import { api } from "./axios";
import type {
  CreatePaymentPayload,
  PaginatedResponse,
  PaginationParams,
  Payment,
  PaymentStatus,
} from "@/types";

export interface PaymentListParams extends PaginationParams {
  bookingId?: string;
  status?: PaymentStatus;
  from?: string;
  to?: string;
}

/**
 * Payment "type" used by the backend to distinguish e.g. deposit
 * collection from full payment. The exact set may evolve; staff POS
 * always submits FULL_PAYMENT for ad-hoc service sales.
 */
export type CashPaymentType =
  | "DEPOSIT"
  | "FULL_PAYMENT"
  | "REMAINING"
  | "SERVICE";

export interface CashPaymentPayload {
  bookingId: string;
  amount: number;
  type: CashPaymentType;
  /** Optional method override — defaults to CASH on the BE. */
  method?: "CASH" | "BANK_TRANSFER" | "VNPAY" | "MOMO";
  note?: string;
}

export interface CreateVnpayPayload {
  bookingId: string;
  /**
   * Optional amount override (e.g. deposit). If omitted, backend computes from booking.
   */
  amount?: number;
}

export interface CreateVnpayResponse {
  paymentUrl: string;
  /**
   * When true, the URL is a mock/simulated payment page.
   */
  mock?: boolean;
}

export const paymentsApi = {
  list: (params?: PaymentListParams) =>
    api.get<PaginatedResponse<Payment>>("/payments", { params }),
  getById: (id: string) => api.get<Payment>(`/payments/${id}`),
  create: (payload: CreatePaymentPayload) =>
    api.post<Payment>("/payments", payload),
  confirm: (id: string) => api.post<Payment>(`/payments/${id}/confirm`),
  refund: (id: string, reason?: string) =>
    api.post<Payment>(`/payments/${id}/refund`, { reason }),
  payCash: (payload: CashPaymentPayload) =>
    api.post<Payment>("/payments/cash", payload),
  /**
   * Create a VNPay payment session. Returns a redirect URL the client should navigate to.
   */
  createVnpay: (payload: CreateVnpayPayload) =>
    api.post<CreateVnpayResponse>("/payments/vnpay/create", payload),
  /**
   * Fetch the list of payments for a given booking.
   */
  listForBooking: (bookingId: string) =>
    api.get<PaginatedResponse<Payment>>("/payments", {
      params: { bookingId, pageSize: 50 },
    }),
  /**
   * Convenience wrapper. The backend exposes /bookings/:id/invoice; we
   * re-export it here so all "invoice" concerns live on paymentsApi too.
   */
  getInvoice: (bookingId: string) =>
    api.get<unknown>(`/bookings/${bookingId}/invoice`),
};

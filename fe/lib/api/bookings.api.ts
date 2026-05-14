import { api } from "./axios";
import type {
  Booking,
  BookingStatus,
  CreateBookingPayload,
  PaginatedResponse,
  PaginationParams,
} from "@/types";

export interface BookingListParams extends PaginationParams {
  status?: BookingStatus;
  customerId?: string;
  fieldId?: string;
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AddServicesPayload {
  items: Array<{ serviceId: string; quantity: number }>;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface BookingInvoice {
  bookingId: string;
  code?: string;
  customerName?: string;
  customerPhone?: string;
  issuedAt?: string;
  items?: InvoiceItem[];
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  [key: string]: unknown;
}

export const bookingsApi = {
  list: (params?: BookingListParams) =>
    api.get<PaginatedResponse<Booking>>("/bookings", { params }),
  create: (payload: CreateBookingPayload) =>
    api.post<Booking>("/bookings", payload),
  getById: (id: string) => api.get<Booking>(`/bookings/${id}`),
  confirm: (id: string) => api.patch<Booking>(`/bookings/${id}/confirm`),
  reject: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/reject`, { reason }),
  cancel: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/cancel`, { reason }),
  checkIn: (id: string) => api.patch<Booking>(`/bookings/${id}/check-in`),
  complete: (id: string) => api.patch<Booking>(`/bookings/${id}/complete`),
  addServices: (id: string, payload: AddServicesPayload) =>
    api.post<Booking>(`/bookings/${id}/services`, payload),
  getInvoice: (id: string) => api.get<BookingInvoice>(`/bookings/${id}/invoice`),
};

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import {
  formatCurrency,
  formatDateTime,
  formatTime,
} from "@/lib/utils";
import {
  PaymentStatus,
  type Booking,
} from "@/types";

export interface BookingDetailDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "Chưa thanh toán",
  [PaymentStatus.PAID]: "Đã thanh toán",
  [PaymentStatus.REFUNDED]: "Đã hoàn tiền",
  [PaymentStatus.FAILED]: "Thanh toán thất bại",
};

export function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
}: BookingDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>
            Chi tiết đơn {booking?.code ?? "—"}
          </DialogTitle>
          <DialogDescription>
            {booking
              ? `Tạo lúc ${formatDateTime(booking.createdAt)}`
              : "Đang tải..."}
          </DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Khách hàng" value={booking.customer?.fullName} />
              <Field label="SĐT" value={booking.customer?.phone} />
              <Field label="Email" value={booking.customer?.email} />
              <Field
                label="Trạng thái"
                value={<BookingStatusBadge status={booking.status} />}
              />
              <Field
                label="Thanh toán"
                value={PAYMENT_LABEL[booking.paymentStatus] ?? booking.paymentStatus}
              />
              {booking.promotion?.code && (
                <Field label="Khuyến mãi" value={booking.promotion.code} />
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Khung giờ
              </p>
              <ul className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
                {booking.slots?.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      Sân #{s.fieldId.slice(0, 6)} ·{" "}
                      {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(s.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {(booking.services?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dịch vụ kèm
                </p>
                <ul className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
                  {(booking.services ?? []).map((sv) => (
                    <li
                      key={sv.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>
                        {sv.service?.name ?? sv.serviceId} × {sv.quantity}
                      </span>
                      <span className="tabular-nums">
                        {formatCurrency(Number(sv.subtotal))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
              <Row
                label="Tổng tiền"
                value={formatCurrency(
                  Number(booking.totalPrice ?? booking.totalAmount ?? 0),
                )}
              />
              {Number(booking.discountAmount ?? 0) > 0 && (
                <Row
                  label="Giảm giá"
                  value={`- ${formatCurrency(Number(booking.discountAmount))}`}
                />
              )}
              <Row
                label="Thành tiền"
                value={formatCurrency(
                  Number(
                    booking.totalPrice ??
                      booking.finalAmount ??
                      booking.totalAmount ??
                      0,
                  ),
                )}
                emphasized
              />
            </div>

            {booking.notes && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ghi chú
                </p>
                <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  {booking.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5">{value || "—"}</div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={
          emphasized ? "font-semibold" : "text-muted-foreground"
        }
      >
        {label}
      </span>
      <span
        className={
          emphasized
            ? "text-base font-semibold tabular-nums"
            : "tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default BookingDetailDialog;

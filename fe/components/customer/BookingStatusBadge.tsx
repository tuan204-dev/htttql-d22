"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookingStatus, PaymentStatus } from "@/types";

/**
 * Localized labels & color schemes for booking lifecycle states.
 *
 * Note: backend may use `PENDING_PAYMENT` as a virtual status for bookings
 * that are PENDING with PaymentStatus.PENDING — we surface both via a helper.
 */
const STATUS_LABEL: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: "Chờ thanh toán",
  [BookingStatus.CONFIRMED]: "Đã xác nhận",
  [BookingStatus.CHECKED_IN]: "Đã nhận sân",
  [BookingStatus.COMPLETED]: "Đã hoàn thành",
  [BookingStatus.CANCELLED]: "Đã hủy",
  [BookingStatus.REJECTED]: "Bị từ chối",
  [BookingStatus.NO_SHOW]: "Không đến",
};

const STATUS_CLASSES: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  [BookingStatus.CONFIRMED]:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  [BookingStatus.CHECKED_IN]:
    "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  [BookingStatus.COMPLETED]:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  [BookingStatus.CANCELLED]:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  [BookingStatus.REJECTED]:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  [BookingStatus.NO_SHOW]:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/30",
};

export interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({
  status,
  className,
}: BookingStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_CLASSES[status], "border", className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

// Indexed by the *raw* string value so we can render both shapes the FE sees:
// booking.paymentStatus (UNPAID/DEPOSITED/FULLY_PAID/REFUNDED) and
// payment.status (PENDING/SUCCESS/FAILED).
const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  DEPOSITED: "Đã đặt cọc",
  FULLY_PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
  PENDING: "Đang xử lý",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
};

const PAYMENT_CLASSES: Record<string, string> = {
  UNPAID:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  DEPOSITED:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  FULLY_PAID:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  REFUNDED:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/30",
  PENDING:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  SUCCESS:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  FAILED:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

export interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  className,
}: PaymentStatusBadgeProps) {
  const key = String(status);
  return (
    <Badge
      variant="outline"
      className={cn(PAYMENT_CLASSES[key] ?? "", "border", className)}
    >
      {PAYMENT_LABEL[key] ?? key}
    </Badge>
  );
}

export default BookingStatusBadge;

"use client";

import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@/types";
import { cn } from "@/lib/utils";

const META: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  [BookingStatus.PENDING]: {
    label: "Chờ duyệt",
    className:
      "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  },
  [BookingStatus.CONFIRMED]: {
    label: "Đã xác nhận",
    className:
      "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  },
  [BookingStatus.CHECKED_IN]: {
    label: "Đang đá",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
  [BookingStatus.COMPLETED]: {
    label: "Hoàn thành",
    className:
      "border-slate-300 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  },
  [BookingStatus.REJECTED]: {
    label: "Đã từ chối",
    className:
      "border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  },
  [BookingStatus.CANCELLED]: {
    label: "Đã hủy",
    className:
      "border-red-300 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  },
  [BookingStatus.NO_SHOW]: {
    label: "Vắng mặt",
    className:
      "border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  },
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const meta = META[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

export default BookingStatusBadge;

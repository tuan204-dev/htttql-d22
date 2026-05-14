"use client";

import { formatCurrency } from "@/lib/utils";

export interface BookingSummaryProps {
  fieldPrice: number;
  servicePrice: number;
  discountAmount: number;
  totalPrice: number;
  depositAmount: number;
}

export function BookingSummary({
  fieldPrice,
  servicePrice,
  discountAmount,
  totalPrice,
  depositAmount,
}: BookingSummaryProps) {
  return (
    <dl className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm sm:p-4">
      <Row label="Tiền sân" value={formatCurrency(fieldPrice)} />
      <Row label="Dịch vụ kèm theo" value={formatCurrency(servicePrice)} />
      {discountAmount > 0 && (
        <Row
          label="Giảm giá"
          value={`- ${formatCurrency(discountAmount)}`}
          tone="success"
        />
      )}
      <div className="my-2 h-px bg-border" />
      <Row
        label="Tổng cộng"
        value={formatCurrency(totalPrice)}
        emphasized
      />
      <Row
        label="Đặt cọc (30%)"
        value={formatCurrency(depositAmount)}
        tone="primary"
      />
    </dl>
  );
}

function Row({
  label,
  value,
  emphasized,
  tone,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  tone?: "primary" | "success";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt
        className={
          emphasized
            ? "font-semibold"
            : "text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd
        className={[
          emphasized ? "text-base font-semibold" : "font-medium",
          tone === "primary" ? "text-primary" : "",
          tone === "success" ? "text-emerald-600 dark:text-emerald-400" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

export default BookingSummary;

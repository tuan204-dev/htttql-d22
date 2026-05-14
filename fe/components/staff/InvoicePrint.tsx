"use client";

import { forwardRef } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoicePrintData {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  bookingCode: string;
  customerName?: string;
  customerPhone?: string;
  issuedAt: string | Date;
  items: InvoiceItem[];
  total: number;
  paid: number;
  remaining: number;
  note?: string;
}

/**
 * Printable invoice. Wrap in a Dialog and call `window.print()` — the
 * embedded `@media print` rules hide everything else on the page.
 */
export const InvoicePrint = forwardRef<HTMLDivElement, { data: InvoicePrintData }>(
  function InvoicePrint({ data }, ref) {
    const {
      storeName = "Sân bóng",
      storeAddress,
      storePhone,
      bookingCode,
      customerName,
      customerPhone,
      issuedAt,
      items,
      total,
      paid,
      remaining,
      note,
    } = data;

    return (
      <>
        {/* Print-only styles. When body has .printing class, only the
            invoice is visible and laid out for 80mm roll. */}
        <style jsx global>{`
          @media print {
            body.printing > *:not(.print-host) {
              display: none !important;
            }
            body.printing .print-host {
              position: fixed !important;
              inset: 0 !important;
              background: white !important;
              z-index: 9999 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body.printing .print-host * {
              visibility: visible;
            }
            body.printing .no-print {
              display: none !important;
            }
            @page {
              size: 80mm auto;
              margin: 6mm;
            }
          }
        `}</style>

        <div ref={ref} className="print-area mx-auto w-full max-w-[320px] bg-white p-4 text-black">
          <div className="text-center">
            <h2 className="text-lg font-bold uppercase">{storeName}</h2>
            {storeAddress && (
              <p className="text-xs">{storeAddress}</p>
            )}
            {storePhone && (
              <p className="text-xs">ĐT: {storePhone}</p>
            )}
          </div>

          <hr className="my-3 border-dashed border-black" />

          <h3 className="text-center text-base font-semibold uppercase">
            Hóa đơn dịch vụ
          </h3>

          <div className="mt-2 text-xs">
            <p>
              <span className="font-medium">Mã đơn:</span> {bookingCode}
            </p>
            <p>
              <span className="font-medium">Ngày:</span>{" "}
              {formatDateTime(issuedAt)}
            </p>
            {customerName && (
              <p>
                <span className="font-medium">Khách:</span> {customerName}
              </p>
            )}
            {customerPhone && (
              <p>
                <span className="font-medium">SĐT:</span> {customerPhone}
              </p>
            )}
          </div>

          <hr className="my-3 border-dashed border-black" />

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/60">
                <th className="py-1 text-left">Mặt hàng</th>
                <th className="py-1 text-right">SL</th>
                <th className="py-1 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-1">
                    {it.name}
                    <div className="text-[10px] opacity-70">
                      {formatCurrency(it.unitPrice)}
                    </div>
                  </td>
                  <td className="py-1 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatCurrency(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="my-2 border-dashed border-black" />

          <div className="space-y-0.5 text-xs">
            <Row label="Tổng cộng" value={formatCurrency(total)} bold />
            <Row label="Đã thu" value={formatCurrency(paid)} />
            <Row label="Còn lại" value={formatCurrency(remaining)} bold />
          </div>

          {note && (
            <>
              <hr className="my-2 border-dashed border-black" />
              <p className="text-xs italic">{note}</p>
            </>
          )}

          <hr className="my-3 border-dashed border-black" />
          <p className="text-center text-xs font-medium">
            Cảm ơn quý khách. Hẹn gặp lại!
          </p>
        </div>
      </>
    );
  },
);

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default InvoicePrint;

"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  Loader,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import {
  InvoicePrint,
  type InvoiceItem,
  type InvoicePrintData,
} from "@/components/staff/InvoicePrint";

import { bookingsApi } from "@/lib/api/bookings.api";
import { paymentsApi } from "@/lib/api/payments.api";
import { servicesApi } from "@/lib/api/services.api";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import {
  PaymentStatus,
  type Booking,
  type PaginatedResponse,
  type Service,
} from "@/types";

function describeError(err: unknown) {
  const ax = err as AxiosError<{ message?: string }>;
  return (
    ax.response?.data?.message || ax.message || "Có lỗi xảy ra. Vui lòng thử lại."
  );
}

interface CartLine {
  serviceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export default function StaffPosPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [invoice, setInvoice] = useState<InvoicePrintData | null>(null);

  // Services list
  const servicesQuery = useQuery({
    queryKey: ["staff", "services"],
    queryFn: async () => {
      const res = await servicesApi.list({ isActive: true, pageSize: 100 });
      return res as unknown as PaginatedResponse<Service>;
    },
  });
  const services = servicesQuery.data?.items ?? [];

  // Booking search
  const searchMutation = useMutation({
    mutationFn: async (kw: string) => {
      const res = await bookingsApi.list({ search: kw, page: 1, limit: 1 });
      return res as unknown as PaginatedResponse<Booking>;
    },
    onSuccess: (data, kw) => {
      const found = data.items?.[0] ?? null;
      setBooking(found);
      setCart([]);
      setCashGiven(0);
      if (!found) toast.error(`Không tìm thấy đơn nào khớp "${kw}".`);
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = keyword.trim();
    if (!kw) {
      toast.warning("Vui lòng nhập mã đơn hoặc số điện thoại.");
      return;
    }
    searchMutation.mutate(kw);
  };

  const addToCart = (svc: Service) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.serviceId === svc.id);
      if (existing) {
        return prev.map((c) =>
          c.serviceId === svc.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          serviceId: svc.id,
          name: svc.name,
          unitPrice: svc.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (serviceId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.serviceId === serviceId
            ? { ...c, quantity: Math.max(0, qty) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const removeLine = (serviceId: string) => {
    setCart((prev) => prev.filter((c) => c.serviceId !== serviceId));
  };

  const total = useMemo(
    () => cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0),
    [cart],
  );

  // Auto-update cash given as user types: keep value but compute change live
  useEffect(() => {
    if (cashGiven < total) {
      // no-op — change will show negative; we'll just clamp display
    }
  }, [cashGiven, total]);

  const change = Math.max(0, cashGiven - total);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("Chưa chọn đơn");
      if (cart.length === 0) throw new Error("Giỏ hàng trống");
      if (cashGiven < total) throw new Error("Tiền khách trả chưa đủ");

      // 1. Add services to booking
      const items = cart.map((c) => ({
        serviceId: c.serviceId,
        quantity: c.quantity,
      }));
      await bookingsApi.addServices(booking.id, { items });

      // 2. Take cash payment
      await paymentsApi.payCash({
        bookingId: booking.id,
        amount: total,
        type: "FULL_PAYMENT",
      });

      return booking;
    },
    onSuccess: async (bk) => {
      toast.success("Đã thu tiền và lưu hóa đơn.");

      // Build invoice for print dialog
      const invoiceItems: InvoiceItem[] = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        subtotal: c.unitPrice * c.quantity,
      }));

      setInvoice({
        storeName: "Sân bóng Sport Center",
        bookingCode: bk.bookingCode ?? bk.code ?? bk.id.slice(0, 8),
        customerName: bk.customer?.fullName,
        customerPhone: bk.customer?.phone,
        issuedAt: new Date().toISOString(),
        items: invoiceItems,
        total,
        paid: total,
        remaining: 0,
      });

      // Reset cart, refresh booking
      setCart([]);
      setCashGiven(0);

      try {
        const fresh = (await bookingsApi.getById(bk.id)) as unknown as Booking;
        setBooking(fresh);
      } catch {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => {
      toast.error(describeError(err));
    },
  });

  const paidAmount =
    booking?.payments?.reduce(
      (s, p) => (p.status === PaymentStatus.PAID ? s + p.amount : s),
      0,
    ) ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          POS - Bán dịch vụ
        </h1>
        <p className="text-sm text-muted-foreground">
          Bán nước, đồ ăn, phụ kiện tại quầy và xuất hóa đơn cho khách.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
        {/* Left column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Booking search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chọn đơn cần tính</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleSearch}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Mã đơn (BK...) hoặc số điện thoại"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={searchMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {searchMutation.isPending ? (
                    <Loader className="size-4 animate-spin" />
                  ) : (
                    "Tìm"
                  )}
                </Button>
              </form>

              {booking ? (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{booking.code}</p>
                      <p className="text-sm">
                        {booking.customer?.fullName ?? "—"} ·{" "}
                        {booking.customer?.phone ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.slots?.[0]
                          ? `${formatDate(booking.slots[0].startTime)} · ${formatTime(
                              booking.slots[0].startTime,
                            )} – ${formatTime(
                              booking.slots[booking.slots.length - 1].endTime,
                            )}`
                          : ""}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Tổng đơn</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(
                          Number(
                            booking.totalPrice ??
                              booking.finalAmount ??
                              booking.totalAmount ??
                              0,
                          ),
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Đã thanh toán</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(paidAmount)}
                      </p>
                    </div>
                  </div>

                  {(booking.services?.length ?? 0) > 0 && (
                    <div className="mt-3 border-t border-border pt-2 text-xs">
                      <p className="font-medium">Dịch vụ đã có:</p>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {(booking.services ?? []).map((s) => (
                          <li key={s.id}>
                            • {s.service?.name ?? s.serviceId} × {s.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Chưa chọn đơn. Hãy tìm theo mã đơn hoặc số điện thoại.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service menu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thực đơn dịch vụ</CardTitle>
            </CardHeader>
            <CardContent>
              {servicesQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có dịch vụ nào.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {services.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => addToCart(svc)}
                      disabled={!booking}
                      className="group flex flex-col items-start justify-between rounded-md border border-border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="w-full">
                        <p className="line-clamp-2 text-sm font-medium">
                          {svc.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-primary tabular-nums">
                          {formatCurrency(svc.price)}
                        </p>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground opacity-90 group-hover:opacity-100">
                        <Plus className="size-3" /> Thêm
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — cart */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Giỏ hàng</CardTitle>
              <span className="text-xs text-muted-foreground">
                {cart.length} mục
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  Giỏ hàng trống. Chọn dịch vụ từ thực đơn.
                </p>
              ) : (
                <ul className="space-y-2">
                  {cart.map((line) => (
                    <li
                      key={line.serviceId}
                      className="rounded-md border border-border p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {line.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(line.unitPrice)} ×{" "}
                            {line.quantity}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => removeLine(line.serviceId)}
                          aria-label="Xóa"
                        >
                          <Trash className="size-3.5" />
                        </Button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            onClick={() =>
                              updateQty(line.serviceId, line.quantity - 1)
                            }
                            aria-label="Giảm"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-6 text-center text-sm tabular-nums">
                            {line.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            onClick={() =>
                              updateQty(line.serviceId, line.quantity + 1)
                            }
                            aria-label="Tăng"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(line.unitPrice * line.quantity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Tổng cộng</span>
                  <span className="tabular-nums text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment-method"
                    defaultChecked
                    readOnly
                  />
                  <span className="font-medium">Tiền mặt (CASH)</span>
                </label>
              </div>

              <div>
                <Label htmlFor="cash" className="text-xs">
                  Tiền khách trả
                </Label>
                <Input
                  id="cash"
                  inputMode="numeric"
                  value={cashGiven || ""}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^0-9]/g, ""));
                    setCashGiven(Number.isFinite(v) ? v : 0);
                  }}
                  placeholder="0"
                  className="text-right tabular-nums"
                />
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted p-2 text-sm">
                <span>Tiền thừa</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(change)}
                </span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => checkoutMutation.mutate()}
                disabled={
                  !booking ||
                  cart.length === 0 ||
                  cashGiven < total ||
                  checkoutMutation.isPending
                }
              >
                {checkoutMutation.isPending ? (
                  <Loader className="mr-1 size-4 animate-spin" />
                ) : (
                  <Receipt className="mr-1 size-4" />
                )}
                Thu tiền & In hóa đơn
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice dialog */}
      <Dialog open={!!invoice} onOpenChange={(v) => !v && setInvoice(null)}>
        <DialogContent className="print-host max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
          <DialogHeader className="no-print">
            <DialogTitle>Hóa đơn</DialogTitle>
          </DialogHeader>
          {invoice && <InvoicePrint data={invoice} />}
          <DialogFooter className="no-print flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setInvoice(null)}
              className="w-full sm:w-auto"
            >
              Đóng
            </Button>
            <Button
              onClick={() => {
                if (typeof document !== "undefined") {
                  document.body.classList.add("printing");
                  window.print();
                  document.body.classList.remove("printing");
                }
              }}
              className="w-full sm:w-auto"
            >
              <Printer className="mr-1 size-4" /> In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

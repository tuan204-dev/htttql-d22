"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Star,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/customer/BookingStatusBadge";

import { bookingsApi } from "@/lib/api/bookings.api";
import { paymentsApi } from "@/lib/api/payments.api";
import { reviewsApi } from "@/lib/api/reviews.api";
import { reviewSchema, type ReviewFormValues } from "@/lib/validators/customer.schema";
import { cn, formatCurrency, formatDate, formatDateTime, FIELD_IMAGE_URL } from "@/lib/utils";
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  type Booking,
  type Payment,
} from "@/types";

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Tiền mặt",
  [PaymentMethod.BANK_TRANSFER]: "Chuyển khoản",
  [PaymentMethod.E_WALLET]: "Ví điện tử",
  [PaymentMethod.VNPAY]: "VNPay",
  [PaymentMethod.MOMO]: "MoMo",
};

type PaymentPortion = "DEPOSIT" | "FULL";
type PayStep = "choose" | "qr" | "done";

// Fake bank account used purely for the demo QR — VietQR API renders the
// scannable code from these params. No real money is involved.
const FAKE_BANK = {
  bankCode: "VCB",
  accountNo: "0123456789",
  accountName: "SOCCER FIELD DEMO",
};
const QR_AUTO_PAY_SECONDS = 5;

function paidTotal(payments: Payment[] | undefined): number {
  if (!payments?.length) return 0;
  // BE Payment row uses TxStatus = PENDING / SUCCESS / FAILED.
  // PaymentStatus.PAID is aliased to "SUCCESS" so the comparison still works,
  // but we also accept the bare "SUCCESS" string in case alias drifts.
  return payments
    .filter((p) => p.status === PaymentStatus.PAID || (p.status as unknown as string) === "SUCCESS")
    .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
}

function parseTimeToMinutes(t: string | undefined | null): number | null {
  if (!t) return null;
  // Accept "HH:mm" or "HH:mm:ss"
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function getEarliestSlotStart(b: Booking): Date | null {
  // Prefer booking.bookingDate + booking.startTime (canonical fields from BE).
  if (b.bookingDate && b.startTime) {
    const minutes = parseTimeToMinutes(b.startTime);
    if (minutes !== null) {
      const d = new Date(`${b.bookingDate}T00:00:00`);
      d.setMinutes(minutes);
      return d;
    }
  }
  // Fallback: scan slots.
  if (b.slots?.length) {
    const min = b.slots.reduce<string | null>((acc, s) => {
      if (!s.startTime) return acc;
      if (!acc) return s.startTime;
      return s.startTime < acc ? s.startTime : acc;
    }, null);
    if (min) {
      const asDate = new Date(min);
      if (!Number.isNaN(asDate.getTime())) return asDate;
    }
  }
  return null;
}

function totalHours(b: Booking): number {
  // BE already computes totalHours; numeric columns arrive as decimal strings.
  const direct = Number(b.totalHours);
  if (!Number.isNaN(direct) && direct > 0) return direct;

  // Fallback 1: derive from booking.startTime / endTime (HH:mm[:ss]).
  const startM = parseTimeToMinutes(b.startTime);
  const endM = parseTimeToMinutes(b.endTime);
  if (startM !== null && endM !== null && endM > startM) {
    return (endM - startM) / 60;
  }

  // Fallback 2: sum slot durations (each slot may be HH:mm:ss or ISO).
  if (b.slots?.length) {
    return b.slots.reduce((acc, s) => {
      const sm = parseTimeToMinutes(s.startTime);
      const em = parseTimeToMinutes(s.endTime);
      if (sm !== null && em !== null && em > sm) {
        return acc + (em - sm) / 60;
      }
      const startMs = new Date(s.startTime).getTime();
      const endMs = new Date(s.endTime).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
        return acc + (endMs - startMs) / 3_600_000;
      }
      return acc;
    }, 0);
  }
  return 0;
}

function fieldFromSlot(b: Booking) {
  // BE now returns `field` directly on the booking. Keep the legacy slot.field
  // lookup as a fallback for older payloads.
  if (b.field) return b.field as { id?: string; name?: string; address?: string; imageUrl?: string };
  const slots = (b.slots ?? []) as Array<{ field?: { id?: string; name?: string; address?: string; imageUrl?: string } }>;
  return slots[0]?.field;
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const res = await bookingsApi.getById(id);
      return res as unknown as Booking;
    },
  });

  const booking = bookingQuery.data;

  // Payments may come embedded or via separate endpoint
  const paymentsQuery = useQuery({
    queryKey: ["booking-payments", id],
    enabled: Boolean(booking) && !booking?.payments,
    queryFn: async () => {
      const res = await paymentsApi.listForBooking(id);
      return (res as unknown as { items: Payment[] }).items ?? [];
    },
  });

  const payments: Payment[] = booking?.payments ?? paymentsQuery.data ?? [];

  // Dialog state
  const [payOpen, setPayOpen] = useState(false);
  const [payPortion, setPayPortion] = useState<PaymentPortion>("DEPOSIT");
  const [payStep, setPayStep] = useState<PayStep>("choose");
  const [countdown, setCountdown] = useState(QR_AUTO_PAY_SECONDS);
  const [paying, setPaying] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Open cancel dialog if ?action=cancel
  useEffect(() => {
    if (searchParams.get("action") === "cancel") {
      setCancelOpen(true);
    }
  }, [searchParams]);

  // Derived booking computations
  const finalAmount = Number(
    booking?.totalPrice ?? booking?.finalAmount ?? booking?.totalAmount ?? 0,
  );
  const paidAmount = paidTotal(payments);
  const remainingAmount = Math.max(0, finalAmount - paidAmount);
  const depositAmount = Math.round(finalAmount * 0.3);
  const start = booking ? getEarliestSlotStart(booking) : null;
  const hours = booking ? totalHours(booking) : 0;
  const field = booking ? fieldFromSlot(booking) : undefined;

  // BE's BookingSlot has no `subtotal` column — fall back to the booking-level
  // fieldPrice so the "Tiền sân" line is never blank.
  const slotsTotal = useMemo(() => {
    const fromSlots = (booking?.slots ?? []).reduce(
      (acc, s) => acc + (s.subtotal ?? 0),
      0,
    );
    if (fromSlots > 0) return fromSlots;
    return Number(booking?.fieldPrice ?? 0) || 0;
  }, [booking]);
  const servicesTotal = useMemo(
    () =>
      (booking?.services ?? []).reduce(
        (acc, s) => acc + (s.subtotal ?? 0),
        0,
      ),
    [booking],
  );

  const canCancel =
    !!booking &&
    (booking.status === BookingStatus.PENDING ||
      booking.status === BookingStatus.CONFIRMED) &&
    !!start &&
    start.getTime() - Date.now() > 24 * 3600 * 1000;

  const canPay = !!booking && remainingAmount > 0 &&
    booking.status !== BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.REJECTED;

  const canReview =
    !!booking && booking.status === BookingStatus.COMPLETED;

  // Review form
  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: "" },
  });
  const ratingValue = reviewForm.watch("rating") ?? 0;

  // Amount the user is paying in the current dialog session.
  const payAmount = payPortion === "DEPOSIT" ? depositAmount : remainingAmount;

  // Reset to step 1 every time the dialog reopens or closes.
  useEffect(() => {
    if (!payOpen) {
      setPayStep("choose");
      setCountdown(QR_AUTO_PAY_SECONDS);
      setPaying(false);
    }
  }, [payOpen]);

  // Fire the real payment exactly once after we land on the QR step.
  // We intentionally key the effect on payStep + booking.id so it doesn't
  // refire on countdown updates.
  useEffect(() => {
    if (payStep !== "qr" || !booking) return;

    setCountdown(QR_AUTO_PAY_SECONDS);
    const tickHandle = window.setInterval(() => {
      setCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    const payHandle = window.setTimeout(async () => {
      try {
        setPaying(true);
        await paymentsApi.payCash({
          bookingId: booking.id,
          amount: payAmount,
          type: payPortion === "DEPOSIT" ? "DEPOSIT" : "FULL_PAYMENT",
          method: "BANK_TRANSFER",
        });
        toast.success("Thanh toán thành công!");
        // Invalidate so the bookings list shows the new status when we land there.
        await queryClient.invalidateQueries({ queryKey: ["booking", id] });
        await queryClient.invalidateQueries({ queryKey: ["booking-payments", id] });
        await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
        setPayOpen(false);
        router.push("/bookings");
      } catch (err) {
        const ax = err as AxiosError<{ message?: string }>;
        toast.error(
          ax.response?.data?.message || "Không thể ghi nhận thanh toán.",
        );
        setPayStep("choose");
      } finally {
        setPaying(false);
      }
    }, QR_AUTO_PAY_SECONDS * 1000);

    return () => {
      window.clearInterval(tickHandle);
      window.clearTimeout(payHandle);
    };
  }, [payStep, booking, payAmount, payPortion, id, queryClient, router]);

  // Construct a real VietQR image URL (no API key needed). The QR encodes the
  // bank account + amount + memo, so a real banking app could scan it; but the
  // payment is still recorded server-side by the auto-confirm timer above.
  const qrMemo = booking ? `BK-${booking.id.slice(0, 8).toUpperCase()}` : "";
  const qrUrl = booking
    ? `https://img.vietqr.io/image/${FAKE_BANK.bankCode}-${FAKE_BANK.accountNo}-qr_only.png?` +
      `amount=${payAmount}&addInfo=${encodeURIComponent(qrMemo)}&accountName=${encodeURIComponent(FAKE_BANK.accountName)}`
    : "";

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      await bookingsApi.cancel(booking.id, cancelReason || undefined);
      toast.success("Đã hủy đơn đặt sân.");
      setCancelOpen(false);
      setCancelReason("");
      await queryClient.invalidateQueries({ queryKey: ["booking", id] });
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      // Clean ?action=cancel from URL
      router.replace(`/bookings/${id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax.response?.data?.message || "Không thể hủy đơn.");
    } finally {
      setCancelling(false);
    }
  };

  const onSubmitReview = async (values: ReviewFormValues) => {
    if (!booking) return;
    setReviewSubmitting(true);
    try {
      await reviewsApi.create({
        bookingId: booking.id,
        rating: values.rating,
        comment: values.comment || undefined,
      });
      toast.success("Cảm ơn bạn đã đánh giá!");
      setReviewOpen(false);
      reviewForm.reset({ rating: 5, comment: "" });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message || "Không thể gửi đánh giá, vui lòng thử lại.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (bookingQuery.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <h2 className="text-lg font-semibold">Không tìm thấy đơn đặt sân</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Đơn đặt sân không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/bookings">
            <ArrowLeft className="mr-2 size-4" />
            Về danh sách
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href="/bookings">
              <ArrowLeft className="mr-1 size-4" />
              Về danh sách
            </Link>
          </Button>
          <h1 className="wrap-break-word text-xl font-semibold tracking-tight sm:text-2xl">
            Đơn đặt sân #{booking.code ?? booking.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tạo lúc {formatDateTime(booking.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <PaymentStatusBadge status={booking.paymentStatus} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Field card */}
          {field && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sân</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted sm:aspect-auto sm:h-32 sm:w-48">
                    <Image
                      src={FIELD_IMAGE_URL}
                      alt={field.name || "Sân"}
                      fill
                      sizes="(max-width: 640px) 100vw, 192px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                    <div>
                      <h3 className="font-medium">
                        {field.name ?? "Sân bóng"}
                      </h3>
                      {field.address && (
                        <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 size-4 shrink-0" />
                          <span>{field.address}</span>
                        </p>
                      )}
                    </div>
                    {field.id && (
                      <Button variant="outline" size="sm" asChild className="w-full sm:w-fit">
                        <Link href={`/fields/${field.id}`}>Xem sân</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slots card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Khung giờ</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.slots?.length ? (
                <ul className="space-y-3">
                  {(() => {
                    // BE shape: { slotDate, slotStart, slotEnd } as strings.
                    // Legacy/fallback: { startTime, endTime }.
                    // Distribute booking.fieldPrice evenly across slots since
                    // BE doesn't store a per-slot subtotal.
                    const slotCount = booking.slots!.length;
                    const evenPrice =
                      slotCount > 0
                        ? Math.round(
                            (Number(booking.fieldPrice ?? 0) || 0) / slotCount,
                          )
                        : 0;
                    return booking.slots!.map((s) => {
                      const slot = s as typeof s & {
                        slotDate?: string;
                        slotStart?: string;
                        slotEnd?: string;
                      };
                      const dateStr = slot.slotDate ?? slot.startTime ?? "";
                      // Time strings come as "HH:mm:ss" — take first 5 chars.
                      const startStr = (slot.slotStart ?? slot.startTime ?? "").slice(0, 5);
                      const endStr = (slot.slotEnd ?? slot.endTime ?? "").slice(0, 5);
                      const slotPrice = slot.subtotal ?? evenPrice;
                      return (
                        <li
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="size-4 text-muted-foreground" />
                              {dateStr ? formatDate(dateStr) : "—"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="size-4" />
                              {startStr} - {endStr}
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(slotPrice)}
                          </span>
                        </li>
                      );
                    });
                  })()}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Đơn này chưa có khung giờ nào.
                </p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                Tổng thời lượng:{" "}
                <span className="font-medium text-foreground">
                  {hours.toFixed(1)} giờ
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Money breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chi tiết thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <Row label="Tiền sân" value={formatCurrency(slotsTotal)} />
                {booking.services?.length ? (
                  <div className="space-y-1">
                    <Row
                      label="Dịch vụ kèm theo"
                      value={formatCurrency(servicesTotal)}
                    />
                    <ul className="ml-3 list-disc space-y-1 text-xs text-muted-foreground">
                      {booking.services.map((sv) => (
                        <li key={sv.id}>
                          {sv.service?.name ?? "Dịch vụ"} × {sv.quantity} —{" "}
                          {formatCurrency(sv.subtotal)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Number(booking.discountAmount) > 0 && (
                  <Row
                    label="Giảm giá"
                    value={`- ${formatCurrency(Number(booking.discountAmount))}`}
                    tone="success"
                  />
                )}
                <div className="my-2 h-px bg-border" />
                <Row
                  label="Tổng cộng"
                  value={formatCurrency(finalAmount)}
                  emphasized
                />
                <Row
                  label="Đã thanh toán"
                  value={formatCurrency(paidAmount)}
                  tone="success"
                />
                <Row
                  label="Còn lại"
                  value={formatCurrency(remainingAmount)}
                  tone={remainingAmount > 0 ? "primary" : undefined}
                />
              </dl>
            </CardContent>
          </Card>

          {/* Payment history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có giao dịch nào.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium">
                          {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatCurrency(p.amount)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.paidAt
                            ? `Thanh toán lúc ${formatDateTime(p.paidAt)}`
                            : `Tạo lúc ${formatDateTime(p.createdAt)}`}
                          {p.transactionId ? ` • Mã GD: ${p.transactionId}` : ""}
                        </p>
                      </div>
                      <PaymentStatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canPay && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setPayOpen(true)}
                >
                  <CreditCard className="mr-2 size-4" />
                  Thanh toán {formatCurrency(remainingAmount)}
                </Button>
              )}
              {canReview && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setReviewOpen(true)}
                >
                  <Star className="mr-2 size-4" />
                  Đánh giá sân
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="mr-2 size-4" />
                  Hủy đơn
                </Button>
              )}
              {!canPay && !canReview && !canCancel && (
                <p className="text-sm text-muted-foreground">
                  Không có hành động khả dụng cho đơn này.
                </p>
              )}
            </CardContent>
          </Card>

          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* ---------------- Payment dialog ---------------- */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          {payStep === "choose" && (
            <>
              <DialogHeader>
                <DialogTitle>Thanh toán đơn đặt sân</DialogTitle>
                <DialogDescription>
                  Chọn số tiền thanh toán. Hệ thống sẽ tạo mã QR chuyển khoản.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Số tiền thanh toán</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <OptionCard
                      active={payPortion === "DEPOSIT"}
                      onClick={() => setPayPortion("DEPOSIT")}
                      disabled={paidAmount >= depositAmount}
                      title="Đặt cọc 30%"
                      desc={formatCurrency(depositAmount)}
                    />
                    <OptionCard
                      active={payPortion === "FULL"}
                      onClick={() => setPayPortion("FULL")}
                      title="Thanh toán đủ"
                      desc={formatCurrency(remainingAmount)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPayOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={() => setPayStep("qr")}>Tiếp tục</Button>
              </DialogFooter>
            </>
          )}

          {payStep === "qr" && (
            <>
              <DialogHeader>
                <DialogTitle>Quét mã QR để thanh toán</DialogTitle>
                <DialogDescription>
                  Mở app ngân hàng và quét mã. Hệ thống sẽ tự xác nhận khi nhận
                  được tiền.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center space-y-4 py-2">
                <div className="rounded-2xl border bg-white p-3 shadow-sm">
                  {/* Use a plain img tag — vietqr.io serves a generated PNG */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="QR thanh toán"
                    width={240}
                    height={240}
                    className="size-48 object-contain sm:size-60"
                  />
                </div>
                <div className="w-full space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="font-medium">Vietcombank (VCB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tài khoản:</span>
                    <span className="font-medium">{FAKE_BANK.accountNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chủ tài khoản:</span>
                    <span className="font-medium">{FAKE_BANK.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tiền:</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(payAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nội dung:</span>
                    <span className="font-mono">{qrMemo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span>
                    Đang chờ xác nhận thanh toán... ({countdown}s)
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPayOpen(false)}
                  disabled={paying}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}

          {payStep === "done" && (
            <>
              <DialogHeader>
                <DialogTitle>Thanh toán thành công</DialogTitle>
                <DialogDescription>
                  Hệ thống đã ghi nhận khoản thanh toán {formatCurrency(payAmount)}.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-6">
                <div className="rounded-full bg-green-100 p-4 text-green-600">
                  <svg viewBox="0 0 24 24" fill="none" className="size-10">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setPayOpen(false)}>Đóng</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Cancel dialog ---------------- */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) router.replace(`/bookings/${id}`);
        }}
      >
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận hủy đơn</DialogTitle>
            <DialogDescription>
              Bạn chắc chắn muốn hủy đơn đặt sân này? Hành động không thể hoàn
              tác.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lý do (tùy chọn)</label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: Trùng lịch, đổi sân khác..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Đóng
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="mr-2 size-4 animate-spin" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Review dialog ---------------- */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Đánh giá sân</DialogTitle>
            <DialogDescription>
              Chia sẻ cảm nhận của bạn về sân để giúp người khác đặt sân tốt hơn.
            </DialogDescription>
          </DialogHeader>

          <Form {...reviewForm}>
            <form
              onSubmit={reviewForm.handleSubmit(onSubmitReview)}
              className="space-y-4"
            >
              <FormField
                control={reviewForm.control}
                name="rating"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Điểm đánh giá</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => f.onChange(n)}
                            aria-label={`${n} sao`}
                            className="p-1"
                          >
                            <Star
                              className={cn(
                                "size-7 transition-colors",
                                n <= ratingValue
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/40",
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="comment"
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Nhận xét</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Nhập cảm nhận của bạn..."
                        {...f}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewOpen(false)}
                  disabled={reviewSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Gửi đánh giá
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
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
          emphasized ? "font-semibold" : "text-muted-foreground"
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

function OptionCard({
  active,
  onClick,
  title,
  desc,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start rounded-md border bg-background p-3 text-left transition",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStatusBadge } from "@/components/customer/BookingStatusBadge";

import { bookingsApi } from "@/lib/api/bookings.api";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import {
  BookingStatus,
  PaymentStatus,
  type Booking,
  type PaginatedResponse,
} from "@/types";

type TabKey = "ALL" | "UPCOMING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const TAB_CONFIG: Array<{ key: TabKey; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "UPCOMING", label: "Sắp tới" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "COMPLETED", label: "Đã hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const PAGE_SIZE = 10;

/**
 * BE stores depositAmount as a string-decimal. Prefer the explicit BE value;
 * fall back to 30% of total when not present.
 */
function depositAmount(b: Booking): number {
  if (b.depositAmount != null && Number(b.depositAmount) > 0) {
    return Number(b.depositAmount);
  }
  const paid = (b.payments ?? [])
    .filter((p) => p.status === PaymentStatus.PAID)
    .reduce((acc, p) => acc + (p.amount ?? 0), 0);
  if (paid > 0) return paid;
  const total = Number(b.totalPrice ?? b.finalAmount ?? b.totalAmount ?? 0);
  return Math.round(total * 0.3);
}

/**
 * BE returns bookingDate (YYYY-MM-DD) + startTime/endTime (HH:mm[:ss]).
 * Combine to a JS Date for display / canCancel checks.
 */
function bookingStartDate(b: Booking): Date | null {
  if (!b.bookingDate || !b.startTime) return null;
  const t = b.startTime.length >= 5 ? b.startTime.slice(0, 5) : b.startTime;
  return new Date(`${b.bookingDate}T${t}:00`);
}

function bookingEndDate(b: Booking): Date | null {
  if (!b.bookingDate || !b.endTime) return null;
  const t = b.endTime.length >= 5 ? b.endTime.slice(0, 5) : b.endTime;
  return new Date(`${b.bookingDate}T${t}:00`);
}

function getFieldName(b: Booking): string {
  return b.field?.name ?? "—";
}

export default function BookingsListPage() {
  const [tab, setTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const base: Record<string, unknown> = { page, pageSize: PAGE_SIZE };
    if (tab === "UPCOMING") {
      // "Upcoming" = confirmed bookings yet to happen; let server filter by status + from-date
      base.status = BookingStatus.CONFIRMED;
      base.from = new Date().toISOString();
    } else if (tab === "CONFIRMED") {
      base.status = BookingStatus.CONFIRMED;
    } else if (tab === "COMPLETED") {
      base.status = BookingStatus.COMPLETED;
    } else if (tab === "CANCELLED") {
      base.status = BookingStatus.CANCELLED;
    }
    return base;
  }, [tab, page]);

  const query = useQuery({
    queryKey: ["my-bookings", tab, page],
    queryFn: async () => {
      const res = await bookingsApi.list(queryParams);
      return res as unknown as PaginatedResponse<Booking>;
    },
  });

  const items = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Đặt sân của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi, thanh toán và quản lý các đơn đặt sân của bạn.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/fields">
            <CalendarPlus className="mr-2 size-4" />
            Đặt sân ngay
          </Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabKey);
          setPage(1);
        }}
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="flex w-max min-w-full gap-1 sm:w-auto sm:min-w-0 sm:flex-wrap">
            {TAB_CONFIG.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách đơn</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
              Không thể tải danh sách đặt sân. Vui lòng thử lại sau.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-12 text-center">
              <p className="font-medium">Chưa có đơn đặt sân nào</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hãy khám phá danh sách sân và đặt lịch ngay hôm nay.
              </p>
              <Button asChild className="mt-4">
                <Link href="/fields">
                  <CalendarPlus className="mr-2 size-4" />
                  Đặt sân ngay
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã đơn</TableHead>
                        <TableHead>Sân</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Khung giờ</TableHead>
                        <TableHead className="text-right">Tổng tiền</TableHead>
                        <TableHead className="text-right">Đặt cọc</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((b) => {
                        const start = bookingStartDate(b);
                        const end = bookingEndDate(b);
                        const canCancel =
                          (b.status === BookingStatus.PENDING ||
                            b.status === BookingStatus.CONFIRMED) &&
                          start !== null &&
                          start.getTime() - Date.now() > 24 * 3600 * 1000;
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">
                              {b.bookingCode ?? b.code ?? b.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>{getFieldName(b)}</TableCell>
                            <TableCell>
                              {start ? formatDate(start) : "—"}
                            </TableCell>
                            <TableCell>
                              {start && end
                                ? `${formatTime(start)} - ${formatTime(end)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(
                                Number(
                                  b.totalPrice ??
                                    b.finalAmount ??
                                    b.totalAmount ??
                                    0,
                                ),
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(depositAmount(b))}
                            </TableCell>
                            <TableCell>
                              <BookingStatusBadge status={b.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/bookings/${b.id}`}>
                                    Xem chi tiết
                                  </Link>
                                </Button>
                                {canCancel && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link
                                      href={`/bookings/${b.id}?action=cancel`}
                                    >
                                      Hủy
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {items.map((b) => {
                  const start = bookingStartDate(b);
                  const end = bookingEndDate(b);
                  const canCancel =
                    (b.status === BookingStatus.PENDING ||
                      b.status === BookingStatus.CONFIRMED) &&
                    start !== null &&
                    start.getTime() - Date.now() > 24 * 3600 * 1000;
                  return (
                    <div
                      key={b.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Mã đơn
                          </p>
                          <p className="truncate font-medium">
                            {b.bookingCode ?? b.code ?? b.id.slice(0, 8)}
                          </p>
                        </div>
                        <BookingStatusBadge status={b.status} />
                      </div>

                      <div className="mt-3 space-y-1.5 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">Sân</span>
                          <span className="text-right font-medium">
                            {getFieldName(b)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">Ngày</span>
                          <span>{start ? formatDate(start) : "—"}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">
                            Khung giờ
                          </span>
                          <span>
                            {start && end
                              ? `${formatTime(start)} - ${formatTime(end)}`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">
                            Tổng tiền
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              Number(
                                b.totalPrice ??
                                  b.finalAmount ??
                                  b.totalAmount ??
                                  0,
                              ),
                            )}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">
                            Đặt cọc
                          </span>
                          <span>{formatCurrency(depositAmount(b))}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1"
                        >
                          <Link href={`/bookings/${b.id}`}>Xem chi tiết</Link>
                        </Button>
                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="flex-1 text-destructive hover:text-destructive"
                          >
                            <Link href={`/bookings/${b.id}?action=cancel`}>
                              Hủy
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Trang {query.data?.page ?? page} / {totalPages}
                  {typeof query.data?.total === "number" &&
                    ` — ${query.data.total} đơn`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || query.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || query.isFetching}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Sau
                    <ChevronRight className="size-4" />
                  </Button>
                  {query.isFetching && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

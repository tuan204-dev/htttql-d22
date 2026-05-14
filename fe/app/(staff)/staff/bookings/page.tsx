"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import { BookingActions } from "@/components/staff/BookingActions";
import { BookingDetailDialog } from "@/components/staff/BookingDetailDialog";

import { bookingsApi } from "@/lib/api/bookings.api";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils";
import {
  BookingStatus,
  PaymentStatus,
  type Booking,
  type PaginatedResponse,
} from "@/types";

type StatusTab =
  | "ALL"
  | BookingStatus.PENDING
  | BookingStatus.CONFIRMED
  | BookingStatus.CHECKED_IN
  | BookingStatus.COMPLETED
  | BookingStatus.CANCELLED;

const TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: BookingStatus.PENDING, label: "Chờ duyệt" },
  { value: BookingStatus.CONFIRMED, label: "Đã xác nhận" },
  { value: BookingStatus.CHECKED_IN, label: "Đang đá" },
  { value: BookingStatus.COMPLETED, label: "Hoàn thành" },
  { value: BookingStatus.CANCELLED, label: "Đã hủy" },
];

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: "Chưa thanh toán",
  [PaymentStatus.PAID]: "Đã thanh toán",
  [PaymentStatus.REFUNDED]: "Đã hoàn tiền",
  [PaymentStatus.FAILED]: "Thất bại",
};

export default function StaffBookingsPage() {
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [detail, setDetail] = useState<Booking | null>(null);

  const queryKey = useMemo(
    () => [
      "staff",
      "bookings",
      tab,
      fromDate,
      toDate,
      searchApplied,
    ],
    [tab, fromDate, toDate, searchApplied],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await bookingsApi.list({
        status: tab === "ALL" ? undefined : (tab as BookingStatus),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchApplied || undefined,
        page: 1,
        limit: 50,
      });
      return res as unknown as PaginatedResponse<Booking>;
    },
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Duyệt đơn
        </h1>
        <p className="text-sm text-muted-foreground">
          Xác nhận, từ chối, check-in và hoàn thành các đơn đặt sân.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as StatusTab)}
            className="w-full"
          >
            <TabsList className="flex w-full flex-wrap">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <form
            className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_1fr_2fr_auto] sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchApplied(search.trim());
            }}
          >
            <div>
              <Label htmlFor="from" className="text-xs">
                Từ ngày
              </Label>
              <Input
                id="from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">
                Đến ngày
              </Label>
              <Input
                id="to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="search" className="text-xs">
                Tìm theo mã đơn / SĐT / tên khách
              </Label>
              <Input
                id="search"
                placeholder="BK..., 09..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                Lọc
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Không thể tải đơn. Vui lòng thử lại.
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Không có đơn nào phù hợp với bộ lọc.
            </div>
          ) : (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách</TableHead>
                      <TableHead className="hidden lg:table-cell">Sân</TableHead>
                      <TableHead>Ngày - Giờ</TableHead>
                      <TableHead className="text-right">Tổng</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Thanh toán
                      </TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((b) => {
                      const startDt =
                        b.bookingDate && b.startTime
                          ? new Date(`${b.bookingDate}T${b.startTime.slice(0, 5)}:00`)
                          : null;
                      const endDt =
                        b.bookingDate && b.endTime
                          ? new Date(`${b.bookingDate}T${b.endTime.slice(0, 5)}:00`)
                          : null;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {b.bookingCode ?? b.code ?? b.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <div className="leading-tight">
                              <p className="font-medium">
                                {b.customer?.fullName ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {b.customer?.phone ?? ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {b.field?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            {startDt ? (
                              <div className="leading-tight">
                                <p>{formatDate(startDt)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(startDt)} –{" "}
                                  {endDt ? formatTime(endDt) : ""}
                                </p>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(
                              Number(b.totalPrice ?? b.finalAmount ?? b.totalAmount ?? 0),
                            )}
                          </TableCell>
                          <TableCell className="hidden text-xs lg:table-cell">
                            {PAYMENT_LABEL[b.paymentStatus] ?? b.paymentStatus}
                          </TableCell>
                          <TableCell>
                            <BookingStatusBadge status={b.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <BookingActions
                                booking={b}
                                onDetail={setDetail}
                                invalidate={[queryKey, ["staff"]]}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {items.map((b) => {
                  const startDt =
                    b.bookingDate && b.startTime
                      ? new Date(`${b.bookingDate}T${b.startTime.slice(0, 5)}:00`)
                      : null;
                  const endDt =
                    b.bookingDate && b.endTime
                      ? new Date(`${b.bookingDate}T${b.endTime.slice(0, 5)}:00`)
                      : null;
                  return (
                    <li key={b.id} className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium">
                            {b.bookingCode ?? b.code ?? b.id.slice(0, 8)}
                          </p>
                          <p className="truncate font-medium">
                            {b.customer?.fullName ?? "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {b.customer?.phone ?? ""}
                          </p>
                        </div>
                        <BookingStatusBadge status={b.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Sân</p>
                          <p className="font-medium">
                            {b.field?.name ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ngày - Giờ</p>
                          <p className="font-medium">
                            {startDt ? formatDate(startDt) : "—"}
                          </p>
                          {startDt && (
                            <p className="text-muted-foreground">
                              {formatTime(startDt)} –{" "}
                              {endDt ? formatTime(endDt) : ""}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Thanh toán</p>
                          <p className="font-medium">
                            {PAYMENT_LABEL[b.paymentStatus] ?? b.paymentStatus}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Tổng</p>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(
                              Number(b.totalPrice ?? b.finalAmount ?? b.totalAmount ?? 0),
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <BookingActions
                          booking={b}
                          onDetail={setDetail}
                          invalidate={[queryKey, ["staff"]]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <BookingDetailDialog
        booking={detail}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </div>
  );
}

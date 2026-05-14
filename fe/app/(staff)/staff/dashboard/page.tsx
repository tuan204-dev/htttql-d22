"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  ClipboardCheck,
  DollarSign,
  MapPin,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { bookingsApi } from "@/lib/api/bookings.api";
import { formatCurrency, formatTime } from "@/lib/utils";
import {
  BookingStatus,
  PaymentStatus,
  type Booking,
  type PaginatedResponse,
} from "@/types";
import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    fromDate: format(start, "yyyy-MM-dd"),
    toDate: format(end, "yyyy-MM-dd"),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export default function StaffDashboardPage() {
  const range = useMemo(todayRange, []);

  // All bookings today (any status)
  const todayQuery = useQuery({
    queryKey: ["staff", "dashboard", "today", range.fromDate],
    queryFn: async () => {
      const res = await bookingsApi.list({
        fromDate: range.fromDate,
        toDate: range.toDate,
        page: 1,
        limit: 100,
      });
      return res as unknown as PaginatedResponse<Booking>;
    },
  });

  // Pending bookings (top 5)
  const pendingQuery = useQuery({
    queryKey: ["staff", "dashboard", "pending"],
    queryFn: async () => {
      const res = await bookingsApi.list({
        status: BookingStatus.PENDING,
        page: 1,
        limit: 5,
      });
      return res as unknown as PaginatedResponse<Booking>;
    },
  });

  const todayItems = todayQuery.data?.items ?? [];
  const pendingItems = pendingQuery.data?.items ?? [];

  // Stats: count today's bookings, pending count, today revenue, in-use fields
  const stats = useMemo(() => {
    const pendingCount = todayItems.filter(
      (b) => b.status === BookingStatus.PENDING,
    ).length;
    const revenueToday = todayItems.reduce((sum, b) => {
      // Anything DEPOSITED/FULLY_PAID/PAID counts. BE booking.paymentStatus is
      // a domain enum (UNPAID/DEPOSITED/FULLY_PAID/REFUNDED), not the FE alias.
      const ps = String(b.paymentStatus ?? "");
      if (
        ps === PaymentStatus.PAID ||
        ps === "DEPOSITED" ||
        ps === "FULLY_PAID"
      ) {
        return sum + Number(b.totalPrice ?? b.finalAmount ?? b.totalAmount ?? 0);
      }
      return sum;
    }, 0);

    const now = Date.now();
    const inUseFieldIds = new Set<string>();
    todayItems.forEach((b) => {
      if (b.status !== BookingStatus.CHECKED_IN) return;
      // Combine bookingDate + startTime/endTime into Date.
      if (b.bookingDate && b.startTime && b.endTime && b.fieldId) {
        const s = new Date(`${b.bookingDate}T${b.startTime.slice(0, 5)}:00`).getTime();
        const e = new Date(`${b.bookingDate}T${b.endTime.slice(0, 5)}:00`).getTime();
        if (s <= now && now <= e) inUseFieldIds.add(b.fieldId);
      }
    });

    return {
      todayCount: todayItems.length,
      pendingCount: pendingQuery.data?.total ?? pendingCount,
      revenueToday,
      inUseCount: inUseFieldIds.size,
    };
  }, [todayItems, pendingQuery.data?.total]);

  const confirmedToday = useMemo(() => {
    return todayItems
      .filter((b) => b.status === BookingStatus.CONFIRMED)
      .sort((a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? ""),
      )
      .slice(0, 5);
  }, [todayItems]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Tổng quan hoạt động hôm nay.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Đơn hôm nay"
          value={stats.todayCount}
          icon={<Calendar className="size-5 text-emerald-600" />}
          loading={todayQuery.isLoading}
        />
        <StatCard
          title="Đơn chờ duyệt"
          value={stats.pendingCount}
          icon={<ClipboardCheck className="size-5 text-amber-600" />}
          loading={pendingQuery.isLoading}
          highlight={stats.pendingCount > 0}
        />
        <StatCard
          title="Doanh thu hôm nay"
          value={formatCurrency(stats.revenueToday)}
          icon={<DollarSign className="size-5 text-blue-600" />}
          loading={todayQuery.isLoading}
        />
        <StatCard
          title="Sân đang sử dụng"
          value={stats.inUseCount}
          icon={<MapPin className="size-5 text-violet-600" />}
          loading={todayQuery.isLoading}
        />
      </div>

      {/* Pending bookings table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Đơn cần xác nhận</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/staff/bookings">
              Xem tất cả <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pendingQuery.isLoading ? (
            <TableSkeleton />
          ) : pendingItems.length === 0 ? (
            <EmptyState text="Không có đơn nào đang chờ duyệt." />
          ) : (
            <div className="-mx-2 overflow-x-auto sm:mx-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách</TableHead>
                    <TableHead className="hidden md:table-cell">Sân</TableHead>
                    <TableHead>Giờ</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {b.bookingCode ?? b.code ?? b.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{b.customer?.fullName ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {b.field?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {b.startTime && b.endTime
                          ? `${b.startTime.slice(0, 5)} – ${b.endTime.slice(0, 5)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(
                          Number(b.totalPrice ?? b.finalAmount ?? b.totalAmount ?? 0),
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Lịch hôm nay</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/staff/check-in">
              Tới Check-in <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {todayQuery.isLoading ? (
            <TableSkeleton />
          ) : confirmedToday.length === 0 ? (
            <EmptyState text="Chưa có lịch đã xác nhận cho hôm nay." />
          ) : (
            <div className="-mx-2 overflow-x-auto sm:mx-0">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead className="hidden md:table-cell">Khách</TableHead>
                    <TableHead>Giờ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmedToday.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {b.bookingCode ?? b.code ?? b.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {b.customer?.fullName ?? "—"}
                      </TableCell>
                      <TableCell>
                        {b.startTime && b.endTime
                          ? `${b.startTime.slice(0, 5)} – ${b.endTime.slice(0, 5)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <BookingStatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
  highlight,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-300" : undefined}>
      <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
              {value}
            </p>
          )}
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted sm:size-10">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}


"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  DollarSign,
  CalendarCheck,
  MapPin,
  Users as UsersIcon,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { BookingsChart } from "@/components/admin/BookingsChart";

import { reportsApi } from "@/lib/api/reports.api";
import { fieldsApi } from "@/lib/api/fields.api";
import { usersApi } from "@/lib/api/users.api";
import { bookingsApi } from "@/lib/api/bookings.api";
import {
  BookingStatus,
  UserRole,
  type Booking,
  type PaginatedResponse,
  type Field,
  type User,
} from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  CHECKED_IN: "Đã check-in",
  COMPLETED: "Hoàn tất",
  NO_SHOW: "Không đến",
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const today = useMemo(() => new Date(), []);
  const fromDate = useMemo(() => subDays(today, 30), [today]);
  const monthStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const from = format(fromDate, "yyyy-MM-dd");
  const to = format(today, "yyyy-MM-dd");
  const monthFrom = format(monthStart, "yyyy-MM-dd");

  // Monthly summary
  const summaryQuery = useQuery({
    queryKey: ["admin-dashboard-summary", monthFrom, to],
    queryFn: async () =>
      (await reportsApi.summary({ from: monthFrom, to })) as unknown as {
        totalRevenue: number;
        totalBookings: number;
        totalCustomers: number;
        averageBookingValue: number;
        totalFields?: number;
      },
  });

  const fieldsQuery = useQuery({
    queryKey: ["admin-dashboard-fields"],
    queryFn: async () =>
      (await fieldsApi.list({ page: 1, limit: 1 })) as unknown as PaginatedResponse<Field>,
  });

  const customersQuery = useQuery({
    queryKey: ["admin-dashboard-customers"],
    queryFn: async () =>
      (await usersApi.list({
        role: UserRole.CUSTOMER,
        page: 1,
        limit: 1,
      })) as unknown as PaginatedResponse<User>,
  });

  const revenueQuery = useQuery({
    queryKey: ["admin-dashboard-revenue", from, to],
    queryFn: async () => {
      const res = await reportsApi.revenue({ from, to, groupBy: "day" });
      return res as unknown as
        | {
            byDay?: { period: string; revenue: number }[];
            series?: { label: string; total: number }[];
          }
        | { period: string; revenue: number }[];
    },
  });

  const bookingsReportQuery = useQuery({
    queryKey: ["admin-dashboard-bookings-report", monthFrom, to],
    queryFn: async () =>
      (await reportsApi.bookings({ from: monthFrom, to })) as unknown as {
        total: number;
        byStatus:
          | Record<string, number>
          | { status: string; count: number }[];
      },
  });

  const pendingQuery = useQuery({
    queryKey: ["admin-dashboard-pending"],
    queryFn: async () =>
      (await bookingsApi.list({
        status: BookingStatus.PENDING,
        page: 1,
        limit: 5,
      })) as unknown as PaginatedResponse<Booking>,
  });

  // Derive arrays defensively. BE returns `{series:[{label,total}]}` for
  // groupBy=day; older shapes used `byDay:[{period,revenue}]` or a flat array.
  const revenueSeries: { period: string; revenue: number }[] = (() => {
    const data = revenueQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.map((d) => ({ period: d.period, revenue: d.revenue }));
    }
    if (Array.isArray(data.series)) {
      return data.series.map((d) => ({ period: d.label, revenue: d.total }));
    }
    if (Array.isArray(data.byDay)) {
      return data.byDay;
    }
    return [];
  })();

  const bookingStatusData = (() => {
    const data = bookingsReportQuery.data;
    if (!data?.byStatus) return [];
    // BE may return either an array of {status, count} or a map { STATUS: count }.
    if (Array.isArray(data.byStatus)) {
      return data.byStatus.map((s) => ({
        label: STATUS_LABELS[s.status] ?? s.status,
        count: s.count,
      }));
    }
    return Object.entries(data.byStatus).map(([status, count]) => ({
      label: STATUS_LABELS[status] ?? status,
      count: Number(count) || 0,
    }));
  })();

  const pending = pendingQuery.data?.items ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Tổng quan
        </h1>
        <p className="text-sm text-muted-foreground">
          Thống kê nhanh hoạt động tháng này.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Doanh thu tháng"
          value={formatCurrency(summaryQuery.data?.totalRevenue ?? 0)}
          description="Từ đầu tháng đến nay"
          icon={DollarSign}
          loading={summaryQuery.isLoading}
        />
        <StatCard
          title="Đặt sân tháng"
          value={String(summaryQuery.data?.totalBookings ?? 0)}
          description="Tổng số đơn"
          icon={CalendarCheck}
          loading={summaryQuery.isLoading}
        />
        <StatCard
          title="Tổng sân"
          value={String(fieldsQuery.data?.total ?? 0)}
          description="Sân đang quản lý"
          icon={MapPin}
          loading={fieldsQuery.isLoading}
        />
        <StatCard
          title="Tổng khách hàng"
          value={String(customersQuery.data?.total ?? 0)}
          description="Khách đã đăng ký"
          icon={UsersIcon}
          loading={customersQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu 30 ngày qua</CardTitle>
            <CardDescription>
              Doanh thu theo ngày từ {format(fromDate, "dd/MM/yyyy")} đến{" "}
              {format(today, "dd/MM/yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <RevenueChart data={revenueSeries} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đặt sân theo trạng thái</CardTitle>
            <CardDescription>Tháng hiện tại</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsReportQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <BookingsChart data={bookingStatusData} variant="bar" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Đơn cần xác nhận</CardTitle>
              <CardDescription>
                5 đơn đang chờ xác nhận gần nhất
              </CardDescription>
            </div>
            <Badge variant="secondary">{pendingQuery.data?.total ?? 0} đơn</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <AlertCircle className="size-6" />
              Không có đơn đang chờ xác nhận
            </div>
          ) : (
            <ul className="divide-y">
              {pending.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      #{b.code}{" "}
                      <span className="text-muted-foreground">
                        — {b.customer?.fullName ?? "Khách"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tạo lúc {formatDateTime(b.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatCurrency(b.finalAmount ?? b.totalAmount ?? 0)}
                    </span>
                    <Badge>Chờ xác nhận</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

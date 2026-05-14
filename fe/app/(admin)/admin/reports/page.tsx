"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { Download } from "lucide-react";
import type { DateRange } from "react-day-picker";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { BookingsChart } from "@/components/admin/BookingsChart";

import { reportsApi } from "@/lib/api/reports.api";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  CHECKED_IN: "Đã check-in",
  COMPLETED: "Hoàn tất",
  NO_SHOW: "Không đến",
};

export default function AdminReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState<DateRange | undefined>({
    from: subDays(today, 30),
    to: today,
  });

  const from = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const to = range?.to ? format(range.to, "yyyy-MM-dd") : from;

  const revenueQuery = useQuery({
    queryKey: ["report-revenue", from, to],
    queryFn: async () =>
      (await reportsApi.revenue({ from, to, groupBy: "day" })) as unknown,
    enabled: !!from && !!to,
  });

  const revenueByFieldQuery = useQuery({
    queryKey: ["report-revenue-field", from, to],
    queryFn: async () =>
      (await reportsApi.revenue({ from, to, groupBy: "field" })) as unknown,
    enabled: !!from && !!to,
  });

  const bookingsQuery = useQuery({
    queryKey: ["report-bookings", from, to],
    queryFn: async () =>
      (await reportsApi.bookings({ from, to })) as unknown as {
        total: number;
        // BE returns Record<string, number>; older shape used an array.
        byStatus?:
          | Record<string, number>
          | { status: string; count: number }[];
        // BE uses `series` with {label,total}; old code expected `byDay` with {period,count}.
        series?: { label: string; total: number }[];
        byDay?: { period: string; count: number }[];
      },
    enabled: !!from && !!to,
  });

  // BE shape: { customer: User, bookingCount, totalSpent }
  // Legacy flat shape: { customerId, fullName, phone, bookingCount, totalSpent }
  type TopCustomerRow = {
    customer?: {
      id?: string;
      fullName?: string;
      phone?: string | null;
      email?: string;
    };
    customerId?: string;
    fullName?: string;
    phone?: string | null;
    bookingCount?: number;
    totalSpent?: number;
  };
  const topCustomersQuery = useQuery({
    queryKey: ["report-top-customers", from, to],
    queryFn: async () =>
      (await reportsApi.topCustomers({
        from,
        to,
        limit: 10,
      })) as unknown as TopCustomerRow[],
    enabled: !!from && !!to,
  });

  // BE shape: { field: Field, bookedHours, availableHours, utilization }
  // Legacy flat shape: { fieldId, fieldName, totalBookedHours, ... }
  type FieldUtilRow = {
    field?: { id?: string; name?: string };
    fieldId?: string;
    fieldName?: string;
    bookedHours?: number;
    availableHours?: number;
    utilization?: number;
    totalBookedHours?: number;
    totalAvailableHours?: number;
    utilizationRate?: number;
    revenue?: number;
  };
  const fieldUtilQuery = useQuery({
    queryKey: ["report-field-util", from, to],
    queryFn: async () =>
      (await reportsApi.fieldUtilization({ from, to })) as unknown as FieldUtilRow[],
    enabled: !!from && !!to,
  });

  // BE shape: { service: { id, name, category }, quantity, revenue }
  // Legacy flat shape: { serviceId, serviceName, quantitySold, revenue }
  type ServiceRow = {
    service?: { id?: string; name?: string; category?: string };
    serviceId?: string;
    serviceName?: string;
    quantity?: number;
    quantitySold?: number;
    revenue?: number;
  };
  const serviceReportQuery = useQuery({
    queryKey: ["report-services", from, to],
    queryFn: async () =>
      (await reportsApi.services({ from, to })) as unknown as ServiceRow[],
    enabled: !!from && !!to,
  });

  // Derive revenue summary.
  // BE shape: { total, fieldRevenue, serviceRevenue, series: { label, total }[] }.
  // Older shapes (kept for safety): top-level array, or `byDay` field.
  const revenueData = (() => {
    const data = revenueQuery.data as
      | {
          total?: number;
          fieldRevenue?: number;
          serviceRevenue?: number;
          series?: { label: string; total: number }[];
          byDay?: { period: string; revenue: number }[];
        }
      | { period: string; revenue: number }[]
      | undefined;
    if (!data) {
      return { total: 0, fieldRevenue: 0, serviceRevenue: 0, byDay: [] };
    }
    if (Array.isArray(data)) {
      const total = data.reduce((sum, d) => sum + (d.revenue ?? 0), 0);
      return { total, fieldRevenue: 0, serviceRevenue: 0, byDay: data };
    }
    const byDay = Array.isArray(data.series)
      ? data.series.map((d) => ({ period: d.label, revenue: d.total }))
      : (data.byDay ?? []);
    return {
      total: data.total ?? 0,
      fieldRevenue: data.fieldRevenue ?? 0,
      serviceRevenue: data.serviceRevenue ?? 0,
      byDay,
    };
  })();

  // BE shape for groupBy=field: { series: { label, total }[] }
  // where label = field name, total = revenue.
  const revenueByField = (() => {
    const data = revenueByFieldQuery.data as
      | {
          series?: { label: string; total: number }[];
          byField?: { fieldName: string; revenue: number }[];
        }
      | { fieldName: string; revenue: number }[]
      | undefined;
    if (!data) return [] as { fieldName: string; revenue: number }[];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.series)) {
      return data.series.map((d) => ({ fieldName: d.label, revenue: d.total }));
    }
    return data.byField ?? [];
  })();

  const bookingStatusData = (() => {
    const raw = bookingsQuery.data?.byStatus;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((s) => ({
        label: STATUS_LABELS[s.status] ?? s.status,
        count: s.count,
      }));
    }
    return Object.entries(raw).map(([status, count]) => ({
      label: STATUS_LABELS[status] ?? status,
      count: Number(count) || 0,
    }));
  })();

  const bookingDayData = (() => {
    const data = bookingsQuery.data;
    if (!data) return [];
    if (Array.isArray(data.series)) {
      return data.series.map((d) => ({ label: d.label, count: d.total }));
    }
    if (Array.isArray(data.byDay)) {
      return data.byDay.map((d) => ({ label: d.period, count: d.count }));
    }
    return [];
  })();

  const handleExport = () => {
    toast.message("Tính năng đang phát triển", {
      description: "Xuất Excel sẽ có trong bản cập nhật sau.",
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Báo cáo
          </h1>
          <p className="text-sm text-muted-foreground">
            Phân tích doanh thu, đặt sân và khách hàng.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DateRangePicker
            value={range}
            onChange={setRange}
            className="w-full sm:w-auto"
          />
          <Button
            variant="outline"
            onClick={handleExport}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 size-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex w-full overflow-x-auto sm:w-auto sm:inline-flex">
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="bookings">Đặt sân</TabsTrigger>
          <TabsTrigger value="customers">Khách hàng</TabsTrigger>
          <TabsTrigger value="fields">Sân</TabsTrigger>
          <TabsTrigger value="services">Dịch vụ</TabsTrigger>
        </TabsList>

        {/* DOANH THU */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tổng doanh thu</CardDescription>
                <CardTitle className="text-2xl">
                  {revenueQuery.isLoading ? (
                    <Skeleton className="h-7 w-32" />
                  ) : (
                    formatCurrency(revenueData.total)
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tiền sân</CardDescription>
                <CardTitle className="text-2xl">
                  {revenueQuery.isLoading ? (
                    <Skeleton className="h-7 w-32" />
                  ) : (
                    formatCurrency(revenueData.fieldRevenue)
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tiền dịch vụ</CardDescription>
                <CardTitle className="text-2xl">
                  {revenueQuery.isLoading ? (
                    <Skeleton className="h-7 w-32" />
                  ) : (
                    formatCurrency(revenueData.serviceRevenue)
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueQuery.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <RevenueChart data={revenueData.byDay} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo sân</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByFieldQuery.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <RevenueChart
                  data={revenueByField.map((d) => ({
                    period: d.fieldName,
                    revenue: d.revenue,
                  }))}
                  variant="bar"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ĐẶT SÂN */}
        <TabsContent value="bookings" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tổng số đơn</CardDescription>
                <CardTitle className="text-2xl">
                  {bookingsQuery.isLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    bookingsQuery.data?.total ?? 0
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            {bookingStatusData.map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{s.label}</CardDescription>
                  <CardTitle className="text-2xl">{s.count}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Theo trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingsQuery.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <BookingsChart data={bookingStatusData} variant="bar" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Số đơn theo ngày</CardTitle>
            </CardHeader>
            <CardContent>
              {bookingsQuery.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <BookingsChart data={bookingDayData} variant="line" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KHÁCH HÀNG */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 khách hàng</CardTitle>
              <CardDescription>Theo tổng chi tiêu</CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomersQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead className="hidden sm:table-cell">SĐT</TableHead>
                        <TableHead className="text-right">Số đơn</TableHead>
                        <TableHead className="text-right">Tổng chi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(topCustomersQuery.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Chưa có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        (topCustomersQuery.data ?? []).map((c, i) => {
                          const id = c.customer?.id ?? c.customerId ?? String(i);
                          const fullName =
                            c.customer?.fullName ?? c.fullName ?? "—";
                          const phone = c.customer?.phone ?? c.phone ?? null;
                          return (
                            <TableRow key={id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                {fullName}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {phone ?? "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {c.bookingCount ?? 0}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(c.totalSpent ?? 0)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SÂN */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tỉ lệ lấp đầy theo sân</CardTitle>
              <CardDescription>
                Số giờ đặt / số giờ có thể đặt trong khoảng thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fieldUtilQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sân</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">
                          Giờ đặt
                        </TableHead>
                        <TableHead className="hidden sm:table-cell text-right">
                          Giờ có sẵn
                        </TableHead>
                        <TableHead className="min-w-40 sm:min-w-48">
                          Tỉ lệ lấp đầy
                        </TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(fieldUtilQuery.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Chưa có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        (fieldUtilQuery.data ?? []).map((f, idx) => {
                          const id = f.field?.id ?? f.fieldId ?? String(idx);
                          const name = f.field?.name ?? f.fieldName ?? "—";
                          const booked =
                            f.bookedHours ?? f.totalBookedHours ?? 0;
                          const available =
                            f.availableHours ?? f.totalAvailableHours ?? 0;
                          const rate = f.utilization ?? f.utilizationRate ?? 0;
                          const pct = Math.round(rate * 100);
                          return (
                            <TableRow key={id}>
                              <TableCell className="font-medium">
                                {name}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-right">
                                {booked.toFixed(1)}h
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-right">
                                {available.toFixed(1)}h
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full bg-primary transition-all"
                                      style={{
                                        width: `${Math.min(100, pct)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="w-12 text-right text-xs font-medium">
                                    {pct}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(f.revenue ?? 0)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DỊCH VỤ */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo dịch vụ</CardTitle>
              <CardDescription>
                Số lượng bán và doanh thu từng dịch vụ
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceReportQuery.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[480px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên dịch vụ</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(serviceReportQuery.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            Chưa có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        (serviceReportQuery.data ?? []).map((s, idx) => {
                          const id = s.service?.id ?? s.serviceId ?? String(idx);
                          const name = s.service?.name ?? s.serviceName ?? "—";
                          const qty = s.quantity ?? s.quantitySold ?? 0;
                          return (
                            <TableRow key={id}>
                              <TableCell className="font-medium">
                                {name}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{qty}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(s.revenue ?? 0)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

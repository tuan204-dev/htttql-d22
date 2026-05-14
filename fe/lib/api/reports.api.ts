import { api } from "./axios";
import type { FieldUsageReportItem, RevenueReportItem } from "@/types";

export interface RevenueReportParams {
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd
  groupBy?: "day" | "week" | "month" | "field";
}

export interface BookingReportParams {
  from: string;
  to: string;
}

export interface FieldUsageReportParams {
  from: string;
  to: string;
}

// BE shape: top-customers returns array of { customer: User, bookingCount, totalSpent }
export interface TopCustomerItem {
  customer: {
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string;
  };
  bookingCount: number;
  totalSpent: number;
}

// Legacy/flat shape kept for backwards-compat in some consumers.
export interface BookingReportItem {
  period?: string;
  status?: string;
  count: number;
}

// BE shape for /reports/bookings:
//   { total, byStatus: Record<status, count>, series: { label, total }[] }
export interface BookingReportResult {
  total: number;
  byStatus: Record<string, number> | BookingReportItem[];
  series?: { label: string; total: number }[];
  // Legacy alias for callers that pre-date the `series` field.
  byDay?: BookingReportItem[];
}

// BE shape for /reports/field-utilization items:
//   { field: Field, bookedHours, availableHours, utilization }
export interface FieldUtilizationItem {
  field: {
    id: string;
    name: string;
  };
  bookedHours: number;
  availableHours: number;
  utilization: number; // 0..1
  revenue?: number;
}

// BE shape for /reports/services items:
//   { service: { id, name, category }, quantity, revenue }
export interface ServiceReportItem {
  service: {
    id: string;
    name: string;
    category?: string;
  };
  quantity: number;
  revenue: number;
}

// BE shape for /reports/revenue:
//   { total, fieldRevenue, serviceRevenue, series: { label, total }[] }
// where `label` is a date (groupBy=day) or a field name (groupBy=field).
export interface RevenueReportResult {
  total: number;
  fieldRevenue: number;
  serviceRevenue: number;
  series?: { label: string; total: number }[];
  // Legacy fields kept for backwards-compat with older callers.
  byDay?: RevenueReportItem[];
  byField?: { fieldId?: string; fieldName: string; revenue: number }[];
}

export const reportsApi = {
  revenue: (params: RevenueReportParams) =>
    api.get<RevenueReportResult | RevenueReportItem[]>("/reports/revenue", {
      params,
    }),
  bookings: (params: BookingReportParams) =>
    api.get<BookingReportResult>("/reports/bookings", { params }),
  topCustomers: (params: { limit?: number; from?: string; to?: string }) =>
    api.get<TopCustomerItem[]>("/reports/top-customers", { params }),
  fieldUtilization: (params: FieldUsageReportParams) =>
    api.get<FieldUtilizationItem[]>("/reports/field-utilization", { params }),
  services: (params: { from: string; to: string }) =>
    api.get<ServiceReportItem[]>("/reports/services", { params }),
  fieldUsage: (params: FieldUsageReportParams) =>
    api.get<FieldUsageReportItem[]>("/reports/field-usage", { params }),
  summary: (params: { from: string; to: string }) =>
    api.get<{
      totalRevenue: number;
      totalBookings: number;
      totalCustomers: number;
      averageBookingValue: number;
      totalFields?: number;
    }>("/reports/summary", { params }),
};

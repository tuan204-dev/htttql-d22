"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import { bookingsApi } from "@/lib/api/bookings.api";
import { fieldsApi } from "@/lib/api/fields.api";
import { formatTime } from "@/lib/utils";
import {
  type Booking,
  type Field,
  type PaginatedResponse,
} from "@/types";

interface ScheduleRow {
  booking: Booking;
  fieldId: string;
  fieldName: string;
  startTime: string;
  endTime: string;
}

export default function StaffSchedulePage() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [fieldFilter, setFieldFilter] = useState<string>("ALL");

  const fieldsQuery = useQuery({
    queryKey: ["staff", "fields-list"],
    queryFn: async () => {
      const res = await fieldsApi.list({ page: 1, limit: 100 });
      return res as unknown as PaginatedResponse<Field>;
    },
  });
  const fields = fieldsQuery.data?.items ?? [];

  const bookingsQuery = useQuery({
    queryKey: ["staff", "schedule", date],
    queryFn: async () => {
      const res = await bookingsApi.list({
        fromDate: date,
        toDate: date,
        page: 1,
        limit: 200,
      });
      return res as unknown as PaginatedResponse<Booking>;
    },
  });

  const rows = useMemo<ScheduleRow[]>(() => {
    const fieldNameById = new Map(fields.map((f) => [f.id, f.name]));
    const all: ScheduleRow[] = [];
    bookingsQuery.data?.items.forEach((b) => {
      b.slots?.forEach((s) => {
        all.push({
          booking: b,
          fieldId: s.fieldId,
          fieldName: fieldNameById.get(s.fieldId) ?? `#${s.fieldId.slice(0, 6)}`,
          startTime: s.startTime,
          endTime: s.endTime,
        });
      });
    });
    // Sort by start time
    all.sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (fieldFilter !== "ALL") {
      return all.filter((r) => r.fieldId === fieldFilter);
    }
    return all;
  }, [bookingsQuery.data?.items, fields, fieldFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Lịch sân
        </h1>
        <p className="text-sm text-muted-foreground">
          Tất cả khung giờ đã đặt trong ngày.
        </p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[200px_220px_1fr] sm:p-6">
          <div>
            <Label htmlFor="date" className="text-xs">
              Ngày
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-xs">Sân</Label>
            <Select value={fieldFilter} onValueChange={setFieldFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tất cả sân" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả sân</SelectItem>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} khung giờ • {date}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookingsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground sm:p-12">
              Chưa có lịch nào cho ngày này.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sân</TableHead>
                      <TableHead>Giờ</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead className="hidden lg:table-cell">SĐT</TableHead>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead className="hidden text-right lg:table-cell">
                        Dịch vụ
                      </TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.booking.id}-${r.startTime}-${i}`}>
                        <TableCell className="font-medium">
                          {r.fieldName}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatTime(r.startTime)} – {formatTime(r.endTime)}
                        </TableCell>
                        <TableCell>
                          {r.booking.customer?.fullName ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {r.booking.customer?.phone ?? "—"}
                        </TableCell>
                        <TableCell>{r.booking.code}</TableCell>
                        <TableCell className="hidden text-right lg:table-cell">
                          {r.booking.services?.length ?? 0}
                        </TableCell>
                        <TableCell>
                          <BookingStatusBadge status={r.booking.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {rows.map((r, i) => (
                  <li
                    key={`${r.booking.id}-${r.startTime}-${i}`}
                    className="space-y-2 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{r.fieldName}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatTime(r.startTime)} – {formatTime(r.endTime)}
                        </p>
                      </div>
                      <BookingStatusBadge status={r.booking.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Khách</p>
                        <p className="font-medium">
                          {r.booking.customer?.fullName ?? "—"}
                        </p>
                        {r.booking.customer?.phone && (
                          <p className="text-muted-foreground">
                            {r.booking.customer.phone}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Mã đơn</p>
                        <p className="font-mono">{r.booking.code}</p>
                        <p className="text-muted-foreground">
                          {r.booking.services?.length ?? 0} dịch vụ
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

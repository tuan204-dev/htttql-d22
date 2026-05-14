"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { AlertTriangle, Loader, ScanLine, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import { BookingActions } from "@/components/staff/BookingActions";

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

function describeError(err: unknown) {
  const ax = err as AxiosError<{ message?: string }>;
  return (
    ax.response?.data?.message || ax.message || "Có lỗi xảy ra. Vui lòng thử lại."
  );
}

export default function StaffCheckInPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<Booking | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (kw: string) => {
      const res = await bookingsApi.list({ search: kw, page: 1, limit: 1 });
      return res as unknown as PaginatedResponse<Booking>;
    },
    onSuccess: (data, kw) => {
      const found = data.items?.[0] ?? null;
      setResult(found);
      if (!found) toast.error(`Không tìm thấy đơn nào khớp "${kw}".`);
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      toast.warning("Vui lòng nhập mã đơn hoặc số điện thoại.");
      return;
    }
    searchMutation.mutate(trimmed);
  };

  const refresh = async () => {
    if (result) {
      try {
        const fresh = (await bookingsApi.getById(result.id)) as unknown as Booking;
        setResult(fresh);
      } catch {
        // ignore — staff queries below will still invalidate
      }
    }
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  const paidAmount =
    result?.payments?.reduce(
      (sum, p) => (p.status === PaymentStatus.PAID ? sum + p.amount : sum),
      0,
    ) ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Check-in
        </h1>
        <p className="text-sm text-muted-foreground">
          Tìm đơn theo mã hoặc số điện thoại để xác nhận khách đã đến sân.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-12 w-full pl-10 text-base"
                placeholder="Nhập mã đơn (BK...) hoặc số điện thoại"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full px-6 sm:w-auto"
              disabled={searchMutation.isPending}
            >
              {searchMutation.isPending ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <ScanLine className="size-4" />
              )}
              Tìm
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchMutation.isPending && (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {!searchMutation.isPending && result && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 sm:p-6">
            <div className="min-w-0">
              <CardTitle className="text-lg">{result.code}</CardTitle>
              <p className="truncate text-sm text-muted-foreground">
                {result.customer?.fullName ?? "—"} ·{" "}
                {result.customer?.phone ?? ""}
              </p>
            </div>
            <BookingStatusBadge status={result.status} />
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info
                label="Ngày"
                value={
                  result.slots?.[0]
                    ? formatDate(result.slots[0].startTime)
                    : "—"
                }
              />
              <Info
                label="Giờ"
                value={
                  result.slots?.[0]
                    ? `${formatTime(result.slots[0].startTime)} – ${formatTime(
                        result.slots[result.slots.length - 1].endTime,
                      )}`
                    : "—"
                }
              />
              <Info
                label="Tổng tiền"
                value={formatCurrency(
                  Number(
                    result.totalPrice ??
                      result.finalAmount ??
                      result.totalAmount ??
                      0,
                  ),
                )}
              />
              <Info
                label="Đã thanh toán"
                value={formatCurrency(paidAmount)}
              />
            </div>

            {result.status === BookingStatus.PENDING && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  Đơn chưa được xác nhận. Vui lòng thu cọc và xác nhận trước khi
                  cho check-in.
                </p>
              </div>
            )}

            <div className="flex justify-stretch sm:justify-end">
              <BookingActions
                booking={result}
                showDetail={false}
                invalidate={[["staff"]]}
                fullWidthMobile
              />
            </div>

            <div className="border-t border-border pt-3 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={searchMutation.isPending}
              >
                Tải lại đơn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!searchMutation.isPending &&
        !result &&
        searchMutation.isSuccess && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground sm:p-12">
              Không tìm thấy đơn nào khớp.
            </CardContent>
          </Card>
        )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

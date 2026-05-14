"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  MapPin,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldCard, type FieldCardField } from "@/components/booking/FieldCard";
import { fieldsApi } from "@/lib/api/fields.api";
import type { PaginatedResponse } from "@/types";

export default function Home() {
  const featuredQuery = useQuery({
    queryKey: ["featured-fields"],
    queryFn: async () => {
      const res = await fieldsApi.list({ page: 1, limit: 4 });
      return res as unknown as PaginatedResponse<FieldCardField>;
    },
    retry: 0,
  });

  const featured = featuredQuery.data?.items ?? [];

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-br from-emerald-50 via-background to-sky-50 dark:from-emerald-950/30 dark:via-background dark:to-sky-950/20"
          />
          <div
            aria-hidden
            className="absolute -left-32 top-1/2 -z-10 size-[420px] -translate-y-1/2 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/20"
          />
          <div
            aria-hidden
            className="absolute -right-24 top-10 -z-10 size-[360px] rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-700/20"
          />

          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:gap-6 sm:px-6 sm:py-20 lg:px-8 md:py-28">
            <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              Hệ thống đặt sân bóng trực tuyến
            </span>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Tìm sân, đặt lịch và thanh toán — tất cả trong một nơi.
            </h1>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              Quản lý sân bóng dễ dàng cho chủ sân và đặt sân nhanh chóng cho
              người chơi. Kiểm tra lịch trống, áp dụng khuyến mãi và đánh giá
              chất lượng sân chỉ trong vài bước.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/fields">
                  Đặt sân ngay <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/register">Tạo tài khoản</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Tại sao chọn chúng tôi?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Trải nghiệm đặt sân tinh gọn, minh bạch và đáng tin cậy.
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <MapPin className="size-6 text-primary" />
                <h3 className="text-lg font-semibold">Đa dạng sân</h3>
                <p className="text-sm text-muted-foreground">
                  Sân 5, 7, 11 người với thông tin chi tiết, hình ảnh và đánh
                  giá thực tế từ người chơi.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <CalendarCheck className="size-6 text-primary" />
                <h3 className="text-lg font-semibold">Đặt lịch nhanh</h3>
                <p className="text-sm text-muted-foreground">
                  Xem lịch trống theo thời gian thực, đặt sân và nhận xác nhận
                  tức thì qua hệ thống.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <ShieldCheck className="size-6 text-primary" />
                <h3 className="text-lg font-semibold">Thanh toán an toàn</h3>
                <p className="text-sm text-muted-foreground">
                  Hỗ trợ nhiều phương thức thanh toán và lưu lịch sử minh bạch
                  cho từng giao dịch.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Featured fields */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
              <div>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
                  Sân bóng nổi bật
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Những sân được người chơi yêu thích nhất.
                </p>
              </div>
              <Link
                href="/fields"
                className="text-sm font-medium text-primary hover:underline"
              >
                Xem tất cả →
              </Link>
            </div>

            {featuredQuery.isLoading ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-4/3 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : featured.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground sm:p-12">
                Chưa có sân nổi bật để hiển thị.
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((f) => (
                  <FieldCard key={f.id} field={f} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-center text-sm text-muted-foreground sm:px-6 sm:text-left lg:px-8 md:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span
                aria-hidden
                className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                ⚽
              </span>
              <span className="font-medium text-foreground">Sân bóng</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 md:justify-end">
              <Link href="/fields" className="hover:text-foreground">
                Sân bóng
              </Link>
              <Link href="/promotions" className="hover:text-foreground">
                Khuyến mãi
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Đăng nhập
              </Link>
              <Link href="/register" className="hover:text-foreground">
                Đăng ký
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}

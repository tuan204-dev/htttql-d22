"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Tag, Calendar, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Header } from "@/components/layout/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { promotionsApi } from "@/lib/api/promotions.api";
import { formatCurrency } from "@/lib/utils";
import type { PaginatedResponse, Promotion } from "@/types";

function normalize(
  data: PaginatedResponse<Promotion> | Promotion[] | undefined,
): Promotion[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

function PromoCard({ p }: { p: Promotion }) {
  const isPercent = p.discountType === "PERCENT";
  const value = Number(p.discountValue);
  const minOrder = Number(p.minOrder ?? 0);
  const headline = isPercent
    ? `Giảm ${value}%`
    : `Giảm ${formatCurrency(value)}`;
  const expiry =
    p.endDate && !Number.isNaN(new Date(p.endDate).getTime())
      ? format(new Date(p.endDate), "dd/MM/yyyy")
      : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.code);
      toast.success(`Đã copy mã ${p.code}`);
    } catch {
      toast.error("Không copy được, vui lòng thử lại");
    }
  };

  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-1">
              <Tag className="size-3" />
              {p.code}
            </Badge>
            <CardTitle className="text-xl">{headline}</CardTitle>
            {p.description && (
              <CardDescription>{p.description}</CardDescription>
            )}
          </div>
          <Sparkles className="size-6 text-yellow-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {minOrder > 0 && (
          <p className="text-muted-foreground">
            Áp dụng cho đơn từ{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(minOrder)}
            </span>
          </p>
        )}
        {expiry && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            Hết hạn: <span className="font-medium text-foreground">{expiry}</span>
          </p>
        )}
        {p.usageLimit && (
          <p className="text-muted-foreground">
            Còn lại:{" "}
            <span className="font-medium text-foreground">
              {Math.max(0, p.usageLimit - (p.usedCount ?? 0))}
            </span>{" "}
            lượt
          </p>
        )}
        <Button onClick={copy} variant="outline" className="w-full gap-2">
          <Copy className="size-4" />
          Copy mã
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PromotionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-promotions"],
    queryFn: () => promotionsApi.list(),
  });

  const promos = normalize(
    data as PaginatedResponse<Promotion> | Promotion[] | undefined,
  );

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-8 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Khuyến mãi đang diễn ra
          </h1>
          <p className="text-muted-foreground">
            Nhập mã khi đặt sân để được giảm giá. Mỗi mã có điều kiện riêng.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : promos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Sparkles className="size-10 text-muted-foreground" />
              <p className="text-lg font-medium">
                Hiện chưa có chương trình khuyến mãi nào
              </p>
              <p className="text-sm text-muted-foreground">
                Quay lại sau hoặc theo dõi fanpage để cập nhật ưu đãi mới nhất.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link href="/fields">Xem sân bóng</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promos.map((p) => (
              <PromoCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

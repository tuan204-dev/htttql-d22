"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Plus, Pencil, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PromotionFormDialog } from "@/components/admin/PromotionFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

import { promotionsApi } from "@/lib/api/promotions.api";
import { PromotionType, type PaginatedResponse, type Promotion } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminPromotionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [confirmDel, setConfirmDel] = useState<Promotion | null>(null);

  const query = useQuery({
    queryKey: ["admin-promotions", search],
    queryFn: async () =>
      (await promotionsApi.list({
        all: true,
        search: search || undefined,
        page: 1,
        limit: 100,
      })) as unknown as PaginatedResponse<Promotion> | Promotion[],
  });

  const promotions: Promotion[] = (() => {
    const d = query.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    return d.items ?? [];
  })();

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await promotionsApi.delete(confirmDel.id);
      toast.success("Đã xóa khuyến mãi");
      await qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(axErr.response?.data?.message || "Xóa thất bại");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Khuyến mãi
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý mã khuyến mãi áp dụng cho đơn đặt sân.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Thêm khuyến mãi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
          <CardDescription>{promotions.length} khuyến mãi</CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Tìm theo mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Table className="min-w-[840px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead className="hidden sm:table-cell">Loại</TableHead>
                    <TableHead className="text-right">Giá trị</TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Đơn tối thiểu
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Hiệu lực
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-right">
                      Đã dùng
                    </TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Chưa có khuyến mãi
                      </TableCell>
                    </TableRow>
                  ) : (
                    promotions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium">
                          {p.code}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {p.discountType === PromotionType.PERCENT
                            ? "%"
                            : "VNĐ"}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.discountType === PromotionType.PERCENT
                            ? `${Number(p.discountValue)}%`
                            : formatCurrency(Number(p.discountValue))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          {p.minOrder
                            ? formatCurrency(Number(p.minOrder))
                            : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatDate(p.startDate)} - {formatDate(p.endDate)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right">
                          {p.usedCount}
                          {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                        </TableCell>
                        <TableCell>
                          {p.isActive ? (
                            <Badge>Đang chạy</Badge>
                          ) : (
                            <Badge variant="outline">Tạm dừng</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setConfirmDel(p)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PromotionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-promotions"] })}
      />
      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xóa khuyến mãi"
        description={`Xóa mã "${confirmDel?.code}"?`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
      />
    </div>
  );
}

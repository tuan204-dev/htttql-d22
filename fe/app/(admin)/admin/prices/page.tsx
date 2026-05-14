"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PriceFormDialog } from "@/components/admin/PriceFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

import { fieldsApi } from "@/lib/api/fields.api";
import { pricesApi } from "@/lib/api/prices.api";
import { formatCurrency } from "@/lib/utils";
import type { Field, PaginatedResponse, Price } from "@/types";

const DAY_TYPE_LABELS: Record<string, string> = {
  ALL: "Tất cả các ngày",
  WEEKDAY: "Ngày thường",
  WEEKEND: "Cuối tuần",
};

function PricesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFieldId = searchParams.get("fieldId") ?? "";

  const qc = useQueryClient();
  const [fieldId, setFieldId] = useState<string>(initialFieldId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Price | null>(null);
  const [confirmDel, setConfirmDel] = useState<Price | null>(null);

  const fieldsQuery = useQuery({
    queryKey: ["admin-prices-fields"],
    queryFn: async () =>
      (await fieldsApi.list({ page: 1, limit: 100 })) as unknown as PaginatedResponse<Field>,
  });

  const fields = fieldsQuery.data?.items ?? [];

  useEffect(() => {
    if (!fieldId && fields.length > 0) {
      setFieldId(fields[0].id);
    }
  }, [fieldId, fields]);

  const pricesQuery = useQuery({
    queryKey: ["admin-prices", fieldId],
    queryFn: async () =>
      (await pricesApi.listByField(fieldId)) as unknown as Price[],
    enabled: !!fieldId,
  });

  const prices = pricesQuery.data ?? [];

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await pricesApi.delete(confirmDel.id);
      toast.success("Đã xóa");
      await qc.invalidateQueries({ queryKey: ["admin-prices", fieldId] });
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
            Bảng giá
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý giá theo khung giờ cho từng sân.
          </p>
        </div>
        <Button
          disabled={!fieldId}
          className="w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Thêm khung giá
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chọn sân</CardTitle>
          <CardDescription>Chọn một sân để xem và quản lý giá</CardDescription>
          <div className="pt-2">
            <Select
              value={fieldId}
              onValueChange={(v) => {
                setFieldId(v);
                const url = new URL(window.location.href);
                url.searchParams.set("fieldId", v);
                router.replace(url.pathname + "?" + url.searchParams.toString());
              }}
            >
              <SelectTrigger className="w-full sm:max-w-sm">
                <SelectValue placeholder="Chọn sân" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {pricesQuery.isLoading || fieldsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !fieldId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có sân nào
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Khung giờ</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Loại ngày
                    </TableHead>
                    <TableHead className="text-right">Giá / giờ</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Chưa có khung giá nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    prices.map((p) => {
                      const dayType = (p as Price & { dayType?: string }).dayType;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.startTime} - {p.endTime}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">
                              {DAY_TYPE_LABELS[dayType ?? "ALL"] ?? dayType ?? "Tất cả"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(p.pricePerHour)}
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {fieldId && (
        <PriceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          fieldId={fieldId}
          initial={editing}
          onSaved={() =>
            qc.invalidateQueries({ queryKey: ["admin-prices", fieldId] })
          }
        />
      )}
      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xóa khung giá"
        description="Bạn có chắc muốn xóa khung giá này?"
        confirmLabel="Xóa"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function AdminPricesPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-72 w-full" /></div>}>
      <PricesContent />
    </Suspense>
  );
}

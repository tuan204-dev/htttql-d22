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
import { ServiceFormDialog } from "@/components/admin/ServiceFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

import { servicesApi } from "@/lib/api/services.api";
import { formatCurrency } from "@/lib/utils";
import type { PaginatedResponse, Service } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  DRINK: "Nước uống",
  FOOD: "Đồ ăn",
  EQUIPMENT: "Trang phục / Dụng cụ",
  REFEREE: "Trọng tài",
  OTHER: "Khác",
};

export default function AdminServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [confirmDel, setConfirmDel] = useState<Service | null>(null);

  // BE's GET /services returns a plain array (`{success, data: Service[]}`),
  // which the axios interceptor unwraps to a Service[]. Older code expected
  // a PaginatedResponse — handle both shapes defensively.
  const query = useQuery({
    queryKey: ["admin-services", search],
    queryFn: async () =>
      (await servicesApi.list({
        page: 1,
        pageSize: 100,
        search: search || undefined,
      })) as unknown as Service[] | PaginatedResponse<Service>,
  });

  const services: Service[] = Array.isArray(query.data)
    ? query.data
    : (query.data?.items ?? []);
  const totalServices = Array.isArray(query.data)
    ? query.data.length
    : (query.data?.total ?? services.length);

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await servicesApi.delete(confirmDel.id);
      toast.success("Đã xóa dịch vụ");
      await qc.invalidateQueries({ queryKey: ["admin-services"] });
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
            Dịch vụ
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý dịch vụ kèm theo (nước uống, đồ ăn, thuê dụng cụ...).
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
          Thêm dịch vụ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách dịch vụ</CardTitle>
          <CardDescription>
            Tổng cộng {totalServices} dịch vụ
          </CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Tìm dịch vụ..."
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
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Danh mục
                    </TableHead>
                    <TableHead className="text-right">Giá</TableHead>
                    <TableHead className="hidden md:table-cell">Đơn vị</TableHead>
                    <TableHead className="hidden md:table-cell text-right">
                      Tồn kho
                    </TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Chưa có dịch vụ nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((s) => {
                      const ext = s as Service & {
                        category?: string;
                        unit?: string;
                        stock?: number;
                        unitPrice?: number | string;
                      };
                      // BE returns `unitPrice` (decimal string); legacy code used `price`.
                      const priceNumber = Number(ext.unitPrice ?? s.price ?? 0);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {CATEGORY_LABELS[ext.category ?? "OTHER"] ?? "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(priceNumber)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {ext.unit ?? "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            {ext.stock ?? 0}
                          </TableCell>
                          <TableCell>
                            {s.isActive ? (
                              <Badge>Đang bán</Badge>
                            ) : (
                              <Badge variant="outline">Ngừng bán</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditing(s);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setConfirmDel(s)}
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

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-services"] })}
      />
      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xóa dịch vụ"
        description={`Bạn có chắc muốn xóa "${confirmDel?.name}"?`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
      />
    </div>
  );
}

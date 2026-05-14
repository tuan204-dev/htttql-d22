"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Plus, Pencil, Trash2, ImageIcon, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { FieldFormDialog } from "@/components/admin/FieldFormDialog";
import { FieldImagesDialog } from "@/components/admin/FieldImagesDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

import { fieldsApi } from "@/lib/api/fields.api";
import {
  FieldStatus,
  FieldType,
  type Field,
  type PaginatedResponse,
} from "@/types";

const TYPE_LABELS: Record<string, string> = {
  [FieldType.FIVE_A_SIDE]: "Sân 5",
  [FieldType.SEVEN_A_SIDE]: "Sân 7",
  [FieldType.ELEVEN_A_SIDE]: "Sân 11",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  [FieldStatus.ACTIVE]: { label: "Hoạt động", variant: "default" },
  [FieldStatus.MAINTENANCE]: { label: "Bảo trì", variant: "secondary" },
  [FieldStatus.INACTIVE]: { label: "Ngừng", variant: "outline" },
};

export default function AdminFieldsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);
  const [imagesFieldId, setImagesFieldId] = useState<string | null>(null);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Field | null>(null);

  const query = useQuery({
    queryKey: ["admin-fields", search],
    queryFn: async () =>
      (await fieldsApi.list({
        page: 1,
        limit: 100,
        search: search || undefined,
      })) as unknown as PaginatedResponse<Field>,
  });

  const fields = query.data?.items ?? [];

  const handleSaved = async (saved: Field) => {
    await qc.invalidateQueries({ queryKey: ["admin-fields"] });
    // Auto open images dialog after create
    if (!editing) {
      setImagesFieldId(saved.id);
      setImagesOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await fieldsApi.delete(confirmDel.id);
      toast.success("Đã xóa sân");
      await qc.invalidateQueries({ queryKey: ["admin-fields"] });
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
            Sân bóng
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý danh sách sân, ảnh và giá theo khung giờ.
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
          Thêm sân
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách sân</CardTitle>
          <CardDescription>
            Tổng cộng {query.data?.total ?? 0} sân
          </CardDescription>
          <div className="pt-2">
            <Input
              placeholder="Tìm theo tên sân..."
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
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="hidden sm:table-cell">Bề mặt</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Chưa có sân nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((f) => {
                      const status = STATUS_LABELS[f.status] ?? {
                        label: f.status,
                        variant: "outline" as const,
                      };
                      const surface = (f as Field & { surface?: string }).surface;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell>{TYPE_LABELS[f.type] ?? f.type}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {surface === "GRASS"
                              ? "Cỏ tự nhiên"
                              : surface === "ARTIFICIAL"
                                ? "Cỏ nhân tạo"
                                : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Quản lý ảnh"
                                onClick={() => {
                                  setImagesFieldId(f.id);
                                  setImagesOpen(true);
                                }}
                              >
                                <ImageIcon className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Quản lý giá"
                                onClick={() =>
                                  router.push(
                                    `/admin/prices?fieldId=${f.id}`,
                                  )
                                }
                              >
                                <DollarSign className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Sửa"
                                onClick={() => {
                                  setEditing(f);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Xóa"
                                onClick={() => setConfirmDel(f)}
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

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={handleSaved}
      />
      <FieldImagesDialog
        fieldId={imagesFieldId}
        open={imagesOpen}
        onOpenChange={setImagesOpen}
      />
      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(open) => !open && setConfirmDel(null)}
        title="Xóa sân"
        description={`Bạn có chắc muốn xóa sân "${confirmDel?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        onConfirm={handleDelete}
      />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AxiosError } from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fieldsApi } from "@/lib/api/fields.api";
import { FieldStatus, FieldType, type Field } from "@/types";

const fieldFormSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên sân"),
  // FieldType.FIVE === FieldType.FIVE_A_SIDE === "FIVE" (BE value)
  type: z.enum([FieldType.FIVE, FieldType.SEVEN, FieldType.ELEVEN]),
  surface: z.enum(["GRASS", "ARTIFICIAL"]).optional(),
  description: z.string().optional(),
  // FieldStatus.AVAILABLE === FieldStatus.ACTIVE === "AVAILABLE" (BE value)
  status: z.enum([
    FieldStatus.AVAILABLE,
    FieldStatus.MAINTENANCE,
    FieldStatus.CLOSED,
  ]),
  address: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

interface FieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Field | null;
  onSaved?: (field: Field) => void;
}

const TYPE_OPTIONS = [
  { value: FieldType.FIVE, label: "Sân 5 người" },
  { value: FieldType.SEVEN, label: "Sân 7 người" },
  { value: FieldType.ELEVEN, label: "Sân 11 người" },
];

const SURFACE_OPTIONS = [
  { value: "GRASS", label: "Cỏ tự nhiên" },
  { value: "ARTIFICIAL", label: "Cỏ nhân tạo" },
];

const STATUS_OPTIONS = [
  { value: FieldStatus.AVAILABLE, label: "Đang hoạt động" },
  { value: FieldStatus.MAINTENANCE, label: "Bảo trì" },
  { value: FieldStatus.CLOSED, label: "Ngừng hoạt động" },
];

export function FieldFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: FieldFormDialogProps) {
  const isEdit = !!initial;
  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: {
      name: "",
      type: FieldType.FIVE,
      surface: "GRASS",
      description: "",
      status: FieldStatus.AVAILABLE,
      address: "",
      openTime: "06:00",
      closeTime: "22:00",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? "",
        type: (initial?.type as FieldType) ?? FieldType.FIVE,
        surface: ((initial as Field & { surface?: string })?.surface as "GRASS" | "ARTIFICIAL") ?? "GRASS",
        description: initial?.description ?? "",
        status: (initial?.status as FieldStatus) ?? FieldStatus.AVAILABLE,
        address: initial?.address ?? "",
        openTime: (initial as Field & { openTime?: string })?.openTime ?? "06:00",
        closeTime: (initial as Field & { closeTime?: string })?.closeTime ?? "22:00",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const onSubmit = async (values: FieldFormValues) => {
    try {
      let saved: Field;
      if (isEdit && initial) {
        saved = (await fieldsApi.update(initial.id, values)) as unknown as Field;
        toast.success("Cập nhật sân thành công");
      } else {
        saved = (await fieldsApi.create(values)) as unknown as Field;
        toast.success("Tạo sân thành công");
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "Có lỗi xảy ra, vui lòng thử lại",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa sân" : "Thêm sân mới"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Cập nhật thông tin sân" : "Điền thông tin để tạo sân mới"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tên sân</FormLabel>
                  <FormControl>
                    <Input placeholder="Sân A1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại sân</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="surface"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bề mặt</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SURFACE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giờ mở</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="closeTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giờ đóng</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Đường ABC, ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isEdit ? "Lưu thay đổi" : "Tạo sân"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default FieldFormDialog;

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

import { servicesApi } from "@/lib/api/services.api";
import type { Service } from "@/types";

// Matches BE CreateServiceDto. Note: BE requires `unitPrice` (not `price`),
// requires `category` & `unit`, and has no `description` column.
const serviceSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên"),
  category: z.enum(["DRINK", "FOOD", "EQUIPMENT", "REFEREE", "OTHER"]),
  unitPrice: z.number().positive("Giá phải > 0"),
  unit: z.string().min(1, "Vui lòng nhập đơn vị"),
  stock: z.number().int().min(0).optional(),
  isActive: z.enum(["true", "false"]),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Service | null;
  onSaved?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "DRINK", label: "Nước uống" },
  { value: "FOOD", label: "Đồ ăn" },
  { value: "EQUIPMENT", label: "Trang phục / Dụng cụ" },
  { value: "REFEREE", label: "Trọng tài" },
  { value: "OTHER", label: "Khác" },
];

export function ServiceFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Props) {
  const isEdit = !!initial;
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      category: "DRINK",
      unitPrice: 0,
      unit: "chai",
      stock: 0,
      isActive: "true",
    },
  });

  useEffect(() => {
    if (open) {
      const ext = initial as (Service & {
        category?: "DRINK" | "FOOD" | "EQUIPMENT" | "REFEREE" | "OTHER";
        unit?: string;
        stock?: number;
        unitPrice?: number | string;
      }) | null;
      form.reset({
        name: initial?.name ?? "",
        category: ext?.category ?? "DRINK",
        // BE returns unitPrice as decimal string (e.g. "15000.00"); coerce.
        unitPrice:
          ext?.unitPrice !== undefined
            ? Number(ext.unitPrice)
            : (initial?.price ?? 0),
        unit: ext?.unit ?? "chai",
        stock: ext?.stock ?? 0,
        isActive: initial ? (initial.isActive ? "true" : "false") : "true",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const onSubmit = async (values: ServiceFormValues) => {
    try {
      const payload = {
        name: values.name,
        category: values.category,
        unitPrice: values.unitPrice,
        unit: values.unit,
        stock: values.stock ?? 0,
        isActive: values.isActive === "true",
      };
      if (isEdit && initial) {
        await servicesApi.update(initial.id, payload);
        toast.success("Cập nhật dịch vụ");
      } else {
        await servicesApi.create(payload);
        toast.success("Tạo dịch vụ");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(axErr.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa dịch vụ" : "Thêm dịch vụ"}</DialogTitle>
          <DialogDescription>
            Thông tin dịch vụ kèm theo đơn đặt sân.
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
                  <FormLabel>Tên dịch vụ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
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
              name="isActive"
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
                      <SelectItem value="true">Đang bán</SelectItem>
                      <SelectItem value="false">Ngừng bán</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giá (VNĐ)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đơn vị</FormLabel>
                  <FormControl>
                    <Input placeholder="chai, ly, ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tồn kho</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
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
                {isEdit ? "Lưu" : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ServiceFormDialog;

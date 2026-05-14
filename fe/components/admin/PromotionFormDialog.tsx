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

import { promotionsApi } from "@/lib/api/promotions.api";
import { PromotionType, type Promotion } from "@/types";

const promotionSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã"),
  description: z.string().optional(),
  discountType: z.enum([PromotionType.PERCENT, PromotionType.FIXED]),
  discountValue: z.number().min(0),
  minOrder: z.number().min(0).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  usageLimit: z.number().int().min(0).optional(),
  isActive: z.enum(["true", "false"]),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Promotion | null;
  onSaved?: () => void;
}

export function PromotionFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: Props) {
  const isEdit = !!initial;
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: PromotionType.PERCENT,
      discountValue: 0,
      minOrder: 0,
      startDate: "",
      endDate: "",
      usageLimit: 0,
      isActive: "true",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: initial?.code ?? "",
        description: initial?.description ?? "",
        discountType: initial?.discountType ?? PromotionType.PERCENT,
        discountValue: initial ? Number(initial.discountValue) : 0,
        minOrder: initial?.minOrder != null ? Number(initial.minOrder) : 0,
        startDate: initial?.startDate
          ? new Date(initial.startDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        endDate: initial?.endDate
          ? new Date(initial.endDate).toISOString().slice(0, 10)
          : new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
        usageLimit: initial?.usageLimit ?? 0,
        isActive: initial ? (initial.isActive ? "true" : "false") : "true",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const onSubmit = async (values: PromotionFormValues) => {
    try {
      const payload = {
        code: values.code,
        description: values.description,
        discountType: values.discountType,
        discountValue: values.discountValue,
        minOrder: values.minOrder,
        startDate: values.startDate,
        endDate: values.endDate,
        usageLimit: values.usageLimit,
        isActive: values.isActive === "true",
      };
      if (isEdit && initial) {
        await promotionsApi.update(initial.id, payload);
        toast.success("Cập nhật khuyến mãi");
      } else {
        await promotionsApi.create(payload);
        toast.success("Tạo khuyến mãi");
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
          <DialogTitle>
            {isEdit ? "Sửa khuyến mãi" : "Thêm khuyến mãi"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình mã giảm giá cho đơn đặt sân.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã</FormLabel>
                  <FormControl>
                    <Input placeholder="SUMMER25" {...field} />
                  </FormControl>
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
                      <SelectItem value="true">Đang chạy</SelectItem>
                      <SelectItem value="false">Tạm dừng</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại giảm</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PromotionType.PERCENT}>
                        Phần trăm (%)
                      </SelectItem>
                      <SelectItem value={PromotionType.FIXED}>
                        Số tiền cố định (VNĐ)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giá trị</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
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
              name="minOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đơn tối thiểu (VNĐ)</FormLabel>
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
              name="usageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giới hạn lượt dùng (0 = không giới hạn)</FormLabel>
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
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bắt đầu</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kết thúc</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Textarea rows={2} {...field} />
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

export default PromotionFormDialog;

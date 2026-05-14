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

import { pricesApi } from "@/lib/api/prices.api";
import type { Price } from "@/types";

// BE DayType enum: WEEKDAY / WEEKEND / HOLIDAY.
// Create mode: all fields required.
const createSchema = z.object({
  dayType: z.enum(["WEEKDAY", "WEEKEND", "HOLIDAY"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:mm"),
  pricePerHour: z.number().min(0, "Giá phải >= 0"),
});

// Edit mode: every field is optional — admin can change 1 or many at a time.
// We still send only the changed fields via dirtyFields tracking on submit.
const updateSchema = createSchema
  .partial()
  .refine(
    (v) =>
      v.dayType !== undefined ||
      v.startTime !== undefined ||
      v.endTime !== undefined ||
      v.pricePerHour !== undefined,
    { message: "Vui lòng chỉnh sửa ít nhất 1 trường" },
  );

type PriceFormValues = z.infer<typeof createSchema>;

interface PriceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldId: string;
  initial?: Price | null;
  onSaved?: () => void;
}

const DAY_TYPE_OPTIONS = [
  { value: "WEEKDAY", label: "Ngày thường (T2-T6)" },
  { value: "WEEKEND", label: "Cuối tuần (T7, CN)" },
  { value: "HOLIDAY", label: "Ngày lễ" },
];

export function PriceFormDialog({
  open,
  onOpenChange,
  fieldId,
  initial,
  onSaved,
}: PriceFormDialogProps) {
  const isEdit = !!initial;
  const form = useForm<PriceFormValues>({
    // Edit mode validates with the partial schema so the user can leave any
    // field at its initial value (or even clear inputs) without blocking submit.
    resolver: zodResolver(
      isEdit
        ? (updateSchema as unknown as typeof createSchema)
        : createSchema,
    ),
    defaultValues: {
      dayType: "WEEKDAY",
      startTime: "06:00",
      endTime: "22:00",
      pricePerHour: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        dayType:
          ((initial as Price & { dayType?: string })?.dayType as
            | "WEEKDAY"
            | "WEEKEND"
            | "HOLIDAY") ?? "WEEKDAY",
        startTime: initial?.startTime ?? "06:00",
        endTime: initial?.endTime ?? "22:00",
        pricePerHour: initial?.pricePerHour ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const onSubmit = async (values: PriceFormValues) => {
    try {
      if (isEdit && initial) {
        // Only send fields the admin actually touched. RHF tracks per-field
        // dirty state; this lets us PATCH "just pricePerHour" without
        // round-tripping the other columns.
        const dirty = form.formState.dirtyFields as Partial<
          Record<keyof PriceFormValues, boolean>
        >;
        const payload: Partial<PriceFormValues> = {};
        (Object.keys(values) as (keyof PriceFormValues)[]).forEach((k) => {
          if (dirty[k]) {
            // The cast is safe — `dirty[k]` only flips for keys present in values.
            (payload as Record<string, unknown>)[k] = values[k];
          }
        });
        if (Object.keys(payload).length === 0) {
          toast.info("Không có thay đổi để lưu");
          return;
        }
        await pricesApi.update(initial.id, payload);
        toast.success("Cập nhật khung giá");
      } else {
        await pricesApi.createForField(fieldId, values);
        toast.success("Tạo khung giá");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa khung giá" : "Thêm khung giá"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình giá theo khung giờ và loại ngày.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="dayType"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Loại ngày</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAY_TYPE_OPTIONS.map((o) => (
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
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giờ bắt đầu</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giờ kết thúc</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pricePerHour"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Giá / giờ (VNĐ)</FormLabel>
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

export default PriceFormDialog;

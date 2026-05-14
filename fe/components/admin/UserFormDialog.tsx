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

import { usersApi } from "@/lib/api/users.api";
import { UserRole, UserStatus, type User } from "@/types";

const userSchema = z.object({
  fullName: z.string().min(1, "Vui lòng nhập họ tên"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  role: z.enum([UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BANNED]),
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: User | null;
  onSaved?: () => void;
}

export function UserFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const isEdit = !!initial;
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      password: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        fullName: initial?.fullName ?? "",
        email: initial?.email ?? "",
        phone: initial?.phone ?? "",
        role: (initial?.role as UserRole) ?? UserRole.STAFF,
        status: (initial?.status as UserStatus) ?? UserStatus.ACTIVE,
        password: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (isEdit && initial) {
        const { password: _password, email: _email, ...rest } = values;
        void _password;
        void _email;
        await usersApi.update(initial.id, rest);
        toast.success("Cập nhật người dùng");
      } else {
        if (!values.password || values.password.length < 6) {
          toast.error("Mật khẩu tối thiểu 6 ký tự");
          return;
        }
        await usersApi.create(values);
        toast.success("Tạo người dùng");
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
            {isEdit ? "Sửa người dùng" : "Tạo người dùng"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin tài khoản."
              : "Tạo tài khoản nhân viên hoặc khách hàng mới."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Họ và tên</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SĐT</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UserRole.CUSTOMER}>Khách hàng</SelectItem>
                      <SelectItem value={UserRole.STAFF}>Nhân viên</SelectItem>
                      <SelectItem value={UserRole.ADMIN}>Quản trị</SelectItem>
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
                      <SelectItem value={UserStatus.ACTIVE}>
                        Hoạt động
                      </SelectItem>
                      <SelectItem value={UserStatus.INACTIVE}>
                        Vô hiệu hóa
                      </SelectItem>
                      <SelectItem value={UserStatus.BANNED}>Cấm</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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

export default UserFormDialog;

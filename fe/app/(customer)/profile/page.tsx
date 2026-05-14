"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordFormValues,
  type UpdateProfileFormValues,
} from "@/lib/validators/customer.schema";
import { usersApi } from "@/lib/api/users.api";
import { useAuthStore } from "@/lib/store/auth.store";
import type { User } from "@/types";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      avatarUrl: user?.avatarUrl ?? "",
    },
  });

  // Re-sync when zustand hydrates with the persisted user
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName ?? "",
        phone: user.phone ?? "",
        avatarUrl: user.avatarUrl ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmitProfile = async (values: UpdateProfileFormValues) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = (await usersApi.update(user.id, {
        fullName: values.fullName,
        phone: values.phone,
        avatarUrl: values.avatarUrl || undefined,
      })) as unknown as User;
      updateUser({
        fullName: updated.fullName ?? values.fullName,
        phone: updated.phone ?? values.phone,
        avatarUrl: updated.avatarUrl ?? values.avatarUrl,
      });
      toast.success("Đã cập nhật hồ sơ.");
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax.response?.data?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSubmitPassword = async (values: ChangePasswordFormValues) => {
    setSavingPassword(true);
    try {
      await usersApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Đã đổi mật khẩu thành công.");
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(ax.response?.data?.message || "Không thể đổi mật khẩu.");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((p) => p[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý thông tin tài khoản và bảo mật của bạn.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar className="size-20">
              <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.fullName ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="info">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="info" className="flex-1 sm:flex-none">Thông tin</TabsTrigger>
            <TabsTrigger value="password" className="flex-1 sm:flex-none">Đổi mật khẩu</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Email không thể chỉnh sửa. Liên hệ hỗ trợ nếu cần thay đổi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form
                    onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <FormField
                      control={profileForm.control}
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
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input value={user?.email ?? ""} readOnly disabled />
                      </FormControl>
                    </FormItem>
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số điện thoại</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="VD: 0901234567"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Ảnh đại diện (URL)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://..."
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Dán URL ảnh đại diện công khai. Bỏ trống nếu không
                            đổi.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto">
                        {savingProfile && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Lưu thay đổi
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
                <CardDescription>
                  Vì lý do bảo mật, vui lòng nhập mật khẩu hiện tại để xác nhận.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Mật khẩu hiện tại</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mật khẩu mới</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={savingPassword} className="w-full sm:w-auto">
                        {savingPassword && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Đổi mật khẩu
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

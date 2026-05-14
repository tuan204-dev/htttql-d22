"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AxiosError } from "axios";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Header } from "@/components/layout/Header";

import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.schema";
import { authApi } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { UserRole, type AuthData } from "@/types";

function LoginForm() {
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const data = (await authApi.login(values)) as AuthData;
      setAuth(data);
      toast.success("Đăng nhập thành công!");

      const from = searchParams.get("from");
      const role = data.user?.role;

      let target: string;
      if (role === UserRole.ADMIN) {
        target = "/admin/dashboard";
      } else if (role === UserRole.STAFF) {
        target = "/staff/dashboard";
      } else {
        target = from && from.startsWith("/") ? from : "/";
      }

      // Use a full navigation so ProtectedRoute layouts pick up the freshly
      // persisted auth state without relying on client-router hydration timing.
      window.location.assign(target);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      const message =
        axErr.response?.data?.message ||
        axErr.message ||
        "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Đăng nhập</CardTitle>
        <CardDescription>
          Đăng nhập để đặt sân, theo dõi lịch và nhận ưu đãi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="ban@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Đăng nhập
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<div className="h-72" />}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}

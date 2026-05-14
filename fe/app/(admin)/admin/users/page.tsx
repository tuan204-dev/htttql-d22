"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Plus, Pencil, Ban, CheckCircle } from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

import { usersApi } from "@/lib/api/users.api";
import { UserRole, UserStatus, type PaginatedResponse, type User } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: "Quản trị",
  [UserRole.STAFF]: "Nhân viên",
  [UserRole.CUSTOMER]: "Khách hàng",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  [UserStatus.ACTIVE]: { label: "Hoạt động", variant: "default" },
  [UserStatus.INACTIVE]: { label: "Vô hiệu", variant: "outline" },
  [UserStatus.BANNED]: { label: "Cấm", variant: "destructive" },
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"ALL" | UserRole>("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  const query = useQuery({
    queryKey: ["admin-users", tab, search],
    queryFn: async () =>
      (await usersApi.list({
        role: tab === "ALL" ? undefined : tab,
        search: search || undefined,
        page: 1,
        limit: 100,
      })) as unknown as PaginatedResponse<User>,
  });

  const users = query.data?.items ?? [];

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    const next =
      confirmToggle.status === UserStatus.ACTIVE
        ? UserStatus.INACTIVE
        : UserStatus.ACTIVE;
    try {
      await usersApi.update(confirmToggle.id, { status: next });
      toast.success(
        next === UserStatus.ACTIVE
          ? "Đã kích hoạt"
          : "Đã vô hiệu hóa người dùng",
      );
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(axErr.response?.data?.message || "Cập nhật thất bại");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Nhân viên & Khách hàng
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý tài khoản, vai trò và trạng thái.
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
          Tạo người dùng
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Người dùng</CardTitle>
          <CardDescription>Tổng cộng {query.data?.total ?? 0}</CardDescription>
          <div className="space-y-3 pt-2">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "ALL" | UserRole)}
            >
              <TabsList className="flex w-full overflow-x-auto sm:w-auto sm:inline-flex">
                <TabsTrigger value="ALL">Tất cả</TabsTrigger>
                <TabsTrigger value={UserRole.ADMIN}>Quản trị</TabsTrigger>
                <TabsTrigger value={UserRole.STAFF}>Nhân viên</TabsTrigger>
                <TabsTrigger value={UserRole.CUSTOMER}>Khách hàng</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Tìm theo tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-sm"
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
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">SĐT</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Không có người dùng
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      const st = STATUS_LABELS[u.status] ?? {
                        label: u.status,
                        variant: "outline" as const,
                      };
                      const isActive = u.status === UserStatus.ACTIVE;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.fullName}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {u.email}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {u.phone ?? "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {ROLE_LABELS[u.role] ?? u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Sửa"
                                onClick={() => {
                                  setEditing(u);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title={isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                                onClick={() => setConfirmToggle(u)}
                              >
                                {isActive ? (
                                  <Ban className="size-4 text-destructive" />
                                ) : (
                                  <CheckCircle className="size-4 text-green-600" />
                                )}
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

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
      />
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        title={
          confirmToggle?.status === UserStatus.ACTIVE
            ? "Vô hiệu hóa người dùng"
            : "Kích hoạt người dùng"
        }
        description={
          confirmToggle?.status === UserStatus.ACTIVE
            ? `Vô hiệu hóa "${confirmToggle?.fullName}"?`
            : `Kích hoạt lại "${confirmToggle?.fullName}"?`
        }
        confirmLabel={
          confirmToggle?.status === UserStatus.ACTIVE ? "Vô hiệu" : "Kích hoạt"
        }
        variant={confirmToggle?.status === UserStatus.ACTIVE ? "destructive" : "default"}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}

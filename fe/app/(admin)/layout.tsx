import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UserRole } from "@/types";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute roles={[UserRole.ADMIN]}>
      <div className="flex min-h-screen w-full bg-muted/20">
        <AdminSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

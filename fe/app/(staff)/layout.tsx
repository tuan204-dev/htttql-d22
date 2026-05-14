"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { UserRole } from "@/types";

export default function StaffLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProtectedRoute
      roles={[UserRole.STAFF, UserRole.ADMIN]}
      fallback={
        <div className="flex flex-1 flex-col">
          <Header />
          <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <Header />
      <div className="flex flex-1">
        <StaffSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main className="min-w-0 flex-1 bg-muted/20">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2 lg:hidden">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </Button>
            <span className="text-sm font-medium">Khu vực nhân viên</span>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

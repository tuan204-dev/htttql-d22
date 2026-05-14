"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  DollarSign,
  Coffee,
  Users,
  Tag,
  BarChart3,
  Menu,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store/auth.store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/fields", label: "Sân bóng", icon: MapPin },
  { href: "/admin/prices", label: "Bảng giá", icon: DollarSign },
  { href: "/admin/services", label: "Dịch vụ", icon: Coffee },
  { href: "/admin/users", label: "Nhân viên & KH", icon: Users },
  { href: "/admin/promotions", label: "Khuyến mãi", icon: Tag },
  { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
];

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  return (
    <div className="border-t p-3">
      {user && (
        <div className="mb-2 px-2">
          <p className="text-sm font-medium truncate">{user.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={handleLogout}
      >
        <LogOut className="size-4" />
        Đăng xuất
      </Button>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLabel =
    NAV_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
    )?.label ?? "Quản trị";

  return (
    <>
      {/* Mobile trigger - sticky top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-3 sm:px-4 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Mở menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  ⚽
                </span>
                Quản trị
              </SheetTitle>
            </SheetHeader>
            <SidebarNav
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <SidebarFooter />
          </SheetContent>
        </Sheet>
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            ⚽
          </span>
          <span className="hidden sm:inline">Quản trị</span>
        </Link>
        <span className="ml-auto truncate text-sm font-medium text-muted-foreground">
          {currentLabel}
        </span>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-4 font-semibold">
          <span
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            ⚽
          </span>
          <span>Quản trị</span>
        </div>
        <SidebarNav pathname={pathname} />
        <SidebarFooter />
      </aside>
    </>
  );
}

export default AdminSidebar;

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardCheck,
  LayoutDashboard,
  ScanLine,
  ShoppingCart,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface StaffSidebarProps {
  /** Whether the mobile drawer is open. */
  open?: boolean;
  /** Close handler for the mobile drawer. */
  onClose?: () => void;
}

const NAV_ITEMS = [
  {
    href: "/staff/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/staff/schedule",
    label: "Lịch sân hôm nay",
    icon: Calendar,
  },
  {
    href: "/staff/bookings",
    label: "Duyệt đơn",
    icon: ClipboardCheck,
  },
  {
    href: "/staff/check-in",
    label: "Check-in",
    icon: ScanLine,
  },
  {
    href: "/staff/pos",
    label: "POS - Bán dịch vụ",
    icon: ShoppingCart,
  },
] as const;

export function StaffSidebar({ open = false, onClose }: StaffSidebarProps) {
  const pathname = usePathname();

  const items = NAV_ITEMS.map((item) => {
    const active =
      pathname === item.href || pathname?.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4" />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-border px-4">
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              S
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Khu vực nhân viên</p>
              <p className="text-xs text-muted-foreground">Sân bóng</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items}</nav>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  S
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Khu vực nhân viên</p>
                  <p className="text-xs text-muted-foreground">Sân bóng</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                aria-label="Đóng menu"
              >
                <X className="size-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items}</nav>
          </aside>
        </div>
      )}
    </>
  );
}

export default StaffSidebar;

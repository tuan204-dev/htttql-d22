"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { UserRole } from "@/types";

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute
      roles={[UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN]}
      fallback={
        <>
          <Header />
          <main className="flex flex-1 items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </main>
        </>
      }
    >
      <Header />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
      </main>
    </ProtectedRoute>
  );
}

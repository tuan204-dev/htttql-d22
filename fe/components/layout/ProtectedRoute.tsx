"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Allowed roles. If omitted, any authenticated user is allowed. */
  roles?: UserRole[];
  /** Path to redirect to when access is denied. Defaults to /login?from=current-path. */
  redirectTo?: string;
  /** Optional UI to render while we resolve auth state. */
  fallback?: ReactNode;
}

const defaultFallback = (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>
);

/**
 * Client-side route guard.
 *
 * Two-phase reveal to handle Next.js SSR + zustand-persist hydration:
 *   1. Server renders with empty store (no localStorage on the server).
 *      We render `fallback` until the client has mounted AND zustand
 *      has had at least one tick to rehydrate from localStorage.
 *   2. After mount, we read the *actual* store state and either render
 *      children or redirect.
 *
 * `persist.hasHydrated()` is a snapshot (not reactive), so we drive
 * `ready` from a `useEffect` + `onFinishHydration` subscription.
 */
export function ProtectedRoute({
  children,
  roles,
  redirectTo,
  fallback = defaultFallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) {
      setReady(true);
      return;
    }
    // If hydration is already done by the time this effect runs, flip immediately.
    if (persist.hasHydrated()) {
      setReady(true);
      return;
    }
    const unsub = persist.onFinishHydration(() => setReady(true));
    // Safety net: in some edge-cases (e.g. Strict-Mode double mount) the
    // onFinishHydration listener may be registered AFTER hydration completed.
    // Re-check on the next microtask.
    queueMicrotask(() => {
      if (persist.hasHydrated()) setReady(true);
    });
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!isAuthenticated || !user) {
      const target =
        redirectTo ?? `/login?from=${encodeURIComponent(pathname || "/")}`;
      router.replace(target);
      return;
    }

    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [ready, isAuthenticated, user, roles, redirectTo, pathname, router]);

  if (!ready) return <>{fallback}</>;
  if (!isAuthenticated || !user) return <>{fallback}</>;
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

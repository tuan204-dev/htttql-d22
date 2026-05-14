"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { servicesApi } from "@/lib/api/services.api";
import { formatCurrency } from "@/lib/utils";
import type { PaginatedResponse, Service } from "@/types";

export interface PickedService {
  serviceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ServicePickerProps {
  value: PickedService[];
  onChange: (items: PickedService[]) => void;
}

export function ServicePicker({ value, onChange }: ServicePickerProps) {
  const query = useQuery({
    queryKey: ["services", { isActive: true }],
    queryFn: async () => {
      const res = await servicesApi.list({ isActive: true, pageSize: 50 });
      return res as unknown as PaginatedResponse<Service>;
    },
  });

  // Local quantity state mirrors `value` so a quick toggle is responsive.
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    const mapped: Record<string, number> = {};
    value.forEach((v) => {
      mapped[v.serviceId] = v.quantity;
    });
    setDraft(mapped);
  }, [value]);

  const services = query.data?.items ?? [];

  const setQuantity = (svc: Service, qty: number) => {
    const safeQty = Math.max(0, Math.min(20, qty));
    const next = { ...draft, [svc.id]: safeQty };
    setDraft(next);

    const list: PickedService[] = Object.entries(next)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => {
        const found = services.find((s) => s.id === id);
        return {
          serviceId: id,
          quantity: q,
          name: found?.name ?? "",
          unitPrice: found?.price ?? 0,
        };
      });
    onChange(list);
  };

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!services.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Hiện chưa có dịch vụ kèm theo.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {services.map((svc) => {
        const qty = draft[svc.id] ?? 0;
        return (
          <li
            key={svc.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{svc.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(svc.price)} / lần
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                onClick={() => setQuantity(svc, qty - 1)}
                disabled={qty <= 0}
                aria-label="Giảm số lượng"
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="w-7 text-center text-sm tabular-nums">
                {qty}
              </span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                onClick={() => setQuantity(svc, qty + 1)}
                aria-label="Tăng số lượng"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default ServicePicker;

"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AvailabilityGridSlot {
  slotStart: string; // "HH:mm"
  slotEnd: string; // "HH:mm"
  available: boolean;
}

export interface AvailabilityGridProps {
  slots: AvailabilityGridSlot[];
  selectedSlots: string[]; // list of slotStart values
  onChange: (slots: string[]) => void;
  /** Default 8 = 4 hours. */
  maxSlots?: number;
}

/**
 * Parse "HH:mm" -> minutes since midnight.
 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Verify the provided slot starts are contiguous in 30-minute steps.
 */
function isContiguous(starts: string[]): boolean {
  if (starts.length <= 1) return true;
  const sorted = [...starts].map(toMinutes).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 30) return false;
  }
  return true;
}

export function AvailabilityGrid({
  slots,
  selectedSlots,
  onChange,
  maxSlots = 8,
}: AvailabilityGridProps) {
  const handleClick = (slot: AvailabilityGridSlot) => {
    if (!slot.available) return;

    const isSelected = selectedSlots.includes(slot.slotStart);

    if (isSelected) {
      // Deselect — but only if the resulting selection remains contiguous.
      const next = selectedSlots.filter((s) => s !== slot.slotStart);
      if (!isContiguous(next)) {
        toast.warning("Vui lòng chọn các khung giờ liền nhau");
        return;
      }
      onChange(next);
      return;
    }

    if (selectedSlots.length >= maxSlots) {
      toast.warning(
        `Bạn chỉ có thể đặt tối đa ${maxSlots} khung (${maxSlots / 2} giờ).`,
      );
      return;
    }

    const next = [...selectedSlots, slot.slotStart];
    if (!isContiguous(next)) {
      toast.warning("Vui lòng chọn các khung giờ liền nhau");
      return;
    }
    onChange(next);
  };

  if (!slots.length) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Chưa có dữ liệu khung giờ.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {slots.map((slot) => {
          const selected = selectedSlots.includes(slot.slotStart);
          return (
            <button
              key={slot.slotStart}
              type="button"
              onClick={() => handleClick(slot)}
              disabled={!slot.available}
              aria-pressed={selected}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-md border px-1 py-2 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                slot.available && !selected &&
                  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
                selected &&
                  "border-amber-300 bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100",
                !slot.available &&
                  "cursor-not-allowed border-muted bg-muted text-muted-foreground line-through opacity-70",
              )}
            >
              {slot.slotStart}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground sm:gap-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-200" /> Còn trống
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-amber-300" /> Đang chọn
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted-foreground/40" /> Đã đặt
        </span>
      </div>
    </div>
  );
}

export default AvailabilityGrid;

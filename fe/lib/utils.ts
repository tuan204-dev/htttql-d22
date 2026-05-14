import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

/**
 * Default field photo used everywhere in the UI until per-field image uploads
 * are wired up. Sourced from the project brief.
 */
export const FIELD_IMAGE_URL =
  "https://pos.nvncdn.com/3c8244-211061/art/20240812_rfsZc1m4.jpeg?v=1723477903";

/**
 * Combine class names with clsx + tailwind-merge so that
 * conflicting Tailwind utilities resolve correctly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Coerce a value into a Date. Accepts Date, ISO string, or anything Date can parse.
 */
function toDate(d: Date | string | number): Date {
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    // Try ISO first, fall back to Date constructor
    const isoCandidate = d.includes("T") || /^\d{4}-\d{2}-\d{2}$/.test(d);
    return isoCandidate ? parseISO(d) : new Date(d);
  }
  return new Date(d);
}

/**
 * Format a number as Vietnamese currency, e.g. 1234500 → "1.234.500đ".
 */
export function formatCurrency(amount: number): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "0đ";
  }
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}đ`;
}

/**
 * Format a date as dd/MM/yyyy (Vietnamese convention).
 */
export function formatDate(d: Date | string | number): string {
  try {
    return format(toDate(d), "dd/MM/yyyy");
  } catch {
    return "";
  }
}

/**
 * Format a datetime as dd/MM/yyyy HH:mm.
 */
export function formatDateTime(d: Date | string | number): string {
  try {
    return format(toDate(d), "dd/MM/yyyy HH:mm");
  } catch {
    return "";
  }
}

/**
 * Format a time as HH:mm.
 */
export function formatTime(d: Date | string | number): string {
  try {
    return format(toDate(d), "HH:mm");
  } catch {
    return "";
  }
}

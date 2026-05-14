"use client";

import { use, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  CalendarIcon,
  Loader2,
  MapPin,
  Star,
  Tag,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import {
  AvailabilityGrid,
  type AvailabilityGridSlot,
} from "@/components/booking/AvailabilityGrid";
import {
  ServicePicker,
  type PickedService,
} from "@/components/booking/ServicePicker";
import { BookingSummary } from "@/components/booking/BookingSummary";

import { fieldsApi, type FieldDetail } from "@/lib/api/fields.api";
import { promotionsApi } from "@/lib/api/promotions.api";
import { bookingsApi } from "@/lib/api/bookings.api";
import { reviewsApi } from "@/lib/api/reviews.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { cn, formatCurrency, FIELD_IMAGE_URL } from "@/lib/utils";
import { FieldType, type Booking, type PaginatedResponse, type Review } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  [FieldType.FIVE_A_SIDE]: "Sân 5",
  [FieldType.SEVEN_A_SIDE]: "Sân 7",
  [FieldType.ELEVEN_A_SIDE]: "Sân 11",
};

const DAY_NAMES: Record<string, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Build the default 06:00 → 23:00 / 30-min slot list when API returns nothing.
 */
function buildDefaultSlots(open = "06:00", close = "23:00"): AvailabilityGridSlot[] {
  const out: AvailabilityGridSlot[] = [];
  const start = toMinutes(open);
  const end = toMinutes(close);
  for (let m = start; m < end; m += 30) {
    const sH = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const sM = (m % 60).toString().padStart(2, "0");
    const eH = Math.floor((m + 30) / 60)
      .toString()
      .padStart(2, "0");
    const eM = ((m + 30) % 60).toString().padStart(2, "0");
    out.push({
      slotStart: `${sH}:${sM}`,
      slotEnd: `${eH}:${eM}`,
      available: true,
    });
  }
  return out;
}

export default function FieldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // -------- Queries --------
  const fieldQuery = useQuery({
    queryKey: ["field", id],
    queryFn: async () => {
      const res = await fieldsApi.getById(id);
      return res as unknown as FieldDetail;
    },
  });

  const [activeImage, setActiveImage] = useState(0);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [services, setServices] = useState<PickedService[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  const dateStr = useMemo(
    () => (date ? format(date, "yyyy-MM-dd") : ""),
    [date],
  );

  const availabilityQuery = useQuery({
    queryKey: ["availability", id, dateStr],
    enabled: Boolean(dateStr),
    queryFn: async () => {
      const res = await fieldsApi.getAvailability(id, { date: dateStr });
      const slots = res as unknown as AvailabilityGridSlot[];
      return Array.isArray(slots) && slots.length
        ? slots
        : buildDefaultSlots(
            fieldQuery.data?.openTime,
            fieldQuery.data?.closeTime,
          );
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const res = await reviewsApi.list({ fieldId: id, pageSize: 5 });
      return res as unknown as PaginatedResponse<Review>;
    },
    retry: 0,
  });

  // -------- Derived totals --------
  const field = fieldQuery.data;
  // Until per-field uploads are wired up, the gallery shows the same shared
  // photo in four slots so the layout still feels populated.
  const images: string[] = [
    FIELD_IMAGE_URL,
    FIELD_IMAGE_URL,
    FIELD_IMAGE_URL,
    FIELD_IMAGE_URL,
  ];

  const hourlyPrice = useMemo(() => {
    const prices = field?.prices ?? [];
    const min = prices.length
      ? Math.min(...prices.map((p) => p.pricePerHour))
      : field?.basePrice ?? 0;
    return min;
  }, [field]);

  const fieldPrice = useMemo(
    () => Math.round((selectedSlots.length / 2) * hourlyPrice),
    [selectedSlots.length, hourlyPrice],
  );

  const servicePrice = useMemo(
    () => services.reduce((acc, s) => acc + s.unitPrice * s.quantity, 0),
    [services],
  );

  const subtotal = fieldPrice + servicePrice;
  const totalPrice = Math.max(0, subtotal - discount);
  const depositAmount = Math.round(totalPrice * 0.3);

  // -------- Handlers --------
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.warning("Vui lòng nhập mã giảm giá");
      return;
    }
    if (subtotal <= 0) {
      toast.warning("Hãy chọn khung giờ trước khi áp dụng mã");
      return;
    }
    setPromoLoading(true);
    try {
      const res = (await promotionsApi.validate(
        promoCode.trim(),
        subtotal,
      )) as unknown as {
        valid: boolean;
        discountAmount: number;
      };
      if (res?.valid && res.discountAmount > 0) {
        setDiscount(res.discountAmount);
        toast.success(
          `Áp dụng mã thành công, giảm ${formatCurrency(res.discountAmount)}`,
        );
      } else {
        setDiscount(0);
        toast.error("Mã giảm giá không hợp lệ");
      }
    } catch (err) {
      setDiscount(0);
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axErr.response?.data?.message || "Không thể áp dụng mã giảm giá",
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!date || selectedSlots.length === 0) {
      toast.warning("Vui lòng chọn ngày và khung giờ");
      return;
    }
    if (!isAuthenticated) {
      const from = `/fields/${id}`;
      router.push(`/login?from=${encodeURIComponent(from)}`);
      return;
    }

    // BE accepts a single contiguous time range. The AvailabilityGrid already
    // enforces "adjacent only" selection, so it's safe to derive [first..last+30'].
    const sorted = [...selectedSlots].sort(
      (a, b) => toMinutes(a) - toMinutes(b),
    );
    const startTime = sorted[0]; // 'HH:mm'
    const lastStart = sorted[sorted.length - 1];
    const endMin = toMinutes(lastStart) + 30;
    const endTime = `${Math.floor(endMin / 60)
      .toString()
      .padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;

    setSubmitLoading(true);
    try {
      const booking = (await bookingsApi.create({
        fieldId: id,
        bookingDate: dateStr, // 'YYYY-MM-DD'
        startTime,
        endTime,
        services: services.map((s) => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
        })),
        promotionCode: promoCode.trim() || undefined,
      })) as unknown as Booking;
      toast.success("Đặt sân thành công!");
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string | string[] }>;
      const msg = axErr.response?.data?.message;
      toast.error(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg as string) ||
              "Không thể tạo đơn đặt sân, vui lòng thử lại.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // -------- Render --------
  if (fieldQuery.isLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:grid-cols-[1fr_360px] lg:py-10">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </main>
      </>
    );
  }

  if (fieldQuery.isError || !field) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-6xl flex-1 px-4 py-12 text-center sm:px-6 sm:py-16">
          <h2 className="text-xl font-semibold">Không tìm thấy sân</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sân bạn đang xem có thể đã bị xoá hoặc tạm ẩn.
          </p>
        </main>
      </>
    );
  }

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + 14);

  return (
    <>
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:grid-cols-[1fr_380px]">
        {/* ---------- Left column ---------- */}
        <div className="space-y-6 sm:space-y-8">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <Image
                src={images[activeImage] || FIELD_IMAGE_URL}
                alt={field.name}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority
              />
            </div>
            {images.length > 1 && (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "relative size-16 shrink-0 overflow-hidden rounded-md border-2 sm:size-20",
                      activeImage === i
                        ? "border-primary"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {TYPE_LABEL[field.type] ?? "Sân bóng"}
              </Badge>
              {field.surface && (
                <Badge variant="outline">{field.surface}</Badge>
              )}
              {typeof field.averageRating === "number" && (
                <span className="inline-flex items-center gap-1 text-sm">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">
                    {field.averageRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({field.reviewCount ?? 0} đánh giá)
                  </span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {field.name}
            </h1>

            {field.address && (
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {field.address}
              </p>
            )}

            {field.description && (
              <p className="leading-7 text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>

          {/* Pricing table */}
          {field.prices && field.prices.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Bảng giá theo giờ</h2>
              <div className="overflow-hidden rounded-md border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Ngày</th>
                        <th className="px-3 py-2">Khung giờ</th>
                        <th className="px-3 py-2 text-right">Giá / giờ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {field.prices.map((p) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {p.dayOfWeek ? DAY_NAMES[p.dayOfWeek] : "Tất cả"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {p.startTime} – {p.endTime}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                            {formatCurrency(p.pricePerHour)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Reviews */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Đánh giá khách hàng</h2>
            {reviewsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : reviewsQuery.data?.items?.length ? (
              <ul className="space-y-3">
                {reviewsQuery.data.items.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {r.customer?.fullName ?? "Khách hàng"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        {r.rating}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Chưa có đánh giá nào cho sân này.
              </p>
            )}
          </section>
        </div>

        {/* ---------- Right column: booking card ---------- */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Đặt sân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Date picker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Chọn ngày
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {date
                        ? format(date, "EEEE, dd/MM/yyyy", { locale: vi })
                        : "Chọn ngày đặt sân"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        setSelectedSlots([]);
                      }}
                      disabled={(d) => d < minDate || d > maxDate}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Availability grid */}
              {date ? (
                availabilityQuery.isLoading ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Khung giờ
                    </label>
                    <AvailabilityGrid
                      slots={availabilityQuery.data ?? []}
                      selectedSlots={selectedSlots}
                      onChange={setSelectedSlots}
                      date={date}
                    />
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Chọn ngày để xem các khung giờ còn trống.
                </p>
              )}

              {/* Services */}
              {selectedSlots.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Dịch vụ kèm theo
                  </label>
                  <ServicePicker value={services} onChange={setServices} />
                </div>
              )}

              {/* Promo */}
              {selectedSlots.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Mã giảm giá
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Nhập mã"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value);
                          setDiscount(0);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={promoLoading}
                    >
                      {promoLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Áp dụng"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Summary */}
              {selectedSlots.length > 0 && (
                <BookingSummary
                  fieldPrice={fieldPrice}
                  servicePrice={servicePrice}
                  discountAmount={discount}
                  totalPrice={totalPrice}
                  depositAmount={depositAmount}
                />
              )}

              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={selectedSlots.length === 0 || submitLoading}
                onClick={handleSubmit}
              >
                {submitLoading && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Đặt sân và thanh toán
              </Button>
              {!isAuthenticated && selectedSlots.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Bạn cần đăng nhập để hoàn tất đặt sân.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>
    </>
  );
}

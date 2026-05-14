"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FIELD_IMAGE_URL, formatCurrency } from "@/lib/utils";
import type { Field, Price } from "@/types";
import { FieldType } from "@/types";

const TYPE_LABEL: Record<FieldType | string, string> = {
  [FieldType.FIVE_A_SIDE]: "Sân 5",
  [FieldType.SEVEN_A_SIDE]: "Sân 7",
  [FieldType.ELEVEN_A_SIDE]: "Sân 11",
};

export interface FieldCardField extends Field {
  prices?: Price[];
  surface?: string;
  primaryImage?: string;
}

export function FieldCard({ field }: { field: FieldCardField }) {
  const image = FIELD_IMAGE_URL;

  const prices = field.prices ?? [];
  const minPrice = prices.length
    ? Math.min(...prices.map((p) => p.pricePerHour))
    : field.basePrice;

  return (
    <Link href={`/fields/${field.id}`} className="group block">
      <Card className="overflow-hidden py-0 pb-5 transition-shadow group-hover:shadow-lg">
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
          <Image
            src={image}
            alt={field.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 backdrop-blur"
          >
            {TYPE_LABEL[field.type] ?? "Sân bóng"}
          </Badge>
        </div>
        <CardContent className="space-y-2 px-4 pt-4 sm:px-6">
          <h3 className="line-clamp-1 text-base font-semibold group-hover:text-primary sm:text-lg">
            {field.name}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {field.surface && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {field.surface}
              </span>
            )}
            {field.address && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="line-clamp-1">{field.address}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
            <div>
              <p className="text-xs text-muted-foreground">Giá từ</p>
              <p className="text-sm font-semibold text-primary sm:text-base">
                {formatCurrency(minPrice ?? 0)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / giờ
                </span>
              </p>
            </div>
            <span className="text-xs font-medium text-primary group-hover:underline">
              Xem chi tiết →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default FieldCard;

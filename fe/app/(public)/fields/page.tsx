"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldCard, type FieldCardField } from "@/components/booking/FieldCard";

import { fieldsApi } from "@/lib/api/fields.api";
import { FieldType, type PaginatedResponse } from "@/types";

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tất cả loại sân" },
  { value: FieldType.FIVE_A_SIDE, label: "Sân 5 người" },
  { value: FieldType.SEVEN_A_SIDE, label: "Sân 7 người" },
  { value: FieldType.ELEVEN_A_SIDE, label: "Sân 11 người" },
];

export default function FieldsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const query = useQuery({
    queryKey: ["fields", typeFilter, appliedSearch],
    queryFn: async () => {
      const res = await fieldsApi.list({
        type: typeFilter === "ALL" ? undefined : typeFilter,
        search: appliedSearch || undefined,
        page: 1,
        limit: 24,
      });
      return res as unknown as PaginatedResponse<FieldCardField>;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const items = query.data?.items ?? [];

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Danh sách sân bóng
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Khám phá các sân chất lượng, kiểm tra lịch trống và đặt sân ngay.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Loại sân" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative w-full flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Tìm theo tên sân hoặc địa chỉ..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full sm:w-32">
                Tìm
              </Button>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {query.isLoading ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-4/3 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : query.isError ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center sm:p-12">
              <p className="text-sm text-muted-foreground">
                Không thể tải danh sách sân. Vui lòng thử lại sau.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center sm:p-12">
              <p className="font-medium">Không tìm thấy sân phù hợp</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hãy thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((f) => (
                <FieldCard key={f.id} field={f} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

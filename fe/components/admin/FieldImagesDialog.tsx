"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, ImageOff } from "lucide-react";
import { AxiosError } from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { fieldsApi, type FieldDetail } from "@/lib/api/fields.api";

interface FieldImagesDialogProps {
  fieldId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FilePreview {
  file: File;
  url: string;
  isPrimary: boolean;
}

export function FieldImagesDialog({
  fieldId,
  open,
  onOpenChange,
}: FieldImagesDialogProps) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);

  const fieldQuery = useQuery({
    queryKey: ["admin-field", fieldId],
    queryFn: async () =>
      (await fieldsApi.getById(fieldId!)) as unknown as FieldDetail,
    enabled: open && !!fieldId,
  });

  useEffect(() => {
    if (!open) {
      pending.forEach((p) => URL.revokeObjectURL(p.url));
      setPending([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: FilePreview[] = [];
    Array.from(files).forEach((file) => {
      next.push({
        file,
        url: URL.createObjectURL(file),
        isPrimary: false,
      });
    });
    setPending((prev) => [...prev, ...next]);
  };

  const togglePrimary = (idx: number) => {
    setPending((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, isPrimary: !p.isPrimary } : { ...p, isPrimary: false },
      ),
    );
  };

  const removePending = (idx: number) => {
    setPending((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].url);
      next.splice(idx, 1);
      return next;
    });
  };

  const handleUpload = async () => {
    if (!fieldId || pending.length === 0) return;
    setUploading(true);
    try {
      for (const p of pending) {
        await fieldsApi.uploadImage(fieldId, p.file, p.isPrimary);
      }
      toast.success(`Đã tải lên ${pending.length} ảnh`);
      setPending([]);
      await qc.invalidateQueries({ queryKey: ["admin-field", fieldId] });
      await qc.invalidateQueries({ queryKey: ["admin-fields"] });
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(axErr.response?.data?.message || "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!fieldId) return;
    if (!confirm("Xóa ảnh này?")) return;
    try {
      await fieldsApi.deleteImage(fieldId, imageId);
      toast.success("Đã xóa ảnh");
      await qc.invalidateQueries({ queryKey: ["admin-field", fieldId] });
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(axErr.response?.data?.message || "Xóa thất bại");
    }
  };

  const detail = fieldQuery.data;
  const existingImages = detail?.images ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Quản lý ảnh sân {detail?.name ?? ""}</DialogTitle>
          <DialogDescription>
            Tải ảnh lên, đánh dấu ảnh chính, hoặc xóa ảnh hiện có.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="upload-input" className="mb-2 block">
              Tải ảnh mới
            </Label>
            <Input
              id="upload-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {pending.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                Xem trước ({pending.length})
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {pending.map((p, idx) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <div key={idx} className="group relative overflow-hidden rounded-md border">
                    <img
                      src={p.url}
                      alt={`preview-${idx}`}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <label className="flex items-center gap-1 text-xs text-white">
                        <input
                          type="checkbox"
                          checked={p.isPrimary}
                          onChange={() => togglePrimary(idx)}
                        />
                        Ảnh chính
                      </label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="xs"
                        onClick={() => removePending(idx)}
                      >
                        Bỏ
                      </Button>
                    </div>
                    {p.isPrimary && (
                      <Badge className="absolute left-1 top-1">Chính</Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                className="mt-3"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                Tải lên
              </Button>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Ảnh hiện có</p>
            {fieldQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            ) : existingImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-sm text-muted-foreground">
                <ImageOff className="mb-1 size-6" />
                Chưa có ảnh nào
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {existingImages.map((url, idx) => {
                  // BE returns `{id, fieldId, imageUrl, isPrimary}`. Older
                  // shapes used `{url}` or a plain string. Handle all three.
                  const obj = typeof url === "object" && url !== null
                    ? (url as { id?: string; imageUrl?: string; url?: string; isPrimary?: boolean })
                    : null;
                  const imageId = obj?.id ?? String(idx);
                  const src =
                    typeof url === "string"
                      ? url
                      : obj?.imageUrl ?? obj?.url ?? "";
                  const isPrimary = obj?.isPrimary ?? false;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <div
                      key={imageId ?? idx}
                      className="group relative overflow-hidden rounded-md border"
                    >
                      <img
                        src={src}
                        alt={`field-${idx}`}
                        className="aspect-square w-full object-cover"
                      />
                      {isPrimary && (
                        <Badge className="absolute left-1 top-1">Chính</Badge>
                      )}
                      {imageId && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => handleDeleteImage(imageId)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FieldImagesDialog;

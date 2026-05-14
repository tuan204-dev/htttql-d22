import { api, apiClient } from "./axios";
import type {
  Field,
  PaginatedResponse,
  PaginationParams,
  Price,
  Review,
} from "@/types";

export interface FieldListParams extends PaginationParams {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AvailabilityParams {
  date: string; // yyyy-MM-dd
  startTime?: string;
  endTime?: string;
}

/**
 * Slot returned by GET /fields/:id/availability.
 * Each slot represents a 30-minute window.
 */
export interface AvailabilitySlot {
  slotStart: string; // "HH:mm"
  slotEnd: string; // "HH:mm"
  available: boolean;
}

/**
 * Detailed field response — includes images and price tiers.
 */
export interface FieldDetail extends Field {
  images?: string[];
  prices?: Price[];
  reviews?: Review[];
  openTime?: string; // "HH:mm"
  closeTime?: string; // "HH:mm"
  surface?: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface FieldImage {
  id: string;
  fieldId: string;
  url: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface CreateFieldPayload {
  name: string;
  type: string;
  surface?: string;
  description?: string;
  status?: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
  basePrice?: number;
  capacity?: number;
}

export const fieldsApi = {
  list: (params?: FieldListParams) =>
    api.get<PaginatedResponse<Field>>("/fields", { params }),
  getById: (id: string) => api.get<FieldDetail>(`/fields/${id}`),
  getAvailability: (id: string, params: AvailabilityParams) =>
    api.get<AvailabilitySlot[]>(`/fields/${id}/availability`, { params }),
  create: (payload: CreateFieldPayload | Partial<Field>) =>
    api.post<Field>("/fields", payload),
  update: (id: string, payload: Partial<Field> | Partial<CreateFieldPayload>) =>
    api.patch<Field>(`/fields/${id}`, payload),
  delete: (id: string) => api.delete<{ success: true }>(`/fields/${id}`),
  uploadImage: async (id: string, file: File, isPrimary?: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    if (isPrimary !== undefined) {
      formData.append("isPrimary", String(isPrimary));
    }
    const res = await apiClient.post<FieldImage>(
      `/fields/${id}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
  deleteImage: (fieldId: string, imageId: string) =>
    api.delete<{ success: true }>(`/fields/${fieldId}/images/${imageId}`),
};

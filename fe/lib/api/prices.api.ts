import { api } from "./axios";
import type { PaginatedResponse, PaginationParams, Price } from "@/types";

export interface PriceListParams extends PaginationParams {
  fieldId?: string;
}

export interface CreatePricePayload {
  fieldId: string;
  dayType?: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
}

export const pricesApi = {
  list: (params?: PriceListParams) =>
    api.get<PaginatedResponse<Price>>("/prices", { params }),
  listByField: (fieldId: string) =>
    api.get<Price[]>(`/fields/${fieldId}/prices`),
  getById: (id: string) => api.get<Price>(`/prices/${id}`),
  create: (payload: CreatePricePayload | Partial<Price>) =>
    api.post<Price>("/prices", payload),
  createForField: (fieldId: string, payload: Omit<CreatePricePayload, "fieldId">) =>
    api.post<Price>(`/fields/${fieldId}/prices`, payload),
  update: (id: string, payload: Partial<Price>) =>
    api.patch<Price>(`/prices/${id}`, payload),
  delete: (id: string) => api.delete<{ success: true }>(`/prices/${id}`),
};

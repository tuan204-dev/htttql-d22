import { api } from "./axios";
import type { PaginatedResponse, PaginationParams, Service } from "@/types";

export interface ServiceListParams extends PaginationParams {
  isActive?: boolean;
  search?: string;
}

export const servicesApi = {
  list: (params?: ServiceListParams) =>
    api.get<PaginatedResponse<Service>>("/services", { params }),
  getById: (id: string) => api.get<Service>(`/services/${id}`),
  create: (payload: Partial<Service>) =>
    api.post<Service>("/services", payload),
  update: (id: string, payload: Partial<Service>) =>
    api.patch<Service>(`/services/${id}`, payload),
  delete: (id: string) => api.delete<{ success: true }>(`/services/${id}`),
};

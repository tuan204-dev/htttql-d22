import { api } from "./axios";
import type {
  PaginatedResponse,
  PaginationParams,
  Promotion,
} from "@/types";

export interface PromotionListParams extends PaginationParams {
  isActive?: boolean;
  search?: string;
  all?: boolean;
  page?: number;
  limit?: number;
}

export const promotionsApi = {
  list: (params?: PromotionListParams) =>
    api.get<PaginatedResponse<Promotion>>("/promotions", { params }),
  getById: (id: string) => api.get<Promotion>(`/promotions/${id}`),
  getByCode: (code: string) =>
    api.get<Promotion>(`/promotions/code/${encodeURIComponent(code)}`),
  validate: (code: string, amount: number) =>
    api.post<{ valid: boolean; discountAmount: number; promotion?: Promotion }>(
      "/promotions/validate",
      { code, amount },
    ),
  create: (payload: Partial<Promotion>) =>
    api.post<Promotion>("/promotions", payload),
  update: (id: string, payload: Partial<Promotion>) =>
    api.patch<Promotion>(`/promotions/${id}`, payload),
  delete: (id: string) => api.delete<{ success: true }>(`/promotions/${id}`),
};

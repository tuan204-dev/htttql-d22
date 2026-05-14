import { api } from "./axios";
import type {
  PaginatedResponse,
  PaginationParams,
  Review,
} from "@/types";

export interface ReviewListParams extends PaginationParams {
  fieldId?: string;
  customerId?: string;
  rating?: number;
}

export interface CreateReviewPayload {
  bookingId: string;
  /**
   * Optional: the backend can derive fieldId from bookingId.
   */
  fieldId?: string;
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  /**
   * BE only exposes `GET /fields/:fieldId/reviews` — there is no flat
   * `GET /reviews` index. When a fieldId is supplied (the only useful case
   * in practice) we route there; otherwise we return an empty page.
   */
  list: (params?: ReviewListParams) => {
    if (params?.fieldId) {
      const { fieldId, ...rest } = params;
      return api.get<Review[] | PaginatedResponse<Review>>(
        `/fields/${fieldId}/reviews`,
        { params: rest },
      );
    }
    // Fallback: BE has no flat list endpoint; return an empty result shape.
    return Promise.resolve({
      items: [] as Review[],
      total: 0,
      page: 1,
      limit: 0,
      totalPages: 0,
    } as unknown as PaginatedResponse<Review>);
  },
  listByField: (fieldId: string, params?: Omit<ReviewListParams, "fieldId">) =>
    api.get<Review[] | PaginatedResponse<Review>>(
      `/fields/${fieldId}/reviews`,
      { params },
    ),
  create: (payload: CreateReviewPayload) =>
    api.post<Review>("/reviews", payload),
  delete: (id: string) => api.delete<{ success: true }>(`/reviews/${id}`),
};

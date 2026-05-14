import { api } from "./axios";
import type {
  PaginatedResponse,
  PaginationParams,
  User,
  UserRole,
  UserStatus,
} from "@/types";

export interface UserListParams extends PaginationParams {
  role?: UserRole | string;
  status?: UserStatus | string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserPayload {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const usersApi = {
  list: (params?: UserListParams) =>
    api.get<PaginatedResponse<User>>("/users", { params }),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  create: (payload: Partial<User> & { password?: string }) =>
    api.post<User>("/users", payload),
  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<User>(`/users/${id}`, payload),
  delete: (id: string) => api.delete<{ success: true }>(`/users/${id}`),
  updateMe: (payload: UpdateUserPayload) =>
    api.patch<User>("/users/me", payload),
  changePassword: (payload: ChangePasswordPayload) =>
    api.patch<{ success: true }>("/users/me/password", payload),
};

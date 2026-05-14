import { api } from "./axios";
import type { AuthData, LoginPayload, RegisterPayload, User } from "@/types";

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthData>("/auth/login", payload),
  register: (payload: RegisterPayload) =>
    api.post<AuthData>("/auth/register", payload),
  logout: () => api.post<{ success: true }>("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      refreshToken,
    }),
};

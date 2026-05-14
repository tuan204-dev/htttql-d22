import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { getAccessToken, getRefreshToken, useAuthStore } from "@/lib/store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

// ----- Request interceptor: attach Bearer token + normalize query params -----
//
// Several FE call sites use param names / formats that don't match the BE
// DTOs. Rather than touch every call site, we translate transparently here.
// ValidationPipe(forbidNonWhitelisted) would otherwise 400 on any unknown key.
//
//   pageSize → limit
//   from     → fromDate   (and trim ISO datetime to YYYY-MM-DD)
//   to       → toDate     (same)
const toIsoDate = (v: unknown): unknown => {
  if (typeof v !== "string" || v.length === 0) return v;
  // Accept either 'YYYY-MM-DD' (pass through) or any ISO date/datetime → take date portion.
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : v;
};

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  if (config.params && typeof config.params === "object") {
    const p = config.params as Record<string, unknown>;
    if ("pageSize" in p && !("limit" in p)) {
      p.limit = p.pageSize;
      delete p.pageSize;
    }
    // `/bookings` DTO uses `fromDate`/`toDate`. `/reports/*` DTO uses `from`/`to`.
    // Only rename when targeting bookings.
    const url = config.url ?? "";
    const isBookings = /\/bookings(?:\?|$|\/)/.test(url);
    if (isBookings) {
      if ("from" in p && !("fromDate" in p)) {
        p.fromDate = toIsoDate(p.from);
        delete p.from;
      }
      if ("to" in p && !("toDate" in p)) {
        p.toDate = toIsoDate(p.to);
        delete p.to;
      }
    }
    // Always strip time portion if caller passed ISO datetime.
    if ("from" in p) p.from = toIsoDate(p.from);
    if ("to" in p) p.to = toIsoDate(p.to);
    if ("fromDate" in p) p.fromDate = toIsoDate(p.fromDate);
    if ("toDate" in p) p.toDate = toIsoDate(p.toDate);
  }
  return config;
});

// ----- Refresh-token single-flight -----
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const rt = getRefreshToken();
  if (!rt) return null;

  refreshPromise = (async () => {
    try {
      // Use a bare axios call so we don't trigger our own interceptors.
      const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
        `${API_URL}/auth/refresh`,
        { refreshToken: rt },
        { headers: { "Content-Type": "application/json" } },
      );
      const body = res.data;
      const tokens = body?.data;
      if (!tokens?.accessToken) return null;

      const state = useAuthStore.getState();
      if (state.user) {
        state.setAuth({
          user: state.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? rt,
        });
      }
      return tokens.accessToken;
    } catch {
      useAuthStore.getState().logout();
      return null;
    } finally {
      // Allow another refresh later
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

// ----- Response interceptor: unwrap envelope, normalize pagination, handle 401 -----
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown> | unknown;
    if (
      body &&
      typeof body === "object" &&
      "success" in (body as Record<string, unknown>) &&
      "data" in (body as Record<string, unknown>)
    ) {
      response.data = (body as ApiEnvelope<unknown>).data;
    }

    // BE paginated shape is `{ data: T[], meta: { page, limit, total, totalPages } }`.
    // FE consumers expect `{ items: T[], page, pageSize, total, totalPages }`.
    // Normalize so list pages can keep reading `.items` / `.totalPages`.
    const inner = response.data as Record<string, unknown> | unknown;
    if (
      inner &&
      typeof inner === "object" &&
      !Array.isArray(inner) &&
      Array.isArray((inner as { data?: unknown }).data) &&
      typeof (inner as { meta?: unknown }).meta === "object" &&
      (inner as { meta?: Record<string, unknown> }).meta !== null
    ) {
      const obj = inner as { data: unknown[]; meta: Record<string, unknown> };
      response.data = {
        items: obj.data,
        page: obj.meta.page,
        pageSize: obj.meta.limit ?? obj.meta.pageSize,
        limit: obj.meta.limit ?? obj.meta.pageSize,
        total: obj.meta.total,
        totalPages: obj.meta.totalPages,
      };
    }

    return response;
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        // headers may be AxiosHeaders instance
        if (typeof (original.headers as { set?: unknown }).set === "function") {
          (original.headers as unknown as { set: (k: string, v: string) => void }).set(
            "Authorization",
            `Bearer ${newToken}`,
          );
        } else {
          (original.headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
        }
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Typed helpers that already return the unwrapped `data` payload.
 * The response interceptor rewrites `response.data` to the envelope's `data`,
 * so we just need to surface that here.
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config).then((r) => r.data as T),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config).then((r) => r.data as T),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config).then((r) => r.data as T),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.patch(url, data, config).then((r) => r.data as T),
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then((r) => r.data as T),
};

export default apiClient;

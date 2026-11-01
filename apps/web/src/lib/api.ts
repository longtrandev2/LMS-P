/**
 * Fetch wrapper — base URL từ VITE_API_URL, Bearer token từ auth store,
 * parse envelope lỗi {error:{code,message}} → ApiError.
 * 401: thử refresh đúng 1 lần rồi retry; thất bại → clear session → /login.
 */
import { useAuthStore } from "@/stores/auth";

/**
 * Chuẩn hoá base URL: chấp nhận env có hoặc không có hậu tố "/api/v1"
 * (vd "http://localhost:8000" và "http://localhost:8000/api/v1" đều đúng —
 * tránh double-prefix /api/v1/api/v1 hoặc thiếu tiền tố).
 */
function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api/v1")) url = `${url}/api/v1`;
  return url;
}

const BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"
);

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface Envelope {
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "INTERNAL";
  let message = "Đã có lỗi không xác định. Vui lòng thử lại.";
  let details: Record<string, unknown> | undefined;
  try {
    const body = (await res.json()) as Envelope;
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    /* body không phải JSON — giữ mặc định theo status */
  }
  if (!res.ok && code === "INTERNAL") {
    if (res.status === 429) {
      code = "RATE_LIMITED";
      message = "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    } else if (res.status === 401) {
      code = "UNAUTHENTICATED";
      message = "Phiên đăng nhập không hợp lệ.";
    }
  }
  return new ApiError(code, message, res.status, details);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw await parseError(res);
    const data = await res.json();
    setSession(data);
    return data.access_token as string;
  } catch {
    clearSession();
    return null;
  }
}

async function refreshOnce(): Promise<string | null> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** FormData — truyền thẳng, không set Content-Type */
  form?: FormData;
  query?: Record<string, string | number | undefined | null>;
  /** Bỏ qua attach token (login, refresh) */
  anonymous?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, query, anonymous, signal, headers: extraHeaders } = options;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (!anonymous && token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (extraHeaders) Object.assign(headers, extraHeaders);
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  };

  let token = anonymous ? null : useAuthStore.getState().accessToken;
  let res = await doFetch(token);

  // 401 & chưa anonymous & request không phải refresh → thử rotate token 1 lần
  if (res.status === 401 && !anonymous) {
    const newToken = await refreshOnce();
    if (newToken) {
      token = newToken;
      res = await doFetch(token);
    } else {
      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // Ngoài cây React — reset toàn bộ state client là chủ đích, không phụ thuộc router UI
        // Navigate after session expiry outside React component context.
        window.location.assign("/login");
      }
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * GET trả về blob (tải học liệu…) — giữ cùng flow auth + refresh 1 lần như request().
 * Filename lấy từ Content-Disposition nếu server gửi.
 */
async function requestBlob(path: string, query?: RequestOptions["query"]): Promise<{ blob: Blob; filename: string | null }> {
  const doFetch = (token: string | null): Promise<Response> =>
    fetch(buildUrl(path, query), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  const token = useAuthStore.getState().accessToken;
  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await refreshOnce();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      useAuthStore.getState().clearSession();
    }
  }

  if (!res.ok) throw await parseError(res);

  const disposition = res.headers.get("content-disposition") ?? "";
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = utf8 ? decodeURIComponent(utf8[1]) : plain ? plain[1] : null;
  return { blob: await res.blob(), filename };
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, opts?: Partial<RequestOptions>) =>
    request<T>(path, { method: "POST", body, ...opts }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", form }),
  download: (path: string, query?: RequestOptions["query"]) => requestBlob(path, query),
};

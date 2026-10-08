const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";
const TOKEN_KEY = "dd_token";

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
  },
};

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  query?: Query;
  signal?: AbortSignal;
}

const qs = (query?: Query) => {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "" || v === "all") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

const buildHeaders = (json: boolean): HeadersInit => {
  const h: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
};

const failure = async (res: Response): Promise<never> => {
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }

  // A rejected admin token means the session is over — let the app react once.
  if (res.status === 401 && tokenStore.get()) {
    tokenStore.clear();
    window.dispatchEvent(new Event("dd:unauthorized"));
  }
  throw new ApiError(data?.message || res.statusText || "Request failed", res.status, data);
};

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, form, query, signal } = opts;
  const res = await fetch(`${BASE}${path}${qs(query)}`, {
    method,
    signal,
    headers: buildHeaders(body !== undefined && !form),
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  if (!res.ok) return failure(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Fires a request whose result is irrelevant (impressions, clicks, shares). */
export const beacon = (path: string, body?: unknown) => {
  fetch(`${BASE}${path}`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).catch(() => {});
};

/** Authenticated file download (xlsx exports need the bearer header). */
export async function download(path: string, fallbackName: string, query?: Query) {
  const res = await fetch(`${BASE}${path}${qs(query)}`, { headers: buildHeaders(false) });
  if (!res.ok) return failure(res);

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = match?.[1] || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

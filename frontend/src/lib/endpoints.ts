/*
 * One function per backend route, grouped by router. The backend mixes three
 * response shapes (bare array/document, { success, data }, { success, data,
 * pagination }); each wrapper normalises to what the UI actually wants.
 */
import { api, download } from "./api";
import type {
  Ad, AdminUser, Article, ArticleStatus, Category, Contact, DashboardStats, Homepage,
  HomeFeed, ImportJob, MediaItem, Paged, Pagination, Subscriber, Tag,
} from "./types";

type Q = Record<string, string | number | boolean | undefined | null>;
const unwrap = <T,>(r: { data: T }) => r.data;

/* ---------------- auth ---------------- */
export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; admin: AdminUser }>("/auth/login", { method: "POST", body: { email, password } }),
};

/* ---------------- news ---------------- */
export interface NewsQuery extends Q {
  page?: number; limit?: number; sort?: string; search?: string; category?: string;
  subCategory?: string; tag?: string; status?: string; author?: string; language?: string;
  country?: string; region?: string; destination?: string; featured?: boolean | string;
  trending?: boolean | string; popular?: boolean | string; breaking?: boolean | string;
  editorsPick?: boolean | string; dateFrom?: string; dateTo?: string; exclude?: string;
}

export interface Facets {
  regions: string[]; countries: string[]; languages: string[]; authors: string[]; destinations: string[];
}

export const newsApi = {
  list: (query: NewsQuery) => api<Paged<Article> & { success: boolean }>("/news/list", { query }),
  legacy: (query: Q = {}) => api<Article[]>("/news", { query }),
  search: (q: string, limit = 8, signal?: AbortSignal) =>
    api<{ data: Article[] }>("/news/search", { query: { q, limit }, signal }).then(unwrap),
  homeFeed: () => api<{ data: HomeFeed }>("/news/homefeed").then(unwrap),
  facets: () => api<{ data: Facets }>("/news/facets").then(unwrap),
  related: (slug: string, limit = 6) =>
    api<{ data: Article[] }>(`/news/related/${encodeURIComponent(slug)}`, { query: { limit } }).then(unwrap),
  bySlug: (slug: string) => api<Article>(`/news/${encodeURIComponent(slug)}`),
  byId: (id: string) => api<Article>(`/news/id/${id}`),

  like: (slug: string, unlike = false) =>
    api<{ likes: number }>(`/news/${encodeURIComponent(slug)}/like`, { method: "POST", body: { unlike } }),
  share: (slug: string) =>
    api<{ shareCount: number }>(`/news/${encodeURIComponent(slug)}/share`, { method: "POST", body: {} }),

  create: (body: Partial<Article> & Record<string, unknown>) => api<Article>("/news", { method: "POST", body }),
  updateById: (id: string, body: Partial<Article> & Record<string, unknown>) =>
    api<Article>(`/news/id/${id}`, { method: "PUT", body }),
  updateBySlug: (slug: string, body: Record<string, unknown>) =>
    api<Article>(`/news/${encodeURIComponent(slug)}`, { method: "PUT", body }),
  changeStatus: (id: string, status: ArticleStatus) =>
    api<{ data: Article }>(`/news/${id}/status`, { method: "PATCH", body: { status } }),
  duplicate: (id: string) => api<{ data: Article }>(`/news/${id}/duplicate`, { method: "POST" }),
  restore: (id: string, status = "draft") =>
    api<{ data: Article }>(`/news/${id}/restore`, { method: "POST", body: { status } }),
  trash: (id: string) => api<{ message: string }>(`/news/${id}/trash`, { method: "POST" }),
  remove: (id: string) => api<{ message: string }>(`/news/${id}`, { method: "DELETE" }),

  bulkStatus: (ids: string[], status: ArticleStatus) =>
    api("/news/bulk/status", { method: "POST", body: { ids, status } }),
  bulkCategory: (ids: string[], category: string, subCategory?: string | null) =>
    api("/news/bulk/category", { method: "POST", body: { ids, category, subCategory } }),
  bulkTags: (ids: string[], tags: string[], mode: "add" | "replace" | "remove") =>
    api("/news/bulk/tags", { method: "POST", body: { ids, tags, mode } }),
  bulkFlags: (ids: string[], flags: Record<string, boolean>) =>
    api("/news/bulk/flags", { method: "POST", body: { ids, flags } }),
  bulkDelete: (ids: string[], hard = false) =>
    api("/news/bulk/delete", { method: "POST", body: { ids, hard } }),
};

/* ---------------- categories ---------------- */
export const categoryApi = {
  list: (query: Q = {}) => api<Category[]>("/categories", { query }),
  tree: (status?: "all") => api<{ data: Category[] }>("/categories/tree", { query: { status } }).then(unwrap),
  get: (idOrSlug: string) =>
    api<{ data: Category & { children: Category[]; articleCount: number } }>(
      `/categories/${encodeURIComponent(idOrSlug)}`
    ).then(unwrap),
  create: (body: Partial<Category>) => api<Category>("/categories", { method: "POST", body }),
  update: (id: string, body: Partial<Category>) => api<Category>(`/categories/${id}`, { method: "PUT", body }),
  visibility: (id: string, body: Partial<Category> = {}) =>
    api<{ data: Category }>(`/categories/${id}/visibility`, { method: "PATCH", body }),
  reorder: (items: { id: string; order: number; parent?: string | null }[]) =>
    api("/categories/reorder", { method: "POST", body: { items } }),
  remove: (id: string, opts: { force?: boolean; moveTo?: string } = {}) =>
    api<{ message: string }>(`/categories/${id}`, {
      method: "DELETE",
      query: { force: opts.force ? "true" : undefined, moveTo: opts.moveTo },
    }),
};

/* ---------------- tags ---------------- */
export const tagApi = {
  list: (query: Q = {}) =>
    api<{ data: Tag[]; pagination: Pagination }>("/tags", { query }),
  get: (idOrSlug: string) => api<{ data: Tag }>(`/tags/${encodeURIComponent(idOrSlug)}`).then(unwrap),
  create: (body: Partial<Tag>) => api<{ data: Tag }>("/tags", { method: "POST", body }).then(unwrap),
  update: (id: string, body: Partial<Tag>) => api<{ data: Tag }>(`/tags/${id}`, { method: "PUT", body }).then(unwrap),
  remove: (id: string) => api("/tags/" + id, { method: "DELETE" }),
  merge: (sourceIds: string[], targetId: string) =>
    api("/tags/merge", { method: "POST", body: { sourceIds, targetId } }),
  recount: () => api<{ message: string }>("/tags/recount", { method: "POST" }),
  bulkDelete: (ids: string[]) => api("/tags/bulk-delete", { method: "POST", body: { ids } }),
};

/* ---------------- homepage ---------------- */
export const homepageApi = {
  get: () => api<Homepage>("/homepage"),
  update: (body: Record<string, unknown>) => api("/homepage", { method: "PUT", body }),
};

/* ---------------- dashboard / auto news ---------------- */
export const dashboardApi = { get: () => api<DashboardStats>("/dashboard") };
export const autoNewsApi = { run: () => api<{ message: string; count: number }>("/auto-news/run", { method: "POST" }) };

/* ---------------- contact ---------------- */
export const contactApi = {
  create: (body: { name: string; email: string; subject?: string; message: string }) =>
    api<Contact>("/contact", { method: "POST", body }),
  list: () => api<Contact[]>("/contact"),
  reply: (id: string, message: string) => api<Contact>(`/contact/reply/${id}`, { method: "PUT", body: { message } }),
  remove: (id: string) => api(`/contact/${id}`, { method: "DELETE" }),
};

/* ---------------- newsletter ---------------- */
export const newsletterApi = {
  subscribe: (email: string, source = "website", name?: string) =>
    api<{ message: string }>("/newsletter/subscribe", { method: "POST", body: { email, source, name } }),
  unsubscribe: (email: string) => api<{ message: string }>("/newsletter/unsubscribe", { method: "POST", body: { email } }),
  list: (query: Q = {}) =>
    api<{ data: Subscriber[]; stats: { active: number }; pagination: Pagination }>("/newsletter", { query }),
  remove: (id: string) => api(`/newsletter/${id}`, { method: "DELETE" }),
};

/* ---------------- ads ---------------- */
export const adsApi = {
  serve: (query: { position: string; device?: string; category?: string }) =>
    api<{ data: Ad[] }>("/ads/serve", { query }).then(unwrap),
  list: (query: Q = {}) => api<{ data: Ad[]; positions: string[] }>("/ads", { query }),
  create: (body: Record<string, unknown>) => api<{ data: Ad }>("/ads", { method: "POST", body }).then(unwrap),
  update: (id: string, body: Record<string, unknown>) =>
    api<{ data: Ad }>(`/ads/${id}`, { method: "PUT", body }).then(unwrap),
  remove: (id: string) => api(`/ads/${id}`, { method: "DELETE" }),
};

/* ---------------- media ---------------- */
export const mediaApi = {
  list: (query: Q = {}) => api<{ data: MediaItem[]; pagination: Pagination }>("/media", { query }),
  folders: () => api<{ data: { name: string; count: number }[] }>("/media/folders").then(unwrap),
  get: (id: string) => api<{ data: MediaItem }>(`/media/${id}`).then(unwrap),
  upload: (file: File, extra: Record<string, string> = {}) => {
    const form = new FormData();
    Object.entries(extra).forEach(([k, v]) => form.append(k, v)); // fields before the file so multer sees them
    form.append("file", file);
    return api<{ data: MediaItem }>("/media/upload", { method: "POST", form }).then(unwrap);
  },
  uploadMany: (files: File[], extra: Record<string, string> = {}) => {
    const form = new FormData();
    Object.entries(extra).forEach(([k, v]) => form.append(k, v));
    files.forEach((f) => form.append("files", f));
    return api<{ data: MediaItem[]; count: number }>("/media/upload-multiple", { method: "POST", form });
  },
  register: (body: Partial<MediaItem> & { url: string }) =>
    api<{ data: MediaItem }>("/media/register", { method: "POST", body }).then(unwrap),
  update: (id: string, body: Partial<MediaItem>) =>
    api<{ data: MediaItem }>(`/media/${id}`, { method: "PUT", body }).then(unwrap),
  replace: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<{ data: MediaItem }>(`/media/${id}/replace`, { method: "PUT", form }).then(unwrap);
  },
  remove: (id: string) => api(`/media/${id}`, { method: "DELETE" }),
  bulkDelete: (ids: string[]) => api("/media/bulk-delete", { method: "POST", body: { ids } }),
};

/* ---------------- import / export ---------------- */
export const importApi = {
  sample: () => download("/import/sample", "driftdine-article-import-template.xlsx"),
  export: (query: Q = {}) => download("/import/export", "driftdine-articles.xlsx", query),
  history: (limit = 25) => api<{ data: ImportJob[] }>("/import/history", { query: { limit } }).then(unwrap),
  validate: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<{ data: ImportJob }>("/import/validate", { method: "POST", form }).then(unwrap);
  },
  run: (file: File, opts: { mode: "create" | "upsert"; skipInvalid: boolean }) => {
    const form = new FormData();
    form.append("mode", opts.mode);
    form.append("skipInvalid", String(opts.skipInvalid));
    form.append("file", file);
    return api<{ async: boolean; batchId: string; totalRows?: number; data?: ImportJob; message?: string }>(
      "/import/run", { method: "POST", form }
    );
  },
  status: (batchId: string) => api<{ data: ImportJob }>(`/import/${batchId}`).then(unwrap),
  rollback: (batchId: string) =>
    api<{ message: string; warning?: string }>(`/import/${batchId}/rollback`, { method: "POST" }),
};

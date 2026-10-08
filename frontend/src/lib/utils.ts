import type { Article, Category, ImageRef, Tag } from "./types";

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/**
 * Cloudinary serves any width on demand. Rewriting the delivery URL keeps card
 * images small (and auto-formatted to AVIF/WebP) without a build step.
 */
export function img(url: string | undefined | null, width = 800): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/[^/]*(w_|f_auto|q_auto)/.test(url)) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

export const srcSet = (url: string | undefined | null, widths = [400, 800, 1200]) =>
  url && url.includes("res.cloudinary.com")
    ? widths.map((w) => `${img(url, w)} ${w}w`).join(", ")
    : undefined;

export const imageUrl = (i?: ImageRef | string | null): string =>
  !i ? "" : typeof i === "string" ? i : i.url || i.thumbnailUrl || "";

export const asObj = <T extends object>(v: T | string | null | undefined): T | undefined =>
  v && typeof v === "object" ? v : undefined;

export const catOf = (a: Article): Category | undefined => asObj<Category>(a.category as Category | string);
export const tagsOf = (a: Article): Tag[] => (a.tags || []).filter((t): t is Tag => typeof t === "object");

/** Articles imported before `publishedDate` existed only carry createdAt. */
export const dateOf = (a: Article) => a.publishedDate || a.createdAt || a.updatedAt || "";

export function fmtDate(value?: string | null, style: "short" | "long" | "time" = "short") {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  if (style === "long") return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  if (style === "time") return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(value?: string | null) {
  if (!value) return "";
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (!Number.isFinite(diff)) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(value);
}

export const compact = (n = 0) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const bytes = (n = 0) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
};

export const summary = (a: Article, max = 160) => {
  const text = a.excerpt || a.description || a.shortDescription || "";
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
};

export const articleHref = (a: Pick<Article, "slug">) => `/news/${a.slug}`;
export const categoryHref = (c: Pick<Category, "slug">) => `/category/${c.slug}`;
export const tagHref = (t: Pick<Tag, "slug">) => `/tag/${t.slug}`;

export const isExternal = (href: string) => /^(https?:)?\/\//i.test(href);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => {
  let t: ReturnType<typeof setTimeout>;
  return (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

/** Category icons are free text; only render real emoji (legacy rows hold CSS class names like "fa-solid fa-chip"). */
export const emojiIcon = (v?: string | null) => (v && v.length <= 8 && /\p{Extended_Pictographic}/u.test(v) ? v : "");

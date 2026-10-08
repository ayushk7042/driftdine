import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, Bookmark, Check, ChevronRight, Clock, Eye, Globe2, Heart, Image as ImageIcon, Link2, ListTree, Mail,
  MapPin, ShieldCheck, Sparkles, Tag as TagIcon, Zap, ExternalLink, Star, Flame,
} from "lucide-react";
import { newsApi } from "@/lib/endpoints";
import { ApiError, beacon } from "@/lib/api";
import { AdSlot } from "@/site/AdSlot";
import { NewsletterForm } from "@/site/Newsletter";
import { catStyle } from "@/site/Blocks";
import { ErrorState, Skeleton } from "@/components/ui";
import { NotFound } from "./Static";
import { absoluteUrl, useSeo } from "@/lib/seo";
import { articleHref, asObj, categoryHref, cn, compact, dateOf, fmtDate, img, imageUrl, isExternal, summary, tagsOf } from "@/lib/utils";
import type { Article, ContentBlock, Category } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Toc { id: string; text: string; level: number }

/** Adds ids to h2/h3 so the table of contents can anchor to them. */
function prepareHtml(html: string): { html: string; toc: Toc[] } {
  if (!html || typeof DOMParser === "undefined") return { html, toc: [] };
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html");
  const toc: Toc[] = [];
  const seen = new Set<string>();
  doc.querySelectorAll("h2, h3").forEach((h) => {
    const text = h.textContent?.trim() || "";
    if (!text) return;
    let id = slugify(text) || "section";
    while (seen.has(id)) id += "-2";
    seen.add(id);
    h.id = id;
    toc.push({ id, text, level: h.tagName === "H2" ? 2 : 3 });
  });
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (isExternal(href)) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
  });
  doc.querySelectorAll("img").forEach((i) => {
    i.setAttribute("loading", "lazy"); i.setAttribute("decoding", "async");
    const to = i.getAttribute("data-redirect");
    // An image the editor gave a redirect link becomes a real link (unless it already sits inside one).
    if (to && /^(https?:\/\/|\/)/i.test(to) && !i.closest("a")) {
      const a = doc.createElement("a");
      a.setAttribute("href", to);
      a.setAttribute("rel", "noopener noreferrer nofollow");
      if (i.getAttribute("data-new-tab") !== "0") a.setAttribute("target", "_blank");
      a.className = "block";
      i.replaceWith(a);
      a.appendChild(i);
    }
  });
  return { html: doc.getElementById("r")!.innerHTML, toc };
}

/** Splits rendered HTML so an inline ad can sit after the third paragraph. */
function splitForAd(html: string): [string, string] {
  const marker = "</p>";
  let idx = -1;
  for (let i = 0; i < 3; i++) {
    idx = html.indexOf(marker, idx + 1);
    if (idx === -1) return [html, ""];
  }
  const cut = idx + marker.length;
  return [html.slice(0, cut), html.slice(cut)];
}

const embedUrl = (url: string) => {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = /vimeo\.com\/(\d+)/.exec(url);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" ? (v as Record<string, any>) : {});

/** Legacy articles store ordered blocks instead of one HTML string. */
function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        const v = b.value;
        switch (b.type) {
          case "text":
            return <Fragment key={i}>{str(v).split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}</Fragment>;
          case "html":
            return <div key={i} dangerouslySetInnerHTML={{ __html: str(v) }} />;
          case "image": {
            const o = obj(v);
            const url = typeof v === "string" ? v : o.url;
            return url ? (
              <figure key={i}>
                <LinkedImg link={o.redirectUrl || obj(b.meta).redirectUrl}><img src={img(url, 1200)} alt={o.alt || ""} loading="lazy" decoding="async" /></LinkedImg>
                {(o.caption || obj(b.meta).caption) && <figcaption>{o.caption || obj(b.meta).caption}</figcaption>}
              </figure>
            ) : null;
          }
          case "quote": {
            const o = obj(v);
            return <blockquote key={i}><p>{typeof v === "string" ? v : o.text}</p>{o.author && <footer>— {o.author}</footer>}</blockquote>;
          }
          case "video":
          case "embed": {
            const url = typeof v === "string" ? v : obj(v).url;
            if (!url) return null;
            const e = embedUrl(url);
            return e
              ? <iframe key={i} src={e} title="Embedded video" loading="lazy" allowFullScreen />
              : <p key={i}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>;
          }
          case "link": {
            const o = obj(v);
            const url = typeof v === "string" ? v : o.url;
            return url ? <p key={i}><a href={url} target="_blank" rel="noopener noreferrer">{o.text || o.title || url}</a></p> : null;
          }
          case "affiliate": {
            const o = obj(v);
            return o.link ? <p key={i}><a href={o.link} target="_blank" rel="sponsored noopener noreferrer">{o.buttonText || o.title || "View offer"}</a></p> : null;
          }
          default:
            return null;
        }
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const wrap = "mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-8";

/** Wraps an image in its admin-set redirect link, if any. */
function LinkedImg({ link, newTab, children }: { link?: string; newTab?: boolean; children: React.ReactNode }) {
  if (!link || !/^(https?:\/\/|\/)/i.test(link)) return <>{children}</>;
  const external = isExternal(link);
  return external
    ? <a href={link} target={newTab === false ? undefined : "_blank"} rel="noopener noreferrer nofollow" className="block cursor-pointer">{children}</a>
    : <Link to={link} className="block cursor-pointer">{children}</Link>;
}

const XIcon = () => <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2.2l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20z" /></svg>;
const FbIcon = () => <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.7l.5-3.3h-3.2V8.6c0-1 .4-1.7 1.8-1.7h1.5V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.6H7.2V14H10v8h3.5z" /></svg>;
const InIcon = () => <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5z" /></svg>;

function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden><div className="h-full gradient-brand transition-[width] duration-100" style={{ width: `${p}%` }} /></div>;
}

const Chip = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold", className)} style={style}>{children}</span>
);

function ActionBar({ article }: { article: Article }) {
  const qc = useQueryClient();
  const likeKey = `dd_like_${article.slug}`;
  const saveKey = `dd_save_${article.slug}`;
  const read = (k: string) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
  const [liked, setLiked] = useState(() => read(likeKey));
  const [saved, setSaved] = useState(() => read(saveKey));
  const [likes, setLikes] = useState(article.likes || 0);
  const [copied, setCopied] = useState(false);

  const like = useMutation({ mutationFn: (unlike: boolean) => newsApi.like(article.slug, unlike), onSuccess: (r) => setLikes(r.likes) });
  const toggleLike = () => {
    const next = !liked;
    setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try { localStorage.setItem(likeKey, next ? "1" : "0"); } catch { /* ignore */ }
    like.mutate(!next);
  };
  const toggleSave = () => {
    const next = !saved; setSaved(next);
    try { localStorage.setItem(saveKey, next ? "1" : "0"); } catch { /* ignore */ }
  };

  const url = typeof window !== "undefined" ? window.location.href : "";
  const counted = () => {
    beacon(`/news/${encodeURIComponent(article.slug)}/share`);
    qc.setQueryData<Article>(["article", article.slug], (a) => (a ? { ...a, shareCount: (a.shareCount || 0) + 1 } : a));
  };
  const copy = async () => {
    counted();
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold transition hover:border-brand hover:text-brand";
  const sq = "grid size-10 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-brand hover:text-brand";
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3.5">
      <div className="flex items-center gap-2">
        <button onClick={toggleLike} aria-pressed={liked} className={cn(btn, liked && "border-danger/40 bg-danger/10 text-danger")}>
          <Heart className={cn("size-4", liked && "fill-current")} /> {compact(likes)}
        </button>
        <button onClick={toggleSave} aria-pressed={saved} className={cn(btn, saved && "border-brand bg-brand-soft text-brand")}>
          <Bookmark className={cn("size-4", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Share</span>
        <a className={sq} onClick={counted} target="_blank" rel="noopener noreferrer" aria-label="Share on X" href={`https://twitter.com/intent/tweet?text=${enc(article.title)}&url=${enc(url)}`}><XIcon /></a>
        <a className={sq} onClick={counted} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}><FbIcon /></a>
        <a className={sq} onClick={counted} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}><InIcon /></a>
        <button className={sq} onClick={copy} aria-label="Copy link">{copied ? <Check className="size-4 text-brand" /> : <Link2 className="size-4" />}</button>
      </div>
    </div>
  );
}

function Toc({ toc, collapsible = false }: { toc: Toc[]; collapsible?: boolean }) {
  const [active, setActive] = useState("");
  useEffect(() => {
    if (!toc.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-90px 0px -70% 0px" });
    toc.forEach((t) => { const el = document.getElementById(t.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [toc]);
  if (toc.length < 2) return null;

  const list = (
    <ul className="space-y-0.5 p-2 text-sm">
      {toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
          <a href={`#${t.id}`} className={cn("block rounded-lg px-3 py-2 transition hover:bg-surface-2", active === t.id ? "bg-brand-soft font-semibold text-brand" : "text-muted")}>{t.text}</a>
        </li>
      ))}
    </ul>
  );
  if (collapsible) {
    return (
      <details className="group rounded-2xl border border-line bg-surface shadow-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <ListTree className="size-4 text-brand" /> On this page ({toc.length}) <ChevronRight className="ml-auto size-4 transition group-open:rotate-90" />
        </summary>
        <div className="border-t border-line">{list}</div>
      </details>
    );
  }
  return (
    <nav aria-label="Table of contents" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold"><ListTree className="size-4 text-brand" /> On this page</p>
      {list}
    </nav>
  );
}

const SideCard = ({ title, to, cta, children }: { title: string; to?: string; cta?: string; children: React.ReactNode }) => (
  <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
    <header className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.1em]">{title}</h2>
      {to && <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">{cta || "See all"} <ArrowRight className="size-3.5" /></Link>}
    </header>
    {children}
  </section>
);

function Thumb({ a, className }: { a: Article; className?: string }) {
  const u = a.featuredImage?.url;
  return u
    ? <img src={img(u, 200)} alt="" loading="lazy" decoding="async" className={cn("object-cover", className)} />
    : <span className={cn("hero-ground grid place-items-center", className)}><img src="/mark.webp" alt="" className="size-6 opacity-90" /></span>;
}

function PopularNow() {
  const q = useQuery({ queryKey: ["news", "popular-side"], queryFn: () => newsApi.list({ sort: "popular", limit: 5 }), staleTime: 5 * 60_000 });
  const items = q.data?.data || [];
  if (!items.length) return null;
  return (
    <SideCard title="Popular now" to="/news?sort=popular">
      <ol className="divide-y divide-line px-4">
        {items.map((a, i) => (
          <li key={a._id} className="group relative flex gap-3 py-3">
            <div className="relative shrink-0">
              <Thumb a={a} className="size-[60px] rounded-lg" />
              <span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">{i + 1}</span>
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[0.88rem] font-semibold leading-snug transition group-hover:text-brand"><Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link></h3>
              <p className="mt-1 flex items-center gap-2 text-[11px] text-muted"><span>{fmtDate(dateOf(a))}</span>{!!a.readTime && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{a.readTime} min</span>}</p>
            </div>
          </li>
        ))}
      </ol>
    </SideCard>
  );
}

function MoreInCategory({ cat, exclude }: { cat?: Category; exclude: string }) {
  const q = useQuery({ queryKey: ["news", "more-in", cat?.slug], queryFn: () => newsApi.list({ category: cat!.slug, limit: 5, exclude }), enabled: !!cat, staleTime: 5 * 60_000 });
  const items = q.data?.data || [];
  if (!cat || !items.length) return null;
  const { color } = catStyle(cat);
  return (
    <SideCard title={`More in ${cat.name}`} to={categoryHref(cat)} cta="View">
      <ul className="divide-y divide-line px-4">
        {items.map((a) => (
          <li key={a._id} className="group relative flex gap-3 py-3">
            <Thumb a={a} className="size-[64px] shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold" style={{ color }}>{cat.name}</p>
              <h3 className="line-clamp-2 text-[0.88rem] font-semibold leading-snug transition group-hover:text-brand"><Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link></h3>
              <p className="mt-1 text-[11px] text-muted">{fmtDate(dateOf(a))}{a.readTime ? ` · ${a.readTime} min read` : ""}</p>
            </div>
          </li>
        ))}
      </ul>
    </SideCard>
  );
}

function SideNewsletter() {
  return (
    <section className="on-dark relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-800 via-leaf-700 to-leaf-600 p-5 text-white shadow-card">
      <span aria-hidden className="orb -right-8 -top-8 size-32 bg-leaf-300/30" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15"><Mail className="size-5" /></span>
          <div><h2 className="font-semibold leading-tight">Stay Updated!</h2><p className="text-xs text-white/75">Latest news, reviews and trends in your inbox.</p></div>
        </div>
        <div className="mt-4"><NewsletterForm dark compact source="article-sidebar" /></div>
        <p className="mt-3 text-xs text-white/70">No spam, unsubscribe anytime.</p>
      </div>
    </section>
  );
}

function AuthorCard({ a }: { a: Article }) {
  const au = a.author;
  if (!au?.name) return null;
  const links = Object.entries(au.social || {}).filter(([, v]) => v);
  return (
    <section className="flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:gap-5 sm:p-6" aria-label="About the author">
      {au.image?.url
        ? <img src={img(au.image.url, 160)} alt="" width={64} height={64} loading="lazy" className="size-14 shrink-0 rounded-full object-cover sm:size-16" />
        : <span className="grid size-14 shrink-0 place-items-center rounded-full gradient-brand font-display text-xl font-semibold text-[#04140d] sm:size-16">{au.name[0]}</span>}
      <div className="min-w-0 space-y-1.5">
        <h2 className="text-lg font-semibold leading-tight">{au.name}</h2>
        {au.designation && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand">{au.designation}</p>}
        {au.bio && <p className="text-[0.92rem] leading-relaxed text-muted">{au.bio}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm font-semibold">
          <Link to={`/author/${encodeURIComponent(au.name)}`} className="text-brand hover:underline">More from this author</Link>
          {links.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer nofollow" className="font-medium capitalize text-muted hover:text-brand">{k}</a>)}
        </div>
      </div>
    </section>
  );
}

function PrevNext({ article, cat }: { article: Article; cat?: Category }) {
  const q = useQuery({ queryKey: ["news", "neighbours", cat?.slug], queryFn: () => newsApi.list({ category: cat?.slug, limit: 40, sort: "latest" }), staleTime: 5 * 60_000 });
  const list = q.data?.data || [];
  const i = list.findIndex((x) => x._id === article._id);
  if (i < 0) return null;
  const prev = list[i + 1]; // older
  const next = list[i - 1]; // newer
  if (!prev && !next) return null;
  const box = "group relative flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3 shadow-card transition hover:border-brand/50 hover:shadow-pop";
  return (
    <nav aria-label="More stories" className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <div className={box}>
          <Thumb a={prev} className="size-16 shrink-0 rounded-lg" />
          <div className="min-w-0"><p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Previous story</p>
            <h3 className="line-clamp-2 text-[0.92rem] font-semibold leading-snug group-hover:text-brand"><Link to={articleHref(prev)} className="after:absolute after:inset-0">{prev.title}</Link></h3></div>
        </div>
      ) : <span />}
      {next ? (
        <div className={cn(box, "sm:flex-row-reverse sm:text-right")}>
          <Thumb a={next} className="size-16 shrink-0 rounded-lg" />
          <div className="min-w-0"><p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Next story</p>
            <h3 className="line-clamp-2 text-[0.92rem] font-semibold leading-snug group-hover:text-brand"><Link to={articleHref(next)} className="after:absolute after:inset-0">{next.title}</Link></h3></div>
        </div>
      ) : <span />}
    </nav>
  );
}

function YouMightLike({ slug }: { slug: string }) {
  const q = useQuery({ queryKey: ["related", slug], queryFn: () => newsApi.related(slug, 6), staleTime: 5 * 60_000 });
  const items = q.data || [];
  if (!items.length) return null;
  return (
    <section className={cn(wrap, "mt-14")} aria-label="You might also like">
      <h2 className="mb-5 text-2xl font-semibold sm:text-[1.7rem]">You might also like</h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {items.map((a) => {
          const c = asObj<Category>(a.category as Category | string);
          const { color } = catStyle(c);
          return (
            <li key={a._id}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
                <div className="aspect-[4/3] overflow-hidden bg-surface-2"><Thumb a={{ ...a, featuredImage: a.featuredImage?.url ? { ...a.featuredImage, url: a.featuredImage.url } : undefined }} className="size-full transition duration-500 group-hover:scale-105" /></div>
                <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                  {c && <p className="text-[11.5px] font-bold" style={{ color }}>{c.name}</p>}
                  <h3 className="line-clamp-3 text-[0.95rem] font-semibold leading-snug transition group-hover:text-brand"><Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link></h3>
                  <p className="mt-auto pt-2 text-[11px] text-muted">{fmtDate(dateOf(a))}{a.readTime ? ` · ${a.readTime} min read` : ""}</p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const StatusBanner = ({ status }: { status?: string }) =>
  status && status !== "published" ? (
    <div className="mb-4 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm font-medium text-warn" role="status">
      Preview — this article is <strong>{status}</strong> and not visible to the public.
    </div>
  ) : null;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ArticlePage() {
  const { slug = "" } = useParams();
  const q = useQuery({
    queryKey: ["article", slug],
    queryFn: () => newsApi.bySlug(slug),
    staleTime: 2 * 60_000,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const a = q.data;

  const cat = a ? asObj<Category>(a.category as Category | string) : undefined;
  const sub = a ? asObj<Category>(a.subCategory as Category | string) : undefined;
  const prepared = useMemo(() => prepareHtml(a?.content || ""), [a?.content]);
  const [head, tail] = useMemo(() => splitForAd(prepared.html), [prepared.html]);
  const tags = a ? tagsOf(a) : [];
  const image = a ? imageUrl(a.ogImage) || imageUrl(a.featuredImage) : "";

  const canonical = a?.canonicalUrl || (a ? absoluteUrl(articleHref(a)) : undefined);
  useSeo({
    title: a?.metaTitle || a?.seoTitle || a?.title,
    description: a?.metaDescription || a?.seoDescription || a?.excerpt || a?.description,
    image: image ? img(image, 1200) : undefined,
    canonical,
    robots: a?.robots && a.robots !== "index, follow" ? a.robots : undefined,
    type: "article",
    jsonLd: a
      ? a.schemaMarkup && typeof a.schemaMarkup === "object"
        ? a.schemaMarkup
        : {
            "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, description: a.metaDescription || a.description,
            image: image ? [image] : undefined, datePublished: dateOf(a), dateModified: a.updatedDate || a.updatedAt,
            author: a.author?.name ? { "@type": "Person", name: a.author.name } : undefined,
            publisher: { "@type": "Organization", name: "Driftdine" }, mainEntityOfPage: canonical,
          }
      : undefined,
  });

  if (q.isLoading) {
    return (
      <div className={cn(wrap, "space-y-5 pt-6")}>
        <Skeleton className="h-5 w-72" /><Skeleton className="h-8 w-80" /><Skeleton className="h-20 w-full max-w-4xl" />
        <Skeleton className="aspect-[16/9] w-full max-w-4xl rounded-3xl" />
      </div>
    );
  }
  if (q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
  if (q.isError || !a) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const hasHtml = !!a.content?.trim();
  const fi = a.featuredImage;
  const summaryText = a.excerpt || a.description || "";
  const place = [a.destination, a.region, a.country].filter(Boolean).join(" · ");
  const updated = a.updatedDate || a.updatedAt;
  const { color: catColor } = catStyle(cat);

  return (
    <>
      <ReadingProgress />
      <article className={cn(wrap, "pt-4 sm:pt-5")}>
        <StatusBanner status={a.status} />

        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted">
          <Link to="/" className="hover:text-brand">Home</Link><ChevronRight className="size-3.5" />
          {cat && <><Link to={categoryHref(cat)} className="hover:text-brand">{cat.name}</Link><ChevronRight className="size-3.5" /></>}
          {sub && <><Link to={`${categoryHref(cat || sub)}?subCategory=${sub.slug}`} className="hover:text-brand">{sub.name}</Link><ChevronRight className="size-3.5" /></>}
          <span className="max-w-[60vw] truncate text-fg/60 sm:max-w-md">{a.title}</span>
        </nav>

        <AdSlot position="article-top" category={cat?._id} className="mb-4" />

        {/* badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {cat && <Link to={categoryHref(cat)}><Chip className="gradient-brand text-[#04140d] shadow-sm hover:brightness-105">{cat.name}</Chip></Link>}
          {a.breakingNews && <Chip className="bg-danger text-white"><Zap className="size-3.5" /> Breaking</Chip>}
          {a.featured && <Chip className="bg-warn/15 text-warn"><Star className="size-3.5" /> Featured</Chip>}
          {a.editorsPick && <Chip className="bg-sky-500/12 text-sky-700 dark:text-sky-300"><ShieldCheck className="size-3.5" /> Editor’s pick</Chip>}
          {a.trending && <Chip className="bg-rose-500/12 text-rose-600 dark:text-rose-300"><Flame className="size-3.5" /> Trending</Chip>}
          {updated && <Chip className="bg-brand-soft text-brand">Updated {fmtDate(updated)}</Chip>}
        </div>

        {/* title */}
        <h1 className="max-w-[1250px] text-[clamp(1.85rem,4.4vw,3.35rem)] font-semibold leading-[1.06] tracking-tight">{a.title}</h1>
        {a.subtitle && <p className="mt-3 max-w-4xl text-lg text-muted sm:text-xl">{a.subtitle}</p>}

        {/* byline */}
        <div className="mt-5 flex items-center gap-3.5">
          {a.author?.image?.url
            ? <img src={img(a.author.image.url, 100)} alt="" width={44} height={44} className="size-11 rounded-full object-cover ring-2 ring-brand/20" />
            : <span className="grid size-11 place-items-center rounded-full gradient-brand text-base font-bold text-[#04140d]">{(a.author?.name || "D")[0]}</span>}
          <div className="text-sm">
            <p className="font-semibold">{a.author?.name || "Driftdine Desk"}{a.author?.designation && <span className="ml-2 font-normal text-muted">{a.author.designation}</span>}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              <span>{fmtDate(dateOf(a), "time")}</span>
              {!!a.readTime && <><span aria-hidden>•</span><span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {a.readTime} min read</span></>}
              {a.language && <><span aria-hidden>•</span><span className="uppercase">{a.language}</span></>}
              {!!a.views && <><span aria-hidden>•</span><span className="inline-flex items-center gap-1"><Eye className="size-3.5" /> {compact(a.views)}</span></>}
            </p>
          </div>
        </div>
        {place && <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[13px] font-medium text-muted"><MapPin className="size-3.5 text-brand" /> {place}</p>}

        {/* two columns */}
        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-10">
          <div className="min-w-0">
            <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              {fi?.url
                ? <LinkedImg link={fi.redirectUrl} newTab={fi.openInNewTab}><img src={img(fi.url, 1400)} alt={fi.alt || a.title} width={fi.width} height={fi.height} fetchPriority="high" decoding="async" className="aspect-[16/9] w-full object-cover sm:aspect-[16/8.4]" /></LinkedImg>
                : <div className="hero-ground grid aspect-[16/9] place-items-center"><img src="/mark.webp" alt="" className="size-16 opacity-90" /></div>}
              <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-surface-2/50 px-4 py-2.5 text-[12.5px] text-muted">
                <span>{fi?.caption || fi?.alt || a.title} — Driftdine</span>
                {fi?.credit && <span className="italic">© {fi.credit}</span>}
              </figcaption>
            </figure>

            {summaryText && (
              <aside className="mt-5 rounded-2xl border p-4 sm:p-5" style={{ borderColor: `${catColor}40`, background: `color-mix(in srgb, ${catColor} 7%, var(--surface))` }}>
                <p className="mb-1.5 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em]" style={{ color: catColor }}><Sparkles className="size-3.5" /> In short</p>
                <p className="text-[1rem] leading-relaxed">{summary({ ...a, excerpt: summaryText } as Article, 320)}</p>
              </aside>
            )}

            <div className="mt-5"><ActionBar article={a} /></div>

            {/* mobile/tablet table of contents */}
            <div className="mt-5 xl:hidden"><Toc toc={prepared.toc} collapsible /></div>

            <div className="prose prose-article mt-6 max-w-none prose-headings:font-display prose-headings:font-semibold prose-h2:mb-3 prose-h2:mt-9 prose-h2:text-[1.75rem] prose-a:font-medium prose-img:rounded-2xl">
              {hasHtml ? (
                <>
                  <div dangerouslySetInnerHTML={{ __html: head }} />
                  {tail && <AdSlot position="article-inline" category={cat?._id} className="not-prose my-8" />}
                  {tail && <div dangerouslySetInnerHTML={{ __html: tail }} />}
                </>
              ) : <Blocks blocks={a.contentBlocks || []} />}
            </div>

            {/* affiliate */}
            {(a.affiliateLinks || []).some((x) => x.link) && (
              <section aria-label="Recommended" className="mt-10 space-y-4">
                <h2 className="text-xl font-semibold">Recommended tools</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {a.affiliateLinks!.filter((x) => x.link).map((x, i) => (
                    <a key={i} href={x.link} target="_blank" rel="sponsored noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-brand">
                      {x.productImage && <img src={img(x.productImage, 200)} alt="" width={64} height={64} loading="lazy" className="size-16 rounded-xl object-cover" />}
                      <span className="min-w-0 flex-1"><span className="block font-semibold">{x.title}</span>{x.price && <span className="text-sm text-muted">{x.price}</span>}</span>
                      <span className="inline-flex h-9 items-center gap-1.5 rounded-xl gradient-brand px-3 text-[13px] font-semibold text-[#04140d]">{x.buttonText || "View"} <ExternalLink className="size-3.5" /></span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* gallery */}
            {!!a.gallery?.filter((g) => g.url).length && (
              <section aria-label="Gallery" className="mt-10">
                <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold"><ImageIcon className="size-5 text-brand" /> Gallery <span className="text-sm font-normal text-muted">{a.gallery.filter((g) => g.url).length} photos</span></h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {a.gallery.filter((g) => g.url).map((g, i) => (
                    <figure key={i}>
                      <LinkedImg link={g.redirectUrl} newTab={g.openInNewTab}><img src={img(g.url, 600)} alt={g.alt || ""} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-xl object-cover" /></LinkedImg>
                      <figcaption className="mt-1.5 text-[12px] text-muted">{g.caption || g.alt || `${cat?.name || "Story"} image`}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {!!a.videos?.filter((v) => v.url).length && (
              <section aria-label="Videos" className="mt-10 space-y-5">
                {a.videos.filter((v) => v.url).map((v, i) => {
                  const e = embedUrl(v.url!);
                  return (
                    <figure key={i}>
                      {e ? <iframe src={e} title={v.title || "Video"} loading="lazy" allowFullScreen className="aspect-video w-full rounded-2xl" />
                        : <video src={v.url} controls preload="metadata" poster={v.thumbnail?.url} className="w-full rounded-2xl" />}
                      {v.caption && <figcaption className="mt-2 text-xs text-muted">{v.caption}</figcaption>}
                    </figure>
                  );
                })}
              </section>
            )}

            {/* CTA */}
            {a.cta?.url ? (
              <a href={a.cta.url} target={a.cta.openInNewTab === false ? undefined : "_blank"} rel="noopener noreferrer sponsored"
                className="group mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl gradient-brand text-[15px] font-semibold text-[#04140d] shadow-[0_12px_28px_-12px_rgb(47_195_134/0.9)] transition hover:-translate-y-0.5">
                {a.cta.label || "Learn more"} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </a>
            ) : cat && (
              <Link to={categoryHref(cat)} className="group mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl gradient-brand text-[15px] font-semibold text-[#04140d] shadow-[0_12px_28px_-12px_rgb(47_195_134/0.9)] transition hover:-translate-y-0.5">
                Read More {cat.name} Stories <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
            )}

            {(a.sourceUrl || a.externalLink) && (
              <a href={a.sourceUrl || a.externalLink} target="_blank" rel="noopener noreferrer nofollow" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-brand hover:text-brand">
                <ExternalLink className="size-4" /> Read the full story at the source
              </a>
            )}

            {/* tags */}
            {tags.length > 0 && (
              <section className="mt-8" aria-label="Tags">
                <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><TagIcon className="size-4 text-brand" /> Topics in this story</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => <Link key={t._id} to={`/tag/${t.slug}`} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold transition hover:border-brand hover:text-brand">#{t.name}</Link>)}
                </div>
              </section>
            )}

            {/* sources */}
            {(a.sourceName || a.sourceUrl || !!a.sourceLinks?.length) && (
              <section className="mt-8 rounded-2xl bg-surface-2/70 p-4 sm:p-5" aria-label="Sources">
                <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold"><Globe2 className="size-4 text-brand" /> Sources &amp; attribution</h2>
                {a.sourceName && <p className="text-sm text-muted">Originally reported by <strong className="text-fg">{a.sourceName}</strong></p>}
                <ul className="mt-2.5 space-y-1.5 text-[13px]">
                  {[...new Set([a.sourceUrl, ...(a.sourceLinks || [])].filter(Boolean) as string[])].map((l) => (
                    <li key={l} className="break-all"><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">{l}</a></li>
                  ))}
                </ul>
                {a.canonicalUrl && <p className="mt-2 break-all text-xs text-muted">Canonical: {a.canonicalUrl}</p>}
              </section>
            )}

            <div className="mt-8"><AuthorCard a={a} /></div>
            <div className="mt-5"><PrevNext article={a} cat={cat} /></div>
            <AdSlot position="article-bottom" category={cat?._id} className="mt-8" />
          </div>

          {/* sidebar */}
          <aside className="space-y-6 xl:sticky xl:top-[88px] xl:self-start" aria-label="Sidebar">
            <AdSlot position="article-sidebar-top" category={cat?._id} />
            <div className="hidden xl:block"><Toc toc={prepared.toc} /></div>
            <AdSlot position="article-sidebar-middle" category={cat?._id} />
            <PopularNow />
            <SideNewsletter />
            <MoreInCategory cat={cat} exclude={a._id} />
            <AdSlot position="article-sidebar-bottom" category={cat?._id} />
            <AdSlot position="sidebar" category={cat?._id} />
            <AdSlot position="sidebar-sticky" category={cat?._id} className="xl:sticky xl:top-[88px]" />
          </aside>
        </div>
      </article>

      <YouMightLike slug={a.slug} />
    </>
  );
}

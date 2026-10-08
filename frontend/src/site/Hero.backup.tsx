import { memo, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock, Cloud, Code2, Landmark, Lock, Newspaper, Server, Sparkles, Star, Zap,
} from "lucide-react";
import type { Article } from "@/lib/types";
import { articleHref, catOf, cn, dateOf, fmtDate, img, summary, timeAgo } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Category badge (icon + colour per topic)                            */
/* ------------------------------------------------------------------ */

const BADGES: Record<string, { icon: typeof Zap; bg: string; fg: string }> = {
  tech: { icon: Zap, bg: "#1f9d6a", fg: "#fff" },
  saas: { icon: Cloud, bg: "#2563eb", fg: "#fff" },
  cybersecurity: { icon: Lock, bg: "#6d4aff", fg: "#fff" },
  fintech: { icon: Landmark, bg: "#8be6bb", fg: "#06301f" },
  software: { icon: Code2, bg: "#0e9aa7", fg: "#fff" },
  ai: { icon: Sparkles, bg: "#e0742a", fg: "#fff" },
  it: { icon: Server, bg: "#475569", fg: "#fff" },
};
const FALLBACKS = [BADGES.tech, BADGES.saas, BADGES.software, BADGES.fintech];

function badgeFor(a: Article) {
  const c = catOf(a);
  if (!c) return null;
  const b = BADGES[c.slug] || FALLBACKS[(c.name.length + c.slug.length) % FALLBACKS.length] || { icon: Newspaper, bg: "#1f9d6a", fg: "#fff" };
  return { ...b, name: c.name };
}

function Badge({ article, className }: { article: Article; className?: string }) {
  const b = badgeFor(article);
  if (!b) return null;
  const Icon = b.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide shadow-sm", className)} style={{ background: b.bg, color: b.fg }}>
      <Icon className="size-3" aria-hidden /> {b.name}
    </span>
  );
}

const MetaRow = ({ article, relative = false, className }: { article: Article; relative?: boolean; className?: string }) => (
  <p className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className)}>
    <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" aria-hidden />{relative ? timeAgo(dateOf(article)) : fmtDate(dateOf(article))}</span>
    {!!article.readTime && <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden />{article.readTime} min</span>}
  </p>
);

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

function CoverImage({ article, ratio, priority = false, width = 700, sizes, className }: {
  article: Article; ratio?: string; priority?: boolean; width?: number; sizes?: string; className?: string;
}) {
  const url = article.featuredImage?.url || article.ogImage?.url;
  if (!url) {
    return (
      <div className={cn("hero-ground grid place-items-center", ratio, className)} aria-hidden>
        <img src="/mark.webp" alt="" width={56} height={55} className="size-14 opacity-90" loading="lazy" />
      </div>
    );
  }
  return (
    <img
      src={img(url, width)} alt={article.featuredImage?.alt || article.title} sizes={sizes}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
      className={cn("size-full object-cover", ratio, className)}
    />
  );
}

const SideCard = memo(function SideCard({ article }: { article: Article }) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-xl bg-surface-2">
        <CoverImage article={article} ratio="aspect-[2/1]" width={700} sizes="(min-width:1280px) 22vw, 46vw" className="transition duration-500 group-hover:scale-105" />
        <Badge article={article} className="absolute left-2.5 top-2.5" />
      </div>
      <h3 className="mt-3 line-clamp-2 text-[0.95rem] font-semibold leading-snug transition group-hover:text-brand sm:text-[1.02rem]">
        <Link to={articleHref(article)} className="after:absolute after:inset-0">{article.title}</Link>
      </h3>
      <p className="mt-1.5 hidden line-clamp-2 text-[0.82rem] leading-snug text-muted sm:block">{summary(article, 110)}</p>
      <div className="mt-2.5 flex items-center justify-between">
        <MetaRow article={article} className="text-muted" />
        <span className="hidden size-7 place-items-center rounded-full border border-line text-muted transition group-hover:border-brand group-hover:text-brand sm:grid"><ArrowRight className="size-3.5" /></span>
      </div>
    </article>
  );
});

const LeadCard = memo(function LeadCard({ article }: { article: Article }) {
  const b = badgeFor(article);
  const words = article.title.trim().split(/\s+/);
  const tail = Math.min(2, Math.max(1, words.length - 3));
  return (
    <article className="group relative isolate flex min-h-[440px] flex-col justify-end overflow-hidden rounded-2xl bg-forest-950 text-white shadow-card sm:min-h-[500px] lg:h-full lg:min-h-0">
      <CoverImage article={article} priority width={1400} sizes="(min-width:1024px) 50vw, 96vw" className="absolute inset-0 -z-10 transition duration-700 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-950 via-forest-950/55 to-forest-950/0" />
      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-leaf-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#04140d] shadow-lg">
        <Star className="size-3.5 fill-current" aria-hidden /> Top story
      </span>

      <div className="space-y-2.5 p-5 sm:p-7">
        {b && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf-400">{b.name}</p>}
        <h2 className="max-w-3xl text-[clamp(1.4rem,2.5vw,2.3rem)] font-semibold leading-[1.12]">
          <Link to={articleHref(article)} className="after:absolute after:inset-0">
            {words.slice(0, -tail).join(" ")} <span className="text-leaf-400">{words.slice(-tail).join(" ")}</span>
          </Link>
        </h2>
        <p className="line-clamp-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/80">{summary(article, 220)}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1">
          <MetaRow article={article} relative className="text-white/70" />
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-leaf-400">Read story <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
        </div>
      </div>
    </article>
  );
});

/* ------------------------------------------------------------------ */
/* Breaking bar                                                        */
/* ------------------------------------------------------------------ */

function BreakingBar({ items }: { items: Article[] }) {
  const pages: Article[][] = [];
  for (let n = 0; n < items.length; n += 2) pages.push(items.slice(n, n + 2));
  const [p, setP] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = pages.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => { if (!document.hidden) setP((n) => (n + 1) % count); }, 5000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!count) return null;
  const go = (d: number) => setP((n) => (n + d + count) % count);
  const btn = "grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg";

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1.5 shadow-sm sm:gap-3"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="Breaking stories"
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-fg sm:px-5 sm:text-xs">
        <Zap className="size-3.5" aria-hidden /> Breaking
      </span>
      <button className={cn(btn, "hidden sm:grid")} onClick={() => go(-1)} aria-label="Previous"><ChevronLeft className="size-4" /></button>
      <button className={cn(btn, "hidden sm:grid")} onClick={() => go(1)} aria-label="Next"><ChevronRight className="size-4" /></button>

      <div key={p} className="flex min-w-0 flex-1 items-center gap-4 animate-fade-up text-[13px] font-medium">
        {pages[p].map((a, n) => (
          <div key={a._id} className={cn("flex min-w-0 flex-1 items-center gap-4", n === 1 && "hidden md:flex")}>
            {n === 1 && <span className="h-4 w-px shrink-0 bg-line" aria-hidden />}
            <Link to={articleHref(a)} className="truncate transition hover:text-brand">{a.title}</Link>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="hidden items-center gap-1.5 sm:flex" role="tablist" aria-label="Breaking pages">
          {pages.map((_, n) => (
            <button key={n} role="tab" aria-selected={n === p} aria-label={`Page ${n + 1}`} onClick={() => setP(n)} className="p-0.5">
              <span className={cn("block size-1.5 rounded-full transition", n === p ? "bg-brand" : "bg-fg/20")} />
            </button>
          ))}
        </div>
      )}
      <button className={btn} onClick={() => go(1)} aria-label="Next breaking stories"><ChevronRight className="size-4" /></button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

function HeroSkeleton(): ReactNode {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_2.03fr_1fr]" aria-hidden>
      <div className="hidden space-y-5 lg:block">{[0, 1].map((n) => <div key={n} className="skeleton h-[300px] rounded-xl" />)}</div>
      <div className="skeleton min-h-[440px] rounded-2xl lg:min-h-[620px]" />
      <div className="hidden space-y-5 lg:block">{[0, 1].map((n) => <div key={n} className="skeleton h-[300px] rounded-xl" />)}</div>
    </div>
  );
}

function Side({ items, order }: { items: Article[]; order: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 lg:flex lg:flex-col lg:justify-between lg:gap-0", order)}>
      {items.map((a, n) => (
        <div key={a._id} className={cn(n > 0 && "lg:border-t lg:border-line lg:pt-4", n === 0 && items.length > 1 && "lg:pb-4")}><SideCard article={a} /></div>
      ))}
    </div>
  );
}

export function HeroSectionV1({ lead, left, right, breaking, loading }: {
  lead?: Article; left: Article[]; right: Article[]; breaking: Article[]; loading?: boolean;
}) {
  const sides = left.length + right.length > 0;

  return (
    <section aria-label="Top stories">
      <div className="mx-auto w-full max-w-[1800px] px-4 pb-4 pt-4 sm:px-6 sm:pt-5 lg:px-8 xl:px-12">
        {loading && !lead ? <HeroSkeleton /> : lead ? (
          <div className={cn("grid animate-fade-up gap-5", sides ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,2.03fr)_minmax(0,1fr)]" : "mx-auto max-w-4xl")}>
            {left.length > 0 && <Side items={left} order="order-2 lg:order-1" />}
            <div className="order-1 min-w-0 lg:order-2"><LeadCard article={lead} /></div>
            {right.length > 0 && <Side items={right} order="order-3" />}
          </div>
        ) : null}
        <div className="mt-5"><BreakingBar items={breaking} /></div>
      </div>
    </section>
  );
}

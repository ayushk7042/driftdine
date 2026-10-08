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
    <span className={cn("inline-flex max-w-[85%] items-center gap-1 truncate rounded-md px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide shadow-sm sm:gap-1.5 sm:px-2.5 sm:text-[10.5px]", className)} style={{ background: b.bg, color: b.fg }}>
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

/** 3:2 box: the whole photo shows, no crop and no empty bars (blurred fill only for odd shapes). */
function Frame({ article, priority = false, width = 700, sizes, className }: { article: Article; priority?: boolean; width?: number; sizes?: string; className?: string }) {
  const fi = article.featuredImage?.url ? article.featuredImage : article.ogImage;
  const url = fi?.url;
  if (!url) return <div className={cn("hero-ground grid aspect-[3/2] place-items-center", className)} aria-hidden><img src="/mark.webp" alt="" width={56} height={55} className="size-14 opacity-90" loading="lazy" /></div>;
  const r = fi?.width && fi?.height ? fi.width / fi.height : 1.5;
  const odd = r < 1.25 || r > 1.9;
  return (
    <div className={cn("relative aspect-[3/2] overflow-hidden bg-surface-2", className)}>
      {odd && <img src={img(url, 120)} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-xl" />}
      <img
        src={img(url, width)} alt={fi?.alt || article.title} sizes={sizes}
        loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
        className={cn("relative size-full transition duration-700 group-hover:scale-[1.04]", odd ? "object-contain" : "object-cover")}
      />
    </div>
  );
}

const SideCard = memo(function SideCard({ article, n }: { article: Article; n: number }) {
  const b = badgeFor(article);
  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-pop lg:flex-row lg:items-center"
      style={{ ["--c" as string]: b?.bg }}
    >
      <div className="relative p-1.5 pb-0 lg:w-[52%] lg:shrink-0 lg:p-1.5 lg:pr-0">
        <Frame article={article} width={560} sizes="(min-width:1280px) 14vw, 46vw" className="rounded-lg" />
        <Badge article={article} className="absolute left-3 top-3 lg:hidden" />
        <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-forest-950/75 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm lg:left-3 lg:right-auto">{n}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 pb-2.5 pt-2 lg:py-2 lg:pl-3 lg:pr-3">
        {b && <p className="hidden text-[9.5px] font-bold uppercase tracking-[0.12em] lg:block" style={{ color: b.bg }}>{b.name}</p>}
        <h3 className="line-clamp-4 text-[0.82rem] font-semibold leading-snug transition group-hover:text-brand sm:text-[0.92rem] xl:text-[1rem]">
          <Link to={articleHref(article)} className="after:absolute after:inset-0">{article.title}</Link>
        </h3>
        <MetaRow article={article} className="mt-auto text-[11px] text-muted lg:mt-0.5" />
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: b?.bg }} />
    </article>
  );
});

const LeadCard = memo(function LeadCard({ article }: { article: Article }) {
  const b = badgeFor(article);
  const words = article.title.trim().split(/\s+/);
  const tail = Math.min(2, Math.max(1, words.length - 3));
  return (
    <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-xl bg-forest-950 text-white shadow-card ring-1 ring-black/5">
      <div className="relative p-1.5 pb-0">
        <Frame article={article} priority width={1000} sizes="(min-width:1024px) 34vw, 96vw" className="rounded-lg" />
        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-md bg-leaf-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#04140d] shadow-lg">
          <Star className="size-3 fill-current" aria-hidden /> Top story
        </span>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-2 overflow-hidden bg-gradient-to-br from-forest-900 to-forest-950 p-4">
        <span aria-hidden className="orb -right-10 -top-12 size-32 bg-leaf-500/25" />
        {b && <p className="relative text-[10.5px] font-bold uppercase tracking-[0.18em] text-leaf-400">{b.name}</p>}
        <h2 className="relative text-[clamp(1.1rem,1.5vw,1.45rem)] font-semibold leading-[1.15]">
          <Link to={articleHref(article)} className="after:absolute after:inset-0">
            {words.slice(0, -tail).join(" ")} <span className="text-leaf-400">{words.slice(-tail).join(" ")}</span>
          </Link>
        </h2>
        <p className="relative line-clamp-2 text-[0.84rem] leading-relaxed text-white/75">{summary(article, 140)}</p>
        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
          <MetaRow article={article} relative className="text-[11.5px] text-white/70" />
          <span className="inline-flex items-center gap-1.5 rounded-full gradient-brand px-3.5 py-1.5 text-[12px] font-semibold text-[#04140d]">
            Read story <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
          </span>
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
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_1.3fr]" aria-hidden>
      <div className="hidden space-y-5 lg:block">{[0, 1].map((n) => <div key={n} className="skeleton h-[300px] rounded-xl" />)}</div>
      <div className="skeleton min-h-[440px] rounded-2xl lg:min-h-[620px]" />
      <div className="hidden space-y-5 lg:block">{[0, 1].map((n) => <div key={n} className="skeleton h-[300px] rounded-xl" />)}</div>
    </div>
  );
}

function Side({ items, order, start }: { items: Article[]; order: string; start: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-1 lg:grid-rows-2", order)}>
      {items.map((a, n) => <SideCard key={a._id} article={a} n={start + n} />)}
    </div>
  );
}

export function HeroSectionCompact({ lead, left, right, breaking, loading }: {
  lead?: Article; left: Article[]; right: Article[]; breaking: Article[]; loading?: boolean;
}) {
  const sides = left.length + right.length > 0;

  return (
    <section aria-label="Top stories">
      <div className="mx-auto w-full max-w-[1800px] px-4 pb-3 pt-3 sm:px-6 lg:px-8 xl:px-12">
        {loading && !lead ? <HeroSkeleton /> : lead ? (
          <div className={cn("grid animate-fade-up gap-3", sides ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-4" : "mx-auto max-w-4xl")}>
            {left.length > 0 && <Side items={left} order="order-2 lg:order-1" start={2} />}
            <div className="order-1 min-w-0 lg:order-2"><LeadCard article={lead} /></div>
            {right.length > 0 && <Side items={right} order="order-3" start={4} />}
          </div>
        ) : null}
        <div className="mt-3"><BreakingBar items={breaking} /></div>
      </div>
    </section>
  );
}

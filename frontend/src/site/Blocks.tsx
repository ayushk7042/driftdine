import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock, Cloud, Code2, Cpu, Landmark, Layers, Monitor, Newspaper, ShieldCheck,
} from "lucide-react";
import type { Article, Category } from "@/lib/types";
import { articleHref, categoryHref, catOf, cn, dateOf, emojiIcon, fmtDate, img, summary } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Category look (icon + accent colour)                                */
/* ------------------------------------------------------------------ */

type IconT = typeof Newspaper;
const CAT: Record<string, { icon: IconT; color: string }> = {
  fintech: { icon: Landmark, color: "#16a370" },
  software: { icon: Code2, color: "#3b82f6" },
  ai: { icon: Cpu, color: "#8b5cf6" },
  saas: { icon: Cloud, color: "#06b6d4" },
  tech: { icon: Monitor, color: "#f97316" },
  cybersecurity: { icon: ShieldCheck, color: "#e11d48" },
  it: { icon: Layers, color: "#14b8a6" },
};
const PALETTE = ["#16a370", "#3b82f6", "#8b5cf6", "#06b6d4", "#f97316", "#e11d48", "#14b8a6"];

export function catStyle(c?: { slug?: string; name?: string; color?: string } | null) {
  const hit = c?.slug ? CAT[c.slug] : undefined;
  if (hit) return hit;
  const n = ((c?.name || "").length + (c?.slug || "").length) % PALETTE.length;
  return { icon: Newspaper, color: c?.color || PALETTE[n] };
}

const Meta = ({ a, className }: { a: Article; className?: string }) => (
  <p className={cn("flex items-center gap-3.5 text-[11.5px]", className)}>
    <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" aria-hidden />{fmtDate(dateOf(a))}</span>
    {!!a.readTime && <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden />{a.readTime} min</span>}
  </p>
);

function Photo({ a, className, width = 700, sizes, priority = false }: { a: Article; className?: string; width?: number; sizes?: string; priority?: boolean }) {
  const url = a.featuredImage?.url || a.ogImage?.url;
  if (!url) return <div className={cn("hero-ground grid place-items-center", className)} aria-hidden><img src="/mark.webp" alt="" width={40} height={39} className="size-10 opacity-90" loading="lazy" /></div>;
  return <img src={img(url, width)} alt={a.featuredImage?.alt || a.title} sizes={sizes} loading={priority ? "eager" : "lazy"} decoding="async" className={cn("size-full object-cover", className)} />;
}

const wrap = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-12";

/* ------------------------------------------------------------------ */
/* Editor's picks: slider + four cards                                 */
/* ------------------------------------------------------------------ */

/**
 * Photos here are ~3:2, so a 3:2 box shows them whole with no bars. Only an unusually
 * tall/wide picture falls back to "contain" over a blurred copy of itself.
 */
function UncroppedPhoto({ a, className, width = 500, sizes }: { a: Article; className?: string; width?: number; sizes?: string }) {
  const fi = a.featuredImage?.url ? a.featuredImage : a.ogImage;
  const url = fi?.url;
  if (!url) return <div className={cn("hero-ground grid place-items-center", className)} aria-hidden><img src="/mark.webp" alt="" width={36} height={35} className="size-9 opacity-90" loading="lazy" /></div>;
  const r = fi?.width && fi?.height ? fi.width / fi.height : 1.5;
  const odd = r < 1.25 || r > 1.9;
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {odd && <img src={img(url, 120)} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-xl" />}
      <img src={img(url, width)} alt={fi?.alt || a.title} sizes={sizes} loading="lazy" decoding="async" className={cn("relative size-full transition duration-500 group-hover:scale-[1.04]", odd ? "object-contain" : "object-cover")} />
    </div>
  );
}

const PickCard = memo(function PickCard({ a }: { a: Article }) {
  const c = catOf(a);
  const { icon: Icon, color } = catStyle(c);
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-pop sm:flex-row sm:items-stretch"
      style={{ ["--c" as string]: color }}
    >
      {/* whole picture stays visible; the blurred copy only fills spare room */}
      <div className="relative shrink-0 self-start p-1.5 pb-0 sm:w-[42%] sm:pb-1.5">
        <UncroppedPhoto a={a} width={520} sizes="(min-width:1280px) 14vw, (min-width:640px) 22vw, 44vw" className="aspect-[3/2] w-full rounded-lg" />
        {!!a.readTime && (
          <span className="absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm xl:right-3">
            <Clock className="size-2.5" aria-hidden /> {a.readTime}m
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2.5 pb-2.5 pt-2 sm:px-3 sm:py-2.5 sm:pl-1.5">
        {c && (
          <Link to={categoryHref(c)} className="relative z-10 inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:opacity-75" style={{ color }}>
            <Icon className="size-3" aria-hidden /> {c.name}
          </Link>
        )}
        <h3 className="line-clamp-3 text-[0.82rem] font-semibold leading-snug transition group-hover:text-brand sm:line-clamp-3 sm:text-[0.9rem]">
          <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
        </h3>
        <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] text-muted"><Calendar className="size-3" aria-hidden />{fmtDate(dateOf(a))}</span>
      </div>

      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: color }} />
    </article>
  );
});

function Slider({ slides }: { slides: Article[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  useEffect(() => { setI(0); }, [n]);
  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % n); }, 6000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (!n) return null;
  const a = slides[i] ?? slides[0];
  const c = catOf(a);
  const { icon: Icon } = catStyle(c);
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const nav = "grid size-9 place-items-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur transition hover:bg-white hover:text-forest-950";

  return (
    <article
      className="on-dark group relative isolate grid overflow-hidden rounded-2xl bg-forest-950 text-white shadow-card md:grid-cols-[1.35fr_1fr]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Editor's picks"
    >
      {/* picture: whole image, blurred copy fills the frame */}
      <div className="relative aspect-[3/2] overflow-hidden md:aspect-auto md:h-full md:min-h-0">
        {slides.map((s, k) => {
          const u = s.featuredImage?.url || s.ogImage?.url;
          return (
            <div key={s._id} className={cn("absolute inset-0 transition-opacity duration-700", k === i ? "opacity-100" : "opacity-0")} aria-hidden={k !== i}>
              {u ? (
                <>
                  <img src={img(u, 160)} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 size-full scale-125 object-cover opacity-80 blur-2xl" />
                  <img src={img(u, 1000)} alt={s.featuredImage?.alt || s.title} loading={k === 0 ? "eager" : "lazy"} decoding="async" sizes="(min-width:1024px) 34vw, 96vw" className="relative size-full object-contain" />
                </>
              ) : <Photo a={s} width={1000} />}
            </div>
          );
        })}
        {c && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-leaf-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#04140d] shadow-lg">
            <Icon className="size-3.5" aria-hidden /> {c.name}
          </span>
        )}
      </div>

      {/* text */}
      <div key={a._id} className="relative flex animate-fade-up flex-col justify-between gap-3 bg-gradient-to-br from-forest-900 to-forest-950 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-leaf-400">Editor’s pick</p>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold tabular-nums text-white/80" aria-live="polite">{i + 1} / {n}</span>
            <button className={nav} onClick={() => go(-1)} aria-label="Previous story"><ArrowLeft className="size-4" /></button>
            <button className={nav} onClick={() => go(1)} aria-label="Next story"><ArrowRight className="size-4" /></button>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-[clamp(1.05rem,1.6vw,1.35rem)] font-semibold leading-[1.15]">
            <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
          </h2>
          <p className="line-clamp-2 text-[0.85rem] leading-relaxed text-white/75">{summary(a, 130)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Meta a={a} className="gap-4 text-[12px] text-white/70" />
          <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-[12.5px] font-semibold transition group-hover:border-leaf-400 group-hover:text-leaf-400">
            Read full story <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function EditorsBlock({ slides, grid, eyebrow, title, subtitle }: { slides: Article[]; grid: Article[]; eyebrow?: string; title?: string; subtitle?: string }) {
  if (!slides.length && !grid.length) return null;
  return (
    <section className={cn(wrap, "mt-1 pb-2")} aria-label="Editor's picks">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow !text-[10.5px]"><span className="size-1.5 rounded-full bg-brand" /> {eyebrow || "Handpicked"}</p>
          <h2 className="text-[1.5rem] font-semibold leading-tight sm:text-[1.7rem]">{title || "Editor’s Picks"}</h2>
          {(subtitle ?? "Stories our editors think you should read first.") && <p className="text-[0.88rem] text-muted">{subtitle || "Stories our editors think you should read first."}</p>}
        </div>
        <Link to="/news?editorsPick=true" className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-brand sm:inline-flex">
          All picks <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </Link>
      </div>
      <div className={cn("grid gap-3.5", grid.length ? "xl:grid-cols-[1.5fr_1.5fr]" : "")}>
        <Slider slides={slides.length ? slides : grid.slice(0, 1)} />
        {grid.length > 0 && (
          <div className="grid grid-cols-2 gap-3 xl:gap-3.5">
            {grid.slice(0, 4).map((a) => <PickCard key={a._id} a={a} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Browse by category                                                  */
/* ------------------------------------------------------------------ */

export interface StripItem { category: Category; count?: number }

export function CategoryStrip({ items, eyebrow, title, subtitle, buttonLabel }: {
  items: StripItem[]; eyebrow?: string; title?: string; subtitle?: string; buttonLabel?: string;
}) {
  if (!items.length) return null;
  return (
    <section className={cn(wrap, "mt-8")} aria-label="Browse by category">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="space-y-1">
          <p className="eyebrow !text-[10.5px]"><span className="size-1.5 rounded-full bg-brand" /> {eyebrow || "Explore categories"}</p>
          <h2 className="text-[1.5rem] font-semibold leading-tight sm:text-[1.7rem]">{title || "Browse by Category"}</h2>
          <p className="text-[0.88rem] text-muted">{subtitle || "Find the latest news, insights and updates in your favorite tech topics."}</p>
        </div>
        <Link to="/categories" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand">
          {buttonLabel || "View all categories"} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </Link>
      </div>

      {/* one tidy row of pills; wraps on small screens, never leaves a hole */}
      <ul className="mt-4 flex flex-wrap gap-2.5">
        {items.map(({ category: c, count }) => {
          const { icon: Icon, color } = catStyle(c);
          const emoji = CAT[c.slug] ? "" : emojiIcon(c.icon); // known topics get the designed vector icon
          return (
            <li key={c._id}>
              <Link
                to={categoryHref(c)}
                className="group relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full border bg-surface pl-1.5 pr-4 text-sm font-semibold shadow-sm transition duration-300 hover:-translate-y-0.5 hover:text-white hover:shadow-card"
                style={{ borderColor: `${color}40`, ["--c" as string]: color }}
              >
                {/* colour floods the pill from the icon outwards on hover */}
                <span aria-hidden className="absolute left-5 top-1/2 size-0 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-95 transition-all duration-500 ease-out group-hover:size-[260px]" style={{ background: color }} />
                <span className="relative grid size-9 place-items-center rounded-full bg-[color-mix(in_srgb,var(--c)_14%,transparent)] text-base text-[var(--c)] transition group-hover:bg-white/25 group-hover:text-white">
                  {emoji || <Icon className="size-[18px]" aria-hidden />}
                </span>
                <span className="relative">{c.name}</span>
                {count !== undefined && (
                  <span className="relative rounded-full bg-[color-mix(in_srgb,var(--c)_12%,transparent)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--c)] transition group-hover:bg-white/25 group-hover:text-white">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* In focus carousel                                                   */
/* ------------------------------------------------------------------ */

const FocusCard = memo(function FocusCard({ a }: { a: Article }) {
  const c = catOf(a);
  const { icon: Icon, color } = catStyle(c);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <Photo a={a} width={700} sizes="(min-width:1280px) 24vw, (min-width:1024px) 31vw, 46vw" className="transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        {!!a.readTime && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm">
            <Clock className="size-3" aria-hidden /> {a.readTime} min
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {c && (
          <Link to={categoryHref(c)} className="relative z-10 inline-flex w-fit items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:opacity-75" style={{ color }}>
            <span className="grid size-5 place-items-center rounded-full" style={{ background: `${color}22` }}><Icon className="size-3" aria-hidden /></span>
            {c.name}
          </Link>
        )}
        <h3 className="line-clamp-3 text-[0.98rem] font-semibold leading-snug transition group-hover:text-brand">
          <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
        </h3>
        <p className="line-clamp-2 text-[0.82rem] leading-snug text-muted">{summary(a, 120)}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted"><Calendar className="size-3.5" aria-hidden />{fmtDate(dateOf(a))}</span>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand">
            Read <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
});

export function InFocusBlock({ items, eyebrow, title, subtitle }: { items: Article[]; eyebrow?: string; title?: string; subtitle?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => { measure(); }, [items.length]);

  if (!items.length) return null;
  const scroll = (d: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: d * Math.max(260, el.clientWidth * 0.8), behavior: "smooth" });
  };
  const arrow = "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-fg shadow-card transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-0 md:grid";

  return (
    <section className={cn(wrap, "mt-8 pb-2")} aria-label="In focus">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow !text-[10.5px]"><span className="size-1.5 rounded-full bg-brand" /> {eyebrow || "In focus"}</p>
          <h2 className="text-[1.5rem] font-semibold leading-tight sm:text-[1.7rem]">{title || "More Stories You Shouldn’t Miss"}</h2>
          <p className="text-[0.88rem] text-muted">{subtitle || "Handpicked tech stories, industry updates and expert insights — all in one place."}</p>
        </div>
        <Link to="/news" className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-brand sm:inline-flex">
          View all articles <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="relative">
        <button className={cn(arrow, "-left-5")} onClick={() => scroll(-1)} disabled={edge.start} aria-label="Scroll left"><ChevronLeft className="size-5" /></button>
        <button className={cn(arrow, "-right-5")} onClick={() => scroll(1)} disabled={edge.end} aria-label="Scroll right"><ChevronRight className="size-5" /></button>

        <ul ref={ref} onScroll={measure} className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-1">
          {items.map((a) => (
            <li key={a._id} className="w-[80%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%] xl:w-[calc((100%-3*1rem)/4)] 2xl:w-[calc((100%-4*1rem)/5)]">
              <FocusCard a={a} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* More stories: compact two/three-column list                         */
/* ------------------------------------------------------------------ */

export function MoreStoriesBlock({ items }: { items: Article[] }) {
  const list = items.slice(0, 8);
  if (!list.length) return null;
  return (
    <section className={cn(wrap, "mt-10")} aria-label="More stories">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow !text-[10.5px]"><span className="size-1.5 rounded-full bg-brand" /> Keep going</p>
          <h2 className="text-[1.5rem] font-semibold leading-tight sm:text-[1.7rem]">More stories</h2>
        </div>
        <Link to="/news" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand">
          Browse everything <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((a, i) => {
          const c = catOf(a);
          const { color } = catStyle(c);
          return (
            <li key={a._id} style={{ ["--x2" as string]: i === list.length - 1 ? 2 - (list.length - 1) % 2 : 1, ["--x4" as string]: i === list.length - 1 ? 4 - (list.length - 1) % 4 : 1 }} className="sm:[grid-column:span_var(--x2)] xl:[grid-column:span_var(--x4)]">
              <article className="group relative flex h-full items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface p-2 pr-3 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop">
                <div className="relative w-[34%] shrink-0 sm:w-[132px] xl:w-[118px] 2xl:w-[140px]">
                  <UncroppedPhoto a={a} width={400} sizes="(min-width:640px) 132px, 34vw" className="aspect-[3/2] w-full rounded-lg" />
                  <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-forest-950/80 text-[10px] font-bold tabular-nums text-white">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {c && <p className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color }}>{c.name}</p>}
                  <h3 className="line-clamp-2 text-[0.9rem] font-semibold leading-snug transition group-hover:text-brand">
                    <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
                  </h3>
                  <Meta a={a} className="text-muted" />
                </div>
                <ArrowRight className="hidden size-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand sm:block" />
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Category section: one aligned row of compact cards                  */
/* ------------------------------------------------------------------ */

export function CategoryRow({ category, items }: { category: Category; items: Article[] }) {
  const [lead, ...rest] = items.slice(0, 5);
  if (!lead) return null;
  const { icon: Icon, color } = catStyle(category);
  const sides = rest.slice(0, 4);
  return (
    <section className={cn(wrap, "mt-10")} aria-label={category.name}>
      <div
        className="relative overflow-hidden rounded-3xl border p-3 sm:p-5"
        style={{ borderColor: `${color}33`, background: `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, var(--surface)), var(--surface) 55%)`, ["--c" as string]: color }}
      >
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-25 blur-3xl" style={{ background: color }} />

        <header className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl text-white shadow-lg" style={{ background: color }}><Icon className="size-5" aria-hidden /></span>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em]" style={{ color }}>Section</p>
              <h2 className="text-[1.5rem] font-semibold leading-none sm:text-[1.8rem]">{category.name}</h2>
            </div>
          </div>
          <Link to={categoryHref(category)} className="group inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-110" style={{ background: color }}>
            More in {category.shortLabel || category.name} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </Link>
        </header>

        <div className="relative grid gap-3 lg:grid-cols-[0.88fr_1fr] lg:gap-4">
          {/* lead: picture in a 3:2 frame (shown whole), title below */}
          <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-pop">
            <div className="relative p-2 pb-0">
              <UncroppedPhoto a={lead} width={900} sizes="(min-width:1024px) 40vw, 94vw" className="aspect-[3/2] w-full rounded-xl" />
              <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white shadow" style={{ background: color }}>Top in {category.shortLabel || category.name}</span>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-2 p-4">
              <h3 className="line-clamp-3 text-[1.2rem] font-semibold leading-snug transition group-hover:text-brand sm:text-[1.4rem]">
                <Link to={articleHref(lead)} className="after:absolute after:inset-0">{lead.title}</Link>
              </h3>
              <p className="line-clamp-4 text-[0.95rem] leading-relaxed text-muted">{summary(lead, 300)}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <Meta a={lead} className="text-muted" />
                <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: color }}>Read story <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </div>
            </div>
          </article>

          {/* rest: four rows, each image whole in a 3:2 box */}
          {sides.length > 0 && (
            <ul className="grid gap-3 lg:grid-rows-4 lg:[&>li>article]:h-full">
              {sides.map((a) => (
                <li key={a._id}>
                  <article className="group relative flex h-full items-center gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-2 pr-3 shadow-card transition duration-300 hover:translate-x-1 hover:border-[color:var(--c)] hover:shadow-pop">
                    <UncroppedPhoto a={a} width={500} sizes="(min-width:1280px) 240px, 40vw" className="aspect-[3/2] w-[40%] shrink-0 rounded-xl sm:w-[200px] lg:w-[34%] xl:w-[220px]" />
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 self-stretch py-0.5">
                      <p className="hidden text-[10px] font-bold uppercase tracking-[0.14em] sm:block" style={{ color }}>{category.name}</p>
                      <h3 className="line-clamp-3 text-[0.92rem] font-semibold leading-snug transition group-hover:text-brand sm:text-[1rem] sm:line-clamp-2">
                        <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
                      </h3>
                      <p className="line-clamp-2 hidden text-[0.8rem] leading-snug text-muted xl:block">{summary(a, 110)}</p>
                      <Meta a={a} className="text-muted" />
                    </div>
                    <span className="hidden size-7 shrink-0 place-items-center rounded-full transition group-hover:translate-x-0.5 sm:grid" style={{ background: `${color}22`, color }}><ArrowRight className="size-3.5" /></span>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

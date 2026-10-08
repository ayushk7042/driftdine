import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Layers, Newspaper } from "lucide-react";
import { categoryApi } from "@/lib/endpoints";
import { ErrorState, Skeleton } from "@/components/ui";
import { useSeo } from "@/lib/seo";
import { categoryHref, cn, emojiIcon, img } from "@/lib/utils";
import type { Category } from "@/lib/types";

const wrap = "mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-8";

type Item = Category & { articleCount?: number };

function Tile({ c, n, size }: { c: Item; n: number; size: "xl" | "lg" | "sm" }) {
  const cover = c.coverImage?.url || c.image?.url;
  const emoji = emojiIcon(c.icon);
  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl bg-forest-900 text-white shadow-card ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-pop",
        size === "xl" && "min-h-[300px] sm:col-span-2 sm:min-h-[380px] lg:col-span-7 lg:row-span-2 lg:min-h-0",
        size === "lg" && "min-h-[200px] sm:col-span-1 lg:col-span-5",
        size === "sm" && "min-h-[190px] sm:col-span-1 lg:col-span-3"
      )}
    >
      {cover ? <img src={img(cover, size === "xl" ? 1200 : 700)} alt="" loading={n < 3 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-105" />
        : <div className="hero-ground absolute inset-0 -z-10" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-950/90 via-forest-950/35 to-forest-950/10 transition group-hover:from-forest-950/95" />

      <span className="absolute left-4 top-4 text-[12px] font-bold tabular-nums tracking-wider text-white/70">{String(n).padStart(2, "0")}</span>
      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md">
        <Newspaper className="size-3" /> {c.articleCount ?? 0} stories
      </span>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className={cn("flex items-center gap-2 font-semibold leading-tight", size === "xl" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl")}>
            {emoji && <span>{emoji}</span>}
            <Link to={categoryHref(c)} className="after:absolute after:inset-0">{c.name}</Link>
          </h2>
          {c.description && <p className={cn("mt-1 text-white/75", size === "xl" ? "line-clamp-2 max-w-md text-[0.95rem]" : "line-clamp-1 text-[0.85rem]")}>{c.description}</p>}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-forest-950 transition group-hover:scale-110 group-hover:bg-leaf-400">
          <ArrowUpRight className="size-4 transition group-hover:rotate-12" />
        </span>
      </div>
    </article>
  );
}

export default function Categories() {
  useSeo({ title: "All categories", description: "Browse every Driftdine section in one place." });
  const q = useQuery({
    queryKey: ["categories", "index"],
    queryFn: () => categoryApi.list({ withCounts: "true", withCover: "true", parent: "root" }),
    staleTime: 10 * 60_000,
  });
  const list: Item[] = [...(q.data || [])].sort((a, b) => (b.articleCount || 0) - (a.articleCount || 0));
  const stories = list.reduce((n, c) => n + (c.articleCount || 0), 0);

  // mosaic: first is hero, next two stack beside it, the rest sit in rows of four
  const [first, second, third, ...rest] = list;

  return (
    <div className={cn(wrap, "pb-6 pt-5")}>
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-muted"><Link to="/" className="hover:text-brand">Home</Link> / <span className="font-medium text-fg">Categories</span></nav>

      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-5">
        <div>
          <p className="eyebrow !text-[11px]"><Layers className="size-3.5" /> The index</p>
          <h1 className="mt-1 text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-tight tracking-tight">Every section, one place</h1>
          <p className="mt-1 text-muted">Pick a topic and go straight to everything we have published on it.</p>
        </div>
        {!q.isLoading && (
          <dl className="grid grid-cols-2 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-surface text-center shadow-card">
            <div className="px-6 py-3"><dd className="font-display text-2xl font-semibold">{list.length}</dd><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Sections</dt></div>
            <div className="px-6 py-3"><dd className="font-display text-2xl font-semibold">{stories}</dd><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Stories</dt></div>
          </dl>
        )}
      </header>

      {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <Skeleton className="min-h-[420px] rounded-2xl lg:col-span-7 lg:row-span-2" />
          <Skeleton className="min-h-[200px] rounded-2xl lg:col-span-5" /><Skeleton className="min-h-[200px] rounded-2xl lg:col-span-5" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[minmax(190px,auto)]">
          {first && <Tile c={first} n={1} size="xl" />}
          {second && <Tile c={second} n={2} size="lg" />}
          {third && <Tile c={third} n={3} size="lg" />}
          {rest.map((c, i) => <Tile key={c._id} c={c} n={i + 4} size="sm" />)}
        </div>
      )}
    </div>
  );
}

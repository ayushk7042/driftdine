import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, LayoutGrid, List, Newspaper, Search, SlidersHorizontal, Sparkles, X, Zap } from "lucide-react";
import { categoryApi, newsApi, type NewsQuery } from "@/lib/endpoints";
import { AdSlot } from "@/site/AdSlot";
import { NewsCard, NewsCardSkeleton, NewsRow } from "@/site/NewsCard";
import { NewsletterForm } from "@/site/Newsletter";
import { UncroppedPhoto, catStyle } from "@/site/Blocks";
import { useCategoryTree } from "@/site/queries";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorState } from "@/components/ui";
import { useSeo } from "@/lib/seo";
import { articleHref, cn, dateOf, fmtDate } from "@/lib/utils";

const wrap = "mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-12";
const PLAIN_PER_PAGE = 21; // newest-story banner + 5 full rows of 4
const FILTER_PER_PAGE = 20;
const SORTS = [{ v: "latest", l: "Latest" }, { v: "popular", l: "Most read" }, { v: "trending", l: "Trending" }, { v: "oldest", l: "Oldest" }];
const FLAGS = [
  { k: "featured", l: "Featured", icon: Sparkles }, { k: "trending", l: "Trending", icon: Flame },
  { k: "editorsPick", l: "Editor’s picks", icon: Newspaper }, { k: "breaking", l: "Breaking", icon: Zap },
] as const;

function useDebouncedValue<T>(v: T, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export default function NewsList() {
  useSeo({ title: "Latest news", description: "Every Driftdine story in one place — search, filter by topic and sort by what’s new or most read." });
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = SORTS.some((s) => s.v === params.get("sort")) ? params.get("sort")! : "latest";
  const category = params.get("category") || "";
  const q = params.get("q") || "";
  const flagKey = FLAGS.find((f) => params.get(f.k) === "true")?.k;
  const [view, setView] = useState<"grid" | "list">(() => { try { return localStorage.getItem("dd_news_view") === "list" ? "list" : "grid"; } catch { return "grid"; } });
  const [search, setSearch] = useState(q);
  const term = useDebouncedValue(search);

  const set = (patch: Record<string, string | null>, keepPage = false) => {
    const n = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!keepPage) n.delete("page");
    setParams(n);
  };
  useEffect(() => { if (term !== q) set({ q: term || null }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [term]);
  const pickView = (v: "grid" | "list") => { setView(v); try { localStorage.setItem("dd_news_view", v); } catch { /* ignore */ } };

  const tree = useCategoryTree();
  const counts = useQuery({ queryKey: ["categories", "counts-root"], queryFn: () => categoryApi.list({ withCounts: "true", parent: "root" }), staleTime: 10 * 60_000 });
  const countOf = useMemo(() => new Map((counts.data || []).map((c) => [c.slug, c.articleCount || 0])), [counts.data]);
  const total = (counts.data || []).reduce((n, c) => n + (c.articleCount || 0), 0);

  const filteredNow = !!(category || q || flagKey || sort !== "latest");
  const PER_PAGE = filteredNow ? FILTER_PER_PAGE : PLAIN_PER_PAGE;
  const query: NewsQuery = { page, limit: PER_PAGE, sort, category: category || undefined, search: q || undefined };
  if (flagKey) query[flagKey] = true;
  const list = useQuery({ queryKey: ["news", "all", query], queryFn: () => newsApi.list(query), placeholderData: keepPreviousData, staleTime: 60_000 });
  const items = list.data?.data || [];
  const pg = list.data?.pagination;

  const filtered = !!(category || q || flagKey || sort !== "latest");
  const hero = !filtered && page === 1 ? items[0] : undefined;
  const rest = hero ? items.slice(1) : items;
  const trending = useQuery({ queryKey: ["news", "trend-strip"], queryFn: () => newsApi.list({ sort: "popular", limit: 5 }), enabled: !filtered && page === 1, staleTime: 5 * 60_000 });

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);
  const clear = () => { setSearch(""); setParams(new URLSearchParams()); };

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-soft/60 to-bg">
        <div aria-hidden className="orb -right-10 -top-16 size-64 bg-leaf-500/20" />
        <div className={cn(wrap, "relative py-6 sm:py-8")}>
          <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-muted"><Link to="/" className="hover:text-brand">Home</Link> / <span className="font-medium text-fg">News</span></nav>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow !text-[11px]"><Newspaper className="size-3.5" /> The newsroom</p>
              <h1 className="mt-1 text-[clamp(2rem,4.6vw,3.3rem)] font-semibold leading-none tracking-tight">Latest <span className="gradient-text">news</span></h1>
              <p className="mt-2 max-w-xl text-[0.98rem] text-muted">Everything we publish, newest first. Search it, filter it, sort it your way.</p>
            </div>
            <div className="flex flex-wrap gap-2.5 text-[13px] font-semibold">
              {!!total && <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2"><Newspaper className="size-4 text-brand" /> {total} stories</span>}
              {!!counts.data?.length && <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2"><LayoutGrid className="size-4 text-brand" /> {counts.data.length} topics</span>}
            </div>
          </div>

          {/* search */}
          <div className="relative mt-5 max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all stories…" aria-label="Search stories"
              className="h-12 w-full rounded-full border border-line bg-surface pl-12 pr-11 text-[0.95rem] shadow-card outline-none transition focus:border-brand focus:shadow-[0_0_0_4px_rgb(47_195_134/0.15)]"
            />
            {search && <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2"><X className="size-4" /></button>}
          </div>

          {/* topic chips */}
          <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <button onClick={() => set({ category: null })} aria-pressed={!category}
              className={cn("shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition", !category ? "border-transparent bg-brand text-brand-fg shadow" : "border-line bg-surface hover:border-brand hover:text-brand")}>
              All <span className="ml-1 opacity-70">{total || ""}</span>
            </button>
            {(tree.data || []).map((c) => {
              const { icon: Icon, color } = catStyle(c);
              const on = category === c.slug;
              return (
                <button key={c._id} onClick={() => set({ category: on ? null : c.slug })} aria-pressed={on}
                  className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition", on ? "border-transparent text-white shadow" : "border-line bg-surface hover:-translate-y-0.5 hover:shadow-card")}
                  style={on ? { background: color } : { borderColor: `${color}40` }}>
                  <Icon className="size-3.5" style={on ? undefined : { color }} aria-hidden /> {c.name}
                  <span className={cn("text-[11px]", on ? "opacity-80" : "text-muted")}>{countOf.get(c.slug) ?? ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className={cn(wrap, "pb-4 pt-5")}>
        <AdSlot position="home-top" className="mb-5" />

        {/* trending strip */}
        {!filtered && page === 1 && !!trending.data?.data.length && (
          <section aria-label="Most read" className="mb-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5"><Flame className="size-4 text-brand" /><h2 className="text-[13px] font-bold uppercase tracking-[0.1em]">Most read right now</h2></div>
            <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
              {trending.data.data.map((a, i) => (
                <li key={a._id} className="group relative flex items-center gap-3 p-3 transition hover:bg-surface-2/60">
                  <span className="font-display text-3xl font-semibold leading-none text-brand/35 transition group-hover:text-brand">{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-[0.86rem] font-semibold leading-snug transition group-hover:text-brand"><Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link></h3>
                    <p className="mt-0.5 text-[11px] text-muted">{fmtDate(dateOf(a))}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted"><SlidersHorizontal className="size-4" /> Filter</span>
            {FLAGS.map((f) => {
              const on = flagKey === f.k;
              return (
                <button key={f.k} onClick={() => set(Object.fromEntries(FLAGS.map((x) => [x.k, x.k === f.k && !on ? "true" : null])))} aria-pressed={on}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition", on ? "border-transparent gradient-brand text-[#04140d]" : "border-line bg-surface hover:border-brand")}>
                  <f.icon className="size-3.5" aria-hidden /> {f.l}
                </button>
              );
            })}
            {filtered && <button onClick={clear} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-danger hover:bg-danger/10"><X className="size-3.5" /> Clear all</button>}
          </div>
          <div className="flex items-center gap-2.5">
            <div role="tablist" aria-label="Sort" className="inline-flex overflow-hidden rounded-xl border border-line bg-surface p-1 text-[12.5px] font-semibold">
              {SORTS.map((s) => (
                <button key={s.v} role="tab" aria-selected={sort === s.v} onClick={() => set({ sort: s.v === "latest" ? null : s.v })}
                  className={cn("rounded-lg px-3 py-1.5 transition", sort === s.v ? "bg-brand text-brand-fg shadow-sm" : "text-muted hover:text-fg")}>{s.l}</button>
              ))}
            </div>
            <div className="inline-flex overflow-hidden rounded-xl border border-line bg-surface p-1" role="group" aria-label="Layout">
              {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => pickView(v)} aria-pressed={view === v} aria-label={`${v} view`}
                  className={cn("grid size-8 place-items-center rounded-lg transition", view === v ? "bg-brand text-brand-fg shadow-sm" : "text-muted hover:text-fg")}><Icon className="size-4" /></button>
              ))}
            </div>
          </div>
        </div>

        {pg && (
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {pg.total ? <>Showing <strong className="text-fg">{(page - 1) * PER_PAGE + 1}–{(page - 1) * PER_PAGE + items.length}</strong> of <strong className="text-fg">{pg.total}</strong> stories{q && <> for “<strong className="text-fg">{q}</strong>”</>}</> : "No stories"}
          </p>
        )}

        {list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <NewsCardSkeleton key={i} />)}</div>
        ) : !items.length ? (
          <EmptyState title="No stories match" text={q ? `Nothing found for “${q}”. Try a broader word.` : "Try a different topic or clear your filters."} action={<button onClick={clear} className="inline-flex h-10 items-center rounded-full gradient-brand px-5 text-sm font-semibold text-[#04140d]">Clear filters</button>} />
        ) : (
          <div className={cn("space-y-4 transition-opacity", list.isFetching && "opacity-60")}>
            {hero && (
              <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:shadow-pop md:flex-row md:items-center">
                <div className="relative p-2 md:w-[40%] md:shrink-0 xl:w-[34%]">
                  <UncroppedPhoto a={hero} width={900} sizes="(min-width:1280px) 34vw, (min-width:768px) 40vw, 96vw" className="aspect-[3/2] w-full rounded-xl" />
                  <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-[11.5px] font-bold text-white shadow-lg"><Flame className="size-3.5" /> Newest</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-6">
                  <h2 className="line-clamp-3 text-[clamp(1.2rem,2vw,1.75rem)] font-semibold leading-[1.15]"><Link to={articleHref(hero)} className="after:absolute after:inset-0">{hero.title}</Link></h2>
                  <p className="line-clamp-2 text-[0.92rem] leading-relaxed text-muted">{hero.excerpt || hero.description}</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1 text-[12px] text-muted">
                    <span>{fmtDate(dateOf(hero))}</span>{!!hero.readTime && <span>{hero.readTime} min read</span>}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand">Read story <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </article>
            )}
            {view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {rest.map((a) => <NewsCard key={a._id} a={a} />)}
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">{rest.map((a) => <NewsRow key={a._id} a={a} />)}</div>
            )}
            <Pagination className="pt-6" pagination={pg} onPage={(p) => set({ page: p === 1 ? null : String(p) }, true)} />
          </div>
        )}

        {/* newsletter strip */}
        <section className="on-dark hero-ground relative mt-10 overflow-hidden rounded-2xl px-5 py-6 text-white sm:px-8" aria-label="Newsletter">
          <div className="relative flex flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
            <div><h2 className="text-xl font-semibold sm:text-2xl">Never miss a story. <span className="gradient-text">Get the weekly drift.</span></h2><p className="mt-0.5 text-[0.85rem] text-white/65">The week’s sharpest tech and SaaS stories, in one email.</p></div>
            <div className="w-full max-w-md shrink-0"><NewsletterForm dark source="news-page" /></div>
          </div>
        </section>
      </div>
    </>
  );
}

import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Clock, Compass, Flame, Hash, LayoutGrid, Newspaper, TrendingUp } from "lucide-react";
import { categoryApi, newsApi } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";
import { AdSlot } from "@/site/AdSlot";
import { NewsletterForm } from "@/site/Newsletter";
import { catStyle } from "@/site/Blocks";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorState, PageLoader, Skeleton } from "@/components/ui";
import { NotFound } from "./Static";
import { useSeo } from "@/lib/seo";
import { articleHref, categoryHref, cn, compact, dateOf, fmtDate, img, summary, timeAgo } from "@/lib/utils";
import type { Article, Tag } from "@/lib/types";

const wrap = "mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-8";
const PER_PAGE = 12;
const SORTS = [{ v: "latest", l: "Latest" }, { v: "popular", l: "Most read" }, { v: "oldest", l: "Oldest" }, { v: "title", l: "A–Z" }];

function Thumb({ a, className, width = 700 }: { a: Article; className?: string; width?: number }) {
  const u = a.featuredImage?.url || a.ogImage?.url;
  return u
    ? <img src={img(u, width)} alt={a.featuredImage?.alt || a.title} loading="lazy" decoding="async" className={cn("object-cover", className)} />
    : <span className={cn("hero-ground grid place-items-center", className)}><img src="/mark.webp" alt="" className="size-8 opacity-90" /></span>;
}

const ByLine = ({ a, className }: { a: Article; className?: string }) => (
  <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted", className)}>
    {a.author?.name && <span>By {a.author.name}</span>}
    <span>{a.author?.name ? "• " : ""}{fmtDate(dateOf(a))}</span>
    {!!a.readTime && <span className="inline-flex items-center gap-1">• <Clock className="size-3" /> {a.readTime} min read</span>}
  </p>
);

const Side = ({ icon, title, to, cta, children }: { icon: React.ReactNode; title: string; to?: string; cta?: string; children: React.ReactNode }) => (
  <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
    <header className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em]"><span className="text-brand">{icon}</span>{title}</h2>
      {to && <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">{cta || "See all"} <ArrowRight className="size-3.5" /></Link>}
    </header>
    {children}
  </section>
);

function MiniList({ items, ranked = false }: { items: Article[]; ranked?: boolean }) {
  return (
    <ol className="divide-y divide-line px-4">
      {items.map((a, i) => (
        <li key={a._id} className="group relative flex gap-3 py-3">
          <div className="relative shrink-0">
            <Thumb a={a} width={200} className="size-16 rounded-lg" />
            {ranked && <span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">{i + 1}</span>}
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[0.88rem] font-semibold leading-snug transition group-hover:text-brand"><Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link></h3>
            <p className="mt-1 flex items-center gap-2 text-[11px] text-muted"><span>{fmtDate(dateOf(a))}</span>{!!a.readTime && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{a.readTime} min</span>}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StoryCard({ a }: { a: Article }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
        <Thumb a={a} className="size-full transition duration-500 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[12px] font-bold text-brand">{typeof a.category === "object" && a.category ? a.category.name : ""}</p>
        <h3 className="line-clamp-2 text-[1.02rem] font-semibold leading-snug transition group-hover:text-brand"><Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link></h3>
        <p className="line-clamp-2 text-[0.86rem] leading-snug text-muted">{summary(a, 120)}</p>
        <ByLine a={a} className="mt-auto pt-2" />
      </div>
    </article>
  );
}

export default function CategoryPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = SORTS.some((s) => s.v === params.get("sort")) ? params.get("sort")! : "latest";
  const subSlug = params.get("subCategory") || "";

  const cq = useQuery({ queryKey: ["category", slug], queryFn: () => categoryApi.get(slug), staleTime: 5 * 60_000, retry: false });
  const c = cq.data;

  const siblings = useQuery({ queryKey: ["categories", "counts-root"], queryFn: () => categoryApi.list({ withCounts: "true", parent: "root" }), staleTime: 10 * 60_000 });

  const top = useQuery({ queryKey: ["cat-top", slug, subSlug], queryFn: () => newsApi.list({ category: slug, subCategory: subSlug || undefined, limit: 1, sort: "latest" }), enabled: !!c, staleTime: 2 * 60_000 });
  const topStory = top.data?.data[0];

  const grid = useQuery({
    queryKey: ["cat-grid", slug, subSlug, sort, page, topStory?._id],
    queryFn: () => newsApi.list({ category: slug, subCategory: subSlug || undefined, sort, page, limit: PER_PAGE, exclude: sort === "latest" ? topStory?._id : undefined }),
    enabled: !!c && !top.isLoading, placeholderData: keepPreviousData, staleTime: 60_000,
  });
  const popular = useQuery({ queryKey: ["cat-pop", slug], queryFn: () => newsApi.list({ category: slug, sort: "popular", limit: 5 }), enabled: !!c, staleTime: 5 * 60_000 });
  const pool = useQuery({ queryKey: ["cat-pool", slug], queryFn: () => newsApi.list({ category: slug, limit: 60, sort: "latest" }), enabled: !!c, staleTime: 5 * 60_000 });

  const topics = useMemo(() => {
    const m = new Map<string, { tag: Tag; n: number }>();
    (pool.data?.data || []).forEach((a) => (a.tags || []).forEach((t) => { if (typeof t === "object") m.set(t._id, { tag: t, n: (m.get(t._id)?.n || 0) + 1 }); }));
    return [...m.values()].sort((x, y) => y.n - x.n).slice(0, 14);
  }, [pool.data]);

  const others = (siblings.data || []).filter((x) => x._id !== c?._id);
  const total = c?.articleCount ?? 0;
  const latest = pool.data?.data[0];
  const { color } = catStyle(c);

  useSeo({
    title: c?.metaTitle || c?.seoTitle || (c ? `${c.name} news` : undefined),
    description: c?.metaDescription || c?.seoDescription || c?.description,
    robots: c?.robots && c.robots !== "index, follow" ? c.robots : undefined,
  });

  if (cq.isLoading) return <PageLoader />;
  if (cq.error instanceof ApiError && cq.error.status === 404) return <NotFound />;
  if (cq.isError || !c) return <ErrorState error={cq.error} onRetry={cq.refetch} />;

  const set = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!("page" in patch)) n.delete("page");
    setParams(n);
  };
  const items = grid.data?.data || [];
  const pg = grid.data?.pagination;
  const shownTotal = (pg?.total ?? 0) + (sort === "latest" && topStory ? 1 : 0);
  const from = pg ? (page - 1) * PER_PAGE + 1 + (sort === "latest" && topStory && page > 1 ? 1 : 0) : 0;
  const to = pg ? Math.min(shownTotal, (page - 1) * PER_PAGE + items.length + (sort === "latest" && topStory ? 1 : 0)) : 0;

  return (
    <>
      {/* hero */}
      <header className="relative overflow-hidden border-b border-line" style={{ background: `radial-gradient(60% 120% at 85% 0%, ${color}22, transparent 60%), linear-gradient(180deg, color-mix(in srgb, ${color} 7%, var(--bg)), var(--bg))` }}>
        <div className={cn(wrap, "py-6 sm:py-8")}>
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[13px] text-muted">
            <Link to="/" className="hover:text-brand">Home</Link> / <Link to="/categories" className="hover:text-brand">Categories</Link> / <span className="font-medium text-fg">{c.name}</span>
          </nav>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-[12px] font-semibold text-brand"><Compass className="size-3.5" /> Category</span>
              <h1 className="mt-3 text-[clamp(2.2rem,5.5vw,3.9rem)] font-semibold leading-none tracking-tight">{c.name}</h1>
              {c.description && <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-muted">{c.description}</p>}
              <div className="mt-5 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold"><Newspaper className="size-4 text-brand" /> {total} {total === 1 ? "story" : "stories"}</span>
                {latest && <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold"><CalendarClock className="size-4 text-brand" /> Updated {timeAgo(dateOf(latest))}</span>}
              </div>
              {!!c.children?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => set({ subCategory: null })} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition", !subSlug ? "border-transparent bg-brand text-brand-fg" : "border-line bg-surface hover:border-brand")}>All</button>
                  {c.children.map((s) => (
                    <button key={s._id} onClick={() => set({ subCategory: s.slug })} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition", subSlug === s.slug ? "border-transparent bg-brand text-brand-fg" : "border-line bg-surface hover:border-brand")}>{s.name}</button>
                  ))}
                </div>
              )}
            </div>
            {others.length > 0 && (
              <div>
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Jump to</p>
                <div className="flex flex-wrap gap-2">
                  {others.map((o) => (
                    <Link key={o._id} to={categoryHref(o)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold transition hover:-translate-y-0.5 hover:border-brand hover:text-brand">
                      {o.name} <span className="text-[11px] font-medium text-muted">{o.articleCount ?? 0}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={cn(wrap, "pb-4 pt-6")}>
        <AdSlot position="category-top" category={c._id} className="mb-7" />

        {grid.isError ? <ErrorState error={grid.error} onRetry={grid.refetch} /> : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="min-w-0 space-y-9">
              {/* top story */}
              {topStory && page === 1 && (
                <article className="group relative grid overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:shadow-pop md:grid-cols-[1fr_1fr]">
                  <div className="relative min-h-[240px] overflow-hidden bg-surface-2">
                    <Thumb a={topStory} width={1000} className="absolute inset-0 size-full transition duration-700 group-hover:scale-105" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-[12px] font-bold text-white shadow-lg"><Flame className="size-3.5" /> Top story</span>
                  </div>
                  <div className="flex flex-col justify-center gap-3 p-5 sm:p-8">
                    <p className="text-[12.5px] font-bold" style={{ color }}>{c.name}</p>
                    <h2 className="line-clamp-4 text-[clamp(1.4rem,2.4vw,2.1rem)] font-semibold leading-[1.12]"><Link to={articleHref(topStory)} className="after:absolute after:inset-0">{topStory.title}</Link></h2>
                    <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-muted">{summary(topStory, 220)}</p>
                    <ByLine a={topStory} />
                    <span className="mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-xl gradient-brand px-5 text-sm font-semibold text-[#04140d] shadow-[0_10px_24px_-12px_rgb(47_195_134/0.9)]">Read story <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                  </div>
                </article>
              )}

              <AdSlot position="category-infeed" category={c._id} />

              {/* all stories */}
              <section aria-label={`All ${c.name} stories`}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-[1.6rem] font-semibold leading-tight">All {c.name} stories</h2>
                    {pg && shownTotal > 0 && <p className="text-sm text-muted">Showing {from}–{to} of {shownTotal}</p>}
                  </div>
                  <div role="tablist" aria-label="Sort" className="inline-flex overflow-hidden rounded-xl border border-line bg-surface p-1 text-[13px] font-semibold">
                    {SORTS.map((s) => (
                      <button key={s.v} role="tab" aria-selected={sort === s.v} onClick={() => set({ sort: s.v === "latest" ? null : s.v })}
                        className={cn("rounded-lg px-3.5 py-1.5 transition", sort === s.v ? "bg-brand text-brand-fg shadow-sm" : "text-muted hover:text-fg")}>{s.l}</button>
                    ))}
                  </div>
                </div>

                {grid.isLoading ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
                ) : !items.length && !topStory ? (
                  <EmptyState title="No stories yet" text="Check back soon — new articles are on the way." />
                ) : (
                  <div className={cn("grid gap-5 sm:grid-cols-2 xl:grid-cols-3", grid.isFetching && "opacity-60 transition-opacity")}>
                    {items.map((a) => <StoryCard key={a._id} a={a} />)}
                  </div>
                )}
                <Pagination className="mt-9" pagination={pg} onPage={(p) => { set({ page: p === 1 ? null : String(p) }); window.scrollTo({ top: 360, behavior: "smooth" }); }} />
              </section>
            </div>

            {/* sidebar */}
            <aside className="space-y-6 xl:sticky xl:top-[88px] xl:self-start" aria-label="Sidebar">
              {!!pool.data?.data.length && (
                <Side icon={<LayoutGrid className="size-4" />} title="Also in this category">
                  <MiniList items={pool.data.data.slice(1, 6)} />
                </Side>
              )}
              {!!popular.data?.data.length && (
                <Side icon={<TrendingUp className="size-4" />} title="Most read here"><MiniList items={popular.data.data} ranked /></Side>
              )}
              {topics.length > 0 && (
                <Side icon={<Hash className="size-4" />} title="Topics on this page">
                  <div className="flex flex-wrap gap-2 p-4">
                    {topics.map(({ tag, n }) => (
                      <Link key={tag._id} to={`/tag/${tag.slug}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[12.5px] font-semibold transition hover:border-brand hover:text-brand">
                        {tag.name} <span className="text-[11px] font-medium text-muted">{n}</span>
                      </Link>
                    ))}
                  </div>
                </Side>
              )}
              <section className="on-dark relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-800 via-leaf-700 to-leaf-600 p-5 text-white shadow-card">
                <span aria-hidden className="orb -right-8 -top-8 size-32 bg-leaf-300/30" />
                <div className="relative">
                  <h2 className="font-semibold leading-tight">Stay Updated!</h2>
                  <p className="mb-4 mt-0.5 text-xs text-white/75">Latest news, reviews and trends in your inbox.</p>
                  <NewsletterForm dark compact source={`category-${c.slug}`} />
                  <p className="mt-3 text-xs text-white/70">No spam, unsubscribe anytime.</p>
                </div>
              </section>
              {others.length > 0 && (
                <Side icon={<Compass className="size-4" />} title="Other categories" to="/categories">
                  <ul className="divide-y divide-line">
                    {others.map((o) => (
                      <li key={o._id}><Link to={categoryHref(o)} className="flex items-center justify-between px-4 py-3 text-sm font-semibold transition hover:bg-surface-2 hover:text-brand">{o.name}<span className="text-xs font-medium text-muted">{compact(o.articleCount || 0)}</span></Link></li>
                    ))}
                  </ul>
                </Side>
              )}
              <AdSlot position="sidebar" category={c._id} />
            </aside>
          </div>
        )}
      </div>
    </>
  );
}


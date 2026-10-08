import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { newsApi, type NewsQuery } from "@/lib/endpoints";
import { NewsCard, NewsCardSkeleton } from "@/site/NewsCard";
import { AdSlot } from "@/site/AdSlot";
import { useCategoryTree } from "@/site/queries";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorState, Select } from "@/components/ui";
import { useSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PASS_THROUGH = ["category", "subCategory", "tag", "region", "country", "destination", "language", "author", "featured", "trending", "popular", "editorsPick", "breaking", "search"] as const;
const SORTS = [
  { v: "latest", l: "Newest" }, { v: "popular", l: "Most read" }, { v: "trending", l: "Trending" }, { v: "oldest", l: "Oldest" },
];
const FLAGS = [
  { k: "featured", l: "Featured" }, { k: "trending", l: "Trending" }, { k: "editorsPick", l: "Editor’s picks" }, { k: "breaking", l: "Breaking" },
] as const;

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Always-on filters from the route (e.g. the category of /category/:slug). */
  fixed?: NewsQuery;
  /** Show the category/sort/flag filter bar. */
  filters?: boolean;
  header?: ReactNode;
  adPosition?: string;
  adCategory?: string;
  emptyText?: string;
  seoTitle?: string;
  noindex?: boolean;
  perPage?: number;
}

export function ArticleListPage({ eyebrow, title, description, fixed = {}, filters = true, header, adPosition, adCategory, emptyText, seoTitle, noindex, perPage = 12 }: Props) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = params.get("sort") || "latest";
  const { data: tree } = useCategoryTree();

  const query: NewsQuery = { limit: perPage, page, sort };
  for (const k of PASS_THROUGH) {
    const v = params.get(k);
    if (v) query[k] = v;
  }
  if (params.get("q")) query.search = params.get("q")!;
  Object.assign(query, fixed);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["news", "list", query],
    queryFn: () => newsApi.list(query),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  useSeo({ title: seoTitle || title, description, robots: noindex ? "noindex, follow" : undefined });
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: false });
  };

  const activeFlags = FLAGS.filter((f) => params.get(f.k) === "true");
  const items = data?.data || [];

  return (
    <div className="container-x pb-4 pt-6">
      <header className="mb-10 space-y-3 animate-fade-up">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="text-4xl font-semibold sm:text-6xl">{title}</h1>
        {description && <p className="max-w-2xl text-lg text-muted">{description}</p>}
        {header}
      </header>

      {adPosition && <AdSlot position={adPosition} category={adCategory} className="mb-8" />}

      {filters && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <SlidersHorizontal className="ml-1 size-4 text-muted" aria-hidden />
          {!fixed.category && (
            <Select aria-label="Category" className="w-auto min-w-40" value={params.get("category") || ""} onChange={(e) => set({ category: e.target.value || null })}>
              <option value="">All topics</option>
              {(tree || []).map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
            </Select>
          )}
          <Select aria-label="Sort" className="w-auto" value={sort} onChange={(e) => set({ sort: e.target.value === "latest" ? null : e.target.value })}>
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </Select>
          <div className="flex flex-wrap gap-2">
            {FLAGS.map((f) => {
              const on = params.get(f.k) === "true";
              return (
                <button key={f.k} onClick={() => set({ [f.k]: on ? null : "true" })} aria-pressed={on}
                  className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition", on ? "border-transparent gradient-brand text-[#04140d]" : "border-line hover:border-brand")}>
                  {f.l}
                </button>
              );
            })}
          </div>
          {(activeFlags.length > 0 || params.get("category") || params.get("tag") || params.get("region")) && (
            <button onClick={() => setParams(new URLSearchParams())} className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-danger">
              <X className="size-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <NewsCardSkeleton key={i} />)}</div> : isError ? <ErrorState error={error} onRetry={refetch} /> : !items.length ? (
        <EmptyState title="Nothing here yet" text={emptyText || "No stories match these filters. Try widening your search."} />
      ) : (
        <div className={cn("transition-opacity", isFetching && "opacity-60")}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((a, i) => (
              <div key={a._id} className="contents">
                <NewsCard a={a} />
                {i === 5 && adPosition && <div className="col-span-2 md:col-span-3 xl:col-span-4"><AdSlot position="category-infeed" category={adCategory} /></div>}
              </div>
            ))}
          </div>
          <Pagination className="mt-12" pagination={data?.pagination} onPage={(p) => set({ page: p === 1 ? null : String(p) })} />
        </div>
      )}
    </div>
  );
}

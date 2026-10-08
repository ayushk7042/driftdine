import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tagApi } from "@/lib/endpoints";
import { ArticleListPage } from "./ArticleListPage";
import { ErrorState, PageLoader, Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { NotFound } from "./Static";
import { useSeo } from "@/lib/seo";

export function TagPage() {
  const { slug = "" } = useParams();
  const q = useQuery({ queryKey: ["tag", slug], queryFn: () => tagApi.get(slug), retry: false, staleTime: 5 * 60_000 });
  if (q.isLoading) return <PageLoader />;
  if (q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const t = q.data;
  return (
    <ArticleListPage
      key={t._id}
      eyebrow="Tag"
      title={`#${t.name}`}
      description={t.seoDescription || t.description}
      seoTitle={t.seoTitle || `#${t.name}`}
      fixed={{ tag: t._id }}
      filters={false}
    />
  );
}

export default function TagsIndex() {
  useSeo({ title: "Tags", description: "Every tag we use, sized by how often it appears." });
  const q = useQuery({ queryKey: ["tags", "all"], queryFn: () => tagApi.list({ limit: 200, status: "active" }), staleTime: 10 * 60_000 });
  const tags = (q.data?.data || []).filter((t) => (t.usageCount ?? 0) > 0 || (q.data?.data.length || 0) < 40);
  const max = Math.max(1, ...tags.map((t) => t.usageCount || 0));

  return (
    <div className="container-x pt-6">
      <header className="mb-10 space-y-3">
        <span className="eyebrow">Browse</span>
        <h1 className="text-4xl font-semibold sm:text-6xl">Tags</h1>
        <p className="max-w-2xl text-lg text-muted">The topics and tools that keep showing up.</p>
      </header>
      {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <div className="flex flex-wrap gap-3">
          {q.isLoading && Array.from({ length: 24 }, (_, i) => <Skeleton key={i} className="h-11 w-28 rounded-full" />)}
          {tags.map((t) => {
            const weight = (t.usageCount || 0) / max;
            return (
              <Link key={t._id} to={`/tag/${t.slug}`}
                className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 transition hover:border-brand hover:text-brand"
                style={{ fontSize: `${0.85 + weight * 0.45}rem` }}>
                #{t.name}
                {!!t.usageCount && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted group-hover:bg-brand-soft group-hover:text-brand">{t.usageCount}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

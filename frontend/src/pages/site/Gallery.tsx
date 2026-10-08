import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { newsApi } from "@/lib/endpoints";
import { useHomepage } from "@/site/queries";
import { Button, ErrorState, Skeleton } from "@/components/ui";
import { useSeo } from "@/lib/seo";
import { articleHref, catOf, cn, compact, img } from "@/lib/utils";

/** The page behind the homepage "Open the wall" link: every story that has a picture. */
export default function GalleryPage() {
  const { data: home } = useHomepage();
  const title = home?.gallery.title || "Snap Wall";
  useSeo({ title, description: home?.gallery.subtitle || "A visual wall of the stories everyone is reading." });

  const q = useInfiniteQuery({
    queryKey: ["gallery"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => newsApi.list({ page: pageParam, limit: 24, sort: "latest" }),
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    staleTime: 2 * 60_000,
  });

  const items = useMemo(
    () => (q.data?.pages.flatMap((p) => p.data) || []).filter((a) => a.featuredImage?.url),
    [q.data]
  );

  return (
    <div className="container-x pt-6">
      <header className="mb-10 space-y-3">
        <span className="eyebrow">Visual stories</span>
        <h1 className="text-4xl font-semibold sm:text-6xl">{title}</h1>
        <p className="max-w-2xl text-lg text-muted">{home?.gallery.subtitle || "Frames from the stories everyone is watching right now."}</p>
      </header>

      {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
            {q.isLoading && Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className={cn("rounded-3xl", i % 3 === 0 ? "h-72" : "h-52")} />)}
            {items.map((a, i) => (
              <Link key={a._id} to={articleHref(a)} className="group relative block break-inside-avoid overflow-hidden rounded-3xl bg-forest-900">
                <img src={img(a.featuredImage!.url, 500)} alt={a.featuredImage?.alt || a.title} loading={i < 4 ? "eager" : "lazy"} decoding="async"
                  className={cn("w-full object-cover transition duration-700 group-hover:scale-105", i % 5 === 0 ? "aspect-[3/4]" : i % 3 === 0 ? "aspect-square" : "aspect-[4/3]")} />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-leaf-300">{catOf(a)?.name}</p>
                  <p className="line-clamp-2 text-sm font-semibold">{a.title}</p>
                  <p className="text-[11px] text-white/60">{compact(a.views || 0)} reads</p>
                </div>
              </Link>
            ))}
          </div>
          {q.hasNextPage && (
            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Load more</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

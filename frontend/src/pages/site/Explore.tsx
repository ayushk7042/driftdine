import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Languages, MapPin, PenLine } from "lucide-react";
import { newsApi } from "@/lib/endpoints";
import { ErrorState, Skeleton } from "@/components/ui";
import { useSeo } from "@/lib/seo";

export default function Explore() {
  useSeo({ title: "Explore", description: "Browse stories by region, country, destination, language and author." });
  const q = useQuery({ queryKey: ["facets"], queryFn: newsApi.facets, staleTime: 10 * 60_000 });
  const f = q.data;

  const groups = f && [
    { icon: <Globe2 className="size-5" />, title: "Regions", param: "region", items: f.regions },
    { icon: <MapPin className="size-5" />, title: "Countries", param: "country", items: f.countries },
    { icon: <MapPin className="size-5" />, title: "Destinations", param: "destination", items: f.destinations },
    { icon: <Languages className="size-5" />, title: "Languages", param: "language", items: f.languages },
    { icon: <PenLine className="size-5" />, title: "Authors", param: "author", items: f.authors },
  ].filter((g) => g.items.length);

  return (
    <div className="container-x pt-6">
      <header className="mb-10 space-y-3">
        <span className="eyebrow">Discover</span>
        <h1 className="text-4xl font-semibold sm:text-6xl">Explore</h1>
        <p className="max-w-2xl text-lg text-muted">Follow the thread — jump into stories by where they’re from, what language they’re in, or who wrote them.</p>
      </header>
      {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {groups?.map((g) => (
            <section key={g.title} className="card p-6">
              <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold"><span className="text-brand">{g.icon}</span>{g.title}</h2>
              <div className="flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <Link key={item} to={g.param === "author" ? `/author/${encodeURIComponent(item)}` : `/news?${g.param}=${encodeURIComponent(item)}`}
                    className="rounded-full border border-line px-3.5 py-1.5 text-sm transition hover:border-brand hover:text-brand">{item}</Link>
                ))}
              </div>
            </section>
          ))}
          {!groups?.length && <p className="text-muted">No regional data yet.</p>}
        </div>
      )}
    </div>
  );
}

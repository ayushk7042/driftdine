import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { useCategoryTree, useHomeFeed, useHomepage } from "@/site/queries";
import { AdSlot, ImageAd, ScriptAd, useAdFor } from "@/site/AdSlot";
import { NewsletterForm } from "@/site/Newsletter";
import { HeroSection } from "@/site/Hero";
import { HeroSectionV1 } from "@/site/Hero.backup";

/** Set to "v1" to bring back the previous hero (kept in site/Hero.backup.tsx). */
const HERO_VERSION: "v1" | "v2" = "v2";
import { CategoryStrip, EditorsBlock, CategoryRow, InFocusBlock, MoreStoriesBlock, type StripItem } from "@/site/Blocks";
import { useQueries, useQuery } from "@tanstack/react-query";
import { categoryApi, newsApi } from "@/lib/endpoints";
import { GridSkeleton } from "@/site/cards";
import { ErrorState } from "@/components/ui";
import { useSeo } from "@/lib/seo";
import { articleHref, asObj, cn, dateOf, compact, fmtDate, img, isExternal } from "@/lib/utils";
import type { Article, Category, Gallery, GalleryRail, GalleryItem, HomeFeed, Homepage, Rail } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Curation helpers                                                    */
/* ------------------------------------------------------------------ */

const objects = (items?: (Article | string)[] | null): Article[] =>
  (items || []).filter((i): i is Article => !!i && typeof i === "object");

/**
 * A rail is curated when an editor set it to "manual" and picked stories;
 * otherwise (or when disabled-by-empty) the live feed fills it. A rail the
 * editor switched off renders nothing.
 */
function resolveRail(rail: Rail | undefined, fallback: Article[], size: number): { off: boolean; items: Article[] } {
  if (rail && rail.enabled === false) return { off: true, items: [] };
  if (rail?.mode === "manual") {
    const picked = objects(rail.items);
    if (picked.length) return { off: false, items: picked.slice(0, size) };
  }
  return { off: false, items: fallback.slice(0, size) };
}

/* ------------------------------------------------------------------ */
/* Snap Wall (gallery) — 2x2 tiles, optional ad/banner rails           */
/* ------------------------------------------------------------------ */

const RAIL_SPAN = {
  one: { narrow: "lg:col-span-3", medium: "lg:col-span-4", wide: "lg:col-span-5" },
  two: { narrow: "lg:col-span-2", medium: "lg:col-span-3", wide: "lg:col-span-4" },
};

/** Bento slots: tile 1 is the big one, tile 2 is wide, the rest are single cells. */
const TILE_SLOT = ["col-span-2 row-span-2", "col-span-2", "", ""];

function WallTile({ item, article, slot = "" }: { item?: GalleryItem; article?: Article; slot?: string }) {
  const art = article || asObj<Article>(item?.article as Article | string);
  const image = item?.image || art?.featuredImage?.url || art?.ogImage?.url || art?.gallery?.[0]?.url || "";
  const title = item?.title || art?.title || "";
  const cat = item?.category || asObj<Category>(art?.category as Category | string)?.name || "";
  const link = item?.link || (art ? articleHref(art) : "#");
  const external = isExternal(link);
  const big = slot.includes("row-span-2");
  const inner = (
    <>
      {image ? (
        <img src={img(image, big ? 1000 : 640)} alt={title} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-110" />
      ) : <div className="hero-ground absolute inset-0" />}
      <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/25 to-transparent transition group-hover:from-forest-950/95" />
      {cat && <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">{cat}</span>}
      <span className="absolute right-3 top-3 grid size-8 -translate-y-1 place-items-center rounded-full bg-leaf-400 text-[#04140d] opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <ArrowUpRight className="size-4" />
      </span>
      <div className="absolute inset-x-0 bottom-0 space-y-1 p-3.5 sm:p-4">
        <h3 className={cn("line-clamp-2 font-semibold leading-snug text-white transition group-hover:-translate-y-0.5", big ? "text-lg sm:text-2xl" : "text-[0.9rem] sm:text-base")}>{title}</h3>
        {art && <p className="text-[11px] text-white/65">{(art.views || 0) >= 20 ? `${compact(art.views || 0)} reads` : fmtDate(art.publishedDate || art.createdAt)}</p>}
      </div>
    </>
  );
  const cls = cn("group relative isolate block overflow-hidden rounded-2xl bg-forest-900 ring-1 ring-white/10 transition duration-300 hover:ring-leaf-400/60", slot);
  return external
    ? <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    : <Link to={link} className={cls}>{inner}</Link>;
}

function RailBox({ rail, side }: { rail: GalleryRail; side: "left" | "right" }) {
  const ad = useAdFor(rail.adPosition, undefined, rail.enabled && rail.type === "ad");
  if (!rail.enabled) return null;
  const fixed = rail.size !== "auto" ? { aspectRatio: rail.size.replace("x", " / ") } : undefined;

  let body: ReactNode = null;
  if (rail.type === "ad" && ad) body = ad.type === "script" ? <ScriptAd ad={ad} /> : <ImageAd ad={ad} position={rail.adPosition} />;
  if (rail.type === "banner" && rail.image) {
    const pic = <img src={img(rail.image, 600)} alt={rail.imageAlt || rail.heading} loading="lazy" decoding="async" className="h-auto w-full rounded-2xl object-cover" />;
    body = rail.link
      ? <a href={rail.link} target={rail.openInNewTab ? "_blank" : undefined} rel="noopener noreferrer sponsored">{pic}</a>
      : pic;
  }
  if (!body) return null;
  return (
    <aside data-side={side} className={cn("flex flex-col justify-start", rail.stretch && "lg:h-full")} style={fixed} aria-label="Sponsored">
      {rail.heading && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{rail.heading}</p>}
      {body}
    </aside>
  );
}

function SnapWall({ gallery, fallback }: { gallery?: Gallery; fallback: Article[] }) {
  const g = gallery;
  const leftAd = useAdFor(g?.rails.left.adPosition || "", undefined, !!g?.rails.left.enabled && g?.rails.left.type === "ad");
  const rightAd = useAdFor(g?.rails.right.adPosition || "", undefined, !!g?.rails.right.enabled && g?.rails.right.type === "ad");
  if (!g || g.enabled === false) return null;

  const has = (r: GalleryRail, ad: unknown) => r.enabled && (r.type === "ad" ? !!ad : !!r.image);
  const left = has(g.rails.left, leftAd);
  const right = has(g.rails.right, rightAd);
  const both = left && right;

  const manual = g.source === "manual" && g.items.length > 0;
  const tiles = manual
    ? g.items.slice(0, 4).map((item, i) => <WallTile key={i} item={item} slot={TILE_SLOT[i]} />)
    : fallback.slice(0, 4).map((a, i) => <WallTile key={a._id} article={a} slot={TILE_SLOT[i]} />);
  if (!tiles.length) return null;

  const span = (r: GalleryRail) => (both ? RAIL_SPAN.two : RAIL_SPAN.one)[r.width];

  return (
    <section className="container-x mt-12" aria-label={g.title}>
      <div className="on-dark hero-ground relative overflow-hidden rounded-[1.75rem] p-4 text-white sm:p-7">
        <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <span aria-hidden className="orb -right-10 -top-10 size-56 bg-leaf-500/25" />
        <div className="relative">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-leaf-400"><Sparkles className="size-3.5" /> Visual stories</p>
              <h2 className="text-[1.7rem] font-semibold leading-tight sm:text-[2.1rem]">{g.title}</h2>
              <p className="max-w-xl text-[0.9rem] text-white/65">{g.subtitle || "Frames from the stories everyone is watching right now."}</p>
            </div>
            <Link to={g.actionLink || "/gallery"} className="group inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-[13px] font-semibold backdrop-blur transition hover:border-leaf-400 hover:bg-leaf-400 hover:text-[#04140d]">
              {g.actionLabel || "Open the wall"} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            {left && <div className={span(g.rails.left)}><RailBox rail={g.rails.left} side="left" /></div>}
            <div className={cn(left && right ? "lg:col-span-8" : left || right ? "lg:col-span-9" : "lg:col-span-12")}>
              <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:grid-cols-4 lg:auto-rows-[190px] xl:auto-rows-[210px]">{tiles}</div>
            </div>
            {right && <div className={span(g.rails.right)}><RailBox rail={g.rails.right} side="right" /></div>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Newsletter band                                                     */
/* ------------------------------------------------------------------ */

function NewsletterBand() {
  return (
    <section className="container-x mt-10">
      <div className="hero-ground relative overflow-hidden rounded-2xl px-5 py-6 text-white sm:px-8">
        <div className="grid-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative flex flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <img src="/mark.webp" alt="" aria-hidden width={160} height={156} loading="lazy" className="w-11 shrink-0" />
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">One email a week. <span className="gradient-text">Zero noise.</span></h2>
              <p className="mt-0.5 text-[0.85rem] text-white/65">The sharpest tech and SaaS stories, delivered. Unsubscribe in one click.</p>
            </div>
          </div>
          <div className="w-full max-w-md shrink-0"><NewsletterForm dark source="homepage" /></div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function useCuration(feed?: HomeFeed, home?: Homepage, categories?: Category[], newest: Article[] = []) {
  return useMemo(() => {
    // Curated rails hold bare category ids; hydrate so cards can show category pills.
    const byId = new Map((categories || []).flatMap((c) => [c, ...(c.children || [])]).map((c) => [c._id, c]));
    const enrich = (a: Article): Article =>
      typeof a.category === "string" && byId.has(a.category) ? { ...a, category: byId.get(a.category) } : a;
    const list = (xs: Article[]) => xs.map(enrich);

    const s = home?.sections;
    const used = new Set<string>();
    const claim = (xs: Article[]) => { xs.forEach((x) => used.add(x._id)); return xs; };

    // Centre story: curated pick, else the editor-set main trending, else the feed's hero.
    const heroRail0 = resolveRail(s?.hero, home?.mainTrending ? [home.mainTrending] : feed?.hero ? [feed.hero] : [], 1);
    const lead = list(heroRail0.items)[0];
    if (lead) used.add(lead._id);

    // Four side stories (two per side). Curated rails are honoured exactly; on auto, the
    // editor's sub-trending picks lead and the live feed tops up to four without repeats.
    const pool = [...(feed?.featured || []), ...(feed?.trending || []), ...(feed?.editorsPick || []), ...(feed?.latest || [])];
    const autoSide = [...(home?.subTrending || []), ...pool];
    const side = resolveRail(s?.heroRail, autoSide, 40);
    const sideIds = new Set<string>();
    const sideList = list(side.items).filter((x) => {
      if (used.has(x._id) || sideIds.has(x._id)) return false;
      sideIds.add(x._id);
      return true;
    }).slice(0, 4);
    const heroSide = side.off ? [] : sideList;
    claim(heroSide);

    // Editor's picks: a five-story slider plus four cards beside it, then the In Focus carousel.
    // Curated rails are honoured exactly; on auto the live feed fills them without repeating
    // anything already shown higher up the page.
    const dedupe = (xs: Article[]) => { const seen = new Set<string>(); return xs.filter((x) => !seen.has(x._id) && seen.add(x._id)); };
    const editorsPool = dedupe([...(feed?.editorsPick || []), ...(feed?.featured || []), ...(feed?.trending || []), ...(feed?.latest || []), ...(feed?.popular || [])]);
    const fresh = (xs: Article[]) => xs.filter((x) => !used.has(x._id));

    const slider = resolveRail(s?.editorsPicks, fresh(editorsPool), 5);
    const sliderItems = slider.off ? [] : list(slider.items);
    claim(sliderItems);
    const editorsGrid = resolveRail(s?.editorsGrid, fresh(editorsPool), 4);
    const gridItems = editorsGrid.off ? [] : list(editorsGrid.items);
    claim(gridItems);
    const inFocus = resolveRail(s?.inFocus, fresh(editorsPool), 10);
    const inFocusItems = inFocus.off ? [] : list(inFocus.items);
    claim(inFocusItems);

    // Snap Wall (auto): the next four stories that have a picture and haven't appeared yet.
    const withPic = (xs: Article[]) => xs.filter((x) => x.featuredImage?.url);
    const wallItems = list(withPic(fresh(editorsPool))).slice(0, 4);
    if (wallItems.length < 4) wallItems.push(...list(withPic(editorsPool)).filter((x) => !wallItems.some((w) => w._id === x._id)).slice(0, 4 - wallItems.length));
    claim(wallItems);

    // Fed from stories not already shown higher up, so the page never repeats itself.
    // "More stories" auto = the 8 newest articles on the site, newest first.
    const more = resolveRail(s?.moreStories, [...newest].sort((a, b) => +new Date(dateOf(b)) - +new Date(dateOf(a))), 8);

    return {
      lead, heroLeft: heroSide.slice(0, 2), heroRight: heroSide.slice(2, 4),
      slider: sliderItems, editorsGrid: gridItems, inFocus: inFocusItems,
      more: more.off ? [] : list(more.items),
      breaking: list(feed?.breaking || []),
      wall: wallItems,
    };
  }, [feed, home, categories, newest]);
}

export default function Home() {
  const feedQ = useHomeFeed();
  const homeQ = useHomepage();
  const { data: tree } = useCategoryTree();
  const newestQ = useQuery({ queryKey: ["news", "newest-8"], queryFn: () => newsApi.list({ sort: "latest", limit: 8 }), staleTime: 2 * 60_000 });
  const c = useCuration(feedQ.data, homeQ.data, tree, newestQ.data?.data);

  useSeo({
    title: undefined,
    description: "Driftdine publishes sharp, fast-moving coverage of tech, SaaS, AI and the tools that run modern business.",
    jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "Driftdine", potentialAction: { "@type": "SearchAction", target: "/search?q={query}", "query-input": "required name=query" } },
  });

  const home = homeQ.data;
  const counts = useQuery({
    queryKey: ["categories", "counts-root"],
    queryFn: () => categoryApi.list({ withCounts: "true", parent: "root" }),
    staleTime: 10 * 60_000,
  });
  const strip = home?.categoryStrip;
  const stripItems: StripItem[] = (() => {
    const countOf = new Map((counts.data || []).map((x) => [x._id, x.articleCount]));
    const base: Category[] =
      strip?.mode === "manual" && strip.items.some((i) => typeof i === "object")
        ? strip.items.filter((i): i is Category => typeof i === "object" && i.status !== "inactive" && !i.hidden)
        : (tree || []).filter((t) => t.showOnHome !== false);
    return base.slice(0, 12).map((category) => ({ category, count: countOf.get(category._id) }));
  })();
  const sections = (home?.categorySections || [])
    .map((s) => ({ s, cat: asObj<Category>(s.category as Category | string) }))
    .filter((x): x is { s: typeof x.s; cat: Category } => !!x.cat);

  // No curated category sections? Fall back to the newest stories of the first few topics.
  const curated = sections.length > 0;
  const autoCats = curated ? [] : (tree || []).filter((t) => t.showOnHome !== false).slice(0, 3);
  const autoRows = useQueries({
    queries: autoCats.map((cat) => ({ queryKey: ["home-cat", cat.slug], queryFn: () => newsApi.list({ category: cat.slug, limit: 5, sort: "latest" }), staleTime: 5 * 60_000 })),
  });

  if (feedQ.isError && homeQ.isError) return <div className="container-x"><ErrorState error={feedQ.error} onRetry={() => { feedQ.refetch(); homeQ.refetch(); }} /></div>;

  const loading = feedQ.isLoading || homeQ.isLoading;

  return (
    <>
      {HERO_VERSION === "v1" ? <HeroSectionV1 lead={c.lead} left={c.heroLeft} right={c.heroRight} breaking={c.breaking} loading={feedQ.isLoading || homeQ.isLoading} /> : <HeroSection lead={c.lead} left={c.heroLeft} right={c.heroRight} breaking={c.breaking} loading={feedQ.isLoading || homeQ.isLoading} />}
      <div className="container-x mt-4"><AdSlot position="home-hero" /></div>
      <div className="container-x mt-4"><AdSlot position="home-top" /></div>
      <EditorsBlock slides={c.slider} grid={c.editorsGrid} eyebrow={home?.editorsText?.eyebrow} title={home?.editorsText?.title} subtitle={home?.editorsText?.subtitle} />
      {strip?.enabled !== false && <CategoryStrip items={stripItems} eyebrow={strip?.eyebrow} title={strip?.title} subtitle={strip?.subtitle} buttonLabel={strip?.buttonLabel} />}
      <InFocusBlock items={c.inFocus} eyebrow={home?.inFocusText?.eyebrow} title={home?.inFocusText?.title} subtitle={home?.inFocusText?.subtitle} />
      <div className="container-x mt-6"><AdSlot position="home-infeed" /></div>

      {loading ? (
        <div className="container-x mt-24"><GridSkeleton n={6} /></div>
      ) : (
        <>
          <div className="container-x mt-10"><AdSlot position="home-mid" /></div>
          <div className="container-x mt-6"><AdSlot position="home-gallery" /></div>
          <SnapWall gallery={home?.gallery} fallback={c.wall} />
          {sections.map(({ s, cat }) => {
            const lead = asObj<Article>(s.trending as Article | string | undefined) as Article | undefined;
            const subs = (s.subTrending || []).filter((x): x is Article => typeof x === "object");
            return <CategoryRow key={cat._id} category={cat} items={[...(lead ? [lead] : []), ...subs].map((x) => ({ ...x, category: cat }))} />;
          })}
          {autoCats.map((cat, i) => <CategoryRow key={cat._id} category={cat} items={(autoRows[i]?.data?.data || []).map((x) => ({ ...x, category: cat }))} />)}
          <MoreStoriesBlock items={c.more} />
          <div className="container-x mt-16"><AdSlot position="home-bottom" /></div>
        </>
      )}
      <NewsletterBand />
    </>
  );
}

import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, Eye, Zap } from "lucide-react";
import type { Article } from "@/lib/types";
import { articleHref, cn, catOf, compact, dateOf, img, srcSet, summary, timeAgo, categoryHref } from "@/lib/utils";

export function Cover({
  article, ratio = "aspect-[16/10]", width = 800, priority = false, sizes, className,
}: { article: Article; ratio?: string; width?: number; priority?: boolean; sizes?: string; className?: string }) {
  const url = article.featuredImage?.url || article.ogImage?.url;
  const cat = catOf(article);
  if (!url) {
    // Branded fallback so imageless stories still look intentional.
    return (
      <div className={cn("relative grid place-items-center overflow-hidden bg-forest-900", ratio, className)} aria-hidden>
        <div className="absolute inset-0 hero-ground opacity-90" />
        <img src="/mark.webp" alt="" width={56} height={55} className="relative size-14 opacity-90" loading="lazy" />
        {cat && <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-widest text-white/60">{cat.name}</span>}
      </div>
    );
  }
  return (
    <img
      src={img(url, width)}
      srcSet={srcSet(url, [width / 2, width, width * 1.5].map(Math.round))}
      sizes={sizes}
      alt={article.featuredImage?.alt || article.title}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("w-full bg-surface-2 object-cover", ratio, className)}
    />
  );
}

export const CategoryPill = ({ article, className }: { article: Article; className?: string }) => {
  const cat = catOf(article);
  if (!cat) return null;
  return (
    <Link
      to={categoryHref(cat)}
      className={cn("relative z-10 inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-brand transition hover:brightness-95", className)}
    >
      {cat.name}
    </Link>
  );
};

export const Meta = ({ article, className }: { article: Article; className?: string }) => (
  <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted", className)}>
    <time dateTime={dateOf(article)}>{timeAgo(dateOf(article))}</time>
    {!!article.readTime && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{article.readTime} min</span>}
    {!!article.views && article.views > 50 && <span className="inline-flex items-center gap-1"><Eye className="size-3" />{compact(article.views)}</span>}
  </p>
);

/** Whole-card link without nesting anchors: the title link stretches over the card. */
const Stretch = ({ article, children }: { article: Article; children: React.ReactNode }) => (
  <Link to={articleHref(article)} className="after:absolute after:inset-0 after:content-['']">{children}</Link>
);

/* Standard grid card */
export const ArticleCard = memo(function ArticleCard({ article, priority = false, className, ratio }: { article: Article; priority?: boolean; className?: string; ratio?: string }) {
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-card", className)}>
      <div className="overflow-hidden">
        <Cover article={article} priority={priority} ratio={ratio} sizes="(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw"
          className="transition duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <CategoryPill article={article} className="self-start" />
        <h3 className="text-[1.15rem] font-semibold leading-snug">
          <Stretch article={article}>{article.title}</Stretch>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{summary(article)}</p>
        <Meta article={article} className="mt-auto pt-1" />
      </div>
    </article>
  );
});

/* Horizontal row: thumb left, text right */
export const ArticleRow = memo(function ArticleRow({ article, thumb = "w-28 sm:w-40", className }: { article: Article; thumb?: string; className?: string }) {
  return (
    <article className={cn("group relative flex gap-4", className)}>
      <div className={cn("shrink-0 overflow-hidden rounded-xl", thumb)}>
        <Cover article={article} ratio="aspect-[4/3]" width={400} className="h-full transition duration-500 group-hover:scale-105" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <CategoryPill article={article} className="self-start !bg-transparent !p-0" />
        <h3 className="line-clamp-3 font-semibold leading-snug"><Stretch article={article}>{article.title}</Stretch></h3>
        <Meta article={article} />
      </div>
    </article>
  );
});

/* Numbered, text-only list item (trending / most read) */
export const RankItem = memo(function RankItem({ article, rank }: { article: Article; rank: number }) {
  return (
    <li className="group relative flex items-start gap-4 border-b border-line py-4 last:border-0">
      <span className="font-display text-4xl font-semibold leading-none text-muted/35 transition group-hover:text-brand">{String(rank).padStart(2, "0")}</span>
      <div className="min-w-0 space-y-1.5">
        <h3 className="line-clamp-2 font-semibold leading-snug"><Stretch article={article}>{article.title}</Stretch></h3>
        <Meta article={article} />
      </div>
    </li>
  );
});

/* Image-overlay tile (hero rail, wall) */
export const OverlayCard = memo(function OverlayCard({
  article, ratio = "aspect-[4/5]", priority = false, className, size = "md",
}: { article: Article; ratio?: string; priority?: boolean; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <article className={cn("group relative isolate overflow-hidden rounded-3xl bg-forest-900", className)}>
      <Cover article={article} ratio={cn(ratio, "h-full")} priority={priority} width={size === "lg" ? 1200 : 700}
        sizes={size === "lg" ? "(min-width:1024px) 60vw, 100vw" : "(min-width:1024px) 30vw, 100vw"}
        className="h-full transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/70 to-forest-950/5" />
      <div className={cn("absolute inset-x-0 bottom-0 flex flex-col gap-2.5 text-white", size === "lg" ? "p-6 sm:p-9" : "p-5")}>
        <CategoryPill article={article} className="self-start !bg-white/15 !text-white backdrop-blur" />
        <h3 className={cn("font-semibold leading-tight", size === "lg" ? "text-2xl sm:text-3xl lg:text-[2.1rem]" : size === "md" ? "text-xl" : "text-base")}>
          <Stretch article={article}>{article.title}</Stretch>
        </h3>
        {size === "lg" && <p className="line-clamp-2 max-w-2xl text-white/75">{summary(article, 200)}</p>}
        <Meta article={article} className="!text-white/65" />
      </div>
    </article>
  );
});

export const BreakingTag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
    <Zap className="size-3" />Breaking
  </span>
);

export const CardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-line bg-surface">
    <div className="skeleton aspect-[16/10] rounded-none" />
    <div className="space-y-3 p-5">
      <div className="skeleton h-5 w-20" /><div className="skeleton h-5 w-full" /><div className="skeleton h-5 w-2/3" />
    </div>
  </div>
);

export const GridSkeleton = ({ n = 6 }: { n?: number }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: n }, (_, i) => <CardSkeleton key={i} />)}</div>
);

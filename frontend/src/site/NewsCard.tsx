import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import type { Article } from "@/lib/types";
import { articleHref, catOf, categoryHref, cn, dateOf, fmtDate, summary } from "@/lib/utils";
import { UncroppedPhoto, catStyle } from "./Blocks";

/** Compact card: whole 3:2 picture (never cropped), category, 2-line title, date. */
export const NewsCard = memo(function NewsCard({ a, className }: { a: Article; className?: string }) {
  const c = catOf(a);
  const { icon: Icon, color } = catStyle(c);
  return (
    <article className={cn("group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop", className)}>
      <div className="relative p-1.5 pb-0">
        <UncroppedPhoto a={a} width={520} sizes="(min-width:1536px) 18vw, (min-width:1280px) 23vw, (min-width:768px) 31vw, 46vw" className="aspect-[3/2] w-full rounded-lg" />
        {!!a.readTime && (
          <span className="absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Clock className="size-2.5" aria-hidden /> {a.readTime}m
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-2.5">
        {c && (
          <Link to={categoryHref(c)} className="relative z-10 inline-flex w-fit items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] transition hover:opacity-75" style={{ color }}>
            <Icon className="size-3" aria-hidden /> {c.name}
          </Link>
        )}
        <h3 className="line-clamp-2 text-[0.92rem] font-semibold leading-snug transition group-hover:text-brand">
          <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
        </h3>
        <p className="hidden line-clamp-2 text-[0.8rem] leading-snug text-muted lg:block">{summary(a, 90)}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted"><Calendar className="size-3" aria-hidden />{fmtDate(dateOf(a))}</span>
          <ArrowRight className="size-3.5 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
        </div>
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: color }} />
    </article>
  );
});

/** Row version for the list view. */
export const NewsRow = memo(function NewsRow({ a }: { a: Article }) {
  const c = catOf(a);
  const { icon: Icon, color } = catStyle(c);
  return (
    <article className="group relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-line bg-surface p-2 pr-4 shadow-card transition duration-300 hover:translate-x-1 hover:border-brand/40 hover:shadow-pop">
      <UncroppedPhoto a={a} width={420} sizes="(min-width:640px) 190px, 38vw" className="aspect-[3/2] w-[38%] shrink-0 rounded-lg sm:w-[190px]" />
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        {c && (
          <Link to={categoryHref(c)} className="relative z-10 inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.1em] hover:opacity-75" style={{ color }}>
            <Icon className="size-3" aria-hidden /> {c.name}
          </Link>
        )}
        <h3 className="line-clamp-2 text-[0.98rem] font-semibold leading-snug transition group-hover:text-brand sm:text-[1.08rem]">
          <Link to={articleHref(a)} className="after:absolute after:inset-0">{a.title}</Link>
        </h3>
        <p className="hidden line-clamp-2 text-[0.85rem] leading-snug text-muted sm:block">{summary(a, 170)}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted">
          {a.author?.name && <span>By {a.author.name}</span>}
          <span className="inline-flex items-center gap-1.5"><Calendar className="size-3" aria-hidden />{fmtDate(dateOf(a))}</span>
          {!!a.readTime && <span className="inline-flex items-center gap-1.5"><Clock className="size-3" aria-hidden />{a.readTime} min</span>}
        </p>
      </div>
      <ArrowRight className="hidden size-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand sm:block" />
    </article>
  );
});

export const NewsCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-line bg-surface p-1.5">
    <div className="skeleton aspect-[3/2] rounded-lg" />
    <div className="space-y-2 p-2"><div className="skeleton h-3 w-16" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /></div>
  </div>
);

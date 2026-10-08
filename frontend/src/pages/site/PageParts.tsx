import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const wrap = "mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-8";

/** Shared page header: breadcrumb, label, big title, intro and optional right-hand content. */
export function PageHero({ crumb, label, icon, title, accent, intro, children }: {
  crumb: string; label: string; icon: ReactNode; title: string; accent?: string; intro?: string; children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-soft/70 to-bg">
      <div aria-hidden className="orb -right-12 -top-16 size-64 bg-leaf-500/20" />
      <div aria-hidden className="orb -left-16 bottom-0 size-48 bg-leaf-300/25 [animation-delay:-4s]" />
      <div className={cn(wrap, "relative py-7 sm:py-10")}>
        <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-muted"><Link to="/" className="hover:text-brand">Home</Link> / <span className="font-medium text-fg">{crumb}</span></nav>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow !text-[11px]">{icon} {label}</p>
            <h1 className="mt-2 text-[clamp(2.1rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-tight">{title} {accent && <span className="gradient-text">{accent}</span>}</h1>
            {intro && <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">{intro}</p>}
          </div>
          {children}
        </div>
      </div>
    </header>
  );
}

export const Card = ({ className, children, id }: { className?: string; children: ReactNode; id?: string }) => (
  <div id={id} className={cn("rounded-2xl border border-line bg-surface shadow-card", className)}>{children}</div>
);

export const IconBadge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand", className)}>{children}</span>
);

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {items.map((x) => (
        <details key={x.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.97rem] font-semibold transition hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden">
            {x.q}
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition group-open:rotate-45">+</span>
          </summary>
          <p className="px-5 pb-4 text-[0.92rem] leading-relaxed text-muted">{x.a}</p>
        </details>
      ))}
    </div>
  );
}

export interface LegalSection { id: string; title: string; body: ReactNode }

/** Long-form legal layout with a sticky "on this page" list. */
export function LegalLayout({ sections, updated }: { sections: LegalSection[]; updated: string }) {
  return (
    <div className={cn(wrap, "grid gap-8 py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-10")}>
      <aside className="lg:sticky lg:top-[88px] lg:self-start">
        <Card className="overflow-hidden">
          <p className="border-b border-line px-4 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-muted">On this page</p>
          <ol className="p-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}><a href={`#${s.id}`} className="flex gap-2.5 rounded-lg px-3 py-2 text-muted transition hover:bg-brand-soft hover:text-brand"><span className="tabular-nums opacity-60">{i + 1}.</span>{s.title}</a></li>
            ))}
          </ol>
        </Card>
        <p className="mt-3 px-1 text-xs text-muted">Last updated: {updated}</p>
      </aside>
      <div className="min-w-0 space-y-4">
        {sections.map((s, i) => (
          <Card key={s.id} className="scroll-mt-24 p-5 sm:p-7">
            <section id={s.id}>
              <h2 className="mb-3 flex items-center gap-3 text-[1.3rem] font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{i + 1}</span>{s.title}</h2>
              <div className="prose prose-article max-w-none text-[0.97rem] leading-relaxed prose-p:my-3 prose-li:my-1">{s.body}</div>
            </section>
          </Card>
        ))}
      </div>
    </div>
  );
}

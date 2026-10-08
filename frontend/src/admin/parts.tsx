import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { ArticleStatus } from "@/lib/types";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const Panel = ({ title, description, actions, children, className }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn("card", className)}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
        {actions}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: "brand" | "warn" | "info" | "danger" }) {
  const tones = { brand: "bg-brand-soft text-brand", warn: "bg-warn/15 text-warn", info: "bg-sky-500/15 text-sky-600 dark:text-sky-300", danger: "bg-danger/15 text-danger" };
  return (
    <div className="card flex items-start gap-4 p-5">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tones[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="font-display text-3xl font-semibold leading-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

const statusTone: Record<ArticleStatus, "brand" | "neutral" | "warn" | "danger" | "info"> = {
  published: "brand", draft: "neutral", scheduled: "info", archived: "warn", trash: "danger",
};
export const StatusBadge = ({ status = "published" }: { status?: ArticleStatus }) => <Badge tone={statusTone[status]} className="capitalize">{status}</Badge>;

export const Table = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("overflow-x-auto", className)}>
    <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
  </div>
);
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn("whitespace-nowrap border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted", className)}>{children}</th>
);
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn("border-b border-line/70 px-4 py-3 align-middle", className)}>{children}</td>
);

export const Checkbox = ({ checked, onChange, label, indeterminate }: { checked: boolean; onChange: (v: boolean) => void; label: string; indeterminate?: boolean }) => (
  <input
    type="checkbox" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)}
    ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked; }}
    className="size-4 cursor-pointer rounded border-line accent-[var(--brand)]"
  />
);

export const Tabs = <T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (t: T) => void }) => (
  <div role="tablist" className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
    {tabs.map((t) => (
      <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
        className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-medium transition", value === t.id ? "bg-brand text-brand-fg" : "text-muted hover:bg-surface-2 hover:text-fg")}>
        {t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
      </button>
    ))}
  </div>
);

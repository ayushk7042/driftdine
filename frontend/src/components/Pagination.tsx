import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as P } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Pagination({ pagination, onPage, className }: { pagination?: P; onPage: (page: number) => void; className?: string }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages } = pagination;

  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  const btn = "grid size-10 place-items-center rounded-full border text-sm font-medium transition";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1.5", className)}>
      <button className={cn(btn, "border-line hover:border-brand disabled:opacity-40")} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(btn, n === page ? "border-transparent gradient-brand text-[#04140d]" : "border-line hover:border-brand")}
          >
            {n}
          </button>
        )
      )}
      <button className={cn(btn, "border-line hover:border-brand disabled:opacity-40")} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

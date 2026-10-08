import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Mark (cropped from the brand sheet) + live wordmark, so it re-colours per theme. */
export function Logo({
  size = 36, tagline = false, to = "/", className, invert = false,
}: { size?: number; tagline?: boolean; to?: string; className?: string; invert?: boolean }) {
  return (
    <Link to={to} aria-label="Driftdine home" className={cn("group inline-flex items-center gap-2.5", className)}>
      <img
        src="/mark.webp"
        alt=""
        width={size}
        height={Math.round(size * 0.973)}
        decoding="async"
        className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn("font-display text-[1.55rem] font-semibold tracking-tight", invert ? "on-dark text-white" : "text-fg")}
          style={{ fontSize: size * 0.62 }}
        >
          Drift<span className="gradient-text">dine</span>
        </span>
        {tagline && (
          <span className={cn("mt-1 text-[8.5px] font-medium uppercase tracking-[0.3em]", invert ? "text-white/60" : "text-muted")}>
            Explore · Learn · Stay ahead
          </span>
        )}
      </span>
    </Link>
  );
}

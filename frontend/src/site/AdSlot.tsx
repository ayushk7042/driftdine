import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { adsApi } from "@/lib/endpoints";
import { beacon } from "@/lib/api";
import { cn, img, isExternal } from "@/lib/utils";
import type { Ad } from "@/lib/types";

const device = () => (window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");

/** Max heights per slot so a huge upload can't blow a leaderboard up. */
const SLOT_CAP: Record<string, number> = {
  "home-top": 140, "home-hero": 160, "home-mid": 160, "home-infeed": 280, "home-bottom": 160,
  "article-top": 140, "article-bottom": 160, "category-top": 140, footer: 120, "mobile-sticky-bottom": 90,
  "article-sidebar-top": 600, "article-sidebar-middle": 600, "article-sidebar-bottom": 600,
};

export function ScriptAd({ ad }: { ad: Ad }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !ad.scriptCode) return;
    host.innerHTML = "";
    // innerHTML never executes <script>; re-create each one so AdSense/GAM tags run.
    const tpl = document.createElement("template");
    tpl.innerHTML = ad.scriptCode;
    tpl.content.childNodes.forEach((node) => {
      if (node.nodeName === "SCRIPT") {
        const src = node as HTMLScriptElement;
        const s = document.createElement("script");
        for (const a of Array.from(src.attributes)) s.setAttribute(a.name, a.value);
        s.text = src.text;
        host.appendChild(s);
      } else host.appendChild(node.cloneNode(true));
    });
  }, [ad.scriptCode]);
  return <div ref={ref} className="flex justify-center" />;
}

export function ImageAd({ ad, position }: { ad: Ad; position: string }) {
  const url = ad.image?.url;
  if (!url) return null;
  const cap = ad.maxHeight || SLOT_CAP[position];
  const frame = ad.display === "frame";
  const picture = (
    <img
      src={img(url, 1200)}
      alt={ad.image?.alt || ad.name}
      loading="lazy"
      decoding="async"
      width={ad.image?.width}
      height={ad.image?.height}
      style={cap ? { maxHeight: cap } : undefined}
      className={cn("mx-auto rounded-xl", frame ? "h-full w-full object-contain" : "h-auto w-full object-contain")}
    />
  );
  if (!ad.targetUrl) return picture;
  const external = isExternal(ad.targetUrl);
  return (
    <a
      href={ad.targetUrl}
      target={ad.openInNewTab ? "_blank" : undefined}
      rel={external ? "sponsored noopener noreferrer" : undefined}
      onClick={() => beacon(`/ads/${ad._id}/click`)}
      className="block"
    >
      {picture}
    </a>
  );
}

/**
 * Renders the highest-priority booked creative for a position, or nothing —
 * an unsold slot collapses completely so layouts never show a blank hole.
 */
export const useAdFor = (position: string, category?: string, enabled = true) => {
  const { data } = useQuery({
    queryKey: ["ad", position, category, device()],
    queryFn: () => adsApi.serve({ position, device: device(), category }),
    staleTime: 5 * 60_000,
    enabled,
  });
  return data?.[0];
};

export function AdSlot({ position, category, className, label = true }: { position: string; category?: string; className?: string; label?: boolean }) {
  const ad = useAdFor(position, category);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (ad && seen.current !== ad._id) {
      seen.current = ad._id;
      beacon(`/ads/${ad._id}/impression`);
    }
  }, [ad]);

  if (!ad) return null;
  return (
    <aside aria-label="Advertisement" className={cn("w-full", className)}>
      {label && <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted/70">Advertisement</p>}
      {ad.type === "script" ? <ScriptAd ad={ad} /> : <ImageAd ad={ad} position={position} />}
    </aside>
  );
}

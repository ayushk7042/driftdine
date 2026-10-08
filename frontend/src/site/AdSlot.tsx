import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { adDevice, adsQueryKey, fetchAllAds, readAdsCache } from "@/lib/adsStore";
import { beacon } from "@/lib/api";
import { AD_SPECS, type AdSpec } from "@/lib/adSpecs";
import { cn, img, isExternal } from "@/lib/utils";
import type { Ad } from "@/lib/types";

const ROTATE_MS = 7000;

/* ------------------------------------------------------------------ */
/* Shared disclosure — one component so it can never drift             */
/* ------------------------------------------------------------------ */

export const AdLabel = () => (
  <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted">Advertisement</p>
);

/* ------------------------------------------------------------------ */
/* Data: every booking is loaded once (before first paint); a slot just  */
/* picks its own position out of that list                               */
/* ------------------------------------------------------------------ */

export function useAds(position: string, category?: string, enabled = true) {
  const device = adDevice();
  const q = useQuery({
    queryKey: adsQueryKey(device),
    queryFn: () => fetchAllAds(device),
    staleTime: 5 * 60_000,
    initialData: () => readAdsCache(device),
    initialDataUpdatedAt: 0, // cached copy shows instantly and is refreshed in the background
  });
  const on = enabled && !!position;
  const ads = on
    ? (q.data || []).filter((a) => a.position === position && (!category || !a.categories?.length || a.categories.some((c) => (typeof c === "string" ? c : c._id) === category)))
    : [];
  return { ads, pending: on && q.data === undefined };
}

/* ------------------------------------------------------------------ */
/* Script creatives (AdSense / GAM) — injected as-is, keep own size    */
/* ------------------------------------------------------------------ */

function ScriptAd({ ad }: { ad: Ad }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !ad.scriptCode) return;
    host.innerHTML = "";
    // innerHTML never runs <script>; re-create each so ad tags execute.
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

/* ------------------------------------------------------------------ */
/* Image creative: never cropped, never stretched, never enlarged       */
/* ------------------------------------------------------------------ */

function boxFor(ad: Ad, spec: AdSpec): CSSProperties {
  const [fw, fh] = spec.fallback;
  const w = ad.image?.width || fw;
  const h = ad.image?.height || fh;
  const ratio = `${w} / ${h}`;
  const own = ad.maxHeight && ad.maxHeight > 0 ? ad.maxHeight : undefined;

  switch (spec.group) {
    case "A": {
      const H = own ?? spec.height ?? 250;
      // scales smoothly: H on desktop, down to half of H on small screens
      return { width: "100%", height: `clamp(${H / 2}px, ${(H / 1400) * 100}vw, ${H}px)` };
    }
    case "B":
      return { width: "100%", aspectRatio: "1 / 1" };
    case "C": {
      const cap = own ?? spec.cap ?? 240;
      const drawW = Math.min(w, cap * (w / h)) * (spec.scale ?? 1); // own pixel width, height ≤ cap
      return { width: `min(100%, ${drawW}px)`, aspectRatio: ratio, marginInline: "auto" };
    }
    default: {
      const drawW = own ? Math.min(w, own * (w / h)) : w; // own size; shrinks only with the column
      return { width: `min(100%, ${drawW}px)`, aspectRatio: ratio, marginInline: "auto" };
    }
  }
}

function Creative({ ad, spec, position }: { ad: Ad; spec: AdSpec; position: string }) {
  if (ad.type === "script") return <ScriptAd ad={ad} />;
  const url = ad.image?.url;
  if (!url) return null;

  const picture = (
    <div
      style={boxFor(ad, spec)}
      className="flex items-center justify-center overflow-hidden rounded-xl bg-[var(--ad-tint)]"
    >
      <img
        src={img(url, 2400)}
        alt={ad.image?.alt || ad.name}
        width={ad.image?.width}
        height={ad.image?.height}
        loading={position === "home-top" ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="block h-auto max-h-full w-auto max-w-full object-contain"
      />
    </div>
  );

  const framed = position === "home-top"
    ? <div className="hero-band rounded-xl px-2 py-2 sm:px-3">{picture}</div>
    : picture;

  if (!ad.targetUrl) return framed;
  return (
    <a
      href={ad.targetUrl}
      target={ad.openInNewTab === false ? undefined : "_blank"}
      rel={isExternal(ad.targetUrl) ? "noopener noreferrer sponsored" : "sponsored"}
      onClick={() => beacon(`/ads/${ad._id}/click`)}
      className="block"
    >
      {framed}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Slot: one ad = static, several = rotate every 7s                     */
/* ------------------------------------------------------------------ */

export function AdSlotView({ ads, position, className, wrap }: { ads: Ad[]; position: string; className?: string; wrap?: (content: ReactNode) => ReactNode }) {
  const spec = AD_SPECS[position] || AD_SPECS["home-mid"];
  const n = ads.length;
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [hold, setHold] = useState(false);
  const idx = n ? i % n : 0;
  const ad = ads[idx];

  useEffect(() => {
    if (n < 2 || hold) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { setI((x) => (x + 1) % n); setTick((x) => x + 1); }, ROTATE_MS);
    return () => clearInterval(t);
  }, [n, hold]);

  // one impression per appearance (every rotation counts)
  const counted = useRef("");
  useEffect(() => {
    if (!ad) return;
    const k = `${ad._id}:${tick}`;
    if (counted.current === k) return;
    counted.current = k;
    beacon(`/ads/${ad._id}/impression`);
  }, [ad, tick]);

  if (!ad) return null;

  const body = (
    <aside
      aria-label="Advertisement"
      data-ad-position={position}
      className={cn("w-full", spec.hideFromLg && "lg:hidden", className)}
      onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)} onBlur={() => setHold(false)}
    >
      <AdLabel />
      <Creative key={ad._id} ad={ad} spec={spec} position={position} />
      {n > 1 && (
        <div className="mt-1.5 flex justify-center gap-1" role="tablist" aria-label="Choose advertisement">
          {ads.map((a, k) => (
            <button
              key={a._id} role="tab" aria-selected={k === idx} aria-label={`Advertisement ${k + 1} of ${n}`}
              onClick={() => { setI(k); setTick((x) => x + 1); }}
              className="grid size-4 place-items-center"
            >
              <span className={cn("block size-1.5 rounded-full transition", k === idx ? "bg-brand" : "bg-fg/25")} />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
  return <>{wrap ? wrap(body) : body}</>;
}

export function AdSlot({ position, category, className }: { position: string; category?: string; className?: string }) {
  const { ads } = useAds(position, category);
  return <AdSlotView ads={ads} position={position} className={className} />;
}

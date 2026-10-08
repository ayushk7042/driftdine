import { useEffect } from "react";

const SITE = "Driftdine";
const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || "").replace(/\/$/, "");

interface SeoInput {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  robots?: string;
  type?: "website" | "article";
  jsonLd?: unknown;
}

const setMeta = (selector: string, attr: "name" | "property", key: string, value?: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!value) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
};

/** Per-route head management — small enough to skip a helmet dependency. */
export function useSeo({ title, description, image, canonical, robots, type = "website", jsonLd }: SeoInput) {
  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : `${SITE} — Explore. Learn. Stay ahead.`;
    document.title = full;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", robots);
    setMeta('meta[property="og:title"]', "property", "og:title", full);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:image"]', "property", "og:image", image || `${SITE_URL}/og.jpg`);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", full);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    } else {
      link?.remove();
    }

    let script = document.head.querySelector<HTMLScriptElement>("script[data-dd-jsonld]");
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.ddJsonld = "1";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else {
      script?.remove();
    }
  }, [title, description, image, canonical, robots, type, jsonLd]);
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

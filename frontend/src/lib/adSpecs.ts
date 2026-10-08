/**
 * Single source of truth for every advertisement placement: how it is sized on the
 * site, where it appears, and what artwork to ask advertisers for. The site renderer
 * and the admin panel both read this.
 */
export type AdGroup = "A" | "B" | "C" | "D";

export interface AdSpec {
  group: AdGroup;
  /** Group A: desktop box height in px. */
  height?: number;
  /** Group C: image is drawn at most this tall (px) unless the booking sets its own max height. */
  cap?: number;
  /** Group C: only `home-top` is drawn larger than the creative. */
  scale?: number;
  /** Phones and tablets only. */
  hideFromLg?: boolean;
  /** Used to reserve space when a booking has no stored pixel size. */
  fallback: [number, number];
  where: string;
  artwork: string;
}

export const AD_SPECS: Record<string, AdSpec> = {
  // Group A — fixed full-width box, whole image centred on a light tint
  "home-hero": { group: "A", height: 250, fallback: [1600, 280], where: "Home, directly under the hero", artwork: "1600×280 (2× for sharp screens)" },
  "home-infeed": { group: "A", height: 250, fallback: [1600, 280], where: "Home, just before “More stories”", artwork: "1600×280 (2× for sharp screens)" },
  "category-top": { group: "A", height: 250, fallback: [1600, 280], where: "Category and News listing pages, above the stories", artwork: "1600×280 (2× for sharp screens)" },
  "home-bottom": { group: "A", height: 230, fallback: [1600, 255], where: "Home, above the footer", artwork: "1600×255 (2× for sharp screens)" },

  // Group B — square rails beside the Snap Wall
  "home-gallery-left": { group: "B", fallback: [1000, 1000], where: "Home, left of the Snap Wall photo tiles", artwork: "1000×1000 square" },
  "home-gallery-right": { group: "B", fallback: [1000, 1000], where: "Home, right of the Snap Wall photo tiles", artwork: "1000×1000 square" },

  // Group C — standard banners, image at its own size, up to 240px tall
  "home-top": { group: "C", cap: 240, scale: 1.25, fallback: [1456, 240], where: "Home, very top above the hero (drawn 1.25× larger)", artwork: "1456×240" },
  "home-mid": { group: "C", cap: 240, fallback: [1456, 240], where: "Home, between the Snap Wall and the category sections", artwork: "1456×240" },
  footer: { group: "C", cap: 240, fallback: [1456, 240], where: "Every page, directly above the footer columns", artwork: "1456×240" },
  "category-infeed": { group: "C", cap: 240, fallback: [1456, 240], where: "Inside a listing page’s feed", artwork: "1456×240" },
  "article-top": { group: "C", cap: 240, fallback: [1456, 240], where: "Article page, above the headline", artwork: "1456×240" },
  "article-inline": { group: "C", cap: 240, fallback: [1456, 240], where: "Article page, inside the body copy", artwork: "1456×240" },
  "article-bottom": { group: "C", cap: 240, fallback: [1456, 240], where: "Article page, below the body before related stories", artwork: "1456×240" },
  "mobile-sticky-bottom": { group: "C", cap: 240, hideFromLg: true, fallback: [640, 100], where: "Phones and tablets only, pinned to the bottom", artwork: "640×100" },

  // Group D — sidebar slots, image at its own size, no height cap
  "article-sidebar-top": { group: "D", fallback: [900, 900], where: "Article page, top of the right column", artwork: "900×900 or 900×1200" },
  "article-sidebar-middle": { group: "D", fallback: [900, 900], where: "Article page, between the table of contents and “Popular now”", artwork: "900×900 or 900×1200" },
  "article-sidebar-bottom": { group: "D", fallback: [900, 900], where: "Article page, below the related stories", artwork: "900×900 or 900×1200" },
  sidebar: { group: "D", fallback: [900, 900], where: "Right column on article and category pages", artwork: "900×900 or 900×1200" },
  "sidebar-sticky": { group: "D", fallback: [900, 1200], where: "Sticky half-page unit in the right column", artwork: "900×1200" },
};

export const AD_GROUP_LABEL: Record<AdGroup, string> = {
  A: "Fixed full-width banner",
  B: "Square rail",
  C: "Standard banner (max 240px tall)",
  D: "Sidebar (own size)",
};

/** Keys offered in the admin panel — the legacy `home-gallery` slot is intentionally absent. */
export const AD_POSITION_KEYS = Object.keys(AD_SPECS);

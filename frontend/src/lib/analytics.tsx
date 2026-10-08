import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

/**
 * Single-page apps never reload, so Google Analytics only sees the first page.
 * This sends a page_view on every route change (admin pages are left out).
 */
export function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    // wait a beat so the page has set its own <title>
    const t = setTimeout(() => {
      window.gtag?.("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: pathname + search,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return null;
}

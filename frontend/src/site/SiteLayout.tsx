import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AdSlot } from "./AdSlot";
import { PageLoader } from "@/components/ui";

export function SiteLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-fg">Skip to content</a>
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
      </main>
      <Footer />
      <div className="sticky bottom-0 z-40 lg:hidden"><AdSlot position="mobile-sticky-bottom" className="bg-bg/95 px-2 pb-1 pt-1 backdrop-blur" /></div>
    </div>
  );
}

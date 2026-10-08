import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "./Newsletter";
import { AdSlot } from "./AdSlot";
import { useCategoryTree } from "./queries";

export function Footer() {
  const { data: tree } = useCategoryTree();
  const cats = (tree || []).filter((c) => c.showInFooter).slice(0, 8);
  const list = cats.length ? cats : (tree || []).slice(0, 8);

  const col = "space-y-3 text-sm";
  const a = "text-white/65 transition hover:text-leaf-300";

  return (
    <footer className="on-dark mt-12 bg-forest-950 text-white">
      <div className="container-x pt-10"><AdSlot position="footer" /></div>
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-6">
          <Logo size={40} tagline invert />
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            Sharp, independent coverage of tech, SaaS and the tools that run modern business — built for people who want to stay ahead.
          </p>
          <div className="max-w-sm">
            <p className="mb-3 text-sm font-semibold">Get the weekly drift</p>
            <NewsletterForm dark compact source="footer" />
          </div>
        </div>

        <nav className={col} aria-label="Topics">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-300">Topics</h4>
          {list.map((c) => <Link key={c._id} to={`/category/${c.slug}`} className={`block ${a}`}>{c.name}</Link>)}
          <Link to="/categories" className={`block ${a}`}>All topics →</Link>
        </nav>

        <nav className={col} aria-label="Discover">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-300">Discover</h4>
          <Link to="/news" className={`block ${a}`}>Latest stories</Link>
          <Link to="/tags" className={`block ${a}`}>Browse tags</Link>
          <Link to="/explore" className={`block ${a}`}>Explore by region</Link>
          <Link to="/gallery" className={`block ${a}`}>Snap Wall</Link>
          <Link to="/search" className={`block ${a}`}>Search</Link>
        </nav>

        <nav className={col} aria-label="Company">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-300">Company</h4>
          <Link to="/about" className={`block ${a}`}>About</Link>
          <Link to="/contact" className={`block ${a}`}>Contact</Link>
          <Link to="/newsletter" className={`block ${a}`}>Newsletter</Link>
          <Link to="/privacy" className={`block ${a}`}>Privacy</Link>
          <Link to="/terms" className={`block ${a}`}>Terms</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} Driftdine. All rights reserved.</p>
          <p className="tracking-[0.28em] uppercase">Explore · Learn · Stay ahead</p>
        </div>
      </div>
    </footer>
  );
}

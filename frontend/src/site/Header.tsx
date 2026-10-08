import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, Mail, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Spinner } from "@/components/ui";
import { newsApi } from "@/lib/endpoints";
import { articleHref, catOf, cn, debounce, img } from "@/lib/utils";
import { useCategoryTree } from "./queries";

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const setTermDebounced = useRef(debounce(setTerm, 220)).current;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ["typeahead", term],
    queryFn: ({ signal }) => newsApi.search(term, 6, signal),
    enabled: term.trim().length > 1,
    staleTime: 60_000,
  });

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-forest-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative mx-auto mt-[8vh] w-[min(720px,calc(100%-2rem))] animate-fade-up">
        <form onSubmit={go} className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-5 shadow-pop">
          <Search className="size-5 text-muted" />
          <input
            ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setTermDebounced(e.target.value); }}
            placeholder="Search articles, tools, topics…" aria-label="Search"
            className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-muted/70"
          />
          {isFetching ? <Spinner /> : <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted sm:block">ESC</kbd>}
        </form>

        {term.trim().length > 1 && (
          <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface shadow-pop">
            {data?.length ? (
              <ul>
                {data.map((a) => (
                  <li key={a._id}>
                    <Link to={articleHref(a)} onClick={onClose} className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2">
                      {a.featuredImage?.url && <img src={img(a.featuredImage.url, 160)} alt="" width={64} height={48} className="h-12 w-16 rounded-lg object-cover" loading="lazy" />}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.title}</span>
                        <span className="text-xs text-muted">{catOf(a)?.name}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                <li className="border-t border-line">
                  <button onClick={go} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-brand hover:bg-surface-2">
                    See all results for “{q}” <ArrowRight className="size-4" />
                  </button>
                </li>
              </ul>
            ) : !isFetching ? (
              <p className="px-5 py-6 text-sm text-muted">No quick matches. Press Enter to search everything.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [topics, setTopics] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number; show: boolean }>({ left: 0, width: 0, show: false });
  const { pathname } = useLocation();

  /** A single highlight pill glides to whichever nav item the pointer is on. */
  const glide = (e: RMouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    const nav = navRef.current;
    if (!nav) return;
    const a = e.currentTarget.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    setInd({ left: a.left - n.left, width: a.width, show: true });
  };
  const unglide = () => setInd((i) => ({ ...i, show: false }));
  const { data: tree } = useCategoryTree();
  const all = (tree || []).filter((c) => c.showInMenu !== false);
  const menu = all.slice(0, 6);

  useEffect(() => { setOpen(false); setTopics(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); }
      if (e.key === "Escape") setTopics(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const link = ({ isActive }: { isActive: boolean }) => cn("nav-link", isActive && "is-active");

  return (
    <>
      <header className={cn("nav-bar sticky top-0 z-50 backdrop-blur-xl", scrolled && "is-scrolled")}>
        <div className="mx-auto flex h-[68px] w-full max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8 xl:gap-8 xl:px-12">
          <Logo size={38} />

          <nav ref={navRef} onMouseLeave={unglide} className="relative ml-2 hidden items-center gap-1 lg:flex xl:ml-5" aria-label="Primary">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1 rounded-full border border-brand/25 bg-gradient-to-r from-leaf-300/35 via-leaf-500/20 to-leaf-300/35 shadow-[0_6px_18px_-8px_rgb(47_195_134/0.7)] transition-[left,width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ left: ind.left, width: ind.width, opacity: ind.show ? 1 : 0, transform: ind.show ? "scale(1)" : "scale(0.85)" }}
            />
            <NavLink to="/news" onMouseEnter={glide} onFocus={glide} className={(st) => link({ isActive: st.isActive || pathname === "/" })}>Latest</NavLink>
            {menu.map((c, i) => (
              <NavLink key={c._id} to={`/category/${c.slug}`} onMouseEnter={glide} onFocus={glide} className={(st) => cn(link(st), i >= 4 && "hidden 2xl:inline-flex")}>{c.shortLabel || c.name}</NavLink>
            ))}
            <div className="relative" onMouseLeave={() => setTopics(false)}>
              <button
                onClick={() => setTopics((o) => !o)} onMouseEnter={(e) => { setTopics(true); glide(e); }} onFocus={glide} aria-expanded={topics} aria-haspopup="menu"
                className={cn("nav-link", topics && "is-active")}
              >
                All topics <ChevronDown className={cn("size-4 transition-transform duration-300", topics && "rotate-180")} />
              </button>
              {topics && (
                <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3"><div role="menu" className="animate-fade-up rounded-2xl border border-line bg-surface p-2 shadow-pop ring-1 ring-brand/10">
                  {all.map((c) => (
                    <Link key={c._id} to={`/category/${c.slug}`} role="menuitem" className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition hover:translate-x-0.5 hover:bg-brand-soft hover:text-brand">
                      <span className="flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-brand/50 transition group-hover:scale-150 group-hover:bg-brand" />{c.name}</span><ArrowRight className="size-3.5 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:text-brand group-hover:opacity-100" />
                    </Link>
                  ))}
                  <Link to="/categories" role="menuitem" className="mt-1 block rounded-xl bg-brand-soft px-3 py-2.5 text-center text-sm font-semibold text-brand">Browse all topics</Link>
                </div></div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setSearch(true)} aria-label="Search"
              className="group hidden h-11 w-[230px] items-center gap-2.5 rounded-full border border-brand/20 bg-surface/70 px-4 text-sm text-muted shadow-sm transition duration-200 hover:border-brand hover:bg-surface hover:text-fg hover:shadow-[0_0_0_4px_rgb(47_195_134/0.14)] xl:flex 2xl:w-[330px]"
            >
              <Search className="size-4 text-brand transition group-hover:scale-110" /> <span className="truncate">Search articles, topics…</span><kbd className="ml-auto hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted 2xl:block">⌘K</kbd>
            </button>
            <button onClick={() => setSearch(true)} className="grid size-10 place-items-center rounded-full border border-brand/20 bg-surface/70 text-brand transition hover:border-brand hover:shadow-[0_0_0_4px_rgb(47_195_134/0.14)] xl:hidden" aria-label="Search"><Search className="size-[18px]" /></button>
            <ThemeToggle />
            <Link to="/newsletter" className="group relative hidden h-11 items-center gap-2 overflow-hidden rounded-xl gradient-brand px-5 text-sm font-semibold text-[#04140d] shadow-[0_8px_22px_-10px_rgb(47_195_134/0.9)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgb(47_195_134/1)] hover:brightness-105 active:translate-y-0 md:inline-flex">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-white/40 opacity-0 group-hover:animate-[sweep_0.8s_ease] group-hover:opacity-100" />
              <Mail className="size-4 transition group-hover:-rotate-12 group-hover:scale-110" /> Subscribe <ArrowRight className="-ml-1 size-0 opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:size-4 group-hover:opacity-100" />
            </Link>
            <button onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full border border-brand/20 bg-surface/70 transition hover:border-brand lg:hidden" aria-label="Menu" aria-expanded={open}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-line bg-surface/95 px-4 pb-4 pt-2 backdrop-blur-xl lg:hidden">
            <nav className="animate-fade-up" aria-label="Mobile">
              {[{ to: "/news", label: "Latest" }, ...all.map((c) => ({ to: `/category/${c.slug}`, label: c.name })),
                { to: "/categories", label: "All topics" }, { to: "/explore", label: "Explore" }, { to: "/gallery", label: "Snap Wall" }, { to: "/contact", label: "Contact" }].map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => cn("block rounded-xl px-4 py-3 text-[15px] font-medium", isActive ? "bg-brand-soft text-brand" : "hover:bg-surface-2")}>{l.label}</NavLink>
              ))}
              <Link to="/newsletter" className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-fg"><Mail className="size-4" /> Subscribe</Link>
            </nav>
          </div>
        )}
      </header>
      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}

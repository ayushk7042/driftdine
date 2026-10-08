import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bot, ExternalLink, FileSpreadsheet, FolderTree, Image as ImageIcon, LayoutDashboard, LayoutTemplate,
  LogOut, Mail, Megaphone, Menu, Newspaper, PenSquare, Tags, Users, X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { dashboardApi } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

const groups = [
  { label: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  { label: "Content", items: [
    { to: "/admin/articles", label: "Articles", icon: Newspaper },
    { to: "/admin/articles/new", label: "New article", icon: PenSquare },
    { to: "/admin/categories", label: "Categories", icon: FolderTree },
    { to: "/admin/tags", label: "Tags", icon: Tags },
    { to: "/admin/media", label: "Media library", icon: ImageIcon },
    { to: "/admin/homepage", label: "Homepage layout", icon: LayoutTemplate },
  ] },
  { label: "Revenue", items: [{ to: "/admin/ads", label: "Advertising", icon: Megaphone }] },
  { label: "Audience", items: [
    { to: "/admin/contacts", label: "Messages", icon: Mail, badge: true },
    { to: "/admin/subscribers", label: "Subscribers", icon: Users },
  ] },
  { label: "Tools", items: [
    { to: "/admin/import", label: "Import / Export", icon: FileSpreadsheet },
    { to: "/admin/automation", label: "Automation", icon: Bot },
  ] },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { pathname } = useLocation();
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get, staleTime: 60_000 });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  const Sidebar = (
    <div className="flex h-full flex-col bg-forest-950 text-white">
      <div className="flex h-16 items-center justify-between px-5"><Logo size={30} to="/admin" invert /><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button></div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Admin">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{g.label}</p>
            {g.items.map((i) => (
              <NavLink key={i.to} to={i.to} end={"end" in i && i.end}
                className={({ isActive }) => cn("mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive ? "bg-white/10 text-leaf-300" : "text-white/65 hover:bg-white/5 hover:text-white")}>
                <i.icon className="size-[18px]" />
                <span className="flex-1">{i.label}</span>
                {"badge" in i && !!stats.data?.newContacts && <span className="rounded-full bg-leaf-400 px-2 py-0.5 text-[10px] font-bold text-forest-950">{stats.data.newContacts}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full gradient-brand text-sm font-bold text-[#04140d]">{(admin?.name || admin?.email || "A")[0].toUpperCase()}</span>
          <div className="min-w-0 text-sm"><p className="truncate font-medium">{admin?.name || "Admin"}</p><p className="truncate text-xs capitalize text-white/50">{admin?.role}</p></div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/65 hover:bg-white/5 hover:text-white"><LogOut className="size-4" /> Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{Sidebar}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-forest-950/70" onClick={() => setOpen(false)} /><div className="relative h-full w-72 animate-fade-up">{Sidebar}</div></div>}

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-xl sm:px-6">
          <button className="grid size-10 place-items-center rounded-full border border-line lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <span className="eyebrow hidden sm:inline-flex">Admin console</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" target="_blank" className="hidden h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:border-brand hover:text-brand sm:inline-flex">View site <ExternalLink className="size-3.5" /></Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

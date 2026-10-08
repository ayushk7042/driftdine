import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, Field, Input } from "@/components/ui";
import { errMsg } from "@/lib/utils";
import { useSeo } from "@/lib/seo";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  useSeo({ title: `${title} — Admin`, robots: "noindex, nofollow" });
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hero-ground relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <Logo size={40} tagline invert className="relative" />
        <div className="relative space-y-4">
          <h2 className="max-w-md text-5xl font-semibold leading-tight">Publish with <span className="gradient-text">precision.</span></h2>
          <p className="max-w-sm text-white/60">One console for articles, media, homepage curation, advertising and audience.</p>
        </div>
        <p className="relative text-xs uppercase tracking-[0.3em] text-white/35">Explore · Learn · Stay ahead</p>
      </div>
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute right-6 top-6"><ThemeToggle /></div>
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden"><Logo size={34} /></div>
          <div className="space-y-2"><h1 className="text-3xl font-semibold">{title}</h1><p className="text-sm text-muted">{subtitle}</p></div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { admin, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const m = useMutation({ mutationFn: () => login(email.trim(), password) });
  const to = (loc.state as { from?: string } | null)?.from || "/admin";

  if (admin) return <Navigate to={to} replace />;

  return (
    <Shell title="Welcome back" subtitle="Sign in to the Driftdine admin console.">
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); m.mutate(undefined, { onSuccess: () => nav(to, { replace: true }) }); }}>
        <Field label="Email"><Input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {m.isError && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{errMsg(m.error)}</p>}
        <Button type="submit" size="lg" loading={m.isPending} className="w-full">Sign in</Button>
        <p className="text-center text-xs text-muted"><Link to="/" className="hover:text-brand">← Back to site</Link></p>
      </form>
    </Shell>
  );
}

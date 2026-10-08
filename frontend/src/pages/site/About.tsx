import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, Eye, FileCheck2, Info, Newspaper, Scale, Target, Zap } from "lucide-react";
import { categoryApi } from "@/lib/endpoints";
import { catStyle } from "@/site/Blocks";
import { NewsletterForm } from "@/site/Newsletter";
import { useSeo } from "@/lib/seo";
import { categoryHref, cn } from "@/lib/utils";
import { Card, IconBadge, PageHero, wrap } from "./PageParts";

const VALUES = [
  { icon: Eye, t: "Clear, not noisy", d: "We cut through launch-day hype and say what a product, price or policy change actually means for the people using it." },
  { icon: FileCheck2, t: "Sourced and checked", d: "Every story names where its facts came from. Claims we cannot confirm are labelled as unconfirmed — never dressed up as fact." },
  { icon: Scale, t: "Independent", d: "Sponsored content and affiliate links are always marked. Advertising never decides what we cover." },
  { icon: Zap, t: "Fast, then right", d: "We publish quickly and update openly. When something changes or we get it wrong, we fix it and say so." },
];

export default function About() {
  useSeo({ title: "About", description: "Driftdine is an independent publication covering technology, SaaS, AI, fintech and cybersecurity." });
  const q = useQuery({ queryKey: ["categories", "counts-root"], queryFn: () => categoryApi.list({ withCounts: "true", parent: "root" }), staleTime: 10 * 60_000 });
  const cats = q.data || [];
  const stories = cats.reduce((n, c) => n + (c.articleCount || 0), 0);

  return (
    <>
      <PageHero crumb="About" label="About Driftdine" icon={<Info className="size-3.5" />} title="Explore. Learn." accent="Stay ahead."
        intro="Driftdine is an independent publication covering technology, SaaS, AI, fintech and cybersecurity — for people who build, buy and run the tools that power modern business.">
        <dl className="grid grid-cols-2 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-surface text-center shadow-card">
          <div className="px-6 py-3"><dd className="font-display text-2xl font-semibold">{stories || "—"}</dd><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Stories</dt></div>
          <div className="px-6 py-3"><dd className="font-display text-2xl font-semibold">{cats.length || "—"}</dd><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Topics</dt></div>
        </dl>
      </PageHero>

      <div className={cn(wrap, "space-y-10 py-8 sm:py-10")}>
        {/* mission */}
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-6 sm:p-8">
            <p className="eyebrow !text-[11px]"><Target className="size-3.5" /> Our mission</p>
            <h2 className="mt-2 text-[1.7rem] font-semibold leading-tight">Make fast-moving tech easy to understand and act on.</h2>
            <p className="mt-3 leading-relaxed text-muted">Software changes weekly: new products, new pricing, new risks, new rules. We read the filings, the changelogs and the fine print so you can make better decisions in minutes instead of hours.</p>
            <p className="mt-3 leading-relaxed text-muted">Every article leads with what happened, explains why it matters, and ends with what to watch next — written in plain language, without the jargon or the hype.</p>
          </Card>
          <Card className="on-dark hero-ground relative overflow-hidden p-6 text-white sm:p-8">
            <div aria-hidden className="grid-fade pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <img src="/mark.webp" alt="" width={56} height={55} className="mb-4 w-12" />
              <h2 className="text-[1.5rem] font-semibold leading-tight">What you can expect</h2>
              <ul className="mt-4 space-y-3 text-[0.95rem] text-white/80">
                {["Original reporting and analysis, not rewrites", "Plain English, short paragraphs, real numbers", "Clear labels on sponsored and affiliate content", "Updates and corrections shown openly"].map((x) => (
                  <li key={x} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-leaf-400" />{x}</li>
                ))}
              </ul>
            </div>
          </Card>
        </section>

        {/* coverage */}
        <section aria-label="What we cover">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="eyebrow !text-[11px]"><Compass className="size-3.5" /> Coverage</p><h2 className="mt-1 text-[1.6rem] font-semibold">What we cover</h2></div>
            <Link to="/categories" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand">All topics <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {cats.map((c) => {
              const { icon: Icon, color } = catStyle(c);
              return (
                <li key={c._id}>
                  <Link to={categoryHref(c)} className="group flex h-full items-start gap-3 rounded-2xl border bg-surface p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop" style={{ borderColor: `${color}33` }}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl transition group-hover:scale-110" style={{ background: `${color}22`, color }}><Icon className="size-5" /></span>
                    <span className="min-w-0"><span className="block font-semibold leading-tight">{c.name}</span><span className="mt-1 line-clamp-2 block text-[0.8rem] leading-snug text-muted">{c.description}</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* values */}
        <section aria-label="How we work">
          <p className="eyebrow !text-[11px]"><Newspaper className="size-3.5" /> How we work</p>
          <h2 className="mb-4 mt-1 text-[1.6rem] font-semibold">Standards we hold ourselves to</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {VALUES.map((v) => (
              <Card key={v.t} className="p-5 transition duration-300 hover:-translate-y-1 hover:shadow-pop">
                <IconBadge><v.icon className="size-5" /></IconBadge>
                <h3 className="mt-3 text-[1.05rem] font-semibold">{v.t}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{v.d}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* cta */}
        <section className="on-dark hero-ground relative overflow-hidden rounded-3xl px-6 py-8 text-white sm:px-10" aria-label="Stay in touch">
          <div aria-hidden className="grid-fade pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div><h2 className="text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Get the week’s best stories, <span className="gradient-text">in one email.</span></h2>
              <p className="mt-2 text-white/65">Join the Driftdine newsletter. Unsubscribe in one click.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold"><Link to="/contact" className="inline-flex h-10 items-center rounded-full border border-white/25 bg-white/10 px-5 transition hover:border-leaf-400 hover:text-leaf-300">Contact the team</Link></div></div>
            <NewsletterForm dark source="about-page" />
          </div>
        </section>
      </div>
    </>
  );
}

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, CheckCircle2, Layers, Mail, MailX, ShieldOff, Sparkles, Zap } from "lucide-react";
import { newsApi, newsletterApi } from "@/lib/endpoints";
import { NewsletterForm } from "@/site/Newsletter";
import { NewsCard } from "@/site/NewsCard";
import { Button } from "@/components/ui";
import { cn, errMsg } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { Card, Faq, IconBadge, PageHero, wrap } from "./PageParts";

const BENEFITS = [
  { icon: Zap, t: "The week in one email", d: "The stories that mattered across tech, SaaS, AI, fintech and security — nothing you need to dig for." },
  { icon: Sparkles, t: "Why it matters", d: "Every pick comes with a short explanation of what it means for you, not just what happened." },
  { icon: Layers, t: "All our topics", d: "One digest covering every section we publish, so you stay across the whole picture." },
  { icon: ShieldOff, t: "No spam, ever", d: "One email a week. We never sell your address and you can leave in one click." },
];
const FAQ = [
  { q: "How often will I get emails?", a: "Once a week — a single digest of the best stories. No daily blasts." },
  { q: "Is it free?", a: "Yes, completely free." },
  { q: "How do I unsubscribe?", a: "Use the unsubscribe box on this page and enter your address. It takes one click and you’ll stop getting emails." },
  { q: "What do you do with my email?", a: "We use it only to send the newsletter. We never sell or share it. Details are in our privacy policy." },
];

export default function NewsletterPage() {
  useSeo({ title: "Newsletter", description: "One email a week with the sharpest stories in tech, SaaS, AI, fintech and cybersecurity." });
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const un = useMutation({ mutationFn: () => newsletterApi.unsubscribe(email.trim()) });
  const wantsOut = params.get("unsubscribe") !== null;
  const latest = useQuery({ queryKey: ["news", "nl-preview"], queryFn: () => newsApi.list({ sort: "latest", limit: 4 }), staleTime: 5 * 60_000 });

  return (
    <>
      <PageHero crumb="Newsletter" label="The weekly drift" icon={<Mail className="size-3.5" />} title="One email a week." accent="Zero noise." intro="The week’s sharpest stories in tech and SaaS, curated and delivered. Free, and you can leave anytime.">
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] font-semibold shadow-card"><CalendarCheck className="size-4 text-brand" /> Every week · free · 1-click unsubscribe</div>
      </PageHero>

      <div className={cn(wrap, "space-y-10 py-8 sm:py-10")}>
        {/* subscribe */}
        <section className="on-dark hero-ground relative overflow-hidden rounded-3xl px-5 py-8 text-white sm:px-10 sm:py-10" aria-label="Subscribe">
          <div aria-hidden className="grid-fade pointer-events-none absolute inset-0 opacity-50" />
          <div aria-hidden className="orb -right-10 -top-12 size-56 bg-leaf-500/25" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex items-center gap-4">
              <img src="/mark.webp" alt="" width={72} height={70} className="hidden w-16 shrink-0 sm:block" />
              <div><h2 className="text-[1.7rem] font-semibold leading-tight sm:text-[2.1rem]">Join the <span className="gradient-text">weekly drift</span></h2>
                <p className="mt-1.5 text-white/70">Enter your email and get next week’s issue.</p></div>
            </div>
            <NewsletterForm dark source="newsletter-page" />
          </div>
        </section>

        {/* benefits */}
        <section aria-label="What you get">
          <h2 className="mb-4 text-[1.6rem] font-semibold">What you’ll get</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {BENEFITS.map((b) => (
              <Card key={b.t} className="p-5 transition duration-300 hover:-translate-y-1 hover:shadow-pop">
                <IconBadge><b.icon className="size-5" /></IconBadge>
                <h3 className="mt-3 text-[1.05rem] font-semibold">{b.t}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{b.d}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* preview */}
        {!!latest.data?.data.length && (
          <section aria-label="Recent stories">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><h2 className="text-[1.6rem] font-semibold">A taste of what’s inside</h2><p className="text-sm text-muted">Recent stories that would make the digest.</p></div>
              <Link to="/news" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand">All news <ArrowRight className="size-4 transition group-hover:translate-x-1" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{latest.data.data.map((a) => <NewsCard key={a._id} a={a} />)}</div>
          </section>
        )}

        {/* faq + unsubscribe */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div><h2 className="mb-4 text-[1.5rem] font-semibold">Questions</h2><Faq items={FAQ} /></div>
          <Card id="unsubscribe" className={cn("h-fit scroll-mt-24 p-5 sm:p-6", wantsOut && "ring-2 ring-brand/40")}>
            <h2 className="flex items-center gap-2 text-[1.15rem] font-semibold"><MailX className="size-5 text-muted" /> Unsubscribe</h2>
            <p className="mt-1 text-sm text-muted">Changed your mind? Enter your address and we’ll stop the emails.</p>
            {un.isSuccess ? (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-brand" role="status"><CheckCircle2 className="size-5" /> You’ve been unsubscribed.</p>
            ) : (
              <form className="mt-4 space-y-2.5" onSubmit={(e) => { e.preventDefault(); un.mutate(); }}>
                <input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address"
                  className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_4px_rgb(47_195_134/0.15)]" />
                <Button type="submit" variant="outline" loading={un.isPending} className="w-full">Unsubscribe</Button>
              </form>
            )}
            {un.isError && <p className="mt-2 text-xs text-danger">{errMsg(un.error)}</p>}
          </Card>
        </section>
      </div>
    </>
  );
}

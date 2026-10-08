import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Bug, CheckCircle2, Clock, Handshake, Lightbulb, MessageSquare, PenSquare, Send, ShieldCheck } from "lucide-react";
import { contactApi } from "@/lib/endpoints";
import { Button } from "@/components/ui";
import { cn, errMsg } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { Card, Faq, IconBadge, PageHero, wrap } from "./PageParts";

const TOPICS = [
  { id: "Story tip", icon: Lightbulb, hint: "Something we should look into" },
  { id: "Correction", icon: PenSquare, hint: "Spotted an error in an article" },
  { id: "Partnership", icon: Handshake, hint: "Advertising, sponsorship, collaboration" },
  { id: "Feedback", icon: MessageSquare, hint: "Ideas to improve Driftdine" },
  { id: "Report a problem", icon: Bug, hint: "Something is broken on the site" },
];
const FAQ = [
  { q: "How quickly do you reply?", a: "We read every message and usually reply within two working days. Corrections are looked at first." },
  { q: "How do I report a mistake in an article?", a: "Choose “Correction” above, paste the article link and tell us what is wrong. If we got it wrong, we fix it and note the update on the article." },
  { q: "Can I send a story tip anonymously?", a: "Yes. Choose “Story tip”, use any name you like, and only give contact details if you want a reply." },
  { q: "Do you accept sponsored content?", a: "We work with sponsors, but sponsored pieces and affiliate links are always clearly labelled and never change our editorial coverage." },
];
const field = "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg outline-none transition placeholder:text-muted/70 focus:border-brand focus:shadow-[0_0_0_4px_rgb(47_195_134/0.15)]";

export default function ContactPage() {
  useSeo({ title: "Contact", description: "Send the Driftdine team a story tip, correction, partnership idea or feedback." });
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const m = useMutation({ mutationFn: () => contactApi.create({ ...form, subject: topic }) });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const left = 1500 - form.message.length;

  return (
    <>
      <PageHero crumb="Contact" label="Get in touch" icon={<Send className="size-3.5" />} title="Let’s" accent="talk." intro="Story tips, corrections, partnerships or feedback — pick a topic, tell us more and we’ll take it from there.">
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] font-semibold shadow-card"><Clock className="size-4 text-brand" /> Usually replies within 2 working days</div>
      </PageHero>

      <div className={cn(wrap, "grid gap-6 py-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:py-10")}>
        <Card className="p-5 sm:p-7">
          {m.isSuccess ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center" role="status">
              <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand"><CheckCircle2 className="size-9" /></span>
              <h2 className="text-2xl font-semibold">Message sent</h2>
              <p className="max-w-sm text-muted">Thanks, {form.name.split(" ")[0] || "friend"} — we’ve got your “{topic.toLowerCase()}” and will be in touch soon.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Link to="/news" className="inline-flex h-10 items-center gap-2 rounded-full gradient-brand px-5 text-sm font-semibold text-[#04140d]">Read the latest <ArrowRight className="size-4" /></Link>
                <button onClick={() => { m.reset(); setForm({ name: "", email: "", message: "" }); }} className="inline-flex h-10 items-center rounded-full border border-line px-5 text-sm font-semibold hover:border-brand">Send another</button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-5">
              <fieldset>
                <legend className="mb-2.5 text-[13px] font-semibold">What’s this about?</legend>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {TOPICS.map((t) => {
                    const on = topic === t.id;
                    return (
                      <button type="button" key={t.id} onClick={() => setTopic(t.id)} aria-pressed={on}
                        className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-left transition", on ? "border-brand bg-brand-soft shadow-[0_0_0_3px_rgb(47_195_134/0.15)]" : "border-line bg-surface hover:-translate-y-0.5 hover:border-brand/50")}>
                        <t.icon className={cn("mt-0.5 size-[18px] shrink-0", on ? "text-brand" : "text-muted")} />
                        <span><span className="block text-[13.5px] font-semibold leading-tight">{t.id}</span><span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{t.hint}</span></span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5"><span className="text-[13px] font-semibold">Your name</span><input required value={form.name} onChange={set("name")} autoComplete="name" className={cn(field, "h-11")} /></label>
                <label className="block space-y-1.5"><span className="text-[13px] font-semibold">Your email</span><input required type="email" value={form.email} onChange={set("email")} autoComplete="email" className={cn(field, "h-11")} /></label>
              </div>
              <label className="block space-y-1.5">
                <span className="flex justify-between text-[13px] font-semibold">Message <span className={cn("font-normal", left < 100 ? "text-warn" : "text-muted")}>{left} left</span></span>
                <textarea required rows={7} maxLength={1500} value={form.message} onChange={set("message")} placeholder={topic === "Correction" ? "Paste the article link and tell us what needs fixing…" : "Tell us more…"} className={cn(field, "py-3 leading-relaxed")} />
              </label>
              {m.isError && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{errMsg(m.error)}</p>}
              <Button type="submit" size="lg" loading={m.isPending} className="w-full sm:w-auto"><Send className="size-4" /> Send message</Button>
              <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck className="size-3.5 text-brand" /> We only use your details to reply. See our <Link to="/privacy" className="text-brand hover:underline">privacy policy</Link>.</p>
            </form>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold">What happens next</h2>
            <ol className="space-y-3.5 text-[0.9rem]">
              {[["We read it", "A real person reads every message."], ["We look into it", "Tips and corrections are checked against sources."], ["You hear back", "If you gave an email, we reply — usually within two working days."]].map(([t, d], i) => (
                <li key={t} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{i + 1}</span><span><span className="block font-semibold leading-tight">{t}</span><span className="text-[0.85rem] text-muted">{d}</span></span></li>
              ))}
            </ol>
          </Card>
          <Card className="on-dark hero-ground relative overflow-hidden p-5 text-white">
            <div aria-hidden className="orb -right-8 -top-8 size-28 bg-leaf-400/30" />
            <div className="relative"><IconBadge className="bg-white/15 text-leaf-300"><Handshake className="size-5" /></IconBadge>
              <h2 className="mt-3 text-[1.1rem] font-semibold">Working with Driftdine</h2>
              <p className="mt-1 text-[0.88rem] text-white/70">Interested in sponsoring or partnering? Choose “Partnership” and tell us about your goals — we’ll share the options.</p></div>
          </Card>
        </aside>
      </div>

      <section className={cn(wrap, "pb-6")} aria-label="Frequently asked questions">
        <h2 className="mb-4 text-[1.5rem] font-semibold">Quick answers</h2>
        <Faq items={FAQ} />
      </section>
    </>
  );
}

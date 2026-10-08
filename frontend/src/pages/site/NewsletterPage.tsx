import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, MailX } from "lucide-react";
import { newsletterApi } from "@/lib/endpoints";
import { NewsletterForm } from "@/site/Newsletter";
import { Button, Input } from "@/components/ui";
import { errMsg } from "@/lib/utils";
import { useSeo } from "@/lib/seo";

export default function NewsletterPage() {
  useSeo({ title: "Newsletter", description: "One email a week with the sharpest stories in tech and SaaS." });
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const un = useMutation({ mutationFn: () => newsletterApi.unsubscribe(email.trim()) });
  const wantsOut = params.get("unsubscribe") !== null;

  return (
    <div className="container-x max-w-3xl pt-6">
      <section className="hero-ground relative overflow-hidden rounded-[2rem] p-8 text-center text-white sm:p-14">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <img src="/mark.webp" alt="" aria-hidden width={160} height={156} className="relative mx-auto mb-6 w-16" />
        <h1 className="relative text-4xl font-semibold sm:text-5xl">The weekly <span className="gradient-text">drift</span></h1>
        <p className="relative mx-auto mt-4 max-w-md text-white/65">The week’s sharpest stories in tech and SaaS, in one tidy email. No spam, ever.</p>
        <div className="relative mx-auto mt-8 max-w-lg"><NewsletterForm dark source="newsletter-page" /></div>
      </section>

      <section id="unsubscribe" className={`card mt-8 p-6 sm:p-8 ${wantsOut ? "ring-2 ring-brand/40" : ""}`}>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><MailX className="size-5 text-muted" /> Unsubscribe</h2>
        <p className="mt-1 text-sm text-muted">Changed your mind? Enter your address and we’ll stop the emails.</p>
        {un.isSuccess ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-brand" role="status"><CheckCircle2 className="size-5" /> You’ve been unsubscribed.</p>
        ) : (
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); un.mutate(); }}>
            <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-full px-5" aria-label="Email address" />
            <Button type="submit" variant="outline" size="lg" loading={un.isPending}>Unsubscribe</Button>
          </form>
        )}
        {un.isError && <p className="mt-2 text-xs text-danger">{errMsg(un.error)}</p>}
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import { LinkButton } from "@/components/ui";
import { useSeo } from "@/lib/seo";

export function NotFound() {
  useSeo({ title: "Page not found", robots: "noindex" });
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="space-y-6">
        <img src="/mark.webp" alt="" width={96} height={94} className="mx-auto opacity-90" />
        <p className="font-display text-8xl font-semibold gradient-text">404</p>
        <h1 className="text-2xl font-semibold">This page drifted off.</h1>
        <p className="mx-auto max-w-sm text-muted">The link may be broken, or the story was moved or unpublished.</p>
        <div className="flex justify-center gap-3">
          <LinkButton to="/">Back home</LinkButton>
          <LinkButton to="/news" variant="outline">Latest stories</LinkButton>
        </div>
      </div>
    </div>
  );
}

const Page = ({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) => (
  <div className="container-x max-w-3xl pt-6">
    <span className="eyebrow">{eyebrow}</span>
    <h1 className="mb-8 mt-3 text-4xl font-semibold sm:text-6xl">{title}</h1>
    <div className="prose prose-article max-w-none">{children}</div>
  </div>
);

export function About() {
  useSeo({ title: "About", description: "Driftdine is an independent publication covering tech and SaaS." });
  return (
    <Page eyebrow="About" title="Explore. Learn. Stay ahead.">
      <p>Driftdine is an independent publication covering technology, SaaS and the tools that run modern businesses. We read the changelogs, test the products and cut through the launch-day noise so you can make better decisions faster.</p>
      <h2>What we cover</h2>
      <p>New products and platforms, pricing and strategy shifts, AI in the workplace, developer tooling, security, and the playbooks behind companies that scale.</p>
      <h2>Get in touch</h2>
      <p>Tips, corrections and partnership ideas are always welcome — <Link to="/contact">send us a note</Link>.</p>
    </Page>
  );
}

export function Privacy() {
  useSeo({ title: "Privacy policy" });
  return (
    <Page eyebrow="Legal" title="Privacy policy">
      <p>We collect only what we need to run the site: anonymous page-view counts, and the email address you choose to give us when you subscribe or contact us. We never sell personal data.</p>
      <h2>Newsletter</h2>
      <p>Subscribers receive our weekly digest. You can <Link to="/newsletter">unsubscribe</Link> at any time.</p>
      <h2>Advertising</h2>
      <p>Some pages show advertisements from third parties, which may set their own cookies. Sponsored content is always labelled.</p>
    </Page>
  );
}

export function Terms() {
  useSeo({ title: "Terms of use" });
  return (
    <Page eyebrow="Legal" title="Terms of use">
      <p>Content on Driftdine is provided for information only and does not constitute professional advice. Links to third-party products may be affiliate links; we may earn a commission at no cost to you.</p>
      <p>You may share short excerpts with attribution and a link back. Republishing full articles requires written permission.</p>
    </Page>
  );
}

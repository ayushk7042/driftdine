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

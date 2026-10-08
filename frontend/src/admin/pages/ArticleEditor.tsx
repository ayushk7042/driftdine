import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Eye, Plus, Save, Send, Trash2 } from "lucide-react";
import { newsApi } from "@/lib/endpoints";
import { Button, ErrorState, Field, Input, PageLoader, Select, Textarea, Toggle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { asObj, cn, errMsg, imageUrl, img } from "@/lib/utils";
import type { AffiliateLink, Article, ArticleStatus, Author, ImageRef, Tag, VideoRef } from "@/lib/types";
import { RichEditor } from "../RichEditor";
import { ImageField, MediaPicker, mediaToImage } from "../MediaPicker";
import { ArticleListEditor, CategorySelect, TagInput, useCategoryOptions } from "../pickers";
import { StatusBadge, Tabs } from "../parts";
import { fromLocalInput, toLocalInput } from "../hooks";

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

interface Form {
  title: string; slug: string; subtitle: string; description: string; excerpt: string; content: string;
  category: string; subCategory: string; tags: string[];
  author: Author;
  featuredImage: ImageRef | null; ogImage: ImageRef | null; twitterImage: ImageRef | null;
  gallery: ImageRef[]; videos: VideoRef[];
  cta: { label: string; url: string; style: "primary" | "secondary" | "ghost"; openInNewTab: boolean };
  affiliateLinks: AffiliateLink[];
  advertisement: { code: string; position: string; enabled: boolean };
  relatedNews: Article[];
  featured: boolean; trending: boolean; popular: boolean; breakingNews: boolean; editorsPick: boolean;
  isMainTrending: boolean; isSubTrending: boolean; isCategoryTrending: boolean; isCategorySubTrending: boolean;
  priority: number; homeOrder: number;
  status: ArticleStatus; publishedDate: string; scheduledAt: string;
  language: string; country: string; region: string; destination: string;
  sourceName: string; sourceUrl: string; sourceLinks: string; externalLink: string; adsLink: string;
  metaTitle: string; metaDescription: string; focusKeyword: string; canonicalUrl: string; robots: string;
  seoKeywords: string[]; schemaMarkup: string;
  autoUpdateEnabled: boolean; readTime: number;
}

const blank = (): Form => ({
  title: "", slug: "", subtitle: "", description: "", excerpt: "", content: "",
  category: "", subCategory: "", tags: [],
  author: { name: "", designation: "", email: "", bio: "", redirectUrl: "", social: {} },
  featuredImage: null, ogImage: null, twitterImage: null, gallery: [], videos: [],
  cta: { label: "", url: "", style: "primary", openInNewTab: true },
  affiliateLinks: [], advertisement: { code: "", position: "", enabled: true }, relatedNews: [],
  featured: false, trending: false, popular: false, breakingNews: false, editorsPick: false,
  isMainTrending: false, isSubTrending: false, isCategoryTrending: false, isCategorySubTrending: false,
  priority: 0, homeOrder: 0,
  status: "draft", publishedDate: toLocalInput(new Date().toISOString()), scheduledAt: "",
  language: "en", country: "", region: "", destination: "",
  sourceName: "", sourceUrl: "", sourceLinks: "", externalLink: "", adsLink: "",
  metaTitle: "", metaDescription: "", focusKeyword: "", canonicalUrl: "", robots: "index, follow",
  seoKeywords: [], schemaMarkup: "", autoUpdateEnabled: false, readTime: 0,
});

const idOf = (v: unknown) => (typeof v === "string" ? v : (asObj<{ _id: string }>(v as { _id: string })?._id ?? ""));

function fromArticle(a: Article): Form {
  const b = blank();
  const tagNames = (a.tags || []).map((t) => (typeof t === "string" ? t : (t as Tag).name)).filter(Boolean);
  return {
    ...b,
    title: a.title || "", slug: a.slug || "", subtitle: a.subtitle || "",
    description: a.description || a.shortDescription || "", excerpt: a.excerpt || "", content: a.content || "",
    category: idOf(a.category), subCategory: idOf(a.subCategory),
    tags: tagNames.length ? tagNames : a.tagNames || [],
    author: { ...b.author, ...(a.author || {}), social: a.author?.social || {} },
    featuredImage: a.featuredImage?.url ? a.featuredImage : null,
    ogImage: a.ogImage?.url ? a.ogImage : null,
    twitterImage: a.twitterImage?.url ? a.twitterImage : null,
    gallery: a.gallery || [], videos: a.videos || [],
    cta: { ...b.cta, ...(a.cta || {}), style: a.cta?.style || "primary", openInNewTab: a.cta?.openInNewTab ?? true, label: a.cta?.label || "", url: a.cta?.url || "" },
    affiliateLinks: a.affiliateLinks || [],
    advertisement: { code: a.advertisement?.code || "", position: a.advertisement?.position || "", enabled: a.advertisement?.enabled ?? true },
    relatedNews: (a.relatedNews || []).filter((r): r is Article => typeof r === "object"),
    featured: !!a.featured, trending: !!a.trending, popular: !!a.popular, breakingNews: !!a.breakingNews, editorsPick: !!a.editorsPick,
    isMainTrending: !!a.isMainTrending, isSubTrending: !!a.isSubTrending, isCategoryTrending: !!a.isCategoryTrending, isCategorySubTrending: !!a.isCategorySubTrending,
    priority: a.priority || 0, homeOrder: a.homeOrder || 0,
    status: a.status || "draft", publishedDate: toLocalInput(a.publishedDate || a.createdAt), scheduledAt: toLocalInput(a.scheduledAt),
    language: a.language || "en", country: a.country || "", region: a.region || "", destination: a.destination || "",
    sourceName: a.sourceName || "", sourceUrl: a.sourceUrl || "", sourceLinks: (a.sourceLinks || []).join("\n"),
    externalLink: a.externalLink || "", adsLink: a.adsLink || "",
    metaTitle: a.metaTitle || a.seoTitle || "", metaDescription: a.metaDescription || a.seoDescription || "",
    focusKeyword: a.focusKeyword || "", canonicalUrl: a.canonicalUrl || "", robots: a.robots || "index, follow",
    seoKeywords: a.seoKeywords || [],
    schemaMarkup: a.schemaMarkup ? JSON.stringify(a.schemaMarkup, null, 2) : "",
    autoUpdateEnabled: !!a.autoUpdateEnabled, readTime: a.readTime || 0,
  };
}

function toPayload(f: Form, isNew: boolean, slugTouched: boolean): Record<string, unknown> {
  const p: Record<string, unknown> = {
    title: f.title.trim(), subtitle: f.subtitle, description: f.description, excerpt: f.excerpt, content: f.content,
    category: f.category, subCategory: f.subCategory || "", tags: f.tags,
    author: { ...f.author, social: f.author.social || {} },
    featuredImage: f.featuredImage, ogImage: f.ogImage, twitterImage: f.twitterImage,
    gallery: f.gallery.filter((g) => g.url), videos: f.videos.filter((v) => v.url),
    cta: f.cta.label || f.cta.url ? f.cta : null,
    affiliateLinks: f.affiliateLinks.filter((a) => a.link),
    advertisement: f.advertisement,
    relatedNews: f.relatedNews.map((r) => r._id),
    featured: f.featured, trending: f.trending, popular: f.popular, breakingNews: f.breakingNews, editorsPick: f.editorsPick,
    isMainTrending: f.isMainTrending, isSubTrending: f.isSubTrending, isCategoryTrending: f.isCategoryTrending, isCategorySubTrending: f.isCategorySubTrending,
    priority: f.priority, homeOrder: f.homeOrder,
    status: f.status, publishedDate: fromLocalInput(f.publishedDate), scheduledAt: fromLocalInput(f.scheduledAt),
    language: f.language, country: f.country, region: f.region, destination: f.destination,
    sourceName: f.sourceName, sourceUrl: f.sourceUrl, sourceLinks: f.sourceLinks.split("\n").map((s) => s.trim()).filter(Boolean),
    externalLink: f.externalLink, adsLink: f.adsLink,
    metaTitle: f.metaTitle, metaDescription: f.metaDescription, focusKeyword: f.focusKeyword,
    canonicalUrl: f.canonicalUrl, robots: f.robots, seoKeywords: f.seoKeywords,
    schemaMarkup: f.schemaMarkup.trim(), autoUpdateEnabled: f.autoUpdateEnabled,
  };
  if (f.readTime > 0 && !isNew) p.readTime = f.readTime;
  // A slug is only sent when the editor set it; otherwise the server derives and de-duplicates it.
  if (slugTouched && f.slug) p.slug = f.slug;
  if (!f.publishedDate) delete p.publishedDate;
  return p;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

const Card = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <section className={cn("card overflow-hidden", className)}>
    <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold">{title}</h2>
    <div className="space-y-4 p-5">{children}</div>
  </section>
);

const Counter = ({ value, min, max }: { value: string; min: number; max: number }) => {
  const n = value.length;
  return <span className={cn("text-xs tabular-nums", n === 0 ? "text-muted" : n > max ? "text-danger" : n >= min ? "text-brand" : "text-warn")}>{n}/{max}</span>;
};

function SerpPreview({ f }: { f: Form }) {
  const title = f.metaTitle || f.title || "Page title";
  const desc = f.metaDescription || f.description || "Meta description appears here.";
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Search preview</p>
      <p className="truncate text-xs text-muted">driftdine.com › news › {f.slug || slugify(f.title) || "slug"}</p>
      <p className="mt-0.5 line-clamp-1 text-lg text-[#1a0dab] dark:text-sky-300">{title}</p>
      <p className="line-clamp-2 text-sm text-muted">{desc}</p>
    </div>
  );
}

const FLAG_LIST: [keyof Form, string, string][] = [
  ["featured", "Featured", "Shown in Featured rails"],
  ["trending", "Trending", "Ranked by views in Trending"],
  ["popular", "Popular", "Eligible for Most read"],
  ["breakingNews", "Breaking", "Appears in the homepage ticker"],
  ["editorsPick", "Editor’s pick", "Shown in Editor’s picks"],
  ["isMainTrending", "Homepage hero", "Lead story (one at a time works best)"],
  ["isSubTrending", "Hero rail", "Small stories beside the hero"],
  ["isCategoryTrending", "Category lead", "Lead story on its category page"],
  ["isCategorySubTrending", "Category rail", "Secondary story on its category page"],
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type TabId = "content" | "media" | "seo" | "advanced";

export default function ArticleEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [form, setForm] = useState<Form>(blank);
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tab, setTab] = useState<TabId>("content");
  const [pickerFor, setPickerFor] = useState<null | "editor" | "gallery">(null);
  const insertImage = useRef<(url: string, alt?: string) => void>(() => {});
  const registerInsert = useCallback((fn: (url: string, alt?: string) => void) => { insertImage.current = fn; }, []);
  const { flat: cats } = useCategoryOptions();

  useSeo({ title: `${isNew ? "New article" : "Edit article"} — Admin`, robots: "noindex" });

  const q = useQuery({ queryKey: ["article-edit", id], queryFn: () => newsApi.byId(id!), enabled: !!id, staleTime: 0, gcTime: 0 });

  useEffect(() => {
    if (q.data) { setForm(fromArticle(q.data)); setLoaded(true); setDirty(false); setSlugTouched(!!q.data.slug); }
  }, [q.data]);

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); }, []);

  // Slug follows the title until the editor edits it by hand (new articles only).
  useEffect(() => {
    if (isNew && !slugTouched) setForm((f) => ({ ...f, slug: slugify(f.title) }));
  }, [form.title, isNew, slugTouched]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async (override?: { status?: ArticleStatus }) => {
      const next = override?.status ? { ...form, status: override.status } : form;
      if (!next.title.trim()) throw new Error("Title is required");
      if (!next.category) throw new Error("Choose a category");
      if (next.schemaMarkup.trim()) { try { JSON.parse(next.schemaMarkup); } catch { throw new Error("Schema markup is not valid JSON"); } }
      const payload = toPayload(next, isNew, slugTouched);
      return isNew ? newsApi.create(payload) : newsApi.updateById(id!, payload);
    },
    onSuccess: (a: Article) => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["news"] });
      qc.invalidateQueries({ queryKey: ["article"] });
      qc.invalidateQueries({ queryKey: ["homefeed"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      a.warnings?.forEach((w) => toast(w, "info"));
      toast(isNew ? "Article created" : "Changes saved");
      if (isNew) nav(`/admin/articles/${a._id}/edit`, { replace: true });
      else setForm(fromArticle(a));
    },
    onError: (e) => toast(errMsg(e), "error"),
  });

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (!save.isPending) save.mutate(undefined); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const subOptions = useMemo(() => cats.filter((c) => c.depth === 1 && String(c.parent) === form.category), [cats, form.category]);

  if (!isNew && q.isLoading) return <PageLoader />;
  if (!isNew && q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!loaded) return <PageLoader />;

  const canPublish = can("canPublish");
  const article = q.data;

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Link to="/admin/articles" className="grid size-9 place-items-center rounded-full border border-line hover:border-brand" aria-label="Back to articles"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{form.title || (isNew ? "Untitled article" : "Edit article")}</h1>
          <p className="flex items-center gap-2 text-xs text-muted"><StatusBadge status={form.status} />{dirty ? <span className="text-warn">Unsaved changes</span> : !isNew && <span>All changes saved</span>}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isNew && <Link to={`/news/${form.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:border-brand"><Eye className="size-4" /> Preview <ExternalLink className="size-3" /></Link>}
          <Button variant="outline" loading={save.isPending && !save.variables} onClick={() => save.mutate(undefined)} disabled={!canPublish}><Save className="size-4" /> Save</Button>
          {form.status !== "published" && canPublish && (
            <Button loading={save.isPending && save.variables?.status === "published"} onClick={() => save.mutate({ status: "published" })}><Send className="size-4" /> Publish</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------------- main column ---------------- */}
        <div className="min-w-0 space-y-6">
          <Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: "content", label: "Content" }, { id: "media", label: "Media" }, { id: "seo", label: "SEO" }, { id: "advanced", label: "Advanced" }]} />

          {tab === "content" && (
            <>
              <Card title="Headline">
                <textarea
                  value={form.title} onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))} placeholder="Article title" aria-label="Title" rows={2}
                  className="w-full resize-none bg-transparent font-display text-3xl font-semibold leading-tight outline-none placeholder:text-muted/50 sm:text-4xl"
                />
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span className="shrink-0">/news/</span>
                  <Input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} placeholder="auto-generated" className="h-9" aria-label="Slug" />
                </div>
                <Field label="Subtitle"><Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Optional deck beneath the headline" /></Field>
                <Field label={<span className="flex justify-between">Short description <Counter value={form.description} min={80} max={300} /></span>} hint="Required. Shown on cards and as the default meta description.">
                  <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
                <Field label="Excerpt" hint="Optional lead paragraph shown above the article body."><Textarea rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></Field>
              </Card>

              <section aria-label="Body" className="space-y-2">
                <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Body</h2>{article?.contentBlocks?.length ? <span className="text-xs text-warn">Legacy content blocks are kept. Text written here takes priority on the site.</span> : null}</div>
                <RichEditor value={form.content} onChange={(h) => set("content", h)} onPickImage={() => setPickerFor("editor")} registerInsert={registerInsert} />
              </section>

              <Card title="Call to action">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Button label"><Input value={form.cta.label} onChange={(e) => set("cta", { ...form.cta, label: e.target.value })} /></Field>
                  <Field label="Button URL"><Input type="url" value={form.cta.url} onChange={(e) => set("cta", { ...form.cta, url: e.target.value })} placeholder="https://" /></Field>
                  <Field label="Style"><Select value={form.cta.style} onChange={(e) => set("cta", { ...form.cta, style: e.target.value as Form["cta"]["style"] })}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="ghost">Ghost</option></Select></Field>
                  <div className="self-end"><Toggle label="Open in new tab" checked={form.cta.openInNewTab} onChange={(v) => set("cta", { ...form.cta, openInNewTab: v })} /></div>
                </div>
              </Card>

              <Card title="Affiliate links">
                {form.affiliateLinks.map((a, i) => (
                  <div key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
                    <Input placeholder="Product title" value={a.title || ""} onChange={(e) => set("affiliateLinks", form.affiliateLinks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <Input placeholder="Affiliate URL" value={a.link || ""} onChange={(e) => set("affiliateLinks", form.affiliateLinks.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)))} />
                    <Input placeholder="Button text" value={a.buttonText || ""} onChange={(e) => set("affiliateLinks", form.affiliateLinks.map((x, j) => (j === i ? { ...x, buttonText: e.target.value } : x)))} />
                    <Input placeholder="Price (e.g. $19/mo)" value={a.price || ""} onChange={(e) => set("affiliateLinks", form.affiliateLinks.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                    <Input className="sm:col-span-2" placeholder="Product image URL" value={a.productImage || ""} onChange={(e) => set("affiliateLinks", form.affiliateLinks.map((x, j) => (j === i ? { ...x, productImage: e.target.value } : x)))} />
                    <Button size="sm" variant="ghost" className="justify-self-start text-danger" onClick={() => set("affiliateLinks", form.affiliateLinks.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /> Remove</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => set("affiliateLinks", [...form.affiliateLinks, { title: "", link: "", buttonText: "View deal" }])}><Plus className="size-4" /> Add link</Button>
              </Card>
            </>
          )}

          {tab === "media" && (
            <>
              <Card title="Featured image">
                <ImageField value={form.featuredImage} onChange={(v) => set("featuredImage", v)} hint="Used on cards, the article header and social sharing. 1600×900 recommended." />
                {form.featuredImage && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Caption"><Input value={form.featuredImage.caption || ""} onChange={(e) => set("featuredImage", { ...form.featuredImage!, caption: e.target.value })} /></Field>
                    <Field label="Credit"><Input value={form.featuredImage.credit || ""} onChange={(e) => set("featuredImage", { ...form.featuredImage!, credit: e.target.value })} /></Field>
                  </div>
                )}
              </Card>

              <Card title={`Gallery (${form.gallery.length})`}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {form.gallery.map((g, i) => (
                    <div key={i} className="space-y-2 rounded-xl border border-line p-2">
                      <div className="group relative aspect-[3/2] overflow-hidden rounded-lg bg-surface-2">
                        <img src={img(g.url, 400)} alt={g.alt || ""} className="size-full object-cover" loading="lazy" />
                        <button type="button" onClick={() => set("gallery", form.gallery.filter((_, j) => j !== i))} aria-label="Remove image" className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-forest-950/80 text-white opacity-0 transition group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
                      </div>
                      <Input placeholder="Alt / caption" value={g.alt || ""} onChange={(e) => set("gallery", form.gallery.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                      <Input type="url" placeholder="Redirect link (optional)" value={g.redirectUrl || ""} onChange={(e) => set("gallery", form.gallery.map((x, j) => (j === i ? { ...x, redirectUrl: e.target.value } : x)))} />
                    </div>
                  ))}
                  <button type="button" onClick={() => setPickerFor("gallery")} className="grid aspect-[3/2] place-items-center self-start rounded-xl border-2 border-dashed border-line text-muted transition hover:border-brand hover:text-brand"><Plus className="size-6" /></button>
                </div>
              </Card>

              <Card title="Videos">
                {form.videos.map((v, i) => (
                  <div key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
                    <Input className="sm:col-span-2" placeholder="YouTube / Vimeo / MP4 URL" value={v.url || ""} onChange={(e) => set("videos", form.videos.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                    <Input placeholder="Title" value={v.title || ""} onChange={(e) => set("videos", form.videos.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <Input placeholder="Caption" value={v.caption || ""} onChange={(e) => set("videos", form.videos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
                    <Button size="sm" variant="ghost" className="justify-self-start text-danger" onClick={() => set("videos", form.videos.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /> Remove</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => set("videos", [...form.videos, { url: "" }])}><Plus className="size-4" /> Add video</Button>
              </Card>
            </>
          )}

          {tab === "seo" && (
            <>
              <Card title="Search & social">
                <SerpPreview f={form} />
                <Field label={<span className="flex justify-between">Meta title <Counter value={form.metaTitle} min={30} max={60} /></span>}><Input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder={form.title} /></Field>
                <Field label={<span className="flex justify-between">Meta description <Counter value={form.metaDescription} min={110} max={160} /></span>}><Textarea rows={3} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Focus keyword"><Input value={form.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} /></Field>
                  <Field label="Robots"><Select value={form.robots} onChange={(e) => set("robots", e.target.value)}>
                    {["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
                </div>
                <Field label="Canonical URL"><Input type="url" value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://" /></Field>
                <Field label="SEO keywords" hint="Press Enter after each keyword."><TagInput value={form.seoKeywords} onChange={(v) => set("seoKeywords", v)} /></Field>
                {article?.seoScore !== undefined && <p className="text-sm text-muted">Current SEO score: <strong className="text-fg">{article.seoScore}/100</strong> (recalculated by the server on save).</p>}
              </Card>
              <Card title="Social images">
                <div className="grid gap-5 sm:grid-cols-2">
                  <ImageField label="Open Graph image" value={form.ogImage} onChange={(v) => set("ogImage", v)} hint="Falls back to the featured image." />
                  <ImageField label="Twitter / X image" value={form.twitterImage} onChange={(v) => set("twitterImage", v)} />
                </div>
              </Card>
              <Card title="Structured data (JSON-LD)">
                <Textarea rows={8} value={form.schemaMarkup} onChange={(e) => set("schemaMarkup", e.target.value)} className="font-mono text-xs" placeholder='{ "@context": "https://schema.org", "@type": "NewsArticle" }' spellCheck={false} />
                <p className="text-xs text-muted">Leave empty to let the site generate NewsArticle markup automatically.</p>
              </Card>
            </>
          )}

          {tab === "advanced" && (
            <>
              <Card title="Locale">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Language"><Input value={form.language} onChange={(e) => set("language", e.target.value)} placeholder="en" /></Field>
                  <Field label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
                  <Field label="Region"><Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Asia, Europe…" /></Field>
                  <Field label="Destination"><Input value={form.destination} onChange={(e) => set("destination", e.target.value)} /></Field>
                </div>
              </Card>
              <Card title="Source & links">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Source name"><Input value={form.sourceName} onChange={(e) => set("sourceName", e.target.value)} /></Field>
                  <Field label="Source URL"><Input type="url" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} /></Field>
                  <Field label="External link"><Input type="url" value={form.externalLink} onChange={(e) => set("externalLink", e.target.value)} /></Field>
                  <Field label="Ads link"><Input type="url" value={form.adsLink} onChange={(e) => set("adsLink", e.target.value)} /></Field>
                </div>
                <Field label="Additional source links" hint="One URL per line."><Textarea rows={3} value={form.sourceLinks} onChange={(e) => set("sourceLinks", e.target.value)} /></Field>
              </Card>
              <Card title="Related articles">
                <ArticleListEditor items={form.relatedNews} onChange={(v) => set("relatedNews", v)} title="Choose related articles" />
                <p className="text-xs text-muted">The site also auto-suggests related stories by tag and category.</p>
              </Card>
              <Card title="Per-article ad override">
                <Toggle label="Enable article ad" checked={form.advertisement.enabled} onChange={(v) => set("advertisement", { ...form.advertisement, enabled: v })} />
                <Field label="Ad position"><Input value={form.advertisement.position} onChange={(e) => set("advertisement", { ...form.advertisement, position: e.target.value })} placeholder="article-inline" /></Field>
                <Field label="Ad code"><Textarea rows={4} className="font-mono text-xs" value={form.advertisement.code} onChange={(e) => set("advertisement", { ...form.advertisement, code: e.target.value })} spellCheck={false} /></Field>
              </Card>
              <Card title="Automation">
                <Toggle label="Allow AI auto-updates" hint="When on, the daily cron may refresh this article. Manual edits normally switch it off." checked={form.autoUpdateEnabled} onChange={(v) => set("autoUpdateEnabled", v)} />
                {!isNew && <Field label="Read time (minutes)" hint="Calculated from the body; override only if needed."><Input type="number" min={0} value={form.readTime} onChange={(e) => set("readTime", Number(e.target.value))} /></Field>}
              </Card>
            </>
          )}
        </div>

        {/* ---------------- sidebar ---------------- */}
        <aside className="space-y-6 xl:sticky xl:top-36 xl:max-h-[calc(100dvh-10rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
          <Card title="Publishing">
            <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value as ArticleStatus)}>
              {(["draft", "published", "scheduled", "archived", "trash"] as ArticleStatus[]).map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</Select></Field>
            <Field label="Publish date"><Input type="datetime-local" value={form.publishedDate} onChange={(e) => set("publishedDate", e.target.value)} /></Field>
            <Field label="Schedule for" hint="A future date publishes automatically."><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} /></Field>
            {article && <p className="text-xs text-muted">{article.views || 0} views · {article.likes || 0} likes · {article.shareCount || 0} shares</p>}
          </Card>

          <Card title="Taxonomy">
            <Field label="Category *"><CategorySelect value={form.category} onChange={(v) => { set("category", v); set("subCategory", ""); }} onlyRoot /></Field>
            <Field label="Sub-category">
              <Select value={form.subCategory} onChange={(e) => set("subCategory", e.target.value)} disabled={!subOptions.length}>
                <option value="">{subOptions.length ? "None" : "No sub-categories"}</option>
                {subOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Tags" hint="New tags are created automatically."><TagInput value={form.tags} onChange={(v) => set("tags", v)} /></Field>
          </Card>

          <Card title="Editorial flags">
            <div className="divide-y divide-line">
              {FLAG_LIST.map(([k, label, hint]) => (
                <Toggle key={k} label={label} hint={hint} checked={form[k] as boolean} onChange={(v) => set(k, v as never)} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority" hint="Higher ranks first"><Input type="number" value={form.priority} onChange={(e) => set("priority", Number(e.target.value))} /></Field>
              <Field label="Home order"><Input type="number" value={form.homeOrder} onChange={(e) => set("homeOrder", Number(e.target.value))} /></Field>
            </div>
          </Card>

          <Card title="Author">
            <Field label="Name"><Input value={form.author.name || ""} onChange={(e) => set("author", { ...form.author, name: e.target.value })} /></Field>
            <Field label="Designation"><Input value={form.author.designation || ""} onChange={(e) => set("author", { ...form.author, designation: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.author.email || ""} onChange={(e) => set("author", { ...form.author, email: e.target.value })} /></Field>
            <Field label="Bio"><Textarea rows={3} value={form.author.bio || ""} onChange={(e) => set("author", { ...form.author, bio: e.target.value })} /></Field>
            <ImageField label="Photo" aspect="aspect-square" withAlt={false} value={form.author.image || null} onChange={(v) => set("author", { ...form.author, image: v || undefined })} />
            <Field label="Profile link"><Input type="url" value={form.author.redirectUrl || ""} onChange={(e) => set("author", { ...form.author, redirectUrl: e.target.value })} /></Field>
            {(["twitter", "linkedin", "instagram", "website"] as const).map((k) => (
              <Field key={k} label={<span className="capitalize">{k}</span>}>
                <Input value={form.author.social?.[k] || ""} onChange={(e) => set("author", { ...form.author, social: { ...form.author.social, [k]: e.target.value } })} placeholder="https://" />
              </Field>
            ))}
          </Card>
        </aside>
      </div>

      <MediaPicker open={pickerFor !== null} multiple={pickerFor === "gallery"} onClose={() => setPickerFor(null)}
        onPick={(items) => {
          if (pickerFor === "editor") { const m = items[0]; if (m) insertImage.current(imageUrl(mediaToImage(m)), m.alt); }
          if (pickerFor === "gallery") set("gallery", [...form.gallery, ...items.map(mediaToImage)]);
        }} />
    </>
  );
}


import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Save, Trash2, X } from "lucide-react";
import { adsApi, homepageApi } from "@/lib/endpoints";
import { Button, ErrorState, Field, Input, PageLoader, Select, Textarea, Toggle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, errMsg, img } from "@/lib/utils";
import type { Article, Category, CategoryStrip, Gallery, GalleryItem, GalleryRail, Homepage, RailKey } from "@/lib/types";
import { PageHeader, Panel, Tabs } from "../parts";
import { ArticleListEditor, ArticlePickerModal, CategorySelect, useCategoryOptions } from "../pickers";
import { ImageField } from "../MediaPicker";
import { useSeo } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/* Local state                                                         */
/* ------------------------------------------------------------------ */

interface RailState { enabled: boolean; mode: "auto" | "manual"; items: Article[]; limit: number }
interface SectionState { category: string; trending: Article | null; subTrending: Article[] }
interface Block { title: string; link: string; image: string; order: number }
interface State {
  mainTrending: Article | null;
  subTrending: Article[];
  sections: Record<RailKey, RailState>;
  categorySections: SectionState[];
  customHomeBlocks: Block[];
  heroTitles: string[];
  heroSubtitle: string;
  categoryStrip: CategoryStrip;
  editorsText: { eyebrow: string; title: string; subtitle: string };
  inFocusText: { eyebrow: string; title: string; subtitle: string };
  gallery: Gallery;
}

const RAILS: { key: RailKey; label: string; hint: string }[] = [
  { key: "hero", label: "Centre story", hint: "The large story in the middle of the hero." },
  { key: "heroRail", label: "Side stories", hint: "Four stories flanking the centre: #1–2 on the left, #3–4 on the right." },
  { key: "editorsPicks", label: "Editor’s picks — slider", hint: "The large sliding story (up to 5) on the left of the editor’s block." },
  { key: "editorsGrid", label: "Editor’s picks — cards", hint: "The four cards to the right of the slider." },
  { key: "featured", label: "Featured stories", hint: "Cards next to the “Most read” list." },
  { key: "popular", label: "Most read", hint: "Ranked list. Leave on auto to rank by views." },
  { key: "latest", label: "Latest from the desk", hint: "The chronological stream." },
  { key: "dontMiss", label: "Don’t miss", hint: "Two big cards beside the latest stream." },
  { key: "moreStories", label: "More stories", hint: "Grid near the bottom of the page." },
  { key: "inFocus", label: "In focus carousel", hint: "The scrolling row of cards titled “More Stories You Shouldn’t Miss”." },
];

/** Rails edited on the Hero tab instead of Content rails. */
const HERO_KEYS: RailKey[] = ["hero", "heroRail"];
/** Rails with their own tabs. */
const OWN_TAB_KEYS: RailKey[] = ["hero", "heroRail", "editorsPicks", "editorsGrid", "inFocus"];
/** Sections removed from the public page; kept in the payload so saved data is untouched. */
const RETIRED_KEYS: RailKey[] = ["featured", "popular", "latest", "dontMiss"];

const objs = (xs?: (Article | string)[] | null) => (xs || []).filter((x): x is Article => !!x && typeof x === "object");
const idOf = (v: unknown) => (typeof v === "string" ? v : (v as { _id?: string } | null)?._id || "");

const emptyRail = (): GalleryRail => ({ enabled: true, width: "narrow", type: "ad", size: "auto", adPosition: "", heading: "", image: "", imageAlt: "", link: "", openInNewTab: true, stretch: false });

function init(h: Homepage): State {
  const sections = {} as Record<RailKey, RailState>;
  for (const { key } of RAILS) {
    const r = h.sections?.[key];
    sections[key] = { enabled: r?.enabled ?? true, mode: r?.mode ?? "auto", items: objs(r?.items), limit: r?.limit ?? 6 };
  }
  return {
    mainTrending: h.mainTrending && typeof h.mainTrending === "object" ? h.mainTrending : null,
    subTrending: objs(h.subTrending),
    sections,
    categorySections: (h.categorySections || []).map((s) => ({
      category: idOf(s.category),
      trending: s.trending && typeof s.trending === "object" ? (s.trending as Article) : null,
      subTrending: objs(s.subTrending),
    })),
    heroTitles: h.heroTitles || [],
    heroSubtitle: h.heroSubtitle || "",
    categoryStrip: { enabled: true, mode: "auto", items: [], eyebrow: "", title: "", subtitle: "", buttonLabel: "", ...(h.categoryStrip || {}) },
    editorsText: { eyebrow: "", title: "", subtitle: "", ...(h.editorsText || {}) },
    inFocusText: { eyebrow: "", title: "", subtitle: "", ...(h.inFocusText || {}) },
    customHomeBlocks: (h.customHomeBlocks || []).map((b, i) => ({ title: b.title || "", link: b.link || "", image: b.image || "", order: b.order ?? i })),
    gallery: {
      ...h.gallery,
      items: (h.gallery?.items || []).map((i) => ({ ...i })),
      rails: { left: { ...emptyRail(), ...h.gallery?.rails?.left, adPosition: h.gallery?.rails?.left?.adPosition || "home-gallery-left" }, right: { ...emptyRail(), ...h.gallery?.rails?.right, adPosition: h.gallery?.rails?.right?.adPosition || "home-gallery-right" } },
    },
  };
}

function payload(s: State) {
  return {
    mainTrending: s.mainTrending?._id || null,
    subTrending: s.subTrending.slice(0, 5).map((a) => a._id),
    categorySections: s.categorySections.filter((c) => c.category).map((c) => ({ category: c.category, trending: c.trending?._id || null, subTrending: c.subTrending.slice(0, 4).map((a) => a._id) })),
    heroTitles: s.heroTitles.map((t) => t.trim()).filter(Boolean),
    heroSubtitle: s.heroSubtitle.trim(),
    categoryStrip: { ...s.categoryStrip, items: s.categoryStrip.items.map((c) => (typeof c === "string" ? c : c._id)) },
    editorsText: s.editorsText,
    inFocusText: s.inFocusText,
    customHomeBlocks: s.customHomeBlocks.filter((b) => b.title || b.image).map((b, i) => ({ ...b, order: i })),
    sections: Object.fromEntries(RAILS.map(({ key }) => [key, { enabled: s.sections[key].enabled, mode: s.sections[key].mode, items: s.sections[key].items.map((a) => a._id) }])),
    gallery: { ...s.gallery, items: s.gallery.items.slice(0, 4).map((i, n) => ({ ...i, article: idOf(i.article) || null, order: n })) },
  };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SingleArticle({ value, onChange, label }: { value: Article | null; onChange: (a: Article | null) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium">{label}</p>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-line p-2">
          {value.featuredImage?.url ? <img src={img(value.featuredImage.url, 120)} alt="" className="size-12 rounded-lg object-cover" /> : <span className="size-12 rounded-lg bg-surface-2" />}
          <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium">{value.title}</span>
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Change</Button>
          <button aria-label="Clear" onClick={() => onChange(null)} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger/10"><X className="size-4" /></button>
        </div>
      ) : <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" /> Choose article</Button>}
      <ArticlePickerModal open={open} onClose={() => setOpen(false)} title={label} onPick={([a]) => a && onChange(a)} />
    </div>
  );
}

function RailEditor({ label, hint, rail, onChange }: { label: string; hint: string; rail: RailState; onChange: (r: RailState) => void }) {
  return (
    <div className={cn("rounded-2xl border border-line p-5", !rail.enabled && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h3 className="font-semibold">{label} <span className="text-xs font-normal text-muted">· up to {rail.limit}</span></h3><p className="text-xs text-muted">{hint}</p></div>
        <div className="flex items-center gap-4">
          <Select aria-label={`${label} mode`} className="h-9 w-auto" value={rail.mode} disabled={!rail.enabled} onChange={(e) => onChange({ ...rail, mode: e.target.value as RailState["mode"] })}>
            <option value="auto">Auto (live feed)</option><option value="manual">Curated</option>
          </Select>
          <Toggle label={rail.enabled ? "On" : "Off"} checked={rail.enabled} onChange={(v) => onChange({ ...rail, enabled: v })} />
        </div>
      </div>
      {rail.enabled && rail.mode === "manual" && (
        <div className="mt-4"><ArticleListEditor items={rail.items} onChange={(items) => onChange({ ...rail, items })} limit={rail.limit} title={`Add to ${label}`} />
          {!rail.items.length && <p className="mt-2 text-xs text-warn">Nothing picked — the live feed fills this rail until you add stories.</p>}</div>
      )}
      {rail.enabled && rail.mode === "auto" && rail.items.length > 0 && <p className="mt-3 text-xs text-muted">{rail.items.length} curated stor{rail.items.length > 1 ? "ies are" : "y is"} saved and will return if you switch back to Curated.</p>}
    </div>
  );
}

function RailConfig({ side, rail, positions, onChange }: { side: "left" | "right"; rail: GalleryRail; positions: string[]; onChange: (r: GalleryRail) => void }) {
  const set = <K extends keyof GalleryRail>(k: K, v: GalleryRail[K]) => onChange({ ...rail, [k]: v });
  return (
    <div className="space-y-4 rounded-2xl border border-line p-5">
      <div className="flex items-center justify-between"><h3 className="font-semibold capitalize">{side} rail</h3><Toggle label={rail.enabled ? "Enabled" : "Disabled"} checked={rail.enabled} onChange={(v) => set("enabled", v)} /></div>
      {rail.enabled && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Width"><Select value={rail.width} onChange={(e) => set("width", e.target.value as GalleryRail["width"])}><option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option></Select></Field>
            <Field label="Content"><Select value={rail.type} onChange={(e) => set("type", e.target.value as GalleryRail["type"])}><option value="ad">Booked ad</option><option value="banner">Static banner</option></Select></Field>
            <Field label="Frame size" hint="Auto keeps the artwork’s own shape."><Select value={rail.size} onChange={(e) => set("size", e.target.value as GalleryRail["size"])}>{["auto", "300x250", "300x600", "160x600"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Heading"><Input value={rail.heading} onChange={(e) => set("heading", e.target.value)} placeholder="Sponsored" /></Field>
          </div>
          {rail.type === "ad" ? (
            <Field label="Ad position" hint="Book a creative at this position under Advertising."><Select value={rail.adPosition} onChange={(e) => set("adPosition", e.target.value)}>{[...new Set([rail.adPosition, ...positions].filter(Boolean))].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          ) : (
            <div className="space-y-3">
              <ImageField label="Banner image" withAlt={false} aspect="aspect-[3/2]" value={rail.image ? { url: rail.image } : null} onChange={(v) => set("image", v?.url || "")} />
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Alt text"><Input value={rail.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} /></Field><Field label="Link"><Input value={rail.link} onChange={(e) => set("link", e.target.value)} placeholder="https://" /></Field></div>
              <Toggle label="Open in new tab" checked={rail.openInNewTab} onChange={(v) => set("openInNewTab", v)} />
            </div>
          )}
          <Toggle label="Stretch to tile height" hint="Off avoids empty space around the artwork." checked={rail.stretch} onChange={(v) => set("stretch", v)} />
        </>
      )}
    </div>
  );
}

function TileEditor({ item, index, onChange, onRemove }: { item: GalleryItem; index: number; onChange: (i: GalleryItem) => void; onRemove: () => void }) {
  const art = item.article && typeof item.article === "object" ? (item.article as Article) : null;
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Tile {index + 1}</h4><button onClick={onRemove} aria-label="Remove tile" className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger/10"><Trash2 className="size-4" /></button></div>
      <SingleArticle label="Linked article (optional)" value={art} onChange={(a) => onChange({ ...item, article: a })} />
      <p className="text-xs text-muted">Anything below overrides the article’s own image, title or link.</p>
      <ImageField label="Image override" withAlt={false} aspect="aspect-square" value={item.image ? { url: item.image } : null} onChange={(v) => onChange({ ...item, image: v?.url || "" })} />
      <Field label="Title"><Input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Category label"><Input value={item.category} onChange={(e) => onChange({ ...item, category: e.target.value })} /></Field><Field label="Link"><Input value={item.link} onChange={(e) => onChange({ ...item, link: e.target.value })} placeholder="/news/… or https://" /></Field></div>
    </div>
  );
}


function CategoryStripEditor({ value, onChange }: { value: CategoryStrip; onChange: (v: CategoryStrip) => void }) {
  const { flat } = useCategoryOptions();
  const [pick, setPick] = useState("");
  const set = <K extends keyof CategoryStrip>(k: K, v: CategoryStrip[K]) => onChange({ ...value, [k]: v });
  const byId = new Map(flat.map((c) => [c._id, c as Category]));
  const items = value.items.map((i) => (typeof i === "string" ? byId.get(i) : i)).filter((c): c is Category => !!c);
  const move = (i: number, d: number) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; set("items", n); };
  const limit = value.limit ?? 12;

  return (
    <div className="space-y-6">
      <Panel title="Browse by Category strip" description="The row of category cards under the editor’s block, with live article counts.">
        <div className="space-y-4">
          <Toggle label="Show this section" checked={value.enabled} onChange={(v) => set("enabled", v)} />
          <Field label="Which categories?">
            <Select value={value.mode} onChange={(e) => set("mode", e.target.value as CategoryStrip["mode"])}>
              <option value="auto">Auto — every category marked “Show on homepage”</option>
              <option value="manual">Curated — only the ones I pick below</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title="Section text" description="Leave blank to use the default wording.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label"><Input value={value.eyebrow} maxLength={60} placeholder="Explore categories" onChange={(e) => set("eyebrow", e.target.value)} /></Field>
          <Field label="Heading"><Input value={value.title} maxLength={80} placeholder="Browse by Category" onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Description" className="sm:col-span-2"><Input value={value.subtitle} maxLength={200} placeholder="Find the latest news, insights and updates in your favorite tech topics." onChange={(e) => set("subtitle", e.target.value)} /></Field>
          <Field label="Button text"><Input value={value.buttonLabel} maxLength={40} placeholder="View all categories" onChange={(e) => set("buttonLabel", e.target.value)} /></Field>
        </div>
      </Panel>

      {value.enabled && (
        <Panel title={`Curated categories (${items.length}/${limit})`} description={value.mode === "auto" ? "Saved for later — used only when you switch to Curated." : "Shown in this order."}>
          <div className="space-y-3">
            <ul className="space-y-2">
              {items.map((c, i) => (
                <li key={c._id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
                  <span className="grid size-6 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                  <Button size="sm" variant="ghost" disabled={i === 0} aria-label="Move up" onClick={() => move(i, -1)}>↑</Button>
                  <Button size="sm" variant="ghost" disabled={i === items.length - 1} aria-label="Move down" onClick={() => move(i, 1)}>↓</Button>
                  <button type="button" aria-label="Remove" onClick={() => set("items", items.filter((x) => x._id !== c._id))} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger/10"><X className="size-4" /></button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <div className="flex-1"><CategorySelect value={pick} onChange={setPick} onlyRoot placeholder="Add a category…" /></div>
              <Button variant="outline" disabled={!pick || items.length >= limit || items.some((c) => c._id === pick)} onClick={() => { const c = byId.get(pick); if (c) { set("items", [...items, c]); setPick(""); } }}><Plus className="size-4" /> Add</Button>
            </div>
            {value.mode === "manual" && !items.length && <p className="text-xs text-warn">Nothing picked — the site falls back to Auto until you add categories.</p>}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type TabId = "hero" | "editors" | "strip" | "focus" | "rails" | "categories" | "wall" | "blocks";

export default function HomepageManager() {
  useSeo({ title: "Homepage — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [tab, setTab] = useState<TabId>("hero");
  const [s, setS] = useState<State | null>(null);
  const [dirty, setDirty] = useState(false);

  const q = useQuery({ queryKey: ["homepage", "admin"], queryFn: homepageApi.get, staleTime: 0, gcTime: 0 });
  const ads = useQuery({ queryKey: ["ads", "positions"], queryFn: () => adsApi.list({}), staleTime: 5 * 60_000 });
  useEffect(() => { if (q.data) { setS(init(q.data)); setDirty(false); } }, [q.data]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: () => homepageApi.update(payload(s!)),
    onSuccess: () => { toast("Homepage saved"); setDirty(false); qc.invalidateQueries({ queryKey: ["homepage"] }); qc.invalidateQueries({ queryKey: ["homefeed"] }); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!s) return <PageLoader />;

  const patch = (p: Partial<State>) => { setS({ ...s, ...p }); setDirty(true); };
  const setGallery = (g: Partial<Gallery>) => patch({ gallery: { ...s.gallery, ...g } });
  const g = s.gallery;
  const positions = (ads.data?.positions || []).filter((p) => p.startsWith("home-gallery"));
  const disabled = !can("canPublish");

  return (
    <>
      <PageHeader title="Homepage layout" description="Curate every block on the front page — or leave a block on auto and let the live feed fill it."
        actions={<>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:border-brand">Preview <ExternalLink className="size-3.5" /></a>
          <Button loading={save.isPending} disabled={disabled || !dirty} onClick={() => save.mutate()}><Save className="size-4" /> {dirty ? "Save changes" : "Saved"}</Button>
        </>} />

      <div className="mb-6"><Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: "hero", label: "Hero" }, { id: "editors", label: "Editor’s picks" }, { id: "strip", label: "Browse by category" }, { id: "focus", label: "In focus" }, { id: "rails", label: "Content rails" }, { id: "categories", label: "Category sections", count: s.categorySections.length }, { id: "wall", label: "Snap Wall" }, { id: "blocks", label: "Custom blocks", count: s.customHomeBlocks.length }]} /></div>

      <fieldset disabled={disabled} className="min-w-0 space-y-6">
        {tab === "hero" && (
          <div className="space-y-6">
            {RAILS.filter((r) => HERO_KEYS.includes(r.key)).map((r) => (
              <RailEditor key={r.key} label={r.label} hint={r.hint} rail={s.sections[r.key]} onChange={(rail) => patch({ sections: { ...s.sections, [r.key]: rail } })} />
            ))}

            <Panel title="Automatic fallbacks" description="Used when a hero block above is on Auto. Leave empty to let the newest featured and trending stories fill in.">
              <div className="grid gap-6 lg:grid-cols-2">
                <SingleArticle label="Preferred centre story (main trending)" value={s.mainTrending} onChange={(a) => patch({ mainTrending: a })} />
                <div><p className="mb-2 text-[13px] font-medium">Preferred side stories (sub trending, up to 5)</p>
                  <ArticleListEditor items={s.subTrending} onChange={(subTrending) => patch({ subTrending })} limit={5} title="Add side story" /></div>
              </div>
            </Panel>
          </div>
        )}

        {tab === "editors" && (
          <div className="space-y-6">
            <p className="rounded-xl bg-brand-soft/60 px-4 py-3 text-sm text-muted">The “Editor’s Picks” block right under the Breaking bar: a sliding story with four story cards beside it. Leave each on <strong>Auto</strong> to fill from your flagged and newest stories, or switch to <strong>Curated</strong> to pick exactly what appears.</p>
            <Panel title="Section heading" description="Shown above the block. Leave blank to use the default wording.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Small label"><Input value={s.editorsText.eyebrow} maxLength={60} placeholder="Handpicked" onChange={(e) => patch({ editorsText: { ...s.editorsText, eyebrow: e.target.value } })} /></Field>
                <Field label="Heading"><Input value={s.editorsText.title} maxLength={100} placeholder="Editor’s Picks" onChange={(e) => patch({ editorsText: { ...s.editorsText, title: e.target.value } })} /></Field>
                <Field label="Description" className="sm:col-span-2"><Input value={s.editorsText.subtitle} maxLength={220} placeholder="Stories our editors think you should read first." onChange={(e) => patch({ editorsText: { ...s.editorsText, subtitle: e.target.value } })} /></Field>
              </div>
            </Panel>
            {RAILS.filter((r) => r.key === "editorsPicks" || r.key === "editorsGrid").map((r) => (
              <RailEditor key={r.key} label={r.label} hint={r.hint} rail={s.sections[r.key]} onChange={(rail) => patch({ sections: { ...s.sections, [r.key]: rail } })} />
            ))}
          </div>
        )}

        {tab === "strip" && <CategoryStripEditor value={s.categoryStrip} onChange={(categoryStrip) => patch({ categoryStrip })} />}

        {tab === "focus" && (
          <div className="space-y-6">
            <Panel title="Section text" description="Leave blank to use the default wording.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Small label"><Input value={s.inFocusText.eyebrow} maxLength={60} placeholder="In focus" onChange={(e) => patch({ inFocusText: { ...s.inFocusText, eyebrow: e.target.value } })} /></Field>
                <Field label="Heading"><Input value={s.inFocusText.title} maxLength={100} placeholder="More Stories You Shouldn’t Miss" onChange={(e) => patch({ inFocusText: { ...s.inFocusText, title: e.target.value } })} /></Field>
                <Field label="Description" className="sm:col-span-2"><Input value={s.inFocusText.subtitle} maxLength={220} placeholder="Handpicked tech stories, industry updates and expert insights — all in one place." onChange={(e) => patch({ inFocusText: { ...s.inFocusText, subtitle: e.target.value } })} /></Field>
              </div>
            </Panel>
            {RAILS.filter((r) => r.key === "inFocus").map((r) => (
              <RailEditor key={r.key} label={r.label} hint={r.hint} rail={s.sections[r.key]} onChange={(rail) => patch({ sections: { ...s.sections, [r.key]: rail } })} />
            ))}
          </div>
        )}

        {tab === "rails" && (
          <div className="space-y-4">
            {RAILS.filter((r) => !OWN_TAB_KEYS.includes(r.key) && !RETIRED_KEYS.includes(r.key)).map((r) => <RailEditor key={r.key} label={r.label} hint={r.hint} rail={s.sections[r.key]} onChange={(rail) => patch({ sections: { ...s.sections, [r.key]: rail } })} />)}
          </div>
        )}

        {tab === "categories" && (
          <div className="space-y-4">
            {s.categorySections.map((c, i) => (
              <Panel key={i} title={`Section ${i + 1}`} actions={<Button size="sm" variant="ghost" className="text-danger" onClick={() => patch({ categorySections: s.categorySections.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /> Remove</Button>}>
                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                  <Field label="Category"><CategorySelect value={c.category} onChange={(v) => patch({ categorySections: s.categorySections.map((x, j) => (j === i ? { ...x, category: v } : x)) })} onlyRoot /></Field>
                  <div className="space-y-5">
                    <SingleArticle label="Lead story" value={c.trending} onChange={(a) => patch({ categorySections: s.categorySections.map((x, j) => (j === i ? { ...x, trending: a } : x)) })} />
                    <div><p className="mb-2 text-[13px] font-medium">Side stories (up to 4)</p>
                      <ArticleListEditor items={c.subTrending} limit={4} onChange={(subTrending) => patch({ categorySections: s.categorySections.map((x, j) => (j === i ? { ...x, subTrending } : x)) })} /></div>
                  </div>
                </div>
              </Panel>
            ))}
            <Button variant="outline" onClick={() => patch({ categorySections: [...s.categorySections, { category: "", trending: null, subTrending: [] }] })}><Plus className="size-4" /> Add category section</Button>
            {s.categorySections.some((c) => !c.category) && <p className="text-xs text-warn">Sections without a category are dropped on save.</p>}
          </div>
        )}

        {tab === "wall" && (
          <div className="space-y-6">
            <Panel title="Snap Wall settings">
              <div className="space-y-4">
                <Toggle label="Show the Snap Wall on the homepage" checked={g.enabled} onChange={(v) => setGallery({ enabled: v })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title"><Input value={g.title} onChange={(e) => setGallery({ title: e.target.value })} /></Field>
                  <Field label="Source"><Select value={g.source} onChange={(e) => setGallery({ source: e.target.value as Gallery["source"] })}><option value="auto">Auto — newest stories</option><option value="manual">Manual — tiles below</option></Select></Field>
                  <Field label="Subtitle" className="sm:col-span-2"><Textarea rows={2} value={g.subtitle} onChange={(e) => setGallery({ subtitle: e.target.value })} /></Field>
                  <Field label="Action label"><Input value={g.actionLabel} onChange={(e) => setGallery({ actionLabel: e.target.value })} /></Field>
                  <Field label="Action link"><Input value={g.actionLink} onChange={(e) => setGallery({ actionLink: e.target.value })} /></Field>
                </div>
              </div>
            </Panel>

            {g.source === "manual" && (
              <Panel title={`Tiles (${g.items.length}/4)`} description="Four tiles keep the 2×2 block whole.">
                <div className="grid gap-4 md:grid-cols-2">
                  {g.items.map((it, i) => <TileEditor key={i} item={it} index={i} onChange={(n) => setGallery({ items: g.items.map((x, j) => (j === i ? n : x)) })} onRemove={() => setGallery({ items: g.items.filter((_, j) => j !== i) })} />)}
                </div>
                {g.items.length < 4 && <Button className="mt-4" variant="outline" onClick={() => setGallery({ items: [...g.items, { article: null, image: "", title: "", category: "", link: "", order: g.items.length }] })}><Plus className="size-4" /> Add tile</Button>}
              </Panel>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {(["left", "right"] as const).map((side) => (
                <RailConfig key={side} side={side} rail={g.rails[side]} positions={positions} onChange={(r) => setGallery({ rails: { ...g.rails, [side]: r } })} />
              ))}
            </div>
          </div>
        )}

        {tab === "blocks" && (
          <Panel title="Custom home blocks" description="Free-form promo tiles (title, link, image).">
            <div className="space-y-4">
              {s.customHomeBlocks.map((b, i) => (
                <div key={i} className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-[160px_1fr]">
                  <ImageField withAlt={false} aspect="aspect-square" value={b.image ? { url: b.image } : null} onChange={(v) => patch({ customHomeBlocks: s.customHomeBlocks.map((x, j) => (j === i ? { ...x, image: v?.url || "" } : x)) })} />
                  <div className="space-y-3">
                    <Field label="Title"><Input value={b.title} onChange={(e) => patch({ customHomeBlocks: s.customHomeBlocks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} /></Field>
                    <Field label="Link"><Input value={b.link} onChange={(e) => patch({ customHomeBlocks: s.customHomeBlocks.map((x, j) => (j === i ? { ...x, link: e.target.value } : x)) })} /></Field>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => { const n = [...s.customHomeBlocks]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; patch({ customHomeBlocks: n }); }}>↑ Up</Button>
                      <Button size="sm" variant="ghost" disabled={i === s.customHomeBlocks.length - 1} onClick={() => { const n = [...s.customHomeBlocks]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; patch({ customHomeBlocks: n }); }}>↓ Down</Button>
                      <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={() => patch({ customHomeBlocks: s.customHomeBlocks.filter((_, j) => j !== i) })}><Trash2 className="size-3.5" /> Remove</Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => patch({ customHomeBlocks: [...s.customHomeBlocks, { title: "", link: "", image: "", order: s.customHomeBlocks.length }] })}><Plus className="size-4" /> Add block</Button>
            </div>
          </Panel>
        )}
      </fieldset>
    </>
  );
}


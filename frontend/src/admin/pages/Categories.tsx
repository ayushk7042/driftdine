import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronRight, Eye, EyeOff, Home, LayoutList, Menu, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { categoryApi } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Select, Skeleton, Textarea, Toggle } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, emojiIcon, errMsg } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { PageHeader, Panel, Tabs } from "../parts";
import { ImageField } from "../MediaPicker";
import { CategorySelect } from "../pickers";
import { useSeo } from "@/lib/seo";

const empty = (parent = ""): Partial<Category> & { parent: string } => ({
  name: "", slug: "", description: "", icon: "", color: "", shortLabel: "", parent,
  status: "active", showOnHome: true, showInMenu: true, showInFooter: false, featured: false, hidden: false,
  autoUpdateEnabled: false, dailyAutoUpdateLimit: 10, maxSubTrending: 5, priority: 0, order: 0,
  metaTitle: "", metaDescription: "", focusKeyword: "", canonicalUrl: "", robots: "index, follow", redirectUrl: "",
});

function CategoryForm({ initial, onClose, onSaved }: { initial: Partial<Category> & { parent?: string | null }; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isEdit = !!initial._id;
  const [f, setF] = useState<Partial<Category> & { parent?: string | null }>({ ...empty(), ...initial, parent: (initial.parent as string) || "" });
  const [tab, setTab] = useState<"general" | "display" | "seo" | "automation">("general");
  const set = <K extends keyof Category>(k: K, v: Category[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, parent: f.parent || null } as Partial<Category>;
      if (!body.slug) delete body.slug;
      return isEdit ? categoryApi.update(initial._id!, body) : categoryApi.create(body);
    },
    onSuccess: () => { toast(isEdit ? "Category updated" : "Category created"); onSaved(); onClose(); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={isEdit ? `Edit ${initial.name}` : "New category"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!f.name?.trim()} onClick={() => save.mutate()}>{isEdit ? "Save changes" : "Create"}</Button></>}>
      <div className="space-y-5">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "general", label: "General" }, { id: "display", label: "Display" }, { id: "seo", label: "SEO" }, { id: "automation", label: "Automation" }]} />
        {tab === "general" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *"><Input value={f.name || ""} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
            <Field label="Slug" hint="Blank = generated from name."><Input value={f.slug || ""} onChange={(e) => set("slug", e.target.value)} /></Field>
            <Field label="Parent category"><CategorySelect value={(f.parent as string) || ""} onChange={(v) => setF((x) => ({ ...x, parent: v }))} onlyRoot exclude={initial._id} placeholder="None (top level)" /></Field>
            <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value as Category["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Icon (emoji)"><Input value={f.icon || ""} onChange={(e) => set("icon", e.target.value)} placeholder="🚀" /></Field>
            <Field label="Short label" hint="Compact name for nav pills."><Input value={f.shortLabel || ""} onChange={(e) => set("shortLabel", e.target.value)} /></Field>
            <Field label="Accent colour"><div className="flex gap-2"><input type="color" value={f.color || "#2fc386"} onChange={(e) => set("color", e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface" /><Input value={f.color || ""} onChange={(e) => set("color", e.target.value)} placeholder="#2fc386" /></div></Field>
            <Field label="Redirect URL" hint="Send the category link elsewhere."><Input value={f.redirectUrl || ""} onChange={(e) => set("redirectUrl", e.target.value)} /></Field>
          </div>
        )}
        {tab === "display" && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <ImageField label="Cover image" value={f.image} onChange={(v) => set("image", v || undefined)} aspect="aspect-[4/3]" />
              <ImageField label="Banner" value={f.banner} onChange={(v) => set("banner", v || undefined)} aspect="aspect-[16/6]" />
              <ImageField label="Icon image" value={f.iconImage} onChange={(v) => set("iconImage", v || undefined)} aspect="aspect-square" withAlt={false} />
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <Toggle label="Show on homepage" checked={!!f.showOnHome} onChange={(v) => set("showOnHome", v)} />
              <Toggle label="Show in menu" checked={!!f.showInMenu} onChange={(v) => set("showInMenu", v)} />
              <Toggle label="Show in footer" checked={!!f.showInFooter} onChange={(v) => set("showInFooter", v)} />
              <Toggle label="Featured" checked={!!f.featured} onChange={(v) => set("featured", v)} />
              <Toggle label="Hidden" hint="Removes it from public lists." checked={!!f.hidden} onChange={(v) => set("hidden", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Order"><Input type="number" value={f.order ?? 0} onChange={(e) => set("order", Number(e.target.value))} /></Field>
              <Field label="Priority" hint="Higher shows first"><Input type="number" value={f.priority ?? 0} onChange={(e) => set("priority", Number(e.target.value))} /></Field>
              <Field label="Max sub-trending"><Input type="number" min={0} value={f.maxSubTrending ?? 5} onChange={(e) => set("maxSubTrending", Number(e.target.value))} /></Field>
            </div>
          </div>
        )}
        {tab === "seo" && (
          <div className="grid gap-4">
            <Field label="Meta title"><Input value={f.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value)} /></Field>
            <Field label="Meta description"><Textarea rows={3} value={f.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Focus keyword"><Input value={f.focusKeyword || ""} onChange={(e) => set("focusKeyword", e.target.value)} /></Field>
              <Field label="Robots"><Select value={f.robots} onChange={(e) => set("robots", e.target.value)}>{["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
              <Field label="SEO title (legacy)"><Input value={f.seoTitle || ""} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
              <Field label="SEO description (legacy)"><Input value={f.seoDescription || ""} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
            </div>
            <Field label="Canonical URL"><Input value={f.canonicalUrl || ""} onChange={(e) => set("canonicalUrl", e.target.value)} /></Field>
            <ImageField label="Open Graph image" value={f.ogImage} onChange={(v) => set("ogImage", v || undefined)} />
          </div>
        )}
        {tab === "automation" && (
          <div className="space-y-4">
            <Toggle label="Enable AI auto-updates" hint="The daily job creates articles for this category." checked={!!f.autoUpdateEnabled} onChange={(v) => set("autoUpdateEnabled", v)} />
            <Field label="Daily article limit"><Input type="number" min={0} value={f.dailyAutoUpdateLimit ?? 10} onChange={(e) => set("dailyAutoUpdateLimit", Number(e.target.value))} /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeleteDialog({ cat, onClose, onDone }: { cat: Category; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [moveTo, setMoveTo] = useState("");
  const [needsForce, setNeedsForce] = useState<{ articleCount: number; childCount: number } | null>(null);

  const del = useMutation({
    mutationFn: (force: boolean) => categoryApi.remove(cat._id, { force, moveTo: moveTo || undefined }),
    onSuccess: () => { toast("Category deleted"); onDone(); onClose(); },
    onError: (e) => {
      // 409 = in use; the API reports counts and wants an explicit force + destination.
      if (e instanceof ApiError && e.status === 409) setNeedsForce({ articleCount: e.data?.articleCount ?? 0, childCount: e.data?.childCount ?? 0 });
      else toast(errMsg(e), "error");
    },
  });

  return (
    <Modal open onClose={onClose} size="sm" title={`Delete “${cat.name}”?`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={del.isPending} disabled={!!needsForce && needsForce.articleCount > 0 && !moveTo} onClick={() => del.mutate(!!needsForce)}>{needsForce ? "Delete anyway" : "Delete"}</Button></>}>
      {!needsForce ? <p className="text-sm text-muted">This removes the category. If it still has articles or sub-categories you’ll be asked how to handle them.</p> : (
        <div className="space-y-4 text-sm">
          <p className="rounded-xl bg-warn/10 px-3 py-2 text-warn">In use: <strong>{needsForce.articleCount}</strong> article(s) and <strong>{needsForce.childCount}</strong> sub-categor{needsForce.childCount === 1 ? "y" : "ies"}. Sub-categories become top-level.</p>
          {needsForce.articleCount > 0 && (
            <Field label="Move its articles to"><CategorySelect value={moveTo} onChange={setMoveTo} exclude={cat._id} placeholder="Choose a category…" /></Field>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Categories() {
  useSeo({ title: "Categories — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [editing, setEditing] = useState<null | (Partial<Category> & { parent?: string | null })>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const q = useQuery({ queryKey: ["categories", "tree", "all"], queryFn: () => categoryApi.tree("all") });
  const counts = useQuery({ queryKey: ["categories", "counts"], queryFn: () => categoryApi.list({ status: "all", withCounts: "true" }) });
  const countOf = useMemo(() => new Map((counts.data || []).map((c) => [c._id, c.articleCount || 0])), [counts.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["category"] }); qc.invalidateQueries({ queryKey: ["homepage"] }); };

  const reorder = useMutation({
    mutationFn: categoryApi.reorder,
    onSuccess: refresh,
    onError: (e) => toast(errMsg(e), "error"),
  });
  const visibility = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Category> }) => categoryApi.visibility(id, body),
    onSuccess: refresh,
    onError: (e) => toast(errMsg(e), "error"),
  });

  const move = (siblings: Category[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= siblings.length) return;
    const next = [...siblings];
    [next[i], next[j]] = [next[j], next[i]];
    reorder.mutate(next.map((c, order) => ({ id: c._id, order, parent: c.parent || null })));
  };

  const Row = ({ c, siblings, i, depth }: { c: Category; siblings: Category[]; i: number; depth: number }) => {
    const expanded = open.has(c._id);
    const kids = c.children || [];
    const chip = "inline-flex size-8 items-center justify-center rounded-lg transition hover:bg-surface-2";
    return (
      <li>
        <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-line hover:bg-surface-2/50", depth > 0 && "ml-8")}>
          {depth === 0 ? (
            <button onClick={() => setOpen((s) => { const n = new Set(s); n.has(c._id) ? n.delete(c._id) : n.add(c._id); return n; })} aria-label={expanded ? "Collapse" : "Expand"} aria-expanded={expanded} className={cn(chip, !kids.length && "invisible")}>
              <ChevronRight className={cn("size-4 transition", expanded && "rotate-90")} />
            </button>
          ) : <span className="size-8" />}
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg" style={c.color ? { background: `${c.color}26` } : undefined}>{emojiIcon(c.icon) || <LayoutList className="size-4 text-brand" />}</span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">{c.name}
              {c.status === "inactive" && <Badge tone="warn">Inactive</Badge>}
              {c.hidden && <Badge tone="neutral">Hidden</Badge>}
              {c.featured && <Badge tone="brand">Featured</Badge>}
            </p>
            <p className="text-xs text-muted">/{c.slug} · {countOf.get(c._id) ?? 0} published</p>
          </div>
          <div className="flex items-center gap-0.5">
            <button className={cn(chip, c.showOnHome ? "text-brand" : "text-muted/50")} title="Show on homepage" aria-pressed={c.showOnHome} onClick={() => visibility.mutate({ id: c._id, body: { showOnHome: !c.showOnHome } })} disabled={!can("canPublish")}><Home className="size-4" /></button>
            <button className={cn(chip, c.showInMenu ? "text-brand" : "text-muted/50")} title="Show in menu" aria-pressed={c.showInMenu} onClick={() => visibility.mutate({ id: c._id, body: { showInMenu: !c.showInMenu } })} disabled={!can("canPublish")}><Menu className="size-4" /></button>
            <button className={cn(chip, c.featured ? "text-warn" : "text-muted/50")} title="Featured" aria-pressed={c.featured} onClick={() => visibility.mutate({ id: c._id, body: { featured: !c.featured } })} disabled={!can("canPublish")}><Star className="size-4" /></button>
            <button className={chip} title={c.hidden ? "Unhide" : "Hide"} onClick={() => visibility.mutate({ id: c._id, body: { hidden: !c.hidden } })} disabled={!can("canPublish")}>{c.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            <span className="mx-1 h-5 w-px bg-line" />
            <button className={chip} aria-label="Move up" disabled={i === 0 || !can("canPublish")} onClick={() => move(siblings, i, -1)}><ArrowUp className="size-4" /></button>
            <button className={chip} aria-label="Move down" disabled={i === siblings.length - 1 || !can("canPublish")} onClick={() => move(siblings, i, 1)}><ArrowDown className="size-4" /></button>
            {depth === 0 && can("canPublish") && <button className={chip} title="Add sub-category" onClick={() => setEditing(empty(c._id))}><Plus className="size-4" /></button>}
            {can("canPublish") && <button className={chip} title="Edit" onClick={() => setEditing(c)}><Pencil className="size-4" /></button>}
            {can("canDelete") && <button className={cn(chip, "text-danger")} title="Delete" onClick={() => setDeleting(c)}><Trash2 className="size-4" /></button>}
          </div>
        </div>
        {depth === 0 && expanded && kids.length > 0 && <ul>{kids.map((k, j) => <Row key={k._id} c={k} siblings={kids} i={j} depth={1} />)}</ul>}
      </li>
    );
  };

  const tree = q.data || [];
  return (
    <>
      <PageHeader title="Categories" description="Organise the site into topics and sub-topics. Use the arrows to reorder."
        actions={can("canPublish") && <Button onClick={() => setEditing(empty())}><Plus className="size-4" /> New category</Button>} />
      <Panel className="!p-0">
        {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <div className="space-y-2 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
          : !tree.length ? <EmptyState title="No categories yet" text="Create your first topic to start publishing." action={<Button onClick={() => setEditing(empty())}>New category</Button>} />
          : <ul className="p-2">{tree.map((c, i) => <Row key={c._id} c={c} siblings={tree} i={i} depth={0} />)}</ul>}
      </Panel>
      {editing && <CategoryForm initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {deleting && <DeleteDialog cat={deleting} onClose={() => setDeleting(null)} onDone={refresh} />}
    </>
  );
}

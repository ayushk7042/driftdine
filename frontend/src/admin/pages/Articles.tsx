import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Copy, Download, ExternalLink, FileX, MoreHorizontal, PenSquare, Pencil, RotateCcw, Search, Star, Trash2 } from "lucide-react";
import { importApi, newsApi, type NewsQuery } from "@/lib/endpoints";
import { Button, EmptyState, ErrorState, Input, LinkButton, Select, Skeleton } from "@/components/ui";
import { ConfirmModal, Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, catOf, compact, errMsg, fmtDate, dateOf, img } from "@/lib/utils";
import type { Article, ArticleStatus } from "@/lib/types";
import { Checkbox, PageHeader, StatusBadge, Table, Tabs, Td, Th } from "../parts";
import { CategorySelect, TagInput } from "../pickers";
import { useDebounced } from "../hooks";
import { useSeo } from "@/lib/seo";

type Tab = "all" | ArticleStatus;
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" }, { id: "published", label: "Published" }, { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" }, { id: "archived", label: "Archived" }, { id: "trash", label: "Trash" },
];
const FLAGS: [string, string][] = [
  ["featured", "Featured"], ["trending", "Trending"], ["popular", "Popular"], ["breakingNews", "Breaking"], ["editorsPick", "Editor’s pick"],
  ["isMainTrending", "Homepage hero"], ["isSubTrending", "Hero rail"],
];

function RowMenu({ a, onAct }: { a: Article; onAct: (act: string) => void }) {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2";
  const go = (act: string) => { setOpen(false); onAct(act); };
  const trashed = a.status === "trash" || !!a.deletedAt;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Row actions" aria-expanded={open} className="grid size-8 place-items-center rounded-lg hover:bg-surface-2"><MoreHorizontal className="size-4" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-line bg-surface p-1 shadow-pop">
            <Link to={`/admin/articles/${a._id}/edit`} className={item}><Pencil className="size-4" /> Edit</Link>
            <Link to={`/news/${a.slug}`} target="_blank" className={item}><ExternalLink className="size-4" /> {a.status === "published" ? "View live" : "Preview"}</Link>
            {can("canPublish") && <button className={item} onClick={() => go("duplicate")}><Copy className="size-4" /> Duplicate</button>}
            {can("canPublish") && !trashed && a.status !== "published" && <button className={item} onClick={() => go("publish")}><CheckCircle2 className="size-4" /> Publish</button>}
            {can("canPublish") && !trashed && a.status === "published" && <button className={item} onClick={() => go("unpublish")}><FileX className="size-4" /> Unpublish</button>}
            {can("canPublish") && !trashed && a.status !== "archived" && <button className={item} onClick={() => go("archive")}><Archive className="size-4" /> Archive</button>}
            {can("canPublish") && trashed && <button className={item} onClick={() => go("restore")}><RotateCcw className="size-4" /> Restore as draft</button>}
            {can("canDelete") && !trashed && <button className={cn(item, "text-danger")} onClick={() => go("trash")}><Trash2 className="size-4" /> Move to trash</button>}
            {can("canDelete") && trashed && <button className={cn(item, "text-danger")} onClick={() => go("delete")}><Trash2 className="size-4" /> Delete forever</button>}
          </div>
        </>
      )}
    </div>
  );
}

export default function Articles() {
  useSeo({ title: "Articles — Admin", robots: "noindex" });
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const term = useDebounced(search);
  const tab = (params.get("status") as Tab) || "all";
  const category = params.get("category") || "";
  const flag = params.get("flag") || "";
  const page = Number(params.get("page")) || 1;
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<null | "category" | "tags" | "flags" | "delete" | "hard">(null);
  const [confirm, setConfirm] = useState<null | { a: Article; act: "trash" | "delete" }>(null);

  const query: NewsQuery = { page, limit: 20, sort: "updated", search: term, category, status: tab === "all" ? "all" : tab };
  if (flag) query[flag] = true;

  const q = useQuery({ queryKey: ["news", "admin", query], queryFn: () => newsApi.list(query), placeholderData: keepPreviousData });
  const items = q.data?.data || [];

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
    setSel(new Set());
  };

  const done = (msg: string) => { toast(msg); setSel(new Set()); setBulk(null); qc.invalidateQueries({ queryKey: ["news"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const fail = (e: unknown) => toast(errMsg(e), "error");

  const rowAct = useMutation({
    mutationFn: async ({ a, act }: { a: Article; act: string }) => {
      switch (act) {
        case "duplicate": return newsApi.duplicate(a._id);
        case "publish": return newsApi.changeStatus(a._id, "published");
        case "unpublish": return newsApi.changeStatus(a._id, "draft");
        case "archive": return newsApi.changeStatus(a._id, "archived");
        case "restore": return newsApi.restore(a._id, "draft");
        case "trash": return newsApi.trash(a._id);
        case "delete": return newsApi.remove(a._id);
      }
    },
    onSuccess: (_r, v) => done(`Done: ${v.act}`),
    onError: fail,
  });

  const bulkStatus = useMutation({ mutationFn: (status: ArticleStatus) => newsApi.bulkStatus([...sel], status), onSuccess: () => done("Status updated"), onError: fail });
  const allIds = useMemo(() => items.map((a) => a._id), [items]);
  const allSelected = allIds.length > 0 && allIds.every((id) => sel.has(id));

  const exportXlsx = useMutation({ mutationFn: () => importApi.export({ status: tab === "all" ? undefined : tab, category: undefined }), onSuccess: () => toast("Export started"), onError: fail });

  return (
    <>
      <PageHeader title="Articles" description="Create, curate and publish every story."
        actions={<>
          <Button variant="outline" loading={exportXlsx.isPending} onClick={() => exportXlsx.mutate()}><Download className="size-4" /> Export</Button>
          {can("canPublish") && <LinkButton to="/admin/articles/new"><PenSquare className="size-4" /> New article</LinkButton>}
        </>} />

      <div className="card overflow-hidden">
        <div className="space-y-3 border-b border-line p-4">
          <Tabs tabs={TABS} value={tab} onChange={(t) => set({ status: t === "all" ? null : t })} />
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" placeholder="Search title, tags, author…" value={search} onChange={(e) => { setSearch(e.target.value); setParams((p) => { p.delete("page"); return p; }, { replace: true }); }} />
            </div>
            <CategorySelect value={category} onChange={(v) => set({ category: v || null })} placeholder="All categories" className="w-auto min-w-44" />
            <Select value={flag} onChange={(e) => set({ flag: e.target.value || null })} className="w-auto" aria-label="Flag filter">
              <option value="">Any flag</option>
              {FLAGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </div>
        </div>

        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-soft px-4 py-2.5 text-sm">
            <strong className="mr-2">{sel.size} selected</strong>
            {can("canPublish") && <>
              <Button size="sm" variant="outline" onClick={() => bulkStatus.mutate("published")}>Publish</Button>
              <Button size="sm" variant="outline" onClick={() => bulkStatus.mutate("draft")}>Draft</Button>
              <Button size="sm" variant="outline" onClick={() => bulkStatus.mutate("archived")}>Archive</Button>
              <Button size="sm" variant="outline" onClick={() => setBulk("category")}>Category</Button>
              <Button size="sm" variant="outline" onClick={() => setBulk("tags")}>Tags</Button>
              <Button size="sm" variant="outline" onClick={() => setBulk("flags")}><Star className="size-3.5" /> Flags</Button>
            </>}
            {can("canDelete") && <>
              <Button size="sm" variant="danger" onClick={() => setBulk("delete")}>Trash</Button>
              <Button size="sm" variant="danger" onClick={() => setBulk("hard")}>Delete forever</Button>
            </>}
            <button className="ml-auto text-muted hover:text-fg" onClick={() => setSel(new Set())}>Clear</button>
          </div>
        )}

        {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !items.length ? (
          <EmptyState title="No articles found" text="Try another filter, or write something new." action={can("canPublish") ? <LinkButton to="/admin/articles/new">New article</LinkButton> : undefined} />
        ) : (
          <Table className={cn(q.isFetching && "opacity-60 transition-opacity")}>
            <thead>
              <tr>
                <Th className="w-10"><Checkbox label="Select all" checked={allSelected} indeterminate={sel.size > 0} onChange={(v) => setSel(v ? new Set(allIds) : new Set())} /></Th>
                <Th>Article</Th><Th>Category</Th><Th>Status</Th><Th>Flags</Th><Th className="text-right">Views</Th><Th>Date</Th><Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id} className={cn("transition hover:bg-surface-2/60", sel.has(a._id) && "bg-brand-soft/50")}>
                  <Td><Checkbox label={`Select ${a.title}`} checked={sel.has(a._id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(a._id) : n.delete(a._id); return n; })} /></Td>
                  <Td className="max-w-md">
                    <div className="flex items-center gap-3">
                      {a.featuredImage?.url ? <img src={img(a.featuredImage.url, 120)} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg object-cover" /> : <span className="size-11 shrink-0 rounded-lg bg-surface-2" />}
                      <div className="min-w-0">
                        <Link to={`/admin/articles/${a._id}/edit`} className="line-clamp-1 font-medium hover:text-brand">{a.title}</Link>
                        <p className="text-xs text-muted">{a.author?.name || "—"} · {a.readTime || 0} min · SEO {a.seoScore ?? 0}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">{catOf(a)?.name || "—"}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {a.isMainTrending && <span title="Homepage hero" className="rounded bg-accent/25 px-1.5 text-[10px] font-bold">HERO</span>}
                      {a.featured && <span title="Featured" className="rounded bg-brand-soft px-1.5 text-[10px] font-bold text-brand">FEAT</span>}
                      {a.trending && <span title="Trending" className="rounded bg-warn/20 px-1.5 text-[10px] font-bold text-warn">TREND</span>}
                      {a.breakingNews && <span title="Breaking" className="rounded bg-danger/20 px-1.5 text-[10px] font-bold text-danger">BRK</span>}
                      {a.editorsPick && <span title="Editor's pick" className="rounded bg-sky-500/20 px-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-300">PICK</span>}
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">{compact(a.views || 0)}</Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(dateOf(a))}</Td>
                  <Td><RowMenu a={a} onAct={(act) => (act === "trash" || act === "delete" ? setConfirm({ a, act }) : rowAct.mutate({ a, act }))} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="border-t border-line p-4"><Pagination pagination={q.data?.pagination} onPage={(p) => set({ page: p === 1 ? null : String(p) })} />
          {q.data && <p className="mt-2 text-center text-xs text-muted">{q.data.pagination.total} articles</p>}</div>
      </div>

      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} danger loading={rowAct.isPending}
        title={confirm?.act === "delete" ? "Delete forever?" : "Move to trash?"}
        text={confirm?.act === "delete" ? `“${confirm?.a.title}” will be permanently removed. This cannot be undone.` : `“${confirm?.a.title}” will be hidden from the site. You can restore it from Trash.`}
        confirmLabel={confirm?.act === "delete" ? "Delete forever" : "Move to trash"}
        onConfirm={() => confirm && rowAct.mutate(confirm, { onSettled: () => setConfirm(null) })} />

      <BulkDialogs kind={bulk} ids={[...sel]} onClose={() => setBulk(null)} onDone={done} onError={fail} />
    </>
  );
}

function BulkDialogs({ kind, ids, onClose, onDone, onError }: { kind: null | "category" | "tags" | "flags" | "delete" | "hard"; ids: string[]; onClose: () => void; onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "replace" | "remove">("add");
  const [flags, setFlags] = useState<Record<string, "keep" | "on" | "off">>({});

  const run = useMutation({
    mutationFn: async () => {
      if (kind === "category") return newsApi.bulkCategory(ids, cat, sub || null);
      if (kind === "tags") return newsApi.bulkTags(ids, tags, mode);
      if (kind === "flags") return newsApi.bulkFlags(ids, Object.fromEntries(Object.entries(flags).filter(([, v]) => v !== "keep").map(([k, v]) => [k, v === "on"])));
      return newsApi.bulkDelete(ids, kind === "hard");
    },
    onSuccess: () => { onDone("Bulk update applied"); setTags([]); setFlags({}); setCat(""); setSub(""); },
    onError,
  });

  const title = { category: "Change category", tags: "Edit tags", flags: "Set flags", delete: "Move to trash", hard: "Delete forever" }[kind || "delete"];
  const danger = kind === "delete" || kind === "hard";
  const allFlags: [string, string][] = [...FLAGS, ["isCategoryTrending", "Category lead"], ["isCategorySubTrending", "Category rail"]];

  return (
    <Modal open={!!kind} onClose={onClose} title={`${title} · ${ids.length} article${ids.length > 1 ? "s" : ""}`} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} loading={run.isPending} onClick={() => run.mutate()}
          disabled={(kind === "category" && !cat) || (kind === "tags" && !tags.length)}>Apply</Button></>}>
      {kind === "category" && (
        <div className="space-y-3">
          <CategorySelect value={cat} onChange={setCat} onlyRoot placeholder="New category" />
          <CategorySelect value={sub} onChange={setSub} placeholder="Sub-category (optional, clears if empty)" />
        </div>
      )}
      {kind === "tags" && (
        <div className="space-y-4">
          <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="add">Add these tags</option><option value="remove">Remove these tags</option><option value="replace">Replace all tags with these</option>
          </Select>
          <TagInput value={tags} onChange={setTags} />
        </div>
      )}
      {kind === "flags" && (
        <ul className="divide-y divide-line">
          {allFlags.map(([k, l]) => (
            <li key={k} className="flex items-center justify-between py-2.5 text-sm">
              {l}
              <span className="inline-flex overflow-hidden rounded-full border border-line text-xs">
                {(["keep", "on", "off"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setFlags({ ...flags, [k]: v })}
                    className={cn("px-3 py-1.5 capitalize", (flags[k] || "keep") === v ? "bg-brand text-brand-fg" : "hover:bg-surface-2")}>{v === "keep" ? "Keep" : v === "on" ? "On" : "Off"}</button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {kind === "delete" && <p className="text-sm text-muted">These articles will be hidden from the site and can be restored from Trash.</p>}
      {kind === "hard" && <p className="text-sm text-danger">These articles will be permanently deleted. This cannot be undone.</p>}
    </Modal>
  );
}

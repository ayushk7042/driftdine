import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitMerge, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { tagApi } from "@/lib/endpoints";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Select, Skeleton, Textarea, Toggle } from "@/components/ui";
import { ConfirmModal, Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, errMsg } from "@/lib/utils";
import type { Tag } from "@/lib/types";
import { Checkbox, PageHeader, Panel, Table, Td, Th } from "../parts";
import { useDebounced } from "../hooks";
import { useSeo } from "@/lib/seo";

function TagForm({ initial, onClose, onSaved }: { initial: Partial<Tag>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<Tag>>({ status: "active", featured: false, ...initial });
  const save = useMutation({
    mutationFn: () => { const b = { ...f }; if (!b.slug) delete b.slug; return initial._id ? tagApi.update(initial._id, b) : tagApi.create(b); },
    onSuccess: () => { toast("Tag saved"); onSaved(); onClose(); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  return (
    <Modal open onClose={onClose} title={initial._id ? "Edit tag" : "New tag"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!f.name?.trim()} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *"><Input value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Slug"><Input value={f.slug || ""} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="auto" /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="SEO title"><Input value={f.seoTitle || ""} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} /></Field>
        <Field label="Focus keyword"><Input value={f.focusKeyword || ""} onChange={(e) => setF({ ...f, focusKeyword: e.target.value })} /></Field>
        <Field label="SEO description" className="sm:col-span-2"><Textarea rows={2} value={f.seoDescription || ""} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Tag["status"] })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
        <div className="self-end"><Toggle label="Featured" checked={!!f.featured} onChange={(v) => setF({ ...f, featured: v })} /></div>
      </div>
    </Modal>
  );
}

export default function Tags() {
  useSeo({ title: "Tags — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("popular");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Partial<Tag> | null>(null);
  const [merging, setMerging] = useState(false);
  const [target, setTarget] = useState("");
  const [confirmDel, setConfirmDel] = useState<null | { ids: string[]; label: string }>(null);
  const term = useDebounced(search);

  const q = useQuery({ queryKey: ["tags", "admin", page, term, status, sort], queryFn: () => tagApi.list({ page, limit: 30, search: term, status, sort }), placeholderData: keepPreviousData });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["tags"] }); setSel(new Set()); };
  const fail = (e: unknown) => toast(errMsg(e), "error");

  const recount = useMutation({ mutationFn: tagApi.recount, onSuccess: (r) => { toast(r.message); refresh(); }, onError: fail });
  const del = useMutation({
    mutationFn: (ids: string[]) => (ids.length === 1 ? tagApi.remove(ids[0]) : tagApi.bulkDelete(ids)),
    onSuccess: () => { toast("Tag(s) deleted"); setConfirmDel(null); refresh(); }, onError: fail,
  });
  const merge = useMutation({
    mutationFn: () => tagApi.merge([...sel].filter((id) => id !== target), target),
    onSuccess: () => { toast("Tags merged"); setMerging(false); setTarget(""); refresh(); }, onError: fail,
  });
  const toggleFeatured = useMutation({ mutationFn: (t: Tag) => tagApi.update(t._id, { featured: !t.featured }), onSuccess: refresh, onError: fail });

  const items = q.data?.data || [];
  const selTags = items.filter((t) => sel.has(t._id));

  return (
    <>
      <PageHeader title="Tags" description="Keep the tag cloud clean — rename, merge and prune."
        actions={<>
          {can("canPublish") && <Button variant="outline" loading={recount.isPending} onClick={() => recount.mutate()}><RefreshCw className="size-4" /> Recount usage</Button>}
          {can("canPublish") && <Button onClick={() => setEditing({})}><Plus className="size-4" /> New tag</Button>}
        </>} />
      <Panel className="!p-0">
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input className="pl-9" placeholder="Search tags…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <Select className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></Select>
          <Select className="w-auto" value={sort} onChange={(e) => setSort(e.target.value)}><option value="popular">Most used</option><option value="name">A → Z</option><option value="latest">Newest</option></Select>
        </div>
        {sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-soft px-4 py-2.5 text-sm">
            <strong className="mr-2">{sel.size} selected</strong>
            {can("canPublish") && sel.size > 1 && <Button size="sm" variant="outline" onClick={() => { setTarget([...sel][0]); setMerging(true); }}><GitMerge className="size-3.5" /> Merge…</Button>}
            {can("canDelete") && <Button size="sm" variant="danger" onClick={() => setConfirmDel({ ids: [...sel], label: `${sel.size} tags` })}>Delete</Button>}
            <button className="ml-auto text-muted hover:text-fg" onClick={() => setSel(new Set())}>Clear</button>
          </div>
        )}
        {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : !items.length ? <EmptyState title="No tags found" /> : (
            <Table className={cn(q.isFetching && "opacity-60")}>
              <thead><tr>
                <Th className="w-10"><Checkbox label="Select all" checked={items.every((t) => sel.has(t._id))} indeterminate={sel.size > 0} onChange={(v) => setSel(v ? new Set(items.map((t) => t._id)) : new Set())} /></Th>
                <Th>Tag</Th><Th>Slug</Th><Th className="text-right">Used in</Th><Th>Status</Th><Th className="w-32" />
              </tr></thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t._id} className="hover:bg-surface-2/60">
                    <Td><Checkbox label={`Select ${t.name}`} checked={sel.has(t._id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(t._id) : n.delete(t._id); return n; })} /></Td>
                    <Td className="font-medium">#{t.name}</Td>
                    <Td className="text-muted">{t.slug}</Td>
                    <Td className="text-right tabular-nums">{t.usageCount ?? 0}</Td>
                    <Td>{t.status === "inactive" ? <Badge tone="warn">Inactive</Badge> : <Badge tone="brand">Active</Badge>}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {can("canPublish") && <button aria-label="Toggle featured" aria-pressed={t.featured} onClick={() => toggleFeatured.mutate(t)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-surface-2", t.featured ? "text-warn" : "text-muted/50")}><Star className="size-4" /></button>}
                        {can("canPublish") && <button aria-label="Edit" onClick={() => setEditing(t)} className="grid size-8 place-items-center rounded-lg hover:bg-surface-2"><Pencil className="size-4" /></button>}
                        {can("canDelete") && <button aria-label="Delete" onClick={() => setConfirmDel({ ids: [t._id], label: `#${t.name}` })} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger/10"><Trash2 className="size-4" /></button>}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        <div className="border-t border-line p-4"><Pagination pagination={q.data?.pagination} onPage={setPage} /></div>
      </Panel>

      {editing && <TagForm initial={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)} danger loading={del.isPending} title={`Delete ${confirmDel?.label}?`}
        text="Articles keep their text copy of the tag name, but the tag pages disappear." confirmLabel="Delete" onConfirm={() => confirmDel && del.mutate(confirmDel.ids)} />
      <Modal open={merging} onClose={() => setMerging(false)} size="sm" title="Merge tags"
        footer={<><Button variant="ghost" onClick={() => setMerging(false)}>Cancel</Button><Button loading={merge.isPending} onClick={() => merge.mutate()}>Merge</Button></>}>
        <div className="space-y-3 text-sm">
          <p className="text-muted">All articles using the other selected tags will move to the tag you keep. The others are deleted.</p>
          <Field label="Keep this tag"><Select value={target} onChange={(e) => setTarget(e.target.value)}>{selTags.map((t) => <option key={t._id} value={t._id}>#{t.name} ({t.usageCount})</option>)}</Select></Field>
        </div>
      </Modal>
    </>
  );
}

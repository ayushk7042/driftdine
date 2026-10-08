import { useCallback, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Film, Folder, Link2, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";
import { mediaApi } from "@/lib/endpoints";
import { Button, EmptyState, ErrorState, Field, Input, Select, Skeleton, Textarea } from "@/components/ui";
import { ConfirmModal, Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { bytes, cn, errMsg, fmtDate, img } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import { PageHeader } from "../parts";
import { useDebounced } from "../hooks";
import { useSeo } from "@/lib/seo";

function Detail({ item, onClose, onChanged }: { item: MediaItem; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { can } = useAuth();
  const [f, setF] = useState({ name: item.name, folder: item.folder || "uncategorized", alt: item.alt || "", caption: item.caption || "", title: item.title || "", credit: item.credit || "", redirectUrl: item.redirectUrl || "", tags: (item.tags || []).join(", ") });
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const url = item.secureUrl || item.url;

  const save = useMutation({
    mutationFn: () => mediaApi.update(item._id, { ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    onSuccess: () => { toast("Saved"); onChanged(); onClose(); }, onError: (e) => toast(errMsg(e), "error"),
  });
  const replace = useMutation({
    mutationFn: (file: File) => mediaApi.replace(item._id, file),
    onSuccess: () => { toast("File replaced — every article using it updates"); onChanged(); onClose(); }, onError: (e) => toast(errMsg(e), "error"),
  });
  const del = useMutation({
    mutationFn: () => mediaApi.remove(item._id),
    onSuccess: () => { toast("Deleted"); onChanged(); onClose(); }, onError: (e) => toast(errMsg(e), "error"),
  });

  return (
    <Modal open onClose={onClose} size="xl" title={item.name}
      footer={<>
        {can("canDelete") && <Button variant="danger" className="mr-auto" onClick={() => setConfirm(true)}><Trash2 className="size-4" /> Delete</Button>}
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {can("canPublish") && <Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}
      </>}>
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
            {item.resourceType === "video" ? <video src={url} controls className="w-full" /> : <img src={img(url, 900)} alt={item.alt || item.name} className="max-h-[50vh] w-full object-contain" />}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs text-muted">
            <div><dt className="font-semibold text-fg">Type</dt><dd>{item.resourceType} · {item.format}</dd></div>
            <div><dt className="font-semibold text-fg">Size</dt><dd>{bytes(item.bytes)}{item.width ? ` · ${item.width}×${item.height}` : ""}</dd></div>
            <div><dt className="font-semibold text-fg">Uploaded</dt><dd>{fmtDate(item.createdAt)}</dd></div>
            <div className="truncate"><dt className="font-semibold text-fg">Original</dt><dd className="truncate">{item.originalName || "—"}</dd></div>
          </dl>
          <div className="flex gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="text-xs" aria-label="File URL" />
            <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
          </div>
          {can("canPublish") && (
            <>
              <input ref={replaceRef} type="file" hidden accept="image/*,video/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) replace.mutate(file); e.target.value = ""; }} />
              <Button variant="outline" loading={replace.isPending} onClick={() => replaceRef.current?.click()}><RefreshCw className="size-4" /> Replace file (keeps same ID)</Button>
            </>
          )}
        </div>
        <div className="space-y-3">
          <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Folder"><Input value={f.folder} onChange={(e) => setF({ ...f, folder: e.target.value })} /></Field>
          <Field label="Alt text"><Input value={f.alt} onChange={(e) => setF({ ...f, alt: e.target.value })} /></Field>
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Caption"><Textarea rows={2} value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Credit"><Input value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })} /></Field>
            <Field label="Link"><Input value={f.redirectUrl} onChange={(e) => setF({ ...f, redirectUrl: e.target.value })} /></Field>
          </div>
          <Field label="Tags" hint="Comma separated"><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        </div>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} danger loading={del.isPending} title="Delete this file?" text="It is removed from Cloudinary too. Articles still pointing at it will show a broken image." confirmLabel="Delete" onConfirm={() => del.mutate()} />
    </Modal>
  );
}

export default function Media() {
  useSeo({ title: "Media — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("-createdAt");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("uncategorized");
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const term = useDebounced(search);

  const q = useQuery({ queryKey: ["media", "lib", page, term, folder, type, sort], queryFn: () => mediaApi.list({ page, limit: 36, search: term, folder, type, sort }), placeholderData: keepPreviousData });
  const folders = useQuery({ queryKey: ["media", "folders"], queryFn: mediaApi.folders });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["media"] }); setSel(new Set()); };

  const upload = useMutation({
    mutationFn: (files: File[]) => (files.length === 1 ? mediaApi.upload(files[0], { folder: uploadFolder }).then((m) => [m]) : mediaApi.uploadMany(files, { folder: uploadFolder }).then((r) => r.data)),
    onSuccess: (r) => { toast(`Uploaded ${r.length} file${r.length > 1 ? "s" : ""}`); refresh(); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const register = useMutation({ mutationFn: () => mediaApi.register({ url: url.trim(), folder: uploadFolder === "uncategorized" ? "external" : uploadFolder }), onSuccess: () => { toast("URL added to library"); setUrl(""); setUrlOpen(false); refresh(); }, onError: (e) => toast(errMsg(e), "error") });
  const bulkDel = useMutation({ mutationFn: () => mediaApi.bulkDelete([...sel]), onSuccess: (r: { deleted?: number }) => { toast(`Deleted ${r.deleted ?? sel.size} file(s)`); setBulkConfirm(false); refresh(); }, onError: (e) => toast(errMsg(e), "error") });

  const onFiles = useCallback((list: FileList | null) => { const files = Array.from(list || []); if (files.length) upload.mutate(files); }, [upload]);
  const items = q.data?.data || [];

  return (
    <>
      <PageHeader title="Media library" description="Every image and video, in one place — reusable across articles, ads and the homepage."
        actions={can("canPublish") && <>
          <Button variant="outline" onClick={() => setUrlOpen(true)}><Link2 className="size-4" /> Add by URL</Button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          <Button loading={upload.isPending} onClick={() => fileRef.current?.click()}><UploadCloud className="size-4" /> Upload</Button>
        </>} />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="card h-fit p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">Folders</p>
          {[{ name: "all", count: undefined as number | undefined }, ...(folders.data || [])].map((f) => (
            <button key={f.name} onClick={() => { setFolder(f.name); setPage(1); if (f.name !== "all") setUploadFolder(f.name); }}
              className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition", folder === f.name ? "bg-brand-soft font-medium text-brand" : "hover:bg-surface-2")}>
              <Folder className="size-4" /><span className="flex-1 truncate capitalize">{f.name === "all" ? "All files" : f.name}</span>
              {f.count !== undefined && <span className="text-xs text-muted">{f.count}</span>}
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-4"
          onDragOver={(e) => { if (can("canPublish")) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (can("canPublish")) onFiles(e.dataTransfer.files); }}>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input className="pl-9" placeholder="Search name, alt, caption…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
            <Select className="w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="all">All types</option><option value="image">Images</option><option value="video">Videos</option></Select>
            <Select className="w-auto" value={sort} onChange={(e) => setSort(e.target.value)}><option value="-createdAt">Newest</option><option value="createdAt">Oldest</option><option value="name">Name</option><option value="-bytes">Largest</option></Select>
          </div>

          {sel.size > 0 && can("canDelete") && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-2.5 text-sm"><strong>{sel.size} selected</strong>
              <Button size="sm" variant="danger" onClick={() => setBulkConfirm(true)}><Trash2 className="size-3.5" /> Delete</Button>
              <button className="ml-auto text-muted hover:text-fg" onClick={() => setSel(new Set())}>Clear</button></div>
          )}

          <div className={cn("relative rounded-3xl transition", drag && "ring-2 ring-brand ring-offset-4 ring-offset-bg")}>
            {drag && <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-brand-soft/90 font-semibold text-brand">Drop to upload to “{uploadFolder}”</div>}
            {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}</div>
            ) : !items.length ? <EmptyState title="No media here" text="Drag files onto this area, or use Upload." /> : (
              <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6", q.isFetching && "opacity-60")}>
                {items.map((m) => {
                  const on = sel.has(m._id);
                  return (
                    <li key={m._id} className="group relative">
                      <button onClick={() => setOpen(m)} className="block aspect-square w-full overflow-hidden rounded-2xl border border-line bg-surface-2 transition group-hover:border-brand">
                        {m.resourceType === "video" ? <span className="grid size-full place-items-center text-muted"><Film className="size-8" /></span>
                          : <img src={img(m.thumbnailUrl || m.url, 300)} alt={m.alt || m.name} loading="lazy" decoding="async" className="size-full object-cover" />}
                      </button>
                      {can("canDelete") && (
                        <button onClick={() => setSel((s) => { const n = new Set(s); on ? n.delete(m._id) : n.add(m._id); return n; })} aria-label={`Select ${m.name}`} aria-pressed={on}
                          className={cn("absolute left-2 top-2 grid size-6 place-items-center rounded-full border-2 transition", on ? "border-brand bg-brand text-brand-fg" : "border-white/80 bg-forest-950/40 text-transparent opacity-0 group-hover:opacity-100")}><Check className="size-3.5" /></button>
                      )}
                      <p className="mt-1.5 truncate text-xs font-medium">{m.name}</p>
                      <p className="text-[11px] text-muted">{bytes(m.bytes)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Pagination pagination={q.data?.pagination} onPage={setPage} />
        </div>
      </div>

      {open && <Detail item={open} onClose={() => setOpen(null)} onChanged={refresh} />}
      <Modal open={urlOpen} onClose={() => setUrlOpen(false)} size="sm" title="Add image by URL"
        footer={<><Button variant="ghost" onClick={() => setUrlOpen(false)}>Cancel</Button><Button loading={register.isPending} disabled={!url.trim()} onClick={() => register.mutate()}>Add</Button></>}>
        <Field label="Image URL" hint="The file stays where it is — only a library entry is created."><Input type="url" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
      </Modal>
      <ConfirmModal open={bulkConfirm} onClose={() => setBulkConfirm(false)} danger loading={bulkDel.isPending} title={`Delete ${sel.size} files?`} text="They are removed from the library and Cloudinary." confirmLabel="Delete" onConfirm={() => bulkDel.mutate()} />
    </>
  );
}

import { useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Link2, Search, UploadCloud, X } from "lucide-react";
import { mediaApi } from "@/lib/endpoints";
import { Modal } from "@/components/Modal";
import { Button, EmptyState, Input, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";
import { cn, errMsg, img } from "@/lib/utils";
import type { ImageRef, MediaItem } from "@/lib/types";
import { useDebounced } from "./hooks";

export const mediaToImage = (m: MediaItem): ImageRef => ({
  public_id: m.public_id, url: m.secureUrl || m.url, thumbnailUrl: m.thumbnailUrl,
  width: m.width, height: m.height, format: m.format, bytes: m.bytes,
  alt: m.alt, caption: m.caption, title: m.title, credit: m.credit, redirectUrl: m.redirectUrl,
});

/** Library browser + uploader + paste-a-URL, used wherever an image is needed. */
export function MediaPicker({
  open, onClose, onPick, multiple = false,
}: { open: boolean; onClose: () => void; onPick: (items: MediaItem[]) => void; multiple?: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const term = useDebounced(search);

  const q = useQuery({
    queryKey: ["media", "picker", page, term],
    queryFn: () => mediaApi.list({ page, limit: 24, search: term, type: "image" }),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const upload = useMutation({
    mutationFn: (files: File[]) => (files.length === 1 ? mediaApi.upload(files[0], { folder: "articles" }).then((m) => [m]) : mediaApi.uploadMany(files, { folder: "articles" }).then((r) => r.data)),
    onSuccess: (items) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      toast(`Uploaded ${items.length} file${items.length > 1 ? "s" : ""}`);
      setSelected((s) => (multiple ? [...s, ...items] : items.slice(0, 1)));
    },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const register = useMutation({
    mutationFn: () => mediaApi.register({ url: url.trim(), folder: "external" }),
    onSuccess: (m) => { setUrl(""); qc.invalidateQueries({ queryKey: ["media"] }); setSelected((s) => (multiple ? [...s, m] : [m])); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const toggle = (m: MediaItem) =>
    setSelected((s) => (s.some((x) => x._id === m._id) ? s.filter((x) => x._id !== m._id) : multiple ? [...s, m] : [m]));

  const confirm = () => { onPick(selected); setSelected([]); onClose(); };

  return (
    <Modal open={open} onClose={onClose} title="Choose an image" size="xl"
      footer={<>
        <span className="mr-auto self-center text-sm text-muted">{selected.length} selected</span>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!selected.length} onClick={confirm}>Use {multiple && selected.length > 1 ? `${selected.length} images` : "image"}</Button>
      </>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search library…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) upload.mutate(f); e.target.value = ""; }} />
          <Button variant="outline" loading={upload.isPending} onClick={() => fileRef.current?.click()}><UploadCloud className="size-4" /> Upload</Button>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) register.mutate(); }}>
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="…or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" loading={register.isPending} disabled={!url.trim()}>Add URL</Button>
        </form>

        {q.isLoading ? <div className="grid place-items-center py-16"><Spinner className="size-6" /></div> : !q.data?.data.length ? (
          <EmptyState title="No images yet" text="Upload a file or paste a URL above." />
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {q.data.data.map((m) => {
                const on = selected.some((x) => x._id === m._id);
                return (
                  <li key={m._id}>
                    <button type="button" onClick={() => toggle(m)} onDoubleClick={() => { onPick([m]); onClose(); }}
                      className={cn("group relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-surface-2 transition", on ? "border-brand" : "border-transparent hover:border-line")}>
                      <img src={img(m.thumbnailUrl || m.url, 240)} alt={m.alt || m.name} loading="lazy" className="size-full object-cover" />
                      {on && <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-brand text-brand-fg"><Check className="size-4" /></span>}
                    </button>
                    <p className="mt-1 truncate text-[11px] text-muted">{m.name}</p>
                  </li>
                );
              })}
            </ul>
            <Pagination pagination={q.data.pagination} onPage={setPage} />
          </>
        )}
      </div>
    </Modal>
  );
}

/** Single image field: preview, pick, clear, alt text. */
export function ImageField({
  value, onChange, label, hint, withAlt = true, aspect = "aspect-[16/9]",
}: { value?: ImageRef | null; onChange: (v: ImageRef | null) => void; label?: string; hint?: string; withAlt?: boolean; aspect?: string }) {
  const [open, setOpen] = useState(false);
  const url = value?.url;
  return (
    <div className="space-y-2">
      {label && <p className="text-[13px] font-medium">{label}</p>}
      {url ? (
        <div className={cn("group relative overflow-hidden rounded-xl border border-line bg-surface-2", aspect)}>
          <img src={img(url, 700)} alt={value?.alt || ""} className="size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-forest-950/60 opacity-0 transition group-hover:opacity-100">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Replace</Button>
            <Button size="sm" variant="danger" onClick={() => onChange(null)}><X className="size-3.5" /> Remove</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={cn("flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-sm text-muted transition hover:border-brand hover:text-brand", aspect)}>
          <UploadCloud className="size-6" /> Choose image
        </button>
      )}
      {url && withAlt && (
        <Input placeholder="Alt text (accessibility + SEO)" value={value?.alt || ""} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
      )}
      {url && withAlt && (
        <div className="space-y-1.5">
          <Input type="url" placeholder="Redirect link (opens when readers click the image)" value={value?.redirectUrl || ""} onChange={(e) => onChange({ ...value, redirectUrl: e.target.value })} />
          {!!value?.redirectUrl && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
              <input type="checkbox" checked={value.openInNewTab !== false} onChange={(e) => onChange({ ...value, openInNewTab: e.target.checked })} className="size-4 accent-[var(--brand)]" /> Open in a new tab
            </label>
          )}
        </div>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={([m]) => m && onChange({ ...mediaToImage(m), alt: value?.alt || m.alt })} />
    </div>
  );
}

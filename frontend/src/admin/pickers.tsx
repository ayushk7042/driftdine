import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { categoryApi, newsApi, tagApi } from "@/lib/endpoints";
import { Modal } from "@/components/Modal";
import { Button, EmptyState, Input, Select, Spinner } from "@/components/ui";
import { cn, catOf, img } from "@/lib/utils";
import type { Article } from "@/lib/types";
import { useDebounced } from "./hooks";

/** Flat, indented category list for <select>. Sub-categories sit under their parent. */
export function useCategoryOptions(includeInactive = true) {
  const q = useQuery({ queryKey: ["categories", "tree", "all"], queryFn: () => categoryApi.tree(includeInactive ? "all" : undefined), staleTime: 60_000 });
  const flat = useMemo(() => (q.data || []).flatMap((p) => [{ ...p, depth: 0 }, ...(p.children || []).map((c) => ({ ...c, depth: 1 }))]), [q.data]);
  return { ...q, flat };
}

export function CategorySelect({ value, onChange, placeholder = "Select category", onlyRoot = false, className, exclude }: {
  value: string; onChange: (id: string) => void; placeholder?: string; onlyRoot?: boolean; className?: string; exclude?: string;
}) {
  const { flat } = useCategoryOptions();
  const opts = flat.filter((c) => (!onlyRoot || c.depth === 0) && c._id !== exclude);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{placeholder}</option>
      {opts.map((c) => <option key={c._id} value={c._id}>{c.depth ? "— " : ""}{c.name}{c.status === "inactive" ? " (inactive)" : ""}</option>)}
    </Select>
  );
}

/** Free-text tags with autocomplete against existing ones; unknown names are created by the API. */
export function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const term = useDebounced(text, 200);
  const q = useQuery({ queryKey: ["tags", "suggest", term], queryFn: () => tagApi.list({ search: term, limit: 8 }), enabled: term.length > 0 });
  const add = (t: string) => {
    const name = t.trim().replace(/^#/, "");
    if (name && !value.some((v) => v.toLowerCase() === name.toLowerCase())) onChange([...value, name]);
    setText("");
  };
  const suggestions = (q.data?.data || []).filter((t) => !value.some((v) => v.toLowerCase() === t.name.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-xs font-medium text-brand">
            #{t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`} className="grid size-4 place-items-center rounded-full hover:bg-brand/20"><X className="size-3" /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Input value={text} placeholder="Add tag, press Enter" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1)); }} />
        {text && suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop">
            {suggestions.map((t) => (
              <li key={t._id}><button type="button" onClick={() => add(t.name)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2">#{t.name}<span className="text-xs text-muted">{t.usageCount}</span></button></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Modal search over published articles; returns the chosen article objects. */
export function ArticlePickerModal({ open, onClose, onPick, multiple = false, exclude = [], title = "Choose articles", limit }: {
  open: boolean; onClose: () => void; onPick: (items: Article[]) => void; multiple?: boolean; exclude?: string[]; title?: string; limit?: number;
}) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Article[]>([]);
  const term = useDebounced(search);
  const q = useQuery({ queryKey: ["news", "picker", term], queryFn: () => newsApi.list({ limit: 20, search: term, status: "published" }), enabled: open });
  const items = (q.data?.data || []).filter((a) => !exclude.includes(a._id));
  const toggle = (a: Article) => setSel((s) => (s.some((x) => x._id === a._id) ? s.filter((x) => x._id !== a._id) : multiple ? (limit && s.length >= limit ? s : [...s, a]) : [a]));

  return (
    <Modal open={open} onClose={() => { setSel([]); onClose(); }} title={title} size="lg"
      footer={<>
        <span className="mr-auto self-center text-sm text-muted">{sel.length}{limit ? ` / ${limit}` : ""} selected</span>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!sel.length} onClick={() => { onPick(sel); setSel([]); onClose(); }}>Add</Button>
      </>}>
      <div className="space-y-3">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input className="pl-9" autoFocus placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {q.isLoading ? <div className="grid place-items-center py-10"><Spinner /></div> : !items.length ? <EmptyState title="No matching articles" /> : (
          <ul className="divide-y divide-line">
            {items.map((a) => {
              const on = sel.some((x) => x._id === a._id);
              return (
                <li key={a._id}>
                  <button type="button" onClick={() => toggle(a)} className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-surface-2", on && "bg-brand-soft")}>
                    {a.featuredImage?.url ? <img src={img(a.featuredImage.url, 120)} alt="" className="size-12 rounded-lg object-cover" loading="lazy" /> : <span className="size-12 rounded-lg bg-surface-2" />}
                    <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-medium">{a.title}</span><span className="text-xs text-muted">{catOf(a)?.name}</span></span>
                    <span className={cn("grid size-5 place-items-center rounded-full border text-[10px]", on ? "border-brand bg-brand text-brand-fg" : "border-line")}>{on ? "✓" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Ordered list of articles with add / reorder / remove — used for curated rails. */
export function ArticleListEditor({ items, onChange, limit, title }: { items: Article[]; onChange: (v: Article[]) => void; limit?: number; title?: string }) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: number) => {
    const next = [...items];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const full = !!limit && items.length >= limit;
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((a, i) => (
          <li key={a._id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">{i + 1}</span>
            {a.featuredImage?.url ? <img src={img(a.featuredImage.url, 100)} alt="" className="size-10 rounded-lg object-cover" loading="lazy" /> : <span className="size-10 rounded-lg bg-surface-2" />}
            <span className="line-clamp-1 min-w-0 flex-1 text-sm font-medium">{a.title}</span>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((x) => x._id !== a._id))} className="grid size-7 place-items-center rounded-lg text-danger hover:bg-danger/10"><X className="size-4" /></button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="outline" disabled={full} onClick={() => setOpen(true)}><Plus className="size-4" /> {full ? `Limit reached (${limit})` : "Add article"}</Button>
      <ArticlePickerModal open={open} onClose={() => setOpen(false)} multiple title={title} limit={limit ? limit - items.length : undefined}
        exclude={items.map((a) => a._id)} onPick={(picked) => onChange([...items, ...picked].slice(0, limit))} />
    </div>
  );
}


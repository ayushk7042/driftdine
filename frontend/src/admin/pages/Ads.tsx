import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Image as ImageIcon, MousePointerClick, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { adsApi } from "@/lib/endpoints";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Select, Skeleton, Textarea, Toggle } from "@/components/ui";
import { ConfirmModal, Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, compact, errMsg, fmtDate, img } from "@/lib/utils";
import type { Ad } from "@/lib/types";
import { PageHeader, Panel, Tabs } from "../parts";
import { ImageField } from "../MediaPicker";
import { useCategoryOptions } from "../pickers";
import { fromLocalInput, toLocalInput } from "../hooks";
import { useSeo } from "@/lib/seo";

const DEVICES = ["desktop", "tablet", "mobile"] as const;

interface AdForm {
  name: string; position: string; type: "image" | "script"; display: "banner" | "frame"; maxHeight: string;
  image: Ad["image"] | null; scriptCode: string; targetUrl: string; openInNewTab: boolean;
  categories: string[]; devices: string[]; priority: number; startsAt: string; endsAt: string; status: "active" | "paused";
}

const toForm = (a?: Ad, position = ""): AdForm => ({
  name: a?.name || "", position: a?.position || position, type: a?.type || "image", display: a?.display || "banner",
  maxHeight: a?.maxHeight ? String(a.maxHeight) : "", image: a?.image?.url ? a.image : null, scriptCode: a?.scriptCode || "",
  targetUrl: a?.targetUrl || "", openInNewTab: a?.openInNewTab ?? true,
  categories: (a?.categories || []).map((c) => (typeof c === "string" ? c : c._id)),
  devices: a?.devices?.length ? a.devices : [...DEVICES], priority: a?.priority || 0,
  startsAt: toLocalInput(a?.startsAt), endsAt: toLocalInput(a?.endsAt), status: a?.status || "active",
});

function AdModal({ ad, positions, onClose, onSaved }: { ad: Ad | null; positions: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { flat } = useCategoryOptions();
  const [f, setF] = useState<AdForm>(() => toForm(ad || undefined, positions[0]));
  const [tab, setTab] = useState<"creative" | "targeting" | "schedule">("creative");
  const set = <K extends keyof AdForm>(k: K, v: AdForm[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, maxHeight: f.maxHeight ? Number(f.maxHeight) : null, image: f.image, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt) };
      return ad ? adsApi.update(ad._id, body) : adsApi.create(body);
    },
    onSuccess: () => { toast(ad ? "Ad updated" : "Ad created"); onSaved(); onClose(); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Modal open onClose={onClose} size="lg" title={ad ? `Edit ${ad.name}` : "New advertisement"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!f.name.trim() || !f.position} onClick={() => save.mutate()}>{ad ? "Save changes" : "Create ad"}</Button></>}>
      <div className="space-y-5">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "creative", label: "Creative" }, { id: "targeting", label: "Targeting" }, { id: "schedule", label: "Schedule" }]} />
        {tab === "creative" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *"><Input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
              <Field label="Position *"><Select value={f.position} onChange={(e) => set("position", e.target.value)}>{positions.map((p) => <option key={p}>{p}</option>)}</Select></Field>
              <Field label="Type"><Select value={f.type} onChange={(e) => set("type", e.target.value as AdForm["type"])}><option value="image">Image banner</option><option value="script">Script / HTML (AdSense, GAM…)</option></Select></Field>
              <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value as AdForm["status"])}><option value="active">Active</option><option value="paused">Paused</option></Select></Field>
            </div>
            {f.type === "image" ? (
              <>
                <ImageField label="Banner image" value={f.image} onChange={(v) => set("image", v)} aspect="aspect-[16/5]" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Destination URL"><Input type="url" value={f.targetUrl} onChange={(e) => set("targetUrl", e.target.value)} placeholder="https://" /></Field>
                  <Field label="Display" hint="Banner keeps proportions; Frame holds the slot size."><Select value={f.display} onChange={(e) => set("display", e.target.value as AdForm["display"])}><option value="banner">Banner (natural size)</option><option value="frame">Frame (fixed slot)</option></Select></Field>
                  <Field label="Max height (px)" hint="Optional cap, up to 1200."><Input type="number" min={0} max={1200} value={f.maxHeight} onChange={(e) => set("maxHeight", e.target.value)} /></Field>
                  <div className="self-end"><Toggle label="Open in new tab" checked={f.openInNewTab} onChange={(v) => set("openInNewTab", v)} /></div>
                </div>
              </>
            ) : (
              <Field label="Script / HTML" hint="Script tags are executed on the public site."><Textarea rows={8} className="font-mono text-xs" spellCheck={false} value={f.scriptCode} onChange={(e) => set("scriptCode", e.target.value)} /></Field>
            )}
          </div>
        )}
        {tab === "targeting" && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-medium">Devices</p>
              <div className="flex gap-2">{DEVICES.map((d) => (
                <button key={d} type="button" onClick={() => set("devices", toggle(f.devices, d))} aria-pressed={f.devices.includes(d)}
                  className={cn("rounded-full border px-4 py-2 text-sm font-medium capitalize", f.devices.includes(d) ? "border-transparent bg-brand text-brand-fg" : "border-line")}>{d}</button>))}</div>
            </div>
            <div>
              <p className="mb-1 text-[13px] font-medium">Categories</p>
              <p className="mb-2 text-xs text-muted">Leave empty to show everywhere.</p>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {flat.map((c) => (
                  <button key={c._id} type="button" onClick={() => set("categories", toggle(f.categories, c._id))} aria-pressed={f.categories.includes(c._id)}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", f.categories.includes(c._id) ? "border-transparent bg-brand text-brand-fg" : "border-line hover:border-brand")}>{c.depth ? "↳ " : ""}{c.name}</button>))}
              </div>
            </div>
            <Field label="Priority" hint="Higher wins when several ads share a slot."><Input type="number" value={f.priority} onChange={(e) => set("priority", Number(e.target.value))} /></Field>
          </div>
        )}
        {tab === "schedule" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" hint="Blank = immediately"><Input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
            <Field label="Ends" hint="Blank = no end"><Input type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Ads() {
  useSeo({ title: "Advertising — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [position, setPosition] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Ad | "new" | null>(null);
  const [deleting, setDeleting] = useState<Ad | null>(null);

  const q = useQuery({ queryKey: ["ads", "admin", position, status], queryFn: () => adsApi.list({ position, status }) });
  const all = useQuery({ queryKey: ["ads", "positions"], queryFn: () => adsApi.list({}), staleTime: 5 * 60_000 });
  const positions = all.data?.positions || q.data?.positions || [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["ads"] }); qc.invalidateQueries({ queryKey: ["ad"] }); };

  const toggle = useMutation({ mutationFn: (a: Ad) => adsApi.update(a._id, { status: a.status === "active" ? "paused" : "active" }), onSuccess: refresh, onError: (e) => toast(errMsg(e), "error") });
  const del = useMutation({ mutationFn: (a: Ad) => adsApi.remove(a._id), onSuccess: () => { toast("Ad deleted"); setDeleting(null); refresh(); }, onError: (e) => toast(errMsg(e), "error") });

  const grouped = useMemo(() => {
    const m = new Map<string, Ad[]>();
    (q.data?.data || []).forEach((a) => m.set(a.position, [...(m.get(a.position) || []), a]));
    return [...m.entries()];
  }, [q.data]);

  const totals = useMemo(() => {
    const d = q.data?.data || [];
    const imp = d.reduce((s, a) => s + (a.impressions || 0), 0);
    const clk = d.reduce((s, a) => s + (a.clicks || 0), 0);
    return { imp, clk, ctr: imp ? ((clk / imp) * 100).toFixed(2) : "0.00", active: d.filter((a) => a.status === "active").length };
  }, [q.data]);

  return (
    <>
      <PageHeader title="Advertising" description="Book banners and scripts into any placement on the site."
        actions={can("canPublish") && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New ad</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[["Active ads", totals.active], ["Impressions", compact(totals.imp)], ["Clicks", compact(totals.clk)], ["CTR", `${totals.ctr}%`]].map(([l, v]) => (
          <div key={l} className="card p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted">{l}</p><p className="font-display text-3xl font-semibold">{v}</p></div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="w-auto" value={position} onChange={(e) => setPosition(e.target.value)}><option value="all">All positions</option>{positions.map((p) => <option key={p}>{p}</option>)}</Select>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Any status</option><option value="active">Active</option><option value="paused">Paused</option></Select>
      </div>

      {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <Skeleton className="h-64" /> : !grouped.length ? (
        <Panel><EmptyState title="No ads booked" text="Create an ad and pick where it should appear." action={can("canPublish") ? <Button onClick={() => setEditing("new")}>New ad</Button> : undefined} /></Panel>
      ) : (
        <div className="space-y-6">
          {grouped.map(([pos, ads]) => (
            <Panel key={pos} title={<span className="font-mono text-sm">{pos}</span>} description={`${ads.length} creative${ads.length > 1 ? "s" : ""}`}>
              <ul className="divide-y divide-line">
                {ads.map((a) => {
                  const ctr = a.impressions ? (((a.clicks || 0) / a.impressions) * 100).toFixed(2) : "0.00";
                  return (
                    <li key={a._id} className="flex flex-wrap items-center gap-4 py-3.5">
                      <div className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2">
                        {a.type === "image" && a.image?.url ? <img src={img(a.image.url, 200)} alt="" className="size-full object-cover" loading="lazy" /> : a.type === "script" ? <Code2 className="size-6 text-muted" /> : <ImageIcon className="size-6 text-muted" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-medium">{a.name}{a.status === "paused" ? <Badge tone="warn">Paused</Badge> : <Badge tone="brand">Active</Badge>}<Badge>{a.type}</Badge></p>
                        <p className="text-xs text-muted">Priority {a.priority || 0} · {(a.devices || []).join(", ")}{a.startsAt || a.endsAt ? ` · ${fmtDate(a.startsAt) || "now"} → ${fmtDate(a.endsAt) || "open"}` : ""}</p>
                      </div>
                      <div className="flex gap-6 text-center text-xs text-muted">
                        <div><p className="font-display text-lg font-semibold text-fg">{compact(a.impressions || 0)}</p>views</div>
                        <div><p className="flex items-center justify-center gap-1 font-display text-lg font-semibold text-fg"><MousePointerClick className="size-3.5" />{compact(a.clicks || 0)}</p>clicks</div>
                        <div><p className="font-display text-lg font-semibold text-fg">{ctr}%</p>CTR</div>
                      </div>
                      {can("canPublish") && (
                        <div className="flex gap-1">
                          <button title={a.status === "active" ? "Pause" : "Resume"} onClick={() => toggle.mutate(a)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2">{a.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
                          <button title="Edit" onClick={() => setEditing(a)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2"><Pencil className="size-4" /></button>
                          {can("canDelete") && <button title="Delete" onClick={() => setDeleting(a)} className="grid size-9 place-items-center rounded-lg text-danger hover:bg-danger/10"><Trash2 className="size-4" /></button>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {editing && <AdModal ad={editing === "new" ? null : editing} positions={positions} onClose={() => setEditing(null)} onSaved={refresh} />}
      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} danger loading={del.isPending} title={`Delete “${deleting?.name}”?`} text="Its stats are lost with it. Pause it instead if you may want it back." confirmLabel="Delete" onConfirm={() => deleting && del.mutate(deleting)} />
    </>
  );
}


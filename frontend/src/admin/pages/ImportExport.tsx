import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, History, Undo2, UploadCloud, XCircle } from "lucide-react";
import { importApi } from "@/lib/endpoints";
import { Badge, Button, EmptyState, Select, Skeleton, Toggle } from "@/components/ui";
import { ConfirmModal, Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, errMsg, fmtDate } from "@/lib/utils";
import type { ImportJob } from "@/lib/types";
import { CategorySelect } from "../pickers";
import { PageHeader, Panel, Table, Td, Th } from "../parts";
import { useSeo } from "@/lib/seo";

const tone = (s: ImportJob["status"]) => (s === "completed" ? "brand" : s === "failed" ? "danger" : s === "rolled_back" ? "warn" : "info") as "brand" | "danger" | "warn" | "info";

function Stat({ label, value, tone: t = "neutral" }: { label: string; value: number | undefined; tone?: "neutral" | "brand" | "danger" | "warn" }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("font-display text-3xl font-semibold", t === "brand" && "text-brand", t === "danger" && "text-danger", t === "warn" && "text-warn")}>{value ?? 0}</p>
    </div>
  );
}

function Issues({ job }: { job: ImportJob }) {
  const issues = job.issues || [];
  if (!issues.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-danger"><AlertTriangle className="size-4" /> {job.errorCount || issues.length} issue{issues.length > 1 ? "s" : ""}{issues.length < (job.errorCount || 0) ? ` (showing ${issues.length})` : ""}</h3>
      <div className="max-h-72 overflow-auto rounded-2xl border border-line">
        <Table><thead><tr><Th>Row</Th><Th>Field</Th><Th>Problem</Th><Th>Value</Th></tr></thead>
          <tbody>{issues.map((i, n) => <tr key={n}><Td className="tabular-nums">{i.row}</Td><Td className="font-mono text-xs">{i.field}</Td><Td>{i.message}</Td><Td className="max-w-48 truncate text-muted">{i.value}</Td></tr>)}</tbody></Table>
      </div>
    </div>
  );
}

function Report({ job }: { job: ImportJob }) {
  const validated = job.status === "validated";
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total rows" value={job.totalRows} />
        {validated ? <>
          <Stat label="Will create" value={job.willCreate} tone="brand" />
          <Stat label="Will update" value={job.willUpdate} tone="warn" />
          <Stat label="Rows with errors" value={job.errorRows} tone={job.errorRows ? "danger" : "neutral"} />
        </> : <>
          <Stat label="Created" value={job.createdCount} tone="brand" />
          <Stat label="Updated" value={job.updatedCount} tone="warn" />
          <Stat label="Skipped / errors" value={(job.skippedCount || 0) + (job.errorCount || 0)} tone={job.errorCount ? "danger" : "neutral"} />
        </>}
      </div>
      {!!job.unknownHeaders?.length && <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">Unrecognised columns ignored: {job.unknownHeaders.join(", ")}</p>}
      {!!job.pendingSubCategories?.length && <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-sm text-sky-600 dark:text-sky-300">Sub-categories to be created on import: {job.pendingSubCategories.join(", ")}</p>}
      {!!job.preview?.length && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Preview (first {job.preview.length} rows)</h3>
          <div className="max-h-80 overflow-auto rounded-2xl border border-line">
            <Table><thead><tr><Th>Row</Th><Th>Title</Th><Th>Category</Th><Th>Status</Th><Th>Action</Th><Th>Valid</Th></tr></thead>
              <tbody>{job.preview.map((r) => (
                <tr key={r.row}><Td className="tabular-nums">{r.row}</Td><Td className="max-w-xs truncate font-medium">{r.title}</Td><Td>{r.category}</Td><Td className="capitalize">{r.status}</Td>
                  <Td><Badge tone={r.action === "create" ? "brand" : "warn"} className="capitalize">{r.action}</Badge></Td>
                  <Td>{r.valid ? <CheckCircle2 className="size-4 text-brand" /> : <XCircle className="size-4 text-danger" />}</Td></tr>))}</tbody></Table>
          </div>
        </div>
      )}
      <Issues job={job} />
    </div>
  );
}

export default function ImportExport() {
  useSeo({ title: "Import / Export — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportJob | null>(null);
  const [mode, setMode] = useState<"upsert" | "create">("upsert");
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [rollback, setRollback] = useState<ImportJob | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState("all");
  const [exportCat, setExportCat] = useState("");
  const [drag, setDrag] = useState(false);

  const fail = (e: unknown) => toast(errMsg(e), "error");
  const history = useQuery({ queryKey: ["import", "history"], queryFn: () => importApi.history(25) });

  // Big sheets import in the background; poll until the job settles.
  const poll = useQuery({
    queryKey: ["import", "status", batchId],
    queryFn: () => importApi.status(batchId!),
    enabled: !!batchId,
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "importing" ? false : 2000),
  });
  useEffect(() => {
    const j = poll.data;
    if (j && j.status !== "importing") {
      setReport(j); setBatchId(null);
      qc.invalidateQueries({ queryKey: ["import", "history"] }); qc.invalidateQueries({ queryKey: ["news"] });
      toast(j.status === "completed" ? "Import finished" : `Import ${j.status}`, j.status === "completed" ? "success" : "error");
    }
  }, [poll.data, qc, toast]);

  const pick = (f: File | null) => { if (!f) return; if (!/\.(xlsx|xlsm|csv)$/i.test(f.name)) { toast("Upload an .xlsx or .csv file", "error"); return; } setFile(f); setReport(null); };

  const validate = useMutation({ mutationFn: () => importApi.validate(file!), onSuccess: setReport, onError: fail });
  const run = useMutation({
    mutationFn: () => importApi.run(file!, { mode, skipInvalid }),
    onSuccess: (r) => {
      if (r.async) { setBatchId(r.batchId); setReport(null); toast(r.message || "Import started in the background", "info"); }
      else if (r.data) { setReport(r.data); toast("Import complete"); qc.invalidateQueries({ queryKey: ["news"] }); }
      qc.invalidateQueries({ queryKey: ["import", "history"] });
    },
    onError: fail,
  });
  const undo = useMutation({
    mutationFn: (id: string) => importApi.rollback(id),
    onSuccess: (r) => { toast(r.message); if (r.warning) toast(r.warning, "info"); setRollback(null); qc.invalidateQueries({ queryKey: ["import"] }); qc.invalidateQueries({ queryKey: ["news"] }); },
    onError: fail,
  });
  const sample = useMutation({ mutationFn: importApi.sample, onError: fail });
  const exp = useMutation({ mutationFn: () => importApi.export({ status: exportStatus === "all" ? undefined : exportStatus, category: exportCat || undefined }), onSuccess: () => toast("Export downloading"), onError: fail });
  const detail = useQuery({ queryKey: ["import", "detail", viewing], queryFn: () => importApi.status(viewing!), enabled: !!viewing });

  const importing = !!batchId;
  const blocked = !can("canPublish");

  return (
    <>
      <PageHeader title="Import / Export" description="Bulk-create or update articles from a spreadsheet, or take your content out as one." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="1 · Upload a sheet" actions={<Button size="sm" variant="outline" loading={sample.isPending} onClick={() => sample.mutate()}><Download className="size-4" /> Download template</Button>}>
            <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.csv" hidden onChange={(e) => { pick(e.target.files?.[0] || null); e.target.value = ""; }} />
            <button type="button" disabled={blocked}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0] || null); }}
              className={cn("flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition", drag ? "border-brand bg-brand-soft" : "border-line hover:border-brand")}>
              {file ? <FileSpreadsheet className="size-9 text-brand" /> : <UploadCloud className="size-9 text-muted" />}
              <span className="font-medium">{file ? file.name : "Drop an .xlsx or .csv here, or click to browse"}</span>
              <span className="text-xs text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB · click to choose another` : "Up to 50 MB · row 1 must hold column headers"}</span>
            </button>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block space-y-1.5"><span className="text-[13px] font-medium">Mode</span>
                <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="upsert">Upsert — update existing slugs, create new</option><option value="create">Create only — skip existing slugs</option></Select></label>
              <div className="self-end"><Toggle label="Skip invalid rows" hint="Off = abort when any row has errors." checked={skipInvalid} onChange={setSkipInvalid} /></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" disabled={!file || blocked || importing} loading={validate.isPending} onClick={() => validate.mutate()}>Validate (dry run)</Button>
              <Button disabled={!file || blocked || importing} loading={run.isPending} onClick={() => run.mutate()}>Run import</Button>
            </div>
          </Panel>

          {importing && (
            <Panel title="Importing in the background…">
              <div className="space-y-3">
                <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full gradient-brand transition-all" style={{ width: `${poll.data?.totalRows ? Math.min(100, ((poll.data.processed || 0) / poll.data.totalRows) * 100) : 5}%` }} /></div>
                <p className="text-sm text-muted">{poll.data?.processed ?? 0} of {poll.data?.totalRows ?? "…"} rows processed. You can leave this page — the job keeps running.</p>
              </div>
            </Panel>
          )}

          {report && <Panel title={report.status === "validated" ? "2 · Validation report" : `Result · ${report.status.replace("_", " ")}`}><Report job={report} /></Panel>}
        </div>

        <div className="space-y-6">
          <Panel title="Export articles">
            <div className="space-y-3">
              <Select value={exportStatus} onChange={(e) => setExportStatus(e.target.value)}><option value="all">All statuses</option>{["published", "draft", "scheduled", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
              <CategorySelect value={exportCat} onChange={setExportCat} placeholder="All categories" />
              <Button className="w-full" loading={exp.isPending} onClick={() => exp.mutate()}><Download className="size-4" /> Download .xlsx</Button>
              <p className="text-xs text-muted">Up to 5,000 articles. The file re-imports cleanly with the same template.</p>
            </div>
          </Panel>
          <Panel title="Tips">
            <ul className="list-disc space-y-2 pl-4 text-xs text-muted">
              <li>Always validate first — nothing is written during a dry run.</li>
              <li>Upsert matches on <code>slug</code>. Changing a title alone creates no duplicate.</li>
              <li>Every import can be rolled back from the history below.</li>
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6 !p-0" title={<span className="flex items-center gap-2"><History className="size-4" /> Import history</span>}>
        {history.isLoading ? <div className="p-5"><Skeleton className="h-32" /></div> : !history.data?.length ? <EmptyState title="No imports yet" /> : (
          <Table>
            <thead><tr><Th>File</Th><Th>When</Th><Th>Mode</Th><Th>Status</Th><Th className="text-right">Rows</Th><Th className="text-right">Created</Th><Th className="text-right">Updated</Th><Th className="text-right">Errors</Th><Th /></tr></thead>
            <tbody>
              {history.data.map((j) => (
                <tr key={j.batchId} className="hover:bg-surface-2/60">
                  <Td className="max-w-48 truncate font-medium">{j.fileName}</Td><Td className="whitespace-nowrap text-muted">{fmtDate(j.createdAt, "time")}</Td><Td className="capitalize">{j.mode}</Td>
                  <Td><Badge tone={tone(j.status)} className="capitalize">{j.status.replace("_", " ")}</Badge></Td>
                  <Td className="text-right tabular-nums">{j.totalRows}</Td><Td className="text-right tabular-nums">{j.createdCount}</Td><Td className="text-right tabular-nums">{j.updatedCount}</Td><Td className="text-right tabular-nums">{j.errorCount}</Td>
                  <Td><div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(j.batchId!)}>Details</Button>
                    {can("canDelete") && j.status === "completed" && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setRollback(j)}><Undo2 className="size-3.5" /> Roll back</Button>}
                  </div></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <ConfirmModal open={!!rollback} onClose={() => setRollback(null)} danger loading={undo.isPending} title="Roll back this import?"
        text={`Articles created by “${rollback?.fileName}” are deleted and updated articles are restored from their snapshots.`} confirmLabel="Roll back" onConfirm={() => rollback && undo.mutate(rollback.batchId!)} />
      <Modal open={!!viewing} onClose={() => setViewing(null)} size="lg" title="Import details">
        {detail.isLoading ? <Skeleton className="h-40" /> : detail.data && <Report job={detail.data} />}
      </Modal>
    </>
  );
}

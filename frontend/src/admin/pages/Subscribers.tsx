import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Search, Trash2, Users } from "lucide-react";
import { newsletterApi } from "@/lib/endpoints";
import { Badge, Button, EmptyState, ErrorState, Input, Select, Skeleton } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, errMsg, fmtDate } from "@/lib/utils";
import type { Subscriber } from "@/lib/types";
import { PageHeader, Table, Td, Th } from "../parts";
import { useDebounced } from "../hooks";
import { useSeo } from "@/lib/seo";

export default function Subscribers() {
  useSeo({ title: "Subscribers — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const term = useDebounced(search);

  const q = useQuery({ queryKey: ["subscribers", page, term, status], queryFn: () => newsletterApi.list({ page, limit: 50, search: term, status }), placeholderData: keepPreviousData });
  const del = useMutation({
    mutationFn: (id: string) => newsletterApi.remove(id),
    onSuccess: () => { toast("Subscriber removed"); setDeleting(null); qc.invalidateQueries({ queryKey: ["subscribers"] }); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const items = q.data?.data || [];

  const csv = () => {
    const rows = [["email", "name", "status", "source", "subscribed_at"], ...items.map((s) => [s.email, s.name || "", s.status, s.source || "", s.createdAt])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "driftdine-subscribers.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  return (
    <>
      <PageHeader title="Subscribers" description="Everyone who joined the weekly newsletter."
        actions={<>
          <Button variant="outline" disabled={!items.length} onClick={() => { navigator.clipboard.writeText(items.filter((s) => s.status === "subscribed").map((s) => s.email).join(", ")); toast("Active emails on this page copied"); }}><Copy className="size-4" /> Copy emails</Button>
          <Button variant="outline" disabled={!items.length} onClick={csv}><Download className="size-4" /> CSV (this page)</Button>
        </>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand"><Users className="size-5" /></span>
          <div><p className="text-xs font-medium uppercase tracking-wider text-muted">Active subscribers</p><p className="font-display text-3xl font-semibold">{q.data?.stats.active ?? "—"}</p></div></div>
        <div className="card p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted">In this view</p><p className="font-display text-3xl font-semibold">{q.data?.pagination.total ?? "—"}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          <div className="relative min-w-52 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input className="pl-9" placeholder="Search email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <Select className="w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="all">All</option><option value="subscribed">Subscribed</option><option value="unsubscribed">Unsubscribed</option></Select>
        </div>
        {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div> : !items.length ? <EmptyState title="No subscribers" /> : (
          <Table className={cn(q.isFetching && "opacity-60")}>
            <thead><tr><Th>Email</Th><Th>Name</Th><Th>Source</Th><Th>Status</Th><Th>Joined</Th><Th className="w-12" /></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s._id} className="hover:bg-surface-2/60">
                  <Td className="font-medium">{s.email}</Td><Td className="text-muted">{s.name || "—"}</Td><Td className="text-muted">{s.source}</Td>
                  <Td>{s.status === "subscribed" ? <Badge tone="brand">Subscribed</Badge> : <Badge tone="neutral">Unsubscribed</Badge>}</Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDate(s.createdAt)}</Td>
                  <Td>{can("canDelete") && <button aria-label={`Remove ${s.email}`} onClick={() => setDeleting(s)} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger/10"><Trash2 className="size-4" /></button>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="border-t border-line p-4"><Pagination pagination={q.data?.pagination} onPage={setPage} /></div>
      </div>
      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} danger loading={del.isPending} title="Remove subscriber?" text={`${deleting?.email} will be deleted from the list.`} confirmLabel="Remove" onConfirm={() => deleting && del.mutate(deleting._id)} />
    </>
  );
}

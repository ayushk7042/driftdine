import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Inbox, Mail, Reply, Trash2 } from "lucide-react";
import { contactApi } from "@/lib/endpoints";
import { Badge, Button, EmptyState, ErrorState, Skeleton, Textarea } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { cn, errMsg, fmtDate, timeAgo } from "@/lib/utils";
import type { Contact } from "@/lib/types";
import { PageHeader, Tabs } from "../parts";
import { useSeo } from "@/lib/seo";

export default function Contacts() {
  useSeo({ title: "Messages — Admin", robots: "noindex" });
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [tab, setTab] = useState<"all" | Contact["status"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const q = useQuery({ queryKey: ["contacts"], queryFn: contactApi.list });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["contacts"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };

  const send = useMutation({
    mutationFn: (id: string) => contactApi.reply(id, reply),
    onSuccess: () => { toast("Reply sent"); setReply(""); refresh(); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const del = useMutation({
    mutationFn: (id: string) => contactApi.remove(id),
    onSuccess: () => { toast("Message deleted"); setDeleting(null); setOpenId(null); refresh(); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const all = q.data || [];
  const list = all.filter((c) => tab === "all" || c.status === tab);
  const current = all.find((c) => c._id === openId) || null;
  const count = (s: Contact["status"]) => all.filter((c) => c.status === s).length;

  return (
    <>
      <PageHeader title="Messages" description="Contact-form submissions from readers and partners." />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: all.length }, { id: "new", label: "New", count: count("new") }, { id: "replied", label: "Replied", count: count("replied") }, { id: "closed", label: "Closed", count: count("closed") }]} /></div>

      {q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <Skeleton className="h-96" /> : !list.length ? <div className="card"><EmptyState icon={<Inbox className="size-6" />} title="Inbox zero" text="No messages in this view." /></div> : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <ul className="card max-h-[70vh] divide-y divide-line overflow-y-auto">
            {list.map((c) => (
              <li key={c._id}>
                <button onClick={() => { setOpenId(c._id); setReply(""); }} className={cn("w-full space-y-1 px-4 py-3.5 text-left transition hover:bg-surface-2", openId === c._id && "bg-brand-soft/60")}>
                  <p className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 font-medium">{c.status === "new" && <span className="size-2 rounded-full bg-brand" />}{c.name}</span><span className="text-xs text-muted">{timeAgo(c.createdAt)}</span></p>
                  <p className="line-clamp-1 text-sm">{c.subject || "(no subject)"}</p>
                  <p className="line-clamp-1 text-xs text-muted">{c.message}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="card min-h-64">
            {!current ? <EmptyState icon={<Mail className="size-6" />} title="Select a message" /> : (
              <div className="space-y-6 p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{current.subject || "(no subject)"}</h2>
                    <p className="text-sm text-muted">{current.name} · <a href={`mailto:${current.email}`} className="text-brand hover:underline">{current.email}</a> · {fmtDate(current.createdAt, "time")}</p>
                  </div>
                  <Badge tone={current.status === "new" ? "brand" : current.status === "replied" ? "info" : "neutral"} className="capitalize">{current.status}</Badge>
                </header>
                <p className="whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 leading-relaxed">{current.message}</p>

                {current.reply?.message && (
                  <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-4">
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand"><CheckCircle2 className="size-4" /> Replied {fmtDate(current.reply.repliedAt, "time")}</p>
                    <p className="whitespace-pre-wrap text-sm">{current.reply.message}</p>
                  </div>
                )}

                {can("canPublish") && (
                  <div className="space-y-3">
                    <Textarea rows={5} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={current.reply ? "Send another reply…" : `Reply to ${current.name.split(" ")[0]}…`} />
                    <div className="flex flex-wrap gap-2">
                      <Button loading={send.isPending} disabled={!reply.trim()} onClick={() => send.mutate(current._id)}><Reply className="size-4" /> Send reply</Button>
                      {can("canDelete") && <Button variant="ghost" className="ml-auto text-danger" onClick={() => setDeleting(current)}><Trash2 className="size-4" /> Delete</Button>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} danger loading={del.isPending} title="Delete message?" text={`The message from ${deleting?.name} will be permanently deleted.`} confirmLabel="Delete" onConfirm={() => deleting && del.mutate(deleting._id)} />
    </>
  );
}

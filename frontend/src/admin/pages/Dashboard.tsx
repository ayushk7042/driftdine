import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bot, CheckCircle2, FileText, FolderTree, Mail, PenSquare, RefreshCw, Sparkles, Target, Zap } from "lucide-react";
import { contactApi, dashboardApi, newsApi } from "@/lib/endpoints";
import { Button, ErrorState, LinkButton, Skeleton } from "@/components/ui";
import { PageHeader, Panel, StatCard, StatusBadge } from "../parts";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { catOf, compact, errMsg, timeAgo } from "@/lib/utils";
import { autoNewsApi } from "@/lib/endpoints";
import { useSeo } from "@/lib/seo";

function ScoreRing({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const color = value >= 80 ? "var(--accent)" : value >= 50 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="relative grid size-36 place-items-center">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="transition-all duration-700" />
      </svg>
      <span className="absolute font-display text-4xl font-semibold">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  useSeo({ title: "Dashboard — Admin", robots: "noindex" });
  const { admin, can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get });
  const recent = useQuery({ queryKey: ["news", "recent-admin"], queryFn: () => newsApi.list({ limit: 6, sort: "updated", status: "all" }) });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: contactApi.list });
  const run = useMutation({
    mutationFn: autoNewsApi.run,
    onSuccess: (r) => { toast(`${r.message} (${r.count})`); qc.invalidateQueries(); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const s = stats.data;
  const newMessages = (contacts.data || []).filter((c) => c.status === "new").slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Welcome back${admin?.name ? `, ${admin.name.split(" ")[0]}` : ""}`}
        description="Here’s what’s happening across Driftdine today."
        actions={<>
          <Button variant="outline" onClick={() => { stats.refetch(); recent.refetch(); contacts.refetch(); }}><RefreshCw className="size-4" /> Refresh</Button>
          {can("canPublish") && <LinkButton to="/admin/articles/new"><PenSquare className="size-4" /> New article</LinkButton>}
        </>}
      />

      {stats.isError ? <ErrorState error={stats.error} onRetry={stats.refetch} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.isLoading ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />) : s && (
            <>
              <StatCard label="Total articles" value={compact(s.totalNews)} icon={<FileText className="size-5" />} />
              <StatCard label="Published" value={compact(s.publishedNews)} icon={<CheckCircle2 className="size-5" />} hint={`${s.totalNews ? Math.round((s.publishedNews / s.totalNews) * 100) : 0}% of all`} />
              <StatCard label="Drafts" value={compact(s.draftNews)} tone="warn" icon={<PenSquare className="size-5" />} />
              <StatCard label="Categories" value={s.categories} tone="info" icon={<FolderTree className="size-5" />} />
              <StatCard label="AI generated" value={compact(s.aiNews)} icon={<Sparkles className="size-5" />} />
              <StatCard label="Auto-updating" value={compact(s.autoUpdateNews)} tone="info" icon={<Zap className="size-5" />} hint="AI cron may rewrite these" />
              <StatCard label="New messages" value={s.newContacts} tone={s.newContacts ? "danger" : "brand"} icon={<Mail className="size-5" />} hint={<Link to="/admin/contacts" className="text-brand hover:underline">Open inbox</Link>} />
              <StatCard label="Avg SEO score" value={s.avgSeoScore} icon={<Target className="size-5" />} hint="across all articles" />
            </>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Recently updated" actions={<Link to="/admin/articles" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">All articles <ArrowRight className="size-4" /></Link>}>
          {recent.isLoading ? <Skeleton className="h-64" /> : (
            <ul className="divide-y divide-line">
              {(recent.data?.data || []).map((a) => (
                <li key={a._id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/articles/${a._id}/edit`} className="line-clamp-1 font-medium hover:text-brand">{a.title}</Link>
                    <p className="text-xs text-muted">{catOf(a)?.name} · {timeAgo(a.updatedAt || a.createdAt)} · {compact(a.views || 0)} views</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
              {!recent.data?.data.length && <li className="py-6 text-center text-sm text-muted">No articles yet.</li>}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Content health" description="Average SEO score">
            <div className="flex items-center gap-5">
              <ScoreRing value={s?.avgSeoScore ?? 0} />
              <p className="text-sm text-muted">{(s?.avgSeoScore ?? 0) >= 80 ? "Great shape. Keep titles and descriptions tight." : "Open an article’s SEO tab to improve titles, descriptions and keywords."}</p>
            </div>
          </Panel>

          <Panel title="Inbox" actions={<Link to="/admin/contacts" className="text-sm font-semibold text-brand">View all</Link>}>
            {newMessages.length ? (
              <ul className="space-y-3">
                {newMessages.map((c) => (
                  <li key={c._id} className="text-sm"><p className="font-medium">{c.name} <span className="font-normal text-muted">· {timeAgo(c.createdAt)}</span></p><p className="line-clamp-1 text-muted">{c.subject || c.message}</p></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">You’re all caught up.</p>}
          </Panel>

          {can("canPublish") && (
            <Panel title="Automation">
              <p className="mb-3 text-sm text-muted">Generate draft articles for every category with auto-update enabled.</p>
              <Button variant="outline" loading={run.isPending} onClick={() => run.mutate()} className="w-full"><Bot className="size-4" /> Run auto news</Button>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

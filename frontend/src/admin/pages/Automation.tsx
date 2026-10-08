import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Hash, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { autoNewsApi, tagApi } from "@/lib/endpoints";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { errMsg } from "@/lib/utils";
import { PageHeader, Panel } from "../parts";
import { useSeo } from "@/lib/seo";

export default function Automation() {
  useSeo({ title: "Automation — Admin", robots: "noindex" });
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();

  const run = useMutation({ mutationFn: autoNewsApi.run, onSuccess: (r) => { toast(`${r.message} — ${r.count} draft(s) created`); qc.invalidateQueries(); }, onError: (e) => toast(errMsg(e), "error") });
  const recount = useMutation({ mutationFn: tagApi.recount, onSuccess: (r) => { toast(r.message); qc.invalidateQueries({ queryKey: ["tags"] }); }, onError: (e) => toast(errMsg(e), "error") });

  return (
    <>
      <PageHeader title="Automation" description="Background jobs and one-click maintenance." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><Bot className="size-5 text-brand" /> Auto news</span>}>
          <div className="space-y-4 text-sm">
            <p className="text-muted">Creates draft articles for every <em>active</em> category that has <strong>auto-update</strong> enabled, up to each category’s daily limit. Drafts are never published automatically.</p>
            <p className="rounded-xl bg-warn/10 px-3 py-2 text-warn">The backend endpoint currently generates placeholder “TEST” drafts. Review and delete them before publishing.</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!can("canPublish")} loading={run.isPending} onClick={() => run.mutate()}><Sparkles className="size-4" /> Run now</Button>
              <Link to="/admin/categories" className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-brand">Configure categories</Link>
            </div>
          </div>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Hash className="size-5 text-brand" /> Tag maintenance</span>}>
          <div className="space-y-4 text-sm">
            <p className="text-muted">Recalculates how many articles use each tag. Run it after large imports or bulk edits.</p>
            <Button variant="outline" disabled={!can("canPublish")} loading={recount.isPending} onClick={() => recount.mutate()}>Recount tag usage</Button>
          </div>
        </Panel>
        <Panel title="Scheduled jobs" className="lg:col-span-2">
          <ul className="space-y-3 text-sm text-muted">
            <li><strong className="text-fg">Daily auto update</strong> — runs on the server cron (<code>CRON_TIME</code>) and refreshes articles that still allow auto-updates.</li>
            <li><strong className="text-fg">Publish scheduled</strong> — publishes articles whose “Schedule for” time has passed. Set it in the article editor’s Publishing panel.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

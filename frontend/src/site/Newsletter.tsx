import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { newsletterApi } from "@/lib/endpoints";
import { errMsg } from "@/lib/utils";
import { Button } from "@/components/ui";

export function NewsletterForm({ source = "footer", dark = false, compact = false }: { source?: string; dark?: boolean; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const m = useMutation({ mutationFn: () => newsletterApi.subscribe(email.trim(), source) });

  if (m.isSuccess) {
    return (
      <p className={`flex items-center gap-2 text-sm font-medium ${dark ? "text-leaf-300" : "text-brand"}`} role="status">
        <CheckCircle2 className="size-5" /> You're on the list. Watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) m.mutate(); }} className="w-full">
      <div className={`flex ${compact ? "flex-col" : "flex-col sm:flex-row"} gap-2`}>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-label="Email address"
          className={`h-12 w-full min-w-0 shrink-0 ${compact ? "" : "sm:w-auto sm:flex-1"} rounded-full border px-5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/40 ${dark ? "border-white/15 bg-white/10 text-white placeholder:text-white/50" : "border-line bg-surface text-fg"}`}
        />
        <Button type="submit" size="lg" loading={m.isPending}>Subscribe <ArrowRight className="size-4" /></Button>
      </div>
      {m.isError && <p className="mt-2 text-xs text-danger" role="alert">{errMsg(m.error)}</p>}
    </form>
  );
}

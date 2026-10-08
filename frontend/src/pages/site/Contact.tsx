import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Mail, MessageSquare } from "lucide-react";
import { contactApi } from "@/lib/endpoints";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { errMsg } from "@/lib/utils";
import { useSeo } from "@/lib/seo";

export default function ContactPage() {
  useSeo({ title: "Contact", description: "Send the Driftdine team a message." });
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const m = useMutation({ mutationFn: () => contactApi.create(form) });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container-x grid gap-12 pt-6 lg:grid-cols-[1fr_1.1fr]">
      <header className="space-y-5">
        <span className="eyebrow">Contact</span>
        <h1 className="text-4xl font-semibold sm:text-6xl">Let’s talk.</h1>
        <p className="max-w-md text-lg text-muted">Story tips, corrections, partnerships — we read every message and reply to as many as we can.</p>
        <ul className="space-y-3 pt-4 text-sm">
          <li className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand"><Mail className="size-5" /></span>We reply by email</li>
          <li className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand"><MessageSquare className="size-5" /></span>Usually within two working days</li>
        </ul>
      </header>

      <div className="card p-6 sm:p-8">
        {m.isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center" role="status">
            <CheckCircle2 className="size-12 text-brand" />
            <h2 className="text-2xl font-semibold">Message sent</h2>
            <p className="text-muted">Thanks, {form.name.split(" ")[0] || "friend"} — we’ll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name"><Input required value={form.name} onChange={set("name")} autoComplete="name" /></Field>
              <Field label="Email"><Input required type="email" value={form.email} onChange={set("email")} autoComplete="email" /></Field>
            </div>
            <Field label="Subject"><Input value={form.subject} onChange={set("subject")} /></Field>
            <Field label="Message"><Textarea required rows={6} value={form.message} onChange={set("message")} /></Field>
            {m.isError && <p className="text-sm text-danger" role="alert">{errMsg(m.error)}</p>}
            <Button type="submit" size="lg" loading={m.isPending} className="w-full">Send message</Button>
          </form>
        )}
      </div>
    </div>
  );
}

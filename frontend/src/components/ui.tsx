import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- buttons ---------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "gradient-brand text-[#04140d] font-semibold shadow-[0_8px_24px_-10px_rgb(47_195_134/0.8)] hover:brightness-105",
  secondary: "bg-brand text-brand-fg font-semibold hover:brightness-110",
  outline: "border border-line bg-surface text-fg hover:border-brand hover:text-brand",
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-danger text-white font-semibold hover:brightness-110",
};
const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2.5 px-6 text-[15px]",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center rounded-full whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant], sizes[size], extra
  );

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ variant, size, loading, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function LinkButton({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ---------- form fields ---------- */
/** Fields fill their container unless the caller sets an explicit width class. */
const wide = (c?: string) => (c && /(^|\s)(sm:|md:|lg:)?w-/.test(c) ? "" : "w-full");

const field =
  "rounded-xl border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-muted/70 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(field, wide(className), "h-10", className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(field, wide(className), "py-2.5 leading-relaxed", className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={cn(field, wide(className), "h-10 pr-8", className)} {...p}>
      {children}
    </select>
  );
});

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && <span className="text-[13px] font-medium text-fg">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export const Badge = ({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "warn" | "danger" | "info"; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
      tone === "neutral" && "bg-surface-2 text-muted",
      tone === "brand" && "bg-brand-soft text-brand",
      tone === "warn" && "bg-warn/15 text-warn",
      tone === "danger" && "bg-danger/15 text-danger",
      tone === "info" && "bg-sky-500/15 text-sky-600 dark:text-sky-300",
      className
    )}
  >
    {children}
  </span>
);

/* ---------- states ---------- */
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("animate-spin text-brand", className ?? "size-5")} />;

export const PageLoader = () => (
  <div className="grid min-h-[40vh] place-items-center" role="status" aria-label="Loading">
    <Spinner className="size-7" />
  </div>
);

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "We couldn't load this right now.";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger"><AlertTriangle className="size-6" /></span>
      <h3 className="text-lg font-semibold">Something went wrong</h3>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">{icon ?? <Inbox className="size-6" />}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} aria-hidden />;

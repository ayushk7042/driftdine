import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface Item { id: number; kind: Kind; text: string }
const Ctx = createContext<{ toast: (text: string, kind?: Kind) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const toast = useCallback((text: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((i) => {
          const I = Icon[i.kind];
          return (
            <div key={i.id} className={cn("pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border bg-surface px-4 py-3 text-sm shadow-pop animate-fade-up",
              i.kind === "success" && "border-brand/40", i.kind === "error" && "border-danger/50", i.kind === "info" && "border-line")}>
              <I className={cn("size-5 shrink-0", i.kind === "success" && "text-brand", i.kind === "error" && "text-danger", i.kind === "info" && "text-muted")} />
              <span>{i.text}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast outside ToastProvider");
  return v.toast;
};

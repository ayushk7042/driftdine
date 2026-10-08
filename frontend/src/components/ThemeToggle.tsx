import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Two-state pill: the active mode sits in a raised circle. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const seg = "grid size-8 place-items-center rounded-full transition duration-300";
  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-brand/20 bg-surface/70 p-0.5 shadow-sm transition duration-200 hover:border-brand hover:shadow-[0_0_0_4px_rgb(47_195_134/0.14)]", className)}
    >
      <span className={cn(seg, !dark ? "bg-gradient-to-br from-leaf-300 to-leaf-500 text-[#04140d] shadow" : "text-muted hover:text-fg")}><Sun className="size-4" /></span>
      <span className={cn(seg, dark ? "bg-gradient-to-br from-leaf-300 to-leaf-500 text-[#04140d] shadow" : "text-muted hover:text-fg")}><Moon className="size-4" /></span>
    </button>
  );
}

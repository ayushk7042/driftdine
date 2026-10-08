import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

/** Hides controls the signed-in role cannot use; the API still enforces it. */
export function Can({ permission, children }: { permission: "canPublish" | "canDelete"; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : null;
}

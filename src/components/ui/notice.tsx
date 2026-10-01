import { Info } from "lucide-react";
import type { ReactNode } from "react";
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Info size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

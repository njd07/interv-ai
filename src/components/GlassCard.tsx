import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  glow = "cyan",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; glow?: "cyan" | "violet" | "none" }) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-6 transition-glow",
        glow === "cyan" && "hover:glow-cyan",
        glow === "violet" && "hover:glow-violet",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

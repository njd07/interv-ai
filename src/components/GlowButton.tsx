import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlowButton({
  children,
  className,
  variant = "cyan",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "cyan" | "violet" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };
  const variants = {
    cyan: "bg-[color-mix(in_oklch,var(--cyan)_18%,transparent)] text-[var(--cyan)] border border-[color-mix(in_oklch,var(--cyan)_45%,transparent)] hover:bg-[color-mix(in_oklch,var(--cyan)_28%,transparent)] hover:shadow-[0_0_24px_-2px_color-mix(in_oklch,var(--cyan)_60%,transparent)]",
    violet: "bg-[color-mix(in_oklch,var(--violet)_18%,transparent)] text-[oklch(0.9_0.15_295)] border border-[color-mix(in_oklch,var(--violet)_50%,transparent)] hover:bg-[color-mix(in_oklch,var(--violet)_30%,transparent)] hover:shadow-[0_0_24px_-2px_color-mix(in_oklch,var(--violet)_60%,transparent)]",
    ghost: "bg-transparent text-foreground border border-border hover:bg-muted",
    danger: "bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25",
  };
  return (
    <button
      className={cn(
        "font-mono uppercase tracking-wider rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

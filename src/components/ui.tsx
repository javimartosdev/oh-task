"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export { Card } from "@/components/card";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          variant === "primary" &&
            "bg-accent text-accent-fg hover:opacity-90 shadow-sm shadow-accent/20",
          variant === "secondary" &&
            "bg-surface-elevated text-foreground border border-border hover:bg-surface-hover",
          variant === "ghost" && "text-muted hover:text-foreground hover:bg-surface-hover",
          variant === "danger" && "text-danger hover:bg-danger/10",
          size === "sm" && "h-8 px-3 text-sm gap-1.5",
          size === "md" && "h-10 px-4 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-2",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors",
        className,
      )}
      {...props}
    />
  );
}


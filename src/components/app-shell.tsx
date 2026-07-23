"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  GanttChart,
  LayoutGrid,
  LogOut,
  Settings,
  Target,
  Timer,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dock", icon: Target },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Cal", icon: CalendarDays },
  { href: "/matrix", label: "Matrix", icon: LayoutGrid },
  { href: "/gantt", label: "Plan", icon: GanttChart },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-full flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-mantle/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-2 px-3">
          <BrandLogo variant="header" />
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              title={`Salir (${userName})`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-0.5 overflow-x-auto px-2 pb-2 scrollbar-none">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                  active
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

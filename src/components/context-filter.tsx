"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Context {
  id: string;
  name: string;
  color: string;
}

export function ContextFilter({
  contexts,
  selectedId,
}: {
  contexts: Context[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("context", id);
    else params.delete("context");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => select(null)}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          !selectedId
            ? "bg-accent/20 text-accent"
            : "bg-surface-hover text-muted hover:text-foreground",
        )}
      >
        Todos
      </button>
      {contexts.map((ctx) => (
        <button
          key={ctx.id}
          onClick={() => select(ctx.id)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selectedId === ctx.id
              ? "text-accent-fg"
              : "bg-surface-hover text-muted hover:text-foreground",
          )}
          style={
            selectedId === ctx.id
              ? { backgroundColor: ctx.color }
              : undefined
          }
        >
          {ctx.name}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import {
  EISENHOWER_LABELS,
  EISENHOWER_QUADRANTS,
  classifyEisenhower,
  fieldsForQuadrant,
  type EisenhowerQuadrant,
} from "@/lib/eisenhower";
import { cn, formatDateKey } from "@/lib/utils";

const TONE: Record<
  EisenhowerQuadrant,
  { text: string; bg: string; ring: string }
> = {
  do: { text: "text-red", bg: "bg-red/15", ring: "ring-red/40" },
  schedule: { text: "text-yellow", bg: "bg-yellow/15", ring: "ring-yellow/40" },
  delegate: { text: "text-blue", bg: "bg-blue/15", ring: "ring-blue/40" },
  eliminate: { text: "text-teal", bg: "bg-teal/15", ring: "ring-teal/40" },
};

export function MatrixMoveControl({
  taskId,
  priority,
  dueDate,
  onMoved,
}: {
  taskId: string;
  priority: number;
  dueDate: string | null;
  onMoved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = classifyEisenhower(
    { priority, dueDate },
    formatDateKey(new Date()),
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function moveTo(q: EisenhowerQuadrant) {
    setBusy(true);
    const fields = fieldsForQuadrant(q);
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, ...fields }),
    });
    setBusy(false);
    setOpen(false);
    onMoved?.();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title="Enviar a matriz"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground",
          open && "bg-surface-hover text-foreground",
          TONE[current].text,
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-mantle p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-overlay1">
            Matriz
          </p>
          {EISENHOWER_QUADRANTS.map((q) => {
            const label = EISENHOWER_LABELS[q];
            const tone = TONE[q];
            const active = current === q;
            return (
              <button
                key={q}
                type="button"
                disabled={busy}
                onClick={() => void moveTo(q)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface",
                  active && cn("ring-1", tone.ring, tone.bg),
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-2 w-2 shrink-0 rounded-sm",
                    q === "do" && "bg-red",
                    q === "schedule" && "bg-yellow",
                    q === "delegate" && "bg-blue",
                    q === "eliminate" && "bg-teal",
                  )}
                />
                <span className="min-w-0">
                  <span className={cn("block text-xs font-medium", tone.text)}>
                    {label.title}
                  </span>
                  <span className="block text-[10px] text-muted">{label.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

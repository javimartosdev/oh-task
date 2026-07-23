"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Plus } from "lucide-react";
import {
  classifyEisenhower,
  EISENHOWER_LABELS,
  fieldsForQuadrant,
  type EisenhowerQuadrant,
} from "@/lib/eisenhower";
import { cn, formatDateKey } from "@/lib/utils";
import { MatrixMoveControl } from "@/components/matrix-move-control";

type MatrixTask = {
  id: string;
  title: string;
  priority: number;
  dueDate: string | null;
  completedAt: string | Date | null;
  status: string;
};

const PANEL: Record<
  EisenhowerQuadrant,
  { panel: string; chip: string; chipText: string; title: string }
> = {
  do: {
    panel: "bg-red/12 ring-1 ring-inset ring-red/30",
    chip: "bg-red text-accent-fg",
    chipText: "text-red",
    title: "text-red",
  },
  schedule: {
    panel: "bg-yellow/12 ring-1 ring-inset ring-yellow/30",
    chip: "bg-yellow text-accent-fg",
    chipText: "text-yellow",
    title: "text-yellow",
  },
  delegate: {
    panel: "bg-blue/12 ring-1 ring-inset ring-blue/30",
    chip: "bg-blue text-accent-fg",
    chipText: "text-blue",
    title: "text-blue",
  },
  eliminate: {
    panel: "bg-teal/12 ring-1 ring-inset ring-teal/30",
    chip: "bg-teal text-accent-fg",
    chipText: "text-teal",
    title: "text-teal",
  },
};

const LEGEND: EisenhowerQuadrant[] = [
  "do",
  "schedule",
  "delegate",
  "eliminate",
];

export function EisenhowerMatrix({ tasks }: { tasks: MatrixTask[] }) {
  const router = useRouter();
  const todayKey = formatDateKey(new Date());
  const [addingTo, setAddingTo] = useState<EisenhowerQuadrant | null>(null);
  const [draft, setDraft] = useState("");

  const byQuadrant = useMemo(() => {
    const map: Record<EisenhowerQuadrant, MatrixTask[]> = {
      do: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };
    for (const t of tasks) {
      if (t.completedAt) continue;
      map[
        classifyEisenhower(
          { priority: t.priority, dueDate: t.dueDate },
          todayKey,
        )
      ].push(t);
    }
    return map;
  }, [tasks, todayKey]);

  async function toggleComplete(task: MatrixTask) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: task.completedAt ? "reopen" : "complete",
      }),
    });
    router.refresh();
  }

  async function createInQuadrant(q: EisenhowerQuadrant) {
    const title = draft.trim();
    if (!title) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        ...fieldsForQuadrant(q),
        parseNatural: false,
      }),
    });
    setDraft("");
    setAddingTo(null);
    router.refresh();
  }

  function bind(q: EisenhowerQuadrant) {
    return {
      q,
      items: byQuadrant[q],
      adding: addingTo === q,
      draft,
      setDraft,
      onToggleAdd: () => {
        setAddingTo(addingTo === q ? null : q);
        setDraft("");
      },
      onSubmit: () => void createInQuadrant(q),
      onCancelAdd: () => {
        setAddingTo(null);
        setDraft("");
      },
      onToggleTask: toggleComplete,
      onMoved: () => router.refresh(),
    };
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Matriz de prioridades
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Arriba = urgente · Izquierda = importante. Mueve tareas desde Tasks
          con el icono de cuadrícula.
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[300px] space-y-2">
          <div
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: "3rem 1fr 1fr" }}
          >
            <div aria-hidden />
            <AxisTag tone="urgent">Urgente</AxisTag>
            <AxisTag tone="calm">No urgente</AxisTag>
          </div>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "3rem 1fr 1fr" }}
          >
            <SideAxis>Importante</SideAxis>
            <Quadrant {...bind("do")} />
            <Quadrant {...bind("schedule")} />

            <SideAxis muted>Menos clave</SideAxis>
            <Quadrant {...bind("delegate")} />
            <Quadrant {...bind("eliminate")} />
          </div>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {LEGEND.map((q) => (
          <li
            key={q}
            className="flex items-start gap-2 rounded-xl bg-mantle px-3 py-2 ring-1 ring-border/50"
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                PANEL[q].chip,
              )}
            >
              {EISENHOWER_LABELS[q].title.slice(0, 1)}
            </span>
            <span className="text-xs leading-snug">
              <span className={cn("font-semibold", PANEL[q].title)}>
                {EISENHOWER_LABELS[q].title}
              </span>
              <span className="text-muted"> — {EISENHOWER_LABELS[q].hint}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AxisTag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "urgent" | "calm";
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide",
        tone === "urgent"
          ? "bg-maroon/15 text-maroon"
          : "bg-overlay0/20 text-overlay1",
      )}
    >
      {children}
    </div>
  );
}

function SideAxis({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-center">
      <span
        className={cn(
          "-rotate-90 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide",
          muted ? "text-overlay1" : "text-peach",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function Quadrant({
  q,
  items,
  adding,
  draft,
  setDraft,
  onToggleAdd,
  onSubmit,
  onCancelAdd,
  onToggleTask,
  onMoved,
}: {
  q: EisenhowerQuadrant;
  items: MatrixTask[];
  adding: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onToggleAdd: () => void;
  onSubmit: () => void;
  onCancelAdd: () => void;
  onToggleTask: (t: MatrixTask) => void;
  onMoved: () => void;
}) {
  const meta = EISENHOWER_LABELS[q];
  const style = PANEL[q];
  const letter = meta.title.slice(0, 1).toUpperCase();

  return (
    <section
      className={cn(
        "flex min-h-[210px] flex-col rounded-2xl p-3 sm:min-h-[250px] sm:p-4",
        style.panel,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
              style.chip,
            )}
          >
            {letter}
          </span>
          <div className="min-w-0">
            <h2 className={cn("text-base font-semibold leading-tight", style.title)}>
              {meta.title}
            </h2>
            <p className="mt-0.5 text-xs text-subtext1">{meta.hint}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleAdd}
          className="rounded-xl bg-background/70 p-2 text-foreground/80 ring-1 ring-border/70 hover:bg-background hover:text-foreground"
          aria-label={`Añadir en ${meta.title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {adding && (
        <form
          className="mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Nueva en «${meta.title}»…`}
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-overlay1 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancelAdd();
            }}
          />
        </form>
      )}

      <div className="flex flex-1 flex-col">
        {items.length === 0 && !adding ? (
          <button
            type="button"
            onClick={onToggleAdd}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-current/20 bg-background/35 px-3 py-8 text-center hover:bg-background/55"
          >
            <span className="text-sm text-overlay1">Nada aquí todavía</span>
            <span className={cn("text-xs font-semibold", style.chipText)}>
              + Añadir tarea
            </span>
          </button>
        ) : (
          <ul className="space-y-1.5">
            {items.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-1 rounded-xl bg-background/65 shadow-sm shadow-crust/10 ring-1 ring-border/50"
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(task)}
                  className="flex flex-1 items-start gap-2 px-2.5 py-2.5 text-left"
                >
                  {task.completedAt ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-overlay1" />
                  )}
                  <span className="text-sm font-medium leading-snug text-foreground">
                    {task.title}
                  </span>
                </button>
                <div className="pr-1.5 pt-1.5">
                  <MatrixMoveControl
                    taskId={task.id}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    onMoved={onMoved}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <p className="mt-3 text-right text-[11px] tabular-nums text-overlay1">
          {items.length} {items.length === 1 ? "tarea" : "tareas"}
        </p>
      )}
    </section>
  );
}

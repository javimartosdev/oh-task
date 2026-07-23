"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDateKey } from "@/lib/utils";
import { timeFromIso } from "@/lib/schedule";

type PlanTask = {
  id: string;
  title: string;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  priority: number;
  status: string;
  dependsOnTaskId: string | null;
  contextName: string | null;
  contextColor: string | null;
};

type TimedBlock = {
  task: PlanTask;
  start: Date;
  end: Date;
  column: number;
  columns: number;
};

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_PX = 72;
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START },
  (_, i) => HOUR_START + i,
);
const TIMELINE_DAYS = 14;

function contrastFg(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#1e1e2e";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65 ? "#1e1e2e" : "#eff1f5";
}

/** Pack overlapping intervals into columns (calendar-style). */
function layoutOverlaps(
  items: { task: PlanTask; start: Date; end: Date }[],
): TimedBlock[] {
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const result: TimedBlock[] = [];
  const active: { end: Date; column: number }[] = [];

  for (const item of sorted) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= item.start) active.splice(i, 1);
    }
    const used = new Set(active.map((a) => a.column));
    let column = 0;
    while (used.has(column)) column++;
    active.push({ end: item.end, column });
    const columns = Math.max(column + 1, ...active.map((a) => a.column + 1));
    result.push({ ...item, column, columns });
  }

  // Second pass: set columns = max concurrent in cluster
  for (const block of result) {
    const overlapping = result.filter(
      (o) => o.start < block.end && o.end > block.start,
    );
    block.columns = Math.max(...overlapping.map((o) => o.column)) + 1;
  }

  return result;
}

export function GanttView({ tasks }: { tasks: PlanTask[] }) {
  const [mode, setMode] = useState<"day" | "timeline">("day");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const dayKey = formatDateKey(cursor);
  const now = new Date();

  const dayTimed = useMemo(() => {
    const items: { task: PlanTask; start: Date; end: Date }[] = [];
    for (const task of tasks) {
      if (!task.scheduledStart) continue;
      const start = parseISO(task.scheduledStart);
      if (!isSameDay(start, cursor)) continue;
      const end = task.scheduledEnd
        ? parseISO(task.scheduledEnd)
        : new Date(start.getTime() + 60 * 60 * 1000);
      items.push({ task, start, end: end > start ? end : new Date(start.getTime() + 30 * 60 * 1000) });
    }
    return layoutOverlaps(items);
  }, [tasks, cursor]);

  const dayUnscheduled = useMemo(() => {
    return tasks.filter((t) => {
      if (t.scheduledStart) return false;
      return t.dueDate === dayKey;
    });
  }, [tasks, dayKey]);

  const nowTop =
    isSameDay(now, cursor) &&
    now.getHours() >= HOUR_START &&
    now.getHours() < HOUR_END
      ? ((now.getHours() - HOUR_START) * 60 + now.getMinutes()) *
        (HOUR_PX / 60)
      : null;

  const totalMin = dayTimed.reduce(
    (s, b) => s + Math.max(0, differenceInMinutes(b.end, b.start)),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Plan</h1>
          <p className="mt-0.5 text-sm text-muted">
            Agenda del día con horas. Color = lista.
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-mantle p-0.5">
          {(
            [
              ["day", "Día"],
              ["timeline", "Timeline"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                mode === id
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "day" ? (
        <DayAgenda
          cursor={cursor}
          setCursor={setCursor}
          dayTimed={dayTimed}
          dayUnscheduled={dayUnscheduled}
          nowTop={nowTop}
          totalMin={totalMin}
        />
      ) : (
        <TimelineStrip tasks={tasks} />
      )}
    </div>
  );
}

function DayAgenda({
  cursor,
  setCursor,
  dayTimed,
  dayUnscheduled,
  nowTop,
  totalMin,
}: {
  cursor: Date;
  setCursor: (d: Date | ((c: Date) => Date)) => void;
  dayTimed: TimedBlock[];
  dayUnscheduled: PlanTask[];
  nowTop: number | null;
  totalMin: number;
}) {
  const isToday = isSameDay(cursor, new Date());
  const gridHeight = (HOUR_END - HOUR_START) * HOUR_PX;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-mantle px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => addDays(c, -1))}
            className="rounded-xl p-2 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfDay(new Date()))}
            className="min-w-[11rem] rounded-xl px-2 py-1.5 text-center hover:bg-surface"
          >
            <div className="text-sm font-semibold capitalize text-foreground">
              {format(cursor, "EEEE d MMM", { locale: es })}
            </div>
            <div className="text-[11px] text-muted">
              {isToday ? "Hoy" : format(cursor, "yyyy")}
              {dayTimed.length > 0 &&
                ` · ${dayTimed.length} bloque${dayTimed.length === 1 ? "" : "s"} · ${Math.round(totalMin / 60)}h ${totalMin % 60}m`}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addDays(c, 1))}
            className="rounded-xl p-2 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!isToday && (
          <button
            type="button"
            onClick={() => setCursor(startOfDay(new Date()))}
            className="rounded-xl bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Ir a hoy
          </button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-mantle">
          <div className="relative flex">
            {/* Hour gutter */}
            <div className="w-14 shrink-0 border-r border-border/70 bg-background/40 select-none">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="relative border-b border-border/30 pr-2 text-right"
                  style={{ height: HOUR_PX }}
                >
                  <span className="absolute -top-2 right-2 text-[10px] font-medium tabular-nums text-overlay1">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div className="relative min-w-0 flex-1" style={{ height: gridHeight }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-border/35"
                  style={{ top: (h - HOUR_START) * HOUR_PX, height: HOUR_PX }}
                >
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-border/20"
                    style={{ top: HOUR_PX / 2 }}
                  />
                </div>
              ))}

              {nowTop !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                  style={{ top: nowTop }}
                >
                  <span className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-red shadow-sm shadow-red/40" />
                  <span className="h-[2px] flex-1 bg-red/80" />
                </div>
              )}

              {dayTimed.map((block) => {
                const color = block.task.contextColor || "#89b4fa";
                const startMin = Math.max(
                  0,
                  (block.start.getHours() - HOUR_START) * 60 +
                    block.start.getMinutes(),
                );
                const endMin = Math.min(
                  (HOUR_END - HOUR_START) * 60,
                  (block.end.getHours() - HOUR_START) * 60 +
                    block.end.getMinutes(),
                );
                const top = (startMin / 60) * HOUR_PX;
                const height = Math.max(28, ((endMin - startMin) / 60) * HOUR_PX - 4);
                const widthPct = 100 / block.columns;
                const leftPct = block.column * widthPct;

                return (
                  <article
                    key={block.task.id}
                    className="absolute z-10 overflow-hidden rounded-xl px-2.5 py-1.5 shadow-sm ring-1 ring-black/5 transition-shadow hover:z-30 hover:shadow-md"
                    style={{
                      top: top + 2,
                      height,
                      left: `calc(${leftPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                      background: color,
                      color: contrastFg(color),
                    }}
                  >
                    <div className="truncate text-[11px] font-semibold tabular-nums opacity-90">
                      {format(block.start, "HH:mm")}
                      –{format(block.end, "HH:mm")}
                    </div>
                    <div className="truncate text-sm font-semibold leading-tight">
                      {block.task.title}
                    </div>
                    {block.task.contextName && height > 48 && (
                      <div className="mt-0.5 truncate text-[10px] opacity-80">
                        {block.task.contextName}
                      </div>
                    )}
                  </article>
                );
              })}

              {dayTimed.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-xs rounded-2xl border border-dashed border-border bg-background/50 px-5 py-6 text-center">
                    <p className="text-sm font-medium text-foreground">
                      Día libre de bloques
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      En Tasks, abre una tarea y guarda día + hora de inicio/fin.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-mantle p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-overlay1">
              Sin hora
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Con fecha hoy, todavía sin horario
            </p>
            <ul className="mt-3 space-y-1.5">
              {dayUnscheduled.length === 0 ? (
                <li className="rounded-xl bg-background/50 px-3 py-4 text-center text-xs text-overlay1">
                  Ninguna
                </li>
              ) : (
                dayUnscheduled.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-2 rounded-xl bg-background/70 px-2.5 py-2 ring-1 ring-border/50"
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: t.contextColor || "#89b4fa" }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {t.title}
                      </div>
                      {t.contextName && (
                        <div className="truncate text-[10px] text-muted">
                          {t.contextName}
                        </div>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-mantle p-3 text-[11px] text-muted leading-relaxed">
            Tip: elige hora en la tarjeta de la tarea (Tasks → expandir → Inicio /
            Fin) para que aparezca en la franja.
          </div>
        </aside>
      </div>
    </div>
  );
}

function TimelineStrip({ tasks }: { tasks: PlanTask[] }) {
  const [origin] = useState(() => startOfDay(new Date()));
  const days = useMemo(
    () => Array.from({ length: TIMELINE_DAYS }, (_, i) => addDays(origin, i)),
    [origin],
  );
  const rows = tasks.filter((t) => t.dueDate || t.scheduledStart);

  function bar(task: PlanTask) {
    let startOffset = 0;
    let span = 1;
    if (task.scheduledStart) {
      const start = parseISO(task.scheduledStart);
      const end = task.scheduledEnd ? parseISO(task.scheduledEnd) : start;
      startOffset = differenceInCalendarDays(start, origin);
      span = Math.max(1, differenceInCalendarDays(end, start) + 1);
    } else if (task.dueDate) {
      startOffset = differenceInCalendarDays(parseISO(task.dueDate), origin);
    }
    if (startOffset < 0) {
      span += startOffset;
      startOffset = 0;
    }
    if (startOffset >= TIMELINE_DAYS || span <= 0) return null;
    return {
      startOffset,
      span: Math.min(span, TIMELINE_DAYS - startOffset),
    };
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-mantle">
      <div className="min-w-[720px]">
        <div
          className="grid border-b border-border text-[10px] text-muted"
          style={{
            gridTemplateColumns: `160px repeat(${TIMELINE_DAYS}, minmax(0, 1fr))`,
          }}
        >
          <div className="px-2 py-2">Tarea</div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className="border-l border-border/60 px-0.5 py-2 text-center"
            >
              <div className="font-medium text-foreground">
                {format(d, "d", { locale: es })}
              </div>
              <div>{format(d, "EEE", { locale: es })}</div>
            </div>
          ))}
        </div>
        {rows.map((task) => {
          const b = bar(task);
          const color = task.contextColor || "#89b4fa";
          const timeLabel = task.scheduledStart
            ? `${timeFromIso(task.scheduledStart)}${
                task.scheduledEnd ? `–${timeFromIso(task.scheduledEnd)}` : ""
              }`
            : null;
          return (
            <div
              key={task.id}
              className="relative grid items-center border-b border-border/40"
              style={{
                gridTemplateColumns: `160px repeat(${TIMELINE_DAYS}, minmax(0, 1fr))`,
                minHeight: 40,
              }}
            >
              <div className="flex items-center gap-2 truncate px-2 py-1">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <div className="min-w-0 truncate text-xs font-medium">
                  {task.title}
                </div>
              </div>
              <div
                className="relative"
                style={{ gridColumn: `2 / span ${TIMELINE_DAYS}` }}
              >
                {b && (
                  <div
                    className="absolute top-1.5 flex h-6 items-center overflow-hidden rounded-md px-1.5 text-[10px] font-medium"
                    style={{
                      left: `${(b.startOffset / TIMELINE_DAYS) * 100}%`,
                      width: `${Math.max((b.span / TIMELINE_DAYS) * 100, 3)}%`,
                      background: color,
                      color: contrastFg(color),
                    }}
                  >
                    <span className="truncate">
                      {timeLabel ? `${timeLabel} ` : ""}
                      {task.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="p-4 text-sm text-muted">No hay tareas con fecha u hora.</p>
        )}
      </div>
    </div>
  );
}

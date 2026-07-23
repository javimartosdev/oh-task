"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  format,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
  differenceInMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn, formatDateKey } from "@/lib/utils";

type Block = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  color: string;
  taskId: string | null;
};

type ScheduledTask = {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  priority: number;
  status: string;
};

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

export function CalendarView({
  blocks,
  scheduledTasks,
  initialDate,
}: {
  blocks: Block[];
  scheduledTasks: ScheduledTask[];
  initialDate?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"day" | "week">("week");
  const [cursor, setCursor] = useState(
    initialDate ? parseISO(initialDate) : startOfDay(new Date()),
  );
  const [title, setTitle] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");

  const days = useMemo(() => {
    if (mode === "day") return [cursor];
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor, mode]);

  const items = useMemo(() => {
    const fromBlocks = blocks.map((b) => ({
      id: b.id,
      title: b.title,
      start: parseISO(b.startAt),
      end: parseISO(b.endAt),
      color: b.color,
      kind: "block" as const,
    }));
    const fromTasks = scheduledTasks
      .filter((t) => t.scheduledStart && t.scheduledEnd)
      .map((t) => ({
        id: t.id,
        title: t.title,
        start: parseISO(t.scheduledStart),
        end: parseISO(t.scheduledEnd),
        color: "#0ea5e9",
        kind: "task" as const,
      }));
    return [...fromBlocks, ...fromTasks];
  }, [blocks, scheduledTasks]);

  function topPct(d: Date) {
    const minutes = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
    const total = (HOUR_END - HOUR_START) * 60;
    return Math.max(0, Math.min(100, (minutes / total) * 100));
  }

  function heightPct(start: Date, end: Date) {
    const mins = Math.max(15, differenceInMinutes(end, start));
    const total = (HOUR_END - HOUR_START) * 60;
    return Math.min(100, (mins / total) * 100);
  }

  async function createBlock(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startLocal || !endLocal) return;
    await fetch("/api/calendar/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        startAt: new Date(startLocal).toISOString(),
        endAt: new Date(endLocal).toISOString(),
      }),
    });
    setTitle("");
    router.refresh();
  }

  async function removeBlock(id: string) {
    await fetch(`/api/calendar/blocks?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function prefillsSlot(day: Date, hour: number) {
    const start = setMinutes(setHours(day, hour), 0);
    const end = setMinutes(setHours(day, hour + 1), 0);
    setStartLocal(format(start, "yyyy-MM-dd'T'HH:mm"));
    setEndLocal(format(end, "yyyy-MM-dd'T'HH:mm"));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Calendario</h1>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCursor(addDays(cursor, mode === "day" ? -1 : -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className="min-w-[140px] text-center text-sm font-medium"
            onClick={() => setCursor(startOfDay(new Date()))}
          >
            {mode === "day"
              ? format(cursor, "d MMM yyyy", { locale: es })
              : `Semana ${format(days[0], "d MMM", { locale: es })}`}
          </button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCursor(addDays(cursor, mode === "day" ? 1 : 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 flex rounded-xl border border-border p-0.5">
            {(["day", "week"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs",
                  mode === m ? "bg-accent text-accent-fg" : "text-muted",
                )}
              >
                {m === "day" ? "Día" : "Semana"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={createBlock}
        className="grid gap-2 rounded-2xl border border-border bg-surface p-3 sm:grid-cols-4"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bloque (reunión, descanso…)"
          className="sm:col-span-2"
        />
        <Input
          type="datetime-local"
          value={startLocal}
          onChange={(e) => setStartLocal(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
          />
          <Button type="submit" size="sm">
            Crear
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <div
          className="grid min-w-[640px]"
          style={{
            gridTemplateColumns: `48px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {days.map((d) => (
            <div
              key={formatDateKey(d)}
              className="border-b border-border px-2 py-2 text-center text-xs font-medium"
            >
              {format(d, "EEE d", { locale: es })}
            </div>
          ))}

          <div className="relative" style={{ height: 0 }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-1 text-[10px] text-muted"
                style={{
                  top: `${((h - HOUR_START) / (HOUR_END - HOUR_START)) * 640}px`,
                }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const key = formatDateKey(day);
            const dayItems = items.filter(
              (it) => formatDateKey(it.start) === key,
            );
            return (
              <div
                key={key}
                className="relative border-l border-border"
                style={{ height: 640 }}
              >
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="absolute left-0 right-0 border-t border-border/50 hover:bg-accent/5"
                    style={{
                      top: `${((h - HOUR_START) / (HOUR_END - HOUR_START)) * 100}%`,
                      height: `${100 / (HOUR_END - HOUR_START)}%`,
                    }}
                    onClick={() => prefillsSlot(day, h)}
                    aria-label={`Slot ${h}`}
                  />
                ))}
                {dayItems.map((it) => (
                  <div
                    key={`${it.kind}-${it.id}`}
                    className="absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-0.5 text-[10px] text-accent-fg shadow-sm"
                    style={{
                      top: `${topPct(it.start)}%`,
                      height: `${heightPct(it.start, it.end)}%`,
                      background: it.color,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="line-clamp-2 font-medium">{it.title}</span>
                      {it.kind === "block" && (
                        <button
                          type="button"
                          onClick={() => removeBlock(it.id)}
                          className="shrink-0 opacity-80 hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

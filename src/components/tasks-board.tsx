"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Circle,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { cn, formatDateKey } from "@/lib/utils";
import { Button, Input } from "@/components/ui";
import { classifyEisenhower, EISENHOWER_LABELS } from "@/lib/eisenhower";
import { MatrixMoveControl } from "@/components/matrix-move-control";
import {
  LIST_COLOR_SWATCHES,
  combineDateAndTime,
  dateFromIso,
  timeFromIso,
} from "@/lib/schedule";
import { addHours } from "date-fns";

type Tag = { id: string; name: string; color: string };
type List = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  isFolder: boolean;
};
type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  status: "todo" | "doing" | "done";
  dueDate: string | null;
  scheduledStart: string | Date | null;
  scheduledEnd: string | Date | null;
  parentTaskId: string | null;
  contextId: string | null;
  contextName: string | null;
  contextColor: string | null;
  completedAt: string | Date | null;
  tags: Tag[];
  recurrence?: string;
};

const PRIORITY_LABELS = ["Ninguna", "Baja", "Media", "Alta"];

export function TasksBoard({
  tasks: initialTasks,
  lists,
  tags,
  view = "list",
}: {
  tasks: TaskRow[];
  lists: List[];
  tags: Tag[];
  view?: "list" | "kanban" | "matrix";
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [listId, setListId] = useState("");
  const [priority, setPriority] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [newListColor, setNewListColor] = useState<string>(LIST_COLOR_SWATCHES[0].hex);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editListId, setEditListId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filterList, setFilterList] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [mode, setMode] = useState<"list" | "kanban" | "matrix">(view);

  const leafLists = lists.filter((l) => !l.isFolder);

  const filtered = useMemo(() => {
    return initialTasks.filter((t) => {
      if (t.parentTaskId) return false;
      if (filterList && t.contextId !== filterList) return false;
      if (filterTag && !t.tags.some((tg) => tg.id === filterTag)) return false;
      if (filterPriority !== "" && t.priority !== Number(filterPriority)) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !(t.notes ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [initialTasks, filterList, filterTag, filterPriority, filterStatus, search]);

  const subtasksOf = (parentId: string) =>
    initialTasks.filter((t) => t.parentTaskId === parentId);

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;
    if (dueDate && dueTime) {
      const start = combineDateAndTime(dueDate, dueTime);
      if (start) {
        scheduledStart = start.toISOString();
        scheduledEnd = addHours(start, 1).toISOString();
      }
    }

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        contextId: listId || null,
        priority,
        dueDate: dueDate || null,
        scheduledStart,
        scheduledEnd,
        tagIds: selectedTagIds,
        parseNatural: true,
      }),
    });
    setTitle("");
    setDueDate("");
    setDueTime("");
    setPriority(0);
    setSelectedTagIds([]);
    router.refresh();
  }

  async function toggleComplete(task: TaskRow) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: task.completedAt ? "reopen" : "complete",
      }),
    });
    router.refresh();
  }

  async function setStatus(id: string, status: "todo" | "doing" | "done") {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }

  async function removeTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addSubtask(parentId: string) {
    if (!subTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: subTitle.trim(), parentTaskId: parentId }),
    });
    setSubTitle("");
    router.refresh();
  }

  async function saveNotes(id: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes }),
    });
    router.refresh();
  }

  async function uploadFile(taskId: string, file: File) {
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("file", file);
    await fetch("/api/attachments", { method: "POST", body: fd });
    router.refresh();
  }

  async function createList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    await fetch("/api/contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newListName.trim(),
        color: newListColor,
      }),
    });
    setNewListName("");
    router.refresh();
  }

  async function updateListColor(listIdToUpdate: string, color: string) {
    await fetch("/api/contexts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: listIdToUpdate, color }),
    });
    router.refresh();
  }

  async function saveSchedule(taskId: string) {
    const start = editDate && editStart
      ? combineDateAndTime(editDate, editStart)
      : null;
    let end =
      editDate && editEnd ? combineDateAndTime(editDate, editEnd) : null;
    if (start && !end) end = addHours(start, 1);
    if (start && end && end <= start) end = addHours(start, 1);

    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: taskId,
        dueDate: editDate || null,
        contextId: editListId || null,
        scheduledStart: start ? start.toISOString() : null,
        scheduledEnd: end ? end.toISOString() : null,
      }),
    });
    router.refresh();
  }

  async function createTag(e: FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    setNewTagName("");
    router.refresh();
  }

  function TaskCard({ task }: { task: TaskRow }) {
    const subs = subtasksOf(task.id);
    const open = expandedId === task.id;
    const quadrant = classifyEisenhower(
      { priority: task.priority, dueDate: task.dueDate },
      formatDateKey(new Date()),
    );
    const qLabel = EISENHOWER_LABELS[quadrant];

    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-surface p-3",
          task.completedAt && "opacity-60",
        )}
        style={
          task.contextColor
            ? {
                borderLeftWidth: 4,
                borderLeftColor: task.contextColor,
              }
            : undefined
        }
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => toggleComplete(task)}
            className="mt-0.5 text-muted hover:text-accent"
          >
            {task.completedAt ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="flex-1 text-left"
            onClick={() => {
              setExpandedId(open ? null : task.id);
              setNotes(task.notes ?? "");
              setEditDate(
                task.dueDate ||
                  dateFromIso(task.scheduledStart) ||
                  formatDateKey(new Date()),
              );
              setEditStart(timeFromIso(task.scheduledStart) || "");
              setEditEnd(timeFromIso(task.scheduledEnd) || "");
              setEditListId(task.contextId ?? "");
            }}
          >
            <div
              className={cn(
                "text-sm font-medium",
                task.completedAt && "line-through text-muted",
              )}
            >
              {task.title}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted">
              {task.contextName && (
                <span
                  className="rounded px-1.5 py-0.5 font-medium"
                  style={{
                    background: `${task.contextColor ?? "#89b4fa"}22`,
                    color: task.contextColor ?? undefined,
                  }}
                >
                  {task.contextName}
                </span>
              )}
              {task.priority > 0 && <span>P{task.priority}</span>}
              {(task.scheduledStart || task.dueDate) && (
                <span>
                  {task.scheduledStart
                    ? `${dateFromIso(task.scheduledStart)} · ${timeFromIso(task.scheduledStart)}${
                        task.scheduledEnd
                          ? `–${timeFromIso(task.scheduledEnd)}`
                          : ""
                      }`
                    : task.dueDate}
                </span>
              )}
              <span
                className={cn(
                  "rounded px-1 py-0.5",
                  quadrant === "do" && "bg-red/15 text-red",
                  quadrant === "schedule" && "bg-yellow/15 text-yellow",
                  quadrant === "delegate" && "bg-blue/15 text-blue",
                  quadrant === "eliminate" && "bg-teal/15 text-teal",
                )}
              >
                {qLabel.title}
              </span>
              {task.tags.map((tg) => (
                <span
                  key={tg.id}
                  className="rounded-full px-1.5 py-0.5"
                  style={{ background: `${tg.color}22`, color: tg.color }}
                >
                  {tg.name}
                </span>
              ))}
            </div>
          </button>
          <MatrixMoveControl
            taskId={task.id}
            priority={task.priority}
            dueDate={task.dueDate}
            onMoved={() => router.refresh()}
          />
          <button
            type="button"
            onClick={() => removeTask(task.id)}
            className="text-muted hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px] text-muted">
                Lista
                <select
                  value={editListId}
                  onChange={(e) => setEditListId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="">Sin lista</option>
                  {leafLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-muted">
                Día
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 h-9"
                />
              </label>
              <label className="block text-[11px] text-muted">
                Inicio
                <Input
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="mt-1 h-9"
                />
              </label>
              <label className="block text-[11px] text-muted">
                Fin
                <Input
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="mt-1 h-9"
                />
              </label>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void saveSchedule(task.id)}>
              Guardar horario (Gantt)
            </Button>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => saveNotes(task.id)}>
                Guardar notas
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover">
                <Paperclip className="h-3.5 w-3.5" />
                Adjunto
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(task.id, f);
                  }}
                />
              </label>
              {(["todo", "doing", "done"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={task.status === s ? "primary" : "ghost"}
                  onClick={() => setStatus(task.id, s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-2 pl-2 text-sm">
                  <button type="button" onClick={() => toggleComplete(s)}>
                    {s.completedAt ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted" />
                    )}
                  </button>
                  <span className={cn(s.completedAt && "line-through text-muted")}>
                    {s.title}
                  </span>
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addSubtask(task.id);
                }}
              >
                <Input
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="Subtarea…"
                  className="h-8"
                />
                <Button size="sm" type="submit">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const todayKey = formatDateKey(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Tareas</h1>
        <div className="flex gap-1 rounded-xl border border-border p-0.5">
          {(["list", "kanban", "matrix"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs capitalize",
                mode === m ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={createTask} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea… (ej. Revisar PR mañana a las 10)"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
          >
            <option value="">Sin lista</option>
            {leafLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
          >
            {PRIORITY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9 w-auto"
          />
          <Input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="h-9 w-auto"
            title="Hora de inicio"
          />
          <Button type="submit" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Añadir
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tg) => {
              const on = selectedTagIds.includes(tg.id);
              return (
                <button
                  key={tg.id}
                  type="button"
                  onClick={() =>
                    setSelectedTagIds((prev) =>
                      on ? prev.filter((id) => id !== tg.id) : [...prev, tg.id],
                    )
                  }
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] border",
                    on ? "border-accent bg-accent/15" : "border-border",
                  )}
                  style={{ color: tg.color }}
                >
                  {tg.name}
                </button>
              );
            })}
          </div>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="h-9 max-w-xs"
        />
        <select
          value={filterList}
          onChange={(e) => setFilterList(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
        >
          <option value="">Todas las listas</option>
          {leafLists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
        >
          <option value="">Todas las etiquetas</option>
          {tags.map((tg) => (
            <option key={tg.id} value={tg.id}>
              {tg.name}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
        >
          <option value="">Cualquier prioridad</option>
          {[1, 2, 3].map((p) => (
            <option key={p} value={p}>
              P{p}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
        >
          <option value="">Cualquier estado</option>
          <option value="todo">todo</option>
          <option value="doing">doing</option>
          <option value="done">done</option>
        </select>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-surface p-3">
        <form onSubmit={createList} className="flex flex-wrap items-center gap-2">
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nueva lista…"
            className="h-9 min-w-[140px] flex-1"
          />
          <div className="flex flex-wrap gap-1">
            {LIST_COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.id}
                type="button"
                title={sw.label}
                onClick={() => setNewListColor(sw.hex)}
                className={cn(
                  "h-6 w-6 rounded-full ring-2 ring-offset-1 ring-offset-surface",
                  newListColor === sw.hex ? "ring-foreground" : "ring-transparent",
                )}
                style={{ background: sw.hex }}
              />
            ))}
          </div>
          <Button size="sm" type="submit" variant="secondary">
            Lista
          </Button>
        </form>
        {leafLists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {leafLists.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: l.color }}
                />
                <span className="text-xs">{l.name}</span>
                <select
                  aria-label={`Color de ${l.name}`}
                  value={l.color}
                  onChange={(e) => void updateListColor(l.id, e.target.value)}
                  className="h-6 max-w-[7rem] rounded border-0 bg-transparent text-[10px] text-muted"
                >
                  {LIST_COLOR_SWATCHES.map((sw) => (
                    <option key={sw.id} value={sw.hex}>
                      {sw.label}
                    </option>
                  ))}
                  {!LIST_COLOR_SWATCHES.some((s) => s.hex === l.color) && (
                    <option value={l.color}>Actual</option>
                  )}
                </select>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={createTag} className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nueva etiqueta…"
            className="h-9"
          />
          <Button size="sm" type="submit" variant="secondary">
            Tag
          </Button>
        </form>
      </div>

      {mode === "list" && (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted">No hay tareas con estos filtros.</p>
          )}
        </div>
      )}

      {mode === "kanban" && (
        <div className="grid gap-3 md:grid-cols-3">
          {(["todo", "doing", "done"] as const).map((col) => (
            <div key={col} className="rounded-2xl border border-border bg-surface/50 p-2">
              <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {col}
              </div>
              <div className="space-y-2">
                {filtered
                  .filter((t) =>
                    col === "done" ? t.status === "done" || t.completedAt : t.status === col,
                  )
                  .map((t) => (
                    <div
                      key={t.id}
                      className="cursor-pointer rounded-xl border border-border bg-surface p-2 text-sm"
                      onClick={() => setStatus(t.id, col === "done" ? "todo" : col === "todo" ? "doing" : "done")}
                    >
                      {t.title}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === "matrix" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["do", "schedule", "delegate", "eliminate"] as const).map((q) => (
            <div
              key={q}
              className={cn(
                "rounded-xl border border-border border-l-4 bg-mantle p-3",
                q === "do" && "border-l-red",
                q === "schedule" && "border-l-yellow",
                q === "delegate" && "border-l-blue",
                q === "eliminate" && "border-l-teal",
              )}
            >
              <div
                className={cn(
                  "mb-2 text-sm font-semibold",
                  q === "do" && "text-red",
                  q === "schedule" && "text-yellow",
                  q === "delegate" && "text-blue",
                  q === "eliminate" && "text-teal",
                )}
              >
                {EISENHOWER_LABELS[q].title}
                <span className="ml-2 text-[11px] font-normal text-muted">
                  {EISENHOWER_LABELS[q].hint}
                </span>
              </div>
              <div className="space-y-2">
                {filtered
                  .filter(
                    (t) =>
                      classifyEisenhower(
                        { priority: t.priority, dueDate: t.dueDate },
                        todayKey,
                      ) === q,
                  )
                  .map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

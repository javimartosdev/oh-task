"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Circle,
  Folder,
  FolderPlus,
  Inbox,
  Plus,
  Trash2,
} from "lucide-react";
import {
  addDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatDateKey } from "@/lib/utils";
import { Button, Input } from "@/components/ui";
import { findInboxId, isInboxList } from "@/lib/lists";
import { LIST_COLOR_SWATCHES } from "@/lib/schedule";

export type SmartList = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  isFolder: boolean;
  icon?: string;
};

export type SmartTask = {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  dueDate: string | null;
  scheduledStart: string | null;
  contextId: string | null;
  contextName: string | null;
  contextColor: string | null;
  completedAt: string | Date | null;
  parentTaskId: string | null;
};

export type SmartView = "inbox" | "today" | "upcoming" | "list";

const PRIORITY = ["", "!", "!!", "!!!"];

export function SmartTasksView({
  view,
  tasks: initialTasks,
  lists,
  listId,
  title,
  subtitle,
}: {
  view: SmartView;
  tasks: SmartTask[];
  lists: SmartList[];
  listId?: string | null;
  title: string;
  subtitle: string;
}) {
  const router = useRouter();
  const inboxId = findInboxId(lists);
  const leafLists = lists.filter((l) => !l.isFolder);
  const folders = lists.filter((l) => l.isFolder);

  const [draft, setDraft] = useState("");
  const [destListId, setDestListId] = useState(
    () =>
      (view === "list" && listId) ||
      (view === "inbox" ? inboxId ?? "" : inboxId ?? "") ||
      "",
  );
  const [moveOpenId, setMoveOpenId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newListParent, setNewListParent] = useState("");
  const [newListColor, setNewListColor] = useState<string>(LIST_COLOR_SWATCHES[0].hex);
  const [dragOverList, setDragOverList] = useState<string | null>(null);

  const todayKey = formatDateKey(new Date());

  const visible = useMemo(() => {
    const roots = initialTasks.filter((t) => !t.parentTaskId && !t.completedAt);
    if (view === "inbox") {
      return roots.filter(
        (t) =>
          !t.contextId ||
          t.contextId === inboxId ||
          (t.contextName && isInboxList({ name: t.contextName })),
      );
    }
    if (view === "today") {
      return roots
        .filter((t) => {
          if (t.dueDate && t.dueDate <= todayKey) return true;
          if (t.scheduledStart) {
            const d = formatDateKey(parseISO(t.scheduledStart));
            return d <= todayKey;
          }
          return false;
        })
        .sort((a, b) => {
          const aT = a.scheduledStart ? parseISO(a.scheduledStart).getTime() : 0;
          const bT = b.scheduledStart ? parseISO(b.scheduledStart).getTime() : 0;
          if (aT !== bT) return aT - bT;
          return b.priority - a.priority;
        });
    }
    if (view === "upcoming") {
      return roots
        .filter((t) => t.dueDate || t.scheduledStart)
        .sort((a, b) => {
          const aKey =
            a.dueDate ??
            (a.scheduledStart ? formatDateKey(parseISO(a.scheduledStart)) : "9999");
          const bKey =
            b.dueDate ??
            (b.scheduledStart ? formatDateKey(parseISO(b.scheduledStart)) : "9999");
          return aKey.localeCompare(bKey) || b.priority - a.priority;
        });
    }
    if (view === "list" && listId) {
      return roots.filter((t) => t.contextId === listId);
    }
    return roots;
  }, [initialTasks, view, listId, inboxId, todayKey]);

  const upcomingGroups = useMemo(() => {
    if (view !== "upcoming") return [];
    const end = addDays(startOfDay(new Date()), 14);
    const groups: { key: string; label: string; items: SmartTask[] }[] = [];
    const byDay = new Map<string, SmartTask[]>();
    const undated: SmartTask[] = [];

    for (const t of visible) {
      const key =
        t.dueDate ??
        (t.scheduledStart ? formatDateKey(parseISO(t.scheduledStart)) : null);
      if (!key) {
        undated.push(t);
        continue;
      }
      const bucket = key > formatDateKey(end) ? "_later" : key;
      if (!byDay.has(bucket)) byDay.set(bucket, []);
      byDay.get(bucket)!.push(t);
    }

    const keys = [...byDay.keys()].sort();
    for (const key of keys) {
      if (key === "_later") {
        groups.push({ key, label: "Más adelante", items: byDay.get(key)! });
      } else {
        const d = parseISO(key);
        const label =
          key === todayKey
            ? "Hoy"
            : key === formatDateKey(addDays(new Date(), 1))
              ? "Mañana"
              : format(d, "EEEE d MMM", { locale: es });
        groups.push({ key, label, items: byDay.get(key)! });
      }
    }
    if (undated.length) {
      groups.push({ key: "_none", label: "Sin fecha", items: undated });
    }
    return groups;
  }, [view, visible, todayKey]);

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const contextId =
      view === "list" && listId
        ? listId
        : destListId || inboxId || null;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.trim(),
        contextId,
        parseNatural: true,
      }),
    });
    setDraft("");
    router.refresh();
  }

  async function toggle(task: SmartTask) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: task.completedAt ? "reopen" : "complete",
      }),
    });
    router.refresh();
  }

  async function moveTask(taskId: string, contextId: string | null) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, contextId }),
    });
    setMoveOpenId(null);
    router.refresh();
  }

  async function removeTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function createFolder(e: FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await fetch("/api/contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newFolderName.trim(),
        isFolder: true,
        icon: "folder",
        color: "#6c7086",
      }),
    });
    setNewFolderName("");
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
        isFolder: false,
        parentId: newListParent || null,
        color: newListColor,
      }),
    });
    setNewListName("");
    router.refresh();
  }

  async function deleteList(id: string) {
    const list = lists.find((l) => l.id === id);
    if (list && isInboxList(list)) return;
    await fetch(`/api/contexts?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/task-id", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropOnList(e: React.DragEvent, targetListId: string | null) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/task-id");
    setDragOverList(null);
    if (taskId) void moveTask(taskId, targetListId);
  }

  const moveTargets = [
    { id: inboxId, label: "Inbox", color: "#89b4fa" },
    ...leafLists
      .filter((l) => !isInboxList(l))
      .map((l) => ({ id: l.id, label: l.name, color: l.color })),
  ];

  function renderTask(task: SmartTask) {
    const overdue =
      task.dueDate && task.dueDate < todayKey && !task.completedAt;
    return (
      <li
        key={task.id}
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        className="group relative flex items-start gap-2 rounded-xl border border-transparent bg-mantle/80 px-2.5 py-2 hover:border-border/80"
      >
        <button
          type="button"
          onClick={() => toggle(task)}
          className="mt-0.5 shrink-0 text-overlay1 hover:text-accent"
          aria-label="Completar"
        >
          {task.completedAt ? (
            <Check className="h-5 w-5 text-green" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {task.priority > 0 && (
              <span className="text-[10px] font-bold text-peach">
                {PRIORITY[task.priority]}
              </span>
            )}
            <span className="text-sm font-medium leading-snug">{task.title}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
            {task.dueDate && (
              <span className={cn(overdue && "text-red")}>
                {task.dueDate === todayKey
                  ? "Hoy"
                  : format(parseISO(task.dueDate), "d MMM", { locale: es })}
              </span>
            )}
            {task.scheduledStart && (
              <span>
                {format(parseISO(task.scheduledStart), "HH:mm")}
              </span>
            )}
            {task.contextName && view !== "list" && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: task.contextColor ?? "#89b4fa" }}
                />
                {task.contextName}
              </span>
            )}
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() =>
              setMoveOpenId(moveOpenId === task.id ? null : task.id)
            }
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface hover:text-foreground"
          >
            Mover
          </button>
          <button
            type="button"
            onClick={() => removeTask(task.id)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-red"
            aria-label="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {moveOpenId === task.id && (
            <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-border bg-mantle p-1 shadow-lg">
              {moveTargets.map((t) => (
                <button
                  key={t.id ?? "inbox"}
                  type="button"
                  onClick={() => moveTask(task.id, t.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-surface"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: t.color }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </li>
    );
  }

  const listsPanel = (
    <aside className="space-y-3 rounded-2xl border border-border bg-mantle p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-overlay1">
          Listas
        </h2>
        <button
          type="button"
          className="lg:hidden rounded-lg p-1 text-muted"
          onClick={() => setSidebarOpen(false)}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <ul className="space-y-0.5">
        <li>
          <Link
            href="/inbox"
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
              view === "inbox"
                ? "bg-accent/15 text-accent font-medium"
                : "hover:bg-surface",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverList("inbox");
            }}
            onDragLeave={() => setDragOverList(null)}
            onDrop={(e) => onDropOnList(e, inboxId)}
          >
            <Inbox className="h-3.5 w-3.5" />
            Inbox
            {dragOverList === "inbox" && (
              <span className="ml-auto text-[10px] text-accent">soltar</span>
            )}
          </Link>
        </li>
        {folders.map((folder) => (
          <li key={folder.id} className="pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-overlay1">
              <Folder className="h-3.5 w-3.5" />
              {folder.name}
              <button
                type="button"
                className="ml-auto text-muted hover:text-red"
                onClick={() => deleteList(folder.id)}
                aria-label="Borrar carpeta"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <ul className="ml-2 space-y-0.5 border-l border-border/60 pl-2">
              {leafLists
                .filter((l) => l.parentId === folder.id)
                .map((list) => (
                  <ListLink
                    key={list.id}
                    list={list}
                    active={view === "list" && listId === list.id}
                    dragOver={dragOverList === list.id}
                    onDragOver={() => setDragOverList(list.id)}
                    onDragLeave={() => setDragOverList(null)}
                    onDrop={(e) => onDropOnList(e, list.id)}
                    onDelete={() => deleteList(list.id)}
                  />
                ))}
            </ul>
          </li>
        ))}
        {leafLists
          .filter((l) => !l.parentId && !isInboxList(l))
          .map((list) => (
            <ListLink
              key={list.id}
              list={list}
              active={view === "list" && listId === list.id}
              dragOver={dragOverList === list.id}
              onDragOver={() => setDragOverList(list.id)}
              onDragLeave={() => setDragOverList(null)}
              onDrop={(e) => onDropOnList(e, list.id)}
              onDelete={() => deleteList(list.id)}
            />
          ))}
      </ul>

      <form onSubmit={createFolder} className="flex gap-1 pt-2">
        <Input
          placeholder="Nueva carpeta"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="secondary" aria-label="Crear carpeta">
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </form>

      <form onSubmit={createList} className="space-y-1.5">
        <Input
          placeholder="Nueva lista"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          className="h-8 text-xs"
        />
        <select
          value={newListParent}
          onChange={(e) => setNewListParent(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="">Sin carpeta</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {LIST_COLOR_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              onClick={() => setNewListColor(s.hex)}
              className={cn(
                "h-5 w-5 rounded-full ring-offset-1 ring-offset-mantle",
                newListColor === s.hex && "ring-2 ring-accent",
              )}
              style={{ background: s.hex }}
              aria-label={s.label}
            />
          ))}
        </div>
        <Button type="submit" size="sm" className="w-full">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Crear lista
        </Button>
      </form>
    </aside>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
          >
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-border bg-mantle px-3 py-1.5 text-xs font-medium lg:hidden"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          Listas
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className={cn("lg:block", sidebarOpen ? "block" : "hidden")}>
          {listsPanel}
        </div>

        <div className="space-y-3">
          <form
            onSubmit={createTask}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-mantle p-3 sm:flex-row sm:items-center"
          >
            <Input
              placeholder="Captura rápida… (ej. Comprar leche mañana a las 10)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1"
              autoFocus={view === "inbox"}
            />
            {view !== "list" && (
              <select
                value={destListId}
                onChange={(e) => setDestListId(e.target.value)}
                className="rounded-xl border border-border bg-background px-2 py-2 text-xs"
              >
                {leafLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
            <Button type="submit" size="sm">
              Añadir
            </Button>
          </form>

          {view === "upcoming" ? (
            <div className="space-y-4">
              {upcomingGroups.length === 0 ? (
                <EmptyState text="Nada próximo. Añade fechas a tus tareas." />
              ) : (
                upcomingGroups.map((g) => (
                  <section key={g.key} className="space-y-1.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-overlay1">
                      {g.label}
                    </h2>
                    <ul className="space-y-1">{g.items.map(renderTask)}</ul>
                  </section>
                ))
              )}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              text={
                view === "inbox"
                  ? "Inbox vacío. Captura lo que se te ocurra."
                  : view === "today"
                    ? "Nada para hoy. Buen momento para planificar."
                    : "Esta lista está vacía."
              }
            />
          ) : (
            <ul className="space-y-1">{visible.map(renderTask)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ListLink({
  list,
  active,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDelete,
}: {
  list: SmartList;
  active: boolean;
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDelete: () => void;
}) {
  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg",
          active && "bg-accent/15",
          dragOver && "ring-1 ring-accent",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Link
          href={`/lists/${list.id}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm",
            active ? "font-medium text-accent" : "hover:text-foreground",
          )}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: list.color }}
          />
          <span className="truncate">{list.name}</span>
          {dragOver && (
            <span className="ml-auto text-[10px] text-accent">soltar</span>
          )}
        </Link>
        {!isInboxList(list) && (
          <button
            type="button"
            onClick={onDelete}
            className="mr-1 rounded p-1 text-muted hover:text-red"
            aria-label="Borrar lista"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-mantle/50 px-5 py-10 text-center text-sm text-muted">
      {text}
    </div>
  );
}

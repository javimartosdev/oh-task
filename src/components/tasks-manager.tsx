"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";

interface Context {
  id: string;
  name: string;
  color: string;
}

interface TaskRow {
  id: string;
  title: string;
  priority: number;
  dueDate: string | null;
  contextId: string | null;
  contextName: string | null;
  contextColor: string | null;
}

export function TasksManager({
  initialTasks,
  contexts,
}: {
  initialTasks: TaskRow[];
  contexts: Context[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [contextId, setContextId] = useState<string>("");
  const [tasks, setTasks] = useState(initialTasks);

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        contextId: contextId || null,
      }),
    });

    if (res.ok) {
      setTitle("");
      router.refresh();
    }
  }

  async function completeTask(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    setTasks((t) => t.filter((x) => x.id !== id));
    router.refresh();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-muted">Todo lo que tienes pendiente</p>
      </header>

      <Card className="p-4">
        <form onSubmit={addTask} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nueva tarea…"
            className="flex-1"
          />
          <select
            value={contextId}
            onChange={(e) => setContextId(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
          >
            <option value="">Sin contexto</option>
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Añadir
          </Button>
        </form>
      </Card>

      <ul className="space-y-2">
        {tasks.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">
            No hay tareas pendientes
          </Card>
        )}
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3"
          >
            <button
              onClick={() => completeTask(task.id)}
              className="h-5 w-5 shrink-0 rounded-md border border-border hover:border-success hover:bg-success/10"
            />
            <span className="flex-1 text-sm">{task.title}</span>
            {task.contextName && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${task.contextColor}20`,
                  color: task.contextColor ?? undefined,
                }}
              >
                {task.contextName}
              </span>
            )}
            <button
              onClick={() => deleteTask(task.id)}
              className="text-muted hover:text-danger p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

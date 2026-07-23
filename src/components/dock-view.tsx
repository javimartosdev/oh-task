"use client";

import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ContextFilter } from "@/components/context-filter";

interface HabitToday {
  id: string;
  name: string;
  color: string;
  completedToday: boolean;
}

interface DockTask {
  id: string;
  title: string;
  contextName: string | null;
  contextColor: string | null;
  priority: number;
}

interface Context {
  id: string;
  name: string;
  color: string;
}

export function DockView({
  habits,
  tasks,
  contexts,
  selectedContextId,
}: {
  habits: HabitToday[];
  tasks: DockTask[];
  contexts: Context[];
  selectedContextId: string | null;
}) {
  const router = useRouter();

  async function toggleHabit(habitId: string, completed: boolean) {
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    router.refresh();
  }

  async function completeTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    router.refresh();
  }

  const doneCount = habits.filter((h) => h.completedToday).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Dock</h1>
        <p className="mt-1 text-muted">
          Tu espacio de enfoque para hoy
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-medium">Hábitos de hoy</h2>
            <p className="text-sm text-muted">
              {doneCount}/{habits.length} completados
            </p>
          </div>
        </div>

        {habits.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            No hay hábitos activos hoy.{" "}
            <a href="/habits" className="text-accent hover:underline">
              Crear hábitos
            </a>
          </Card>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {habits.map((habit) => (
              <li key={habit.id}>
                <button
                  onClick={() => toggleHabit(habit.id, habit.completedToday)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                    habit.completedToday
                      ? "border-success/30 bg-success/10"
                      : "border-border bg-surface-elevated hover:border-border/80 hover:bg-surface-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      habit.completedToday
                        ? "border-success/40 bg-success/20 text-success"
                        : "border-border text-muted",
                    )}
                  >
                    {habit.completedToday ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </span>
                  <span className="font-medium">{habit.name}</span>
                  <span
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Tasks</h2>
            <p className="text-sm text-muted">Pendientes para hoy</p>
          </div>
          <ContextFilter
            contexts={contexts}
            selectedId={selectedContextId}
          />
        </div>

        {tasks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            Nada pendiente. Buen trabajo.
          </Card>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3">
                  <button
                    onClick={() => completeTask(task.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:border-success/40 hover:text-success transition-colors"
                    aria-label="Completar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-sm font-medium">{task.title}</span>
                  {task.contextName && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: `${task.contextColor ?? "#6366f1"}20`,
                        color: task.contextColor ?? "#6366f1",
                      }}
                    >
                      {task.contextName}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

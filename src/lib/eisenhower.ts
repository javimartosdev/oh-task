import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { formatDateKey } from "@/lib/utils";

export type EisenhowerQuadrant = "do" | "schedule" | "delegate" | "eliminate";

export const EISENHOWER_QUADRANTS: EisenhowerQuadrant[] = [
  "do",
  "schedule",
  "delegate",
  "eliminate",
];

/** priority >= 2 = important; due within 2 days or overdue = urgent */
export function classifyEisenhower(
  task: { priority: number; dueDate: string | null },
  todayKey: string,
): EisenhowerQuadrant {
  const important = task.priority >= 2;
  let urgent = false;
  if (task.dueDate) {
    const days = differenceInCalendarDays(
      parseISO(task.dueDate),
      parseISO(todayKey),
    );
    urgent = days <= 2;
  }

  if (urgent && important) return "do";
  if (!urgent && important) return "schedule";
  if (urgent && !important) return "delegate";
  return "eliminate";
}

/** Values that make classifyEisenhower land in the chosen quadrant. */
export function fieldsForQuadrant(
  quadrant: EisenhowerQuadrant,
  now: Date = new Date(),
): { priority: number; dueDate: string | null } {
  const today = formatDateKey(now);
  const later = formatDateKey(addDays(now, 7));

  switch (quadrant) {
    case "do":
      return { priority: 3, dueDate: today };
    case "schedule":
      return { priority: 2, dueDate: later };
    case "delegate":
      return { priority: 0, dueDate: today };
    case "eliminate":
      return { priority: 0, dueDate: null };
  }
}

export const EISENHOWER_LABELS: Record<
  EisenhowerQuadrant,
  { title: string; hint: string; tone: "red" | "yellow" | "blue" | "teal" }
> = {
  do: {
    title: "Ahora",
    hint: "Urgente e importante",
    tone: "red",
  },
  schedule: {
    title: "Agenda",
    hint: "Importante, sin prisa",
    tone: "yellow",
  },
  delegate: {
    title: "Rápido",
    hint: "Urgente, poco peso",
    tone: "blue",
  },
  eliminate: {
    title: "Luego",
    hint: "Ni urgente ni clave",
    tone: "teal",
  },
};

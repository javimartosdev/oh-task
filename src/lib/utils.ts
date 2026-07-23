import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Picker order Mon→Sun; `dow` matches JS Date.getDay() (0=Sun … 6=Sat). */
export const WEEKDAY_PICKER = [
  { dow: 1, label: "L", name: "Lunes" },
  { dow: 2, label: "M", name: "Martes" },
  { dow: 3, label: "X", name: "Miércoles" },
  { dow: 4, label: "J", name: "Jueves" },
  { dow: 5, label: "V", name: "Viernes" },
  { dow: 6, label: "S", name: "Sábado" },
  { dow: 0, label: "D", name: "Domingo" },
] as const;

/** 0=Sun … 6=Sat — todos los días de la semana */
export const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

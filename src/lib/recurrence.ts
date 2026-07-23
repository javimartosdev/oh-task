import { addDays, addMonths, addWeeks } from "date-fns";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export function nextOccurrence(
  from: Date,
  recurrence: Recurrence,
): Date | null {
  switch (recurrence) {
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addWeeks(from, 1);
    case "monthly":
      return addMonths(from, 1);
    default:
      return null;
  }
}

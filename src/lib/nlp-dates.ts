import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  format,
  nextDay,
  setHours,
  setMinutes,
  startOfDay,
  type Day,
} from "date-fns";

export type ParsedNaturalDate = {
  cleanTitle: string;
  dueDate?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
};

const DOW_ES: Record<string, Day> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

const DOW_EN: Record<string, Day> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function atTime(base: Date, hours: number, minutes = 0): Date {
  return setMinutes(setHours(base, hours), minutes);
}

function parseTimeFragment(
  text: string,
): { hours: number; minutes: number; matched: string } | null {
  const m24 = text.match(/\b(?:a\s+las?\s+|at\s+)?(\d{1,2})(?::(\d{2}))?\s*(h|hrs?)?\b/i);
  const m12 = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (m12) {
    let h = Number(m12[1]);
    const min = m12[2] ? Number(m12[2]) : 0;
    const ap = m12[3].toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { hours: h, minutes: min, matched: m12[0] };
  }

  if (m24) {
    const h = Number(m24[1]);
    const min = m24[2] ? Number(m24[2]) : 0;
    if (h >= 0 && h <= 23) {
      return { hours: h, minutes: min, matched: m24[0] };
    }
  }

  return null;
}

/** Extract date/time phrases from a task title (ES/EN). */
export function parseNaturalDate(
  input: string,
  now: Date = new Date(),
): ParsedNaturalDate | null {
  let text = input.trim();
  if (!text) return null;

  let due: Date | null = null;
  let hasTime = false;
  let hours = 9;
  let minutes = 0;
  const remove: string[] = [];

  const lower = text.toLowerCase();

  const inHours = lower.match(/\ben\s+(\d+)\s+horas?\b/);
  const inHoursEn = lower.match(/\bin\s+(\d+)\s+hours?\b/);
  if (inHours || inHoursEn) {
    const n = Number((inHours ?? inHoursEn)![1]);
    const start = addHours(now, n);
    remove.push((inHours ?? inHoursEn)![0]);
    const cleanTitle = stripPhrases(text, remove).trim() || text;
    return {
      cleanTitle,
      dueDate: format(start, "yyyy-MM-dd"),
      scheduledStart: start,
      scheduledEnd: addHours(start, 1),
    };
  }

  if (/\bhoy\b|\btoday\b/.test(lower)) {
    due = startOfDay(now);
    remove.push(...(lower.match(/\bhoy\b|\btoday\b/) ?? []));
  } else if (/\bmañana\b|\btomorrow\b/.test(lower)) {
    due = startOfDay(addDays(now, 1));
    remove.push(...(lower.match(/\bmañana\b|\btomorrow\b/) ?? []));
  } else if (/\bpasado\s+mañana\b/.test(lower)) {
    due = startOfDay(addDays(now, 2));
    remove.push("pasado mañana");
  }

  if (!due) {
    for (const [name, dow] of Object.entries({ ...DOW_ES, ...DOW_EN })) {
      const re = new RegExp(`\\b${name}\\b`, "i");
      if (re.test(lower)) {
        due = startOfDay(nextDay(now, dow));
        remove.push(name);
        break;
      }
    }
  }

  if (!due) {
    const dmy = lower.match(/\bel\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]) - 1;
      let year = dmy[3] ? Number(dmy[3]) : now.getFullYear();
      if (year < 100) year += 2000;
      due = startOfDay(new Date(year, month, day));
      remove.push(dmy[0]);
    }
  }

  if (!due) {
    const iso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) {
      const [y, m, d] = iso[1].split("-").map(Number);
      due = startOfDay(new Date(y, m - 1, d));
      remove.push(iso[1]);
    }
  }

  const time = parseTimeFragment(lower);
  if (time) {
    hasTime = true;
    hours = time.hours;
    minutes = time.minutes;
    remove.push(time.matched);
    if (!due) due = startOfDay(now);
  }

  if (!due) return null;

  const cleanTitle = stripPhrases(text, remove).trim() || text;
  const dueDate = format(due, "yyyy-MM-dd");

  if (hasTime) {
    const scheduledStart = atTime(due, hours, minutes);
    return {
      cleanTitle,
      dueDate,
      scheduledStart,
      scheduledEnd: addHours(scheduledStart, 1),
    };
  }

  return { cleanTitle, dueDate };
}

function stripPhrases(text: string, phrases: string[]): string {
  let out = text;
  for (const p of phrases) {
    out = out.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

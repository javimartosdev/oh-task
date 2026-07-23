"use client";

import { useMemo } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, isAfter, startOfMonth } from "date-fns";
import { cn, DAY_LABELS } from "@/lib/utils";
import {
  buildGlobalMonthCalendar,
  monthLabel,
  type GlobalDayStatus,
  type HabitWithSchedule,
  type WeekStatus,
} from "@/lib/habits";
import { Button } from "@/components/ui";

const WEEK_ROW: Record<WeekStatus, string> = {
  default: "",
  in_progress: "",
  perfect: "calendar-week-perfect",
};

function CrossOff({ animate }: { animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className="pointer-events-none absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)]"
      aria-hidden
    >
      <line
        x1="6"
        y1="6"
        x2="34"
        y2="34"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animate ? "cross-line animate-cross-off" : "opacity-80"}
      />
    </svg>
  );
}

function DayCellView({
  dayNum,
  date,
  status,
  inMonth,
  isToday,
  isFuture,
  isSelected,
  animateCross,
  onSelect,
}: {
  dayNum: string;
  date: string;
  status: GlobalDayStatus;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isSelected?: boolean;
  animateCross?: boolean;
  onSelect?: (date: string) => void;
}) {
  const showCross =
    status === "optimal" || status === "recovered" || animateCross;

  const clickable = inMonth && !isFuture && onSelect;

  const className = cn(
    "calendar-day relative flex aspect-square items-center justify-center rounded-md text-sm transition-all duration-300",
    !inMonth && "opacity-25",
    status === "inactive" && inMonth && "calendar-day-inactive",
    status === "pending" && inMonth && "calendar-day-pending",
    status === "partial" && inMonth && "calendar-day-partial",
    status === "optimal" && inMonth && "calendar-day-optimal",
    status === "recovered" && inMonth && "calendar-day-recovered",
    status === "missed" && inMonth && "calendar-day-missed",
    isToday && "calendar-day-today",
    isSelected && "calendar-day-selected",
    animateCross && "animate-day-pop",
    clickable && "cursor-pointer hover:brightness-95 active:scale-95",
  );

  const inner = (
    <>
      <span
        className={cn(
          "relative z-10 tabular-nums",
          showCross && "text-[#3d3a36]/70",
        )}
      >
        {dayNum}
      </span>
      {showCross && <CrossOff animate={!!animateCross} />}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onSelect(date)}
        className={className}
        aria-label={`Editar hábitos del ${date}`}
        aria-pressed={isSelected}
      >
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function GlobalCalendar({
  month,
  onMonthChange,
  habits,
  logsByHabit,
  celebrateDate,
  celebrateWeek,
  selectedDate,
  onDaySelect,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  habits: HabitWithSchedule[];
  logsByHabit: Record<string, { logDate: string; completed: boolean }[]>;
  celebrateDate?: string | null;
  celebrateWeek?: string | null;
  selectedDate?: string | null;
  onDaySelect?: (date: string) => void;
}) {
  const logsMap = useMemo(() => {
    const m = new Map<string, { logDate: string; completed: boolean }[]>();
    for (const [id, logs] of Object.entries(logsByHabit)) {
      m.set(id, logs);
    }
    return m;
  }, [logsByHabit]);

  const calendar = useMemo(
    () => buildGlobalMonthCalendar(month, habits, logsMap),
    [month, habits, logsMap],
  );

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const canGoForward = !isAfter(startOfMonth(addMonths(month, 1)), currentMonthStart);

  return (
    <div className="calendar-paper rounded-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="calendar-title text-lg font-semibold capitalize tracking-tight">
            {monthLabel(month)}
          </h2>
          <p className="calendar-subtitle mt-0.5 text-xs">
            {calendar.monthSummary.optimalDays} días óptimos
            {calendar.monthSummary.perfectWeeks > 0 &&
              ` · ${calendar.monthSummary.perfectWeeks} semana${calendar.monthSummary.perfectWeeks > 1 ? "s" : ""} perfecta${calendar.monthSummary.perfectWeeks > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="calendar-nav-btn"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMonthChange(addMonths(month, 1))}
            disabled={!canGoForward}
            className="calendar-nav-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="calendar-weekday text-center text-[10px] font-semibold uppercase tracking-widest"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {calendar.weeks.map((week) => (
          <div
            key={week.weekKey}
            className={cn(
              "relative grid grid-cols-7 gap-1 rounded-lg p-0.5 pr-5 transition-colors duration-500",
              WEEK_ROW[week.status],
              celebrateWeek === week.weekKey && "animate-week-perfect",
            )}
          >
            {week.status === "perfect" && (
              <span
                className="calendar-week-perfect-badge"
                title="Semana perfecta"
                aria-label="Semana perfecta"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            {week.days.map((cell) => {
              const dayNum = cell.date.split("-")[2].replace(/^0/, "");
              return (
                <DayCellView
                  key={cell.date}
                  dayNum={dayNum}
                  date={cell.date}
                  status={cell.status}
                  inMonth={cell.inMonth}
                  isToday={cell.isToday}
                  isFuture={cell.isFuture}
                  isSelected={selectedDate === cell.date}
                  onSelect={onDaySelect}
                  animateCross={
                    celebrateDate === cell.date && cell.status === "optimal"
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-[11px] calendar-subtitle">
        <LegendDot className="calendar-day-optimal border" label="Día óptimo" />
        <LegendDot className="calendar-week-perfect border" label="Semana perfecta" />
        <LegendDot className="calendar-day-missed border" label="Fallado" />
      </div>
    </div>
  );
}

function LegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", className)} />
      {label}
    </span>
  );
}

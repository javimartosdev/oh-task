import type { DayCell, DayStatus } from "@/lib/habits";
import { cn, DAY_LABELS } from "@/lib/utils";
import { isInCurrentMonth } from "@/lib/habits";

const STATUS_STYLES: Record<DayStatus, string> = {
  inactive: "bg-transparent text-muted/20 border-transparent",
  pending: "border-border/60 text-muted/50 bg-surface",
  done: "bg-success/20 text-success border-success/40 font-semibold",
  recovered: "bg-success/10 text-success/70 border-success/25 line-through decoration-success/50",
  missed: "bg-danger/10 text-danger/60 border-danger/20 line-through decoration-danger/40",
  week_success: "bg-accent/25 text-accent border-accent/40 font-semibold",
  week_partial: "bg-warning/10 text-warning/70 border-warning/25",
};

function statusLabel(status: DayStatus): string {
  switch (status) {
    case "done":
      return "✓";
    case "recovered":
      return "✓";
    case "week_success":
      return "★";
    case "missed":
      return "·";
    case "week_partial":
      return "○";
    default:
      return "";
  }
}

export function HabitCalendar({
  month,
  cells,
  habitColor,
}: {
  month: Date;
  cells: DayCell[];
  habitColor: string;
}) {
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-medium uppercase tracking-wider text-muted/50 py-1"
          >
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell) => {
            const inMonth = isInCurrentMonth(cell.date, month);
            const dayNum = cell.date.split("-")[2].replace(/^0/, "");
            return (
              <div
                key={cell.date}
                title={`${cell.date} — ${cell.status}`}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-lg border text-[11px] transition-colors",
                  STATUS_STYLES[cell.status],
                  !inMonth && "opacity-30",
                  cell.isToday && "ring-2 ring-offset-1 ring-offset-surface-elevated",
                )}
                style={
                  cell.isToday
                    ? ({ "--tw-ring-color": habitColor } as React.CSSProperties)
                    : undefined
                }
              >
                {inMonth ? (
                  <span className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[9px] opacity-60">{dayNum}</span>
                    <span>{statusLabel(cell.status)}</span>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
      <CalendarLegend />
    </div>
  );
}

function CalendarLegend() {
  const items: { status: DayStatus; label: string }[] = [
    { status: "done", label: "Hecho" },
    { status: "recovered", label: "Recuperado" },
    { status: "missed", label: "Fallado" },
    { status: "week_success", label: "Semana lograda" },
  ];

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {items.map(({ status, label }) => (
        <div key={status} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className={cn(
              "h-4 w-4 rounded border flex items-center justify-center text-[9px]",
              STATUS_STYLES[status],
            )}
          >
            {statusLabel(status)}
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

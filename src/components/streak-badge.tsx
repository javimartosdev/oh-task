export function StreakBadge({
  current,
  longest,
  unit = "days",
}: {
  current: number;
  longest: number;
  unit?: "days" | "weeks";
}) {
  const unitLabel = unit === "weeks" ? "semanas" : "días";

  return (
    <div className="flex gap-4 text-sm">
      <div>
        <span className="text-muted">Racha actual</span>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {current}
          <span className="ml-1 text-xs font-normal text-muted">
            {unitLabel}
          </span>
        </p>
      </div>
      <div>
        <span className="text-muted">Mejor racha</span>
        <p className="text-2xl font-semibold tabular-nums text-foreground/70">
          {longest}
          <span className="ml-1 text-xs font-normal text-muted">
            {unitLabel}
          </span>
        </p>
      </div>
    </div>
  );
}

/** Catppuccin accent swatches for list colors (Mocha hex — works in light too). */
export const LIST_COLOR_SWATCHES = [
  { id: "blue", hex: "#89b4fa", label: "Azul" },
  { id: "mauve", hex: "#cba6f7", label: "Malva" },
  { id: "teal", hex: "#94e2d5", label: "Teal" },
  { id: "green", hex: "#a6e3a1", label: "Verde" },
  { id: "yellow", hex: "#f9e2af", label: "Amarillo" },
  { id: "peach", hex: "#fab387", label: "Melocotón" },
  { id: "red", hex: "#f38ba8", label: "Rojo" },
  { id: "pink", hex: "#f5c2e7", label: "Rosa" },
  { id: "sapphire", hex: "#74c7ec", label: "Zafiro" },
  { id: "lavender", hex: "#b4befe", label: "Lavanda" },
] as const;

export function combineDateAndTime(
  dateKey: string,
  timeHm: string,
): Date | null {
  if (!dateKey || !timeHm) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = timeHm.split(":").map(Number);
  if (![y, m, d, hh, mm].every((n) => Number.isFinite(n))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function timeFromIso(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function dateFromIso(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

"use client";

import Link from "next/link";

export default function StatsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-xl font-semibold">No se pudieron cargar las estadísticas</h1>
      <p className="text-sm text-muted">
        Prueba a reiniciar el servidor de desarrollo. Si persiste, vuelve al Dock.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium"
        >
          Volver al Dock
        </Link>
      </div>
    </div>
  );
}

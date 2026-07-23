import { Suspense } from "react";
import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <SettingsPanel />
    </Suspense>
  );
}

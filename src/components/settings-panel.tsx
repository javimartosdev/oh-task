"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";

type SyncState = {
  connections: {
    id: string;
    provider: string;
    connectedAt: string;
    calendarId?: string | null;
  }[];
  configured: { google: boolean; outlook: boolean; apple: boolean };
  lastGoogleSync?: string | null;
};

export function SettingsPanel() {
  const search = useSearchParams();
  const [sync, setSync] = useState<SyncState | null>(null);
  const [invites, setInvites] = useState<
    { code: string; usedCount: number; maxUses: number }[]
  >([]);
  const [appleForm, setAppleForm] = useState({
    caldavUrl: "https://caldav.icloud.com/",
    username: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [s, i] = await Promise.all([
      fetch("/api/calendar/sync").then((r) => r.json()),
      fetch("/api/invites").then((r) => r.json()),
    ]);
    setSync(s);
    setInvites(Array.isArray(i) ? i : []);
  }

  useEffect(() => {
    void load();
    const syncParam = search.get("sync");
    if (syncParam === "ok") setMsg("Calendario conectado.");
    if (syncParam === "error") setMsg("Error al conectar calendario.");
  }, [search]);

  async function connect(provider: "google" | "outlook") {
    const res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (data.authorizeUrl) {
      window.location.href = data.authorizeUrl;
      return;
    }
    setMsg(data.error ?? "No configurado");
  }

  async function connectApple(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "apple", ...appleForm }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Apple Calendar guardado." : data.error);
    void load();
  }

  async function disconnect(provider: string) {
    await fetch(`/api/calendar/sync?provider=${provider}`, { method: "DELETE" });
    void load();
  }

  async function syncGoogleNow() {
    setSyncing(true);
    setMsg("");
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 21);
    const res = await fetch(
      `/api/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    );
    const data = await res.json();
    setMsg(
      res.ok
        ? `Google sync OK — ${data.events?.length ?? 0} eventos.`
        : data.error ?? "Error al sincronizar",
    );
    setSyncing(false);
    void load();
  }

  async function createInvite() {
    await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxUses: 5 }),
    });
    void load();
  }

  const googleConnected = sync?.connections.some((c) => c.provider === "google");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
      >
        Ajustes
      </h1>
      {msg && (
        <p className="rounded-xl border border-border bg-mantle px-3 py-2 text-sm">
          {msg}
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-border bg-mantle p-4">
        <h2 className="text-sm font-semibold">Google Calendar</h2>
        <p className="text-xs text-muted">
          Conecta tu cuenta para ver eventos en Cal y exportar bloques. Requiere{" "}
          <code className="text-[10px]">GOOGLE_CLIENT_ID</code> y{" "}
          <code className="text-[10px]">GOOGLE_CLIENT_SECRET</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => connect("google")}
            disabled={!sync?.configured.google || googleConnected}
          >
            {googleConnected ? "Google conectado" : "Conectar Google"}
          </Button>
          {googleConnected && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={syncGoogleNow}
                disabled={syncing}
              >
                {syncing ? "Sincronizando…" : "Sincronizar ahora"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => disconnect("google")}
              >
                Desconectar
              </Button>
            </>
          )}
        </div>
        {sync?.lastGoogleSync && (
          <p className="text-[11px] text-muted">
            Última sync: {new Date(sync.lastGoogleSync).toLocaleString("es")}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-mantle p-4">
        <h2 className="text-sm font-semibold">Otros calendarios (opcional)</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => connect("outlook")}
            disabled={!sync?.configured.outlook}
          >
            Outlook
          </Button>
        </div>
        <form onSubmit={connectApple} className="space-y-2">
          <Input
            placeholder="CalDAV URL"
            value={appleForm.caldavUrl}
            onChange={(e) =>
              setAppleForm((f) => ({ ...f, caldavUrl: e.target.value }))
            }
          />
          <Input
            placeholder="Apple ID / usuario"
            value={appleForm.username}
            onChange={(e) =>
              setAppleForm((f) => ({ ...f, username: e.target.value }))
            }
          />
          <Input
            type="password"
            placeholder="App-specific password"
            value={appleForm.password}
            onChange={(e) =>
              setAppleForm((f) => ({ ...f, password: e.target.value }))
            }
          />
          <Button size="sm" type="submit">
            Guardar Apple CalDAV
          </Button>
        </form>
        <ul className="space-y-1 text-sm">
          {(sync?.connections ?? [])
            .filter((c) => c.provider !== "google")
            .map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span className="capitalize">{c.provider}</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => disconnect(c.provider)}
                >
                  Desconectar
                </Button>
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-mantle p-4">
        <h2 className="text-sm font-semibold">Invitar amigos</h2>
        <p className="text-xs text-muted">
          Genera un código y compártelo. En registro, el amigo lo introduce.
          Activa <code className="text-[10px]">INVITE_ONLY=1</code> para cerrar
          el registro público.
        </p>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
          <li>Pulsa «Generar código»</li>
          <li>Envíaselo por chat</li>
          <li>Tu amigo se registra en /register con ese código</li>
        </ol>
        <Button size="sm" onClick={createInvite}>
          Generar código
        </Button>
        <ul className="space-y-1 text-sm font-mono">
          {invites.map((i) => (
            <li key={i.code}>
              {i.code} ({i.usedCount}/{i.maxUses})
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-mantle/50 p-4">
        <h2 className="text-sm font-semibold text-overlay1">Plan Pro</h2>
        <p className="mt-1 text-xs text-muted">
          Monetización aparcada. Oh-Task es para ti y unos amigos; Stripe se
          estudiará más adelante.
        </p>
      </section>
    </div>
  );
}

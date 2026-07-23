"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";

type SyncState = {
  connections: { id: string; provider: string; connectedAt: string }[];
  configured: { google: boolean; outlook: boolean; apple: boolean };
};

export function SettingsPanel() {
  const search = useSearchParams();
  const [sync, setSync] = useState<SyncState | null>(null);
  const [billing, setBilling] = useState<{
    plan: string;
    stripeConfigured: boolean;
  } | null>(null);
  const [invites, setInvites] = useState<{ code: string; usedCount: number; maxUses: number }[]>(
    [],
  );
  const [appleForm, setAppleForm] = useState({
    caldavUrl: "https://caldav.icloud.com/",
    username: "",
    password: "",
  });
  const [msg, setMsg] = useState("");

  async function load() {
    const [s, b, i] = await Promise.all([
      fetch("/api/calendar/sync").then((r) => r.json()),
      fetch("/api/billing").then((r) => r.json()),
      fetch("/api/invites").then((r) => r.json()),
    ]);
    setSync(s);
    setBilling(b);
    setInvites(Array.isArray(i) ? i : []);
  }

  useEffect(() => {
    void load();
    const syncParam = search.get("sync");
    if (syncParam === "ok") setMsg("Calendario conectado.");
    if (syncParam === "error") setMsg("Error al conectar calendario.");
    if (search.get("billing") === "success") setMsg("Suscripción activada.");
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

  async function createInvite() {
    await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxUses: 5 }),
    });
    void load();
  }

  async function billingAction(action: "checkout" | "portal") {
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMsg(data.error ?? "Error de billing");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Ajustes</h1>
      {msg && (
        <p className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">{msg}</p>
      )}

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Sincronización de calendarios</h2>
        <p className="text-xs text-muted">
          Google y Outlook requieren OAuth en variables de entorno. Apple usa CalDAV +
          contraseña de app.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => connect("google")}
            disabled={!sync?.configured.google}
          >
            Google
          </Button>
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
            onChange={(e) => setAppleForm((f) => ({ ...f, caldavUrl: e.target.value }))}
          />
          <Input
            placeholder="Apple ID / usuario"
            value={appleForm.username}
            onChange={(e) => setAppleForm((f) => ({ ...f, username: e.target.value }))}
          />
          <Input
            type="password"
            placeholder="App-specific password"
            value={appleForm.password}
            onChange={(e) => setAppleForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Button size="sm" type="submit">
            Guardar Apple CalDAV
          </Button>
        </form>
        <ul className="space-y-1 text-sm">
          {(sync?.connections ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between">
              <span className="capitalize">{c.provider}</span>
              <Button size="sm" variant="danger" onClick={() => disconnect(c.provider)}>
                Desconectar
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Invitaciones</h2>
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

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Plan</h2>
        <p className="text-sm">
          Actual: <strong>{billing?.plan ?? "…"}</strong>
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => billingAction("checkout")}
            disabled={!billing?.stripeConfigured}
          >
            Pasar a Pro
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => billingAction("portal")}
            disabled={!billing?.stripeConfigured}
          >
            Portal Stripe
          </Button>
        </div>
        {!billing?.stripeConfigured && (
          <p className="text-xs text-muted">
            Configura STRIPE_SECRET_KEY y STRIPE_PRICE_ID para cobrar.
          </p>
        )}
      </section>
    </div>
  );
}

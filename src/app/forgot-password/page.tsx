"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Card, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error");
      return;
    }
    setDone(true);
    if (data.resetUrl) setResetUrl(data.resetUrl);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo variant="auth" className="mb-2" />
          <p className="text-sm text-muted">Recuperar contraseña</p>
        </div>
        {done ? (
          <div className="space-y-3 text-sm">
            <p>Si el email existe, puedes restablecer la contraseña.</p>
            {resetUrl && (
              <p className="break-all rounded-xl bg-surface-hover p-2 text-xs">
                Enlace (modo amigos, sin SMTP):{" "}
                <Link href={resetUrl} className="text-accent underline">
                  {resetUrl}
                </Link>
              </p>
            )}
            <Link href="/login" className="text-accent hover:underline">
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full">
              Enviar enlace
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

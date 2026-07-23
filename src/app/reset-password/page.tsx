"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Card, Input } from "@/components/ui";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/reset-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error");
      return;
    }
    setOk(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandLogo variant="auth" className="mb-2" />
        <p className="text-sm text-muted">Nueva contraseña</p>
      </div>
      {ok ? (
        <p className="text-sm text-success">Contraseña actualizada. Redirigiendo…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            placeholder="Nueva contraseña"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={!token}>
            Guardar
          </Button>
          {!token && (
            <p className="text-xs text-danger">Falta el token en la URL.</p>
          )}
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          Login
        </Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}

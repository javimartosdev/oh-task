import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/card";

export const metadata = {
  title: "Instalar en iPhone — Oh-Task",
  description: "Cómo añadir Oh-Task a la pantalla de inicio de tu iPhone",
};

const steps = [
  {
    n: 1,
    title: "Abre Safari",
    body: "Entra en la URL de Oh-Task (debe ser https://). Chrome u otros navegadores en iOS no instalan PWAs igual de bien.",
  },
  {
    n: 2,
    title: "Inicia sesión",
    body: "Crea tu cuenta o entra con email y contraseña. La sesión se mantiene al abrir la app desde el icono.",
  },
  {
    n: 3,
    title: "Compartir → Añadir a pantalla de inicio",
    body: "Pulsa el botón Compartir (cuadrado con flecha hacia arriba) y elige «Añadir a pantalla de inicio». Confirma el nombre «Oh-Task».",
  },
  {
    n: 4,
    title: "Ábrela desde el icono",
    body: "Usa el icono en tu pantalla de inicio. Se abrirá a pantalla completa, como una app nativa. Necesitas conexión a internet.",
  },
];

export default function InstallPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <BrandLogo variant="auth" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Instalar en iPhone
        </h1>
        <p className="text-sm text-muted">
          Llévate Oh-Task en el bolsillo como Progressive Web App
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((step) => (
          <Card key={step.n} className="p-5">
            <div className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                {step.n}
              </span>
              <div>
                <h2 className="font-medium">{step.title}</h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3 text-center text-sm">
        <Link
          href="/login"
          className="rounded-xl bg-accent px-4 py-3 font-medium text-accent-fg"
        >
          Ir a iniciar sesión
        </Link>
        <Link href="/" className="text-muted hover:text-foreground">
          Volver a la app
        </Link>
      </div>
    </div>
  );
}

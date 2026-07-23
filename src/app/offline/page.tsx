export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Sin conexión</h1>
        <p className="mt-2 text-sm text-muted">
          Oh-Task necesita red para sincronizar. Reintenta cuando vuelvas online.
        </p>
      </div>
    </div>
  );
}

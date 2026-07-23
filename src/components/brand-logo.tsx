import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandVariant = "header" | "auth" | "icon";

export function BrandLogo({
  variant = "auth",
  className,
}: {
  variant?: BrandVariant;
  className?: string;
}) {
  if (variant === "icon") {
    return (
      <Image
        src="/icons/icon.svg"
        alt="Oh-Task"
        width={32}
        height={32}
        className={cn("rounded-lg shrink-0", className)}
        priority
      />
    );
  }

  if (variant === "header") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <Image
          src="/icons/icon.svg"
          alt=""
          width={32}
          height={32}
          className="rounded-[10px] shrink-0 ring-1 ring-border/60"
          priority
          aria-hidden
        />
        <span className="text-[17px] font-semibold tracking-tight text-foreground leading-none">
          Oh-Task
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        className,
      )}
    >
      <Image
        src="/icons/icon.svg"
        alt=""
        width={72}
        height={72}
        className="rounded-2xl ring-1 ring-border/60 shadow-lg shadow-mantle/40"
        priority
        aria-hidden
      />
      <div>
        <span className="block text-2xl font-semibold tracking-tight text-foreground">
          Oh-Task
        </span>
        <span className="mt-1 block text-sm text-muted">
          Captura. Organiza. Enfócate.
        </span>
      </div>
    </div>
  );
}

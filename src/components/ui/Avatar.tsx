import { cn } from "@/lib/cn";

/** Avatar monochrome (initiales) : aucune couleur hors palette, aucune photo de personne réelle en démo. */
export function Avatar({ name, size = 40, ring, className }: {
  name: string; hue?: number; size?: number; ring?: boolean; className?: string;
}) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full border border-silver/40 bg-surface-2 font-mono font-medium text-cloud", ring && "ring-2 ring-cloud/80", className)}>
      {initials}
    </span>
  );
}

import { cn } from "@/lib/cn";

/** Avatar généré (initiales + teinte) : aucune photo de personne réelle en démo. */
export function Avatar({ name, hue = 215, size = 40, ring, className }: {
  name: string; hue?: number; size?: number; ring?: boolean; className?: string;
}) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-mono text-[0.72em] font-medium text-cloud", ring && "ring-2 ring-cloud/80", className)}
      style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(145deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 60% 28%))` }}
    >
      {initials}
    </span>
  );
}

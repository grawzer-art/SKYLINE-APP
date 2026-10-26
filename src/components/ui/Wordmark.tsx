import Image from "next/image";
import { brand } from "@/data/demo";
import { cn } from "@/lib/cn";

/**
 * Wordmark SKYLINE OFFICIEL uniquement. Aucune recréation typographique : tant que le fichier fourni
 * (SVG/PNG, variante blanche sur fond sombre) n'est pas renseigné dans `brand.wordmarkSrc`,
 * un emplacement clairement identifié s'affiche à sa place.
 */
export function Wordmark({ className }: { className?: string }) {
  if (brand.wordmarkSrc) {
    return <Image src={brand.wordmarkSrc} alt="SKYLINE" width={160} height={32} priority className={cn("h-6 w-auto", className)} />;
  }
  return (
    <span role="img" aria-label="SKYLINE (emplacement du wordmark officiel)"
      className={cn("inline-flex h-7 items-center border border-dashed border-cloud/35 px-2.5 font-mono text-[0.54rem] uppercase tracking-[0.16em] text-cloud/60", className)}>
      Wordmark officiel · à fournir
    </span>
  );
}

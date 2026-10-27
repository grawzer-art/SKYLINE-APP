"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Photo plein cadre. Sans fichier (ou en cas d'échec) : emplacement remplaçable clairement identifié,
 * jamais une fausse image. `slotLabel` décrit l'asset attendu ; `provisional` signale un visuel de travail.
 */
export function Photo({
  src, alt = "", priority, provisional, tagClassName, objectPosition, slotLabel, sizes = "(max-width: 480px) 100vw, 480px", className, imgClassName,
}: {
  src?: string; alt?: string; priority?: boolean; provisional?: boolean; tagClassName?: string; objectPosition?: string;
  slotLabel?: string; sizes?: string; className?: string; imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!src && !failed;
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-surface-1", className)}>
      {hasImage ? (
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} onError={() => setFailed(true)}
          style={objectPosition ? { objectPosition } : undefined} className={cn("object-cover", imgClassName)} />
      ) : (
        <div aria-hidden className="absolute inset-3 grid place-items-center border border-dashed border-cloud/15">
          {slotLabel && <span className="px-6 text-center font-mono text-[0.7rem] uppercase leading-relaxed tracking-[0.16em] text-cloud/60">Photo à fournir<br />{slotLabel}</span>}
        </div>
      )}
      {provisional && hasImage && (
        <span className={cn("pointer-events-none absolute right-3 top-3 border border-cloud/25 bg-jet/45 px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-cloud/70 backdrop-blur", tagClassName)}>
          Visuel provisoire
        </span>
      )}
    </div>
  );
}

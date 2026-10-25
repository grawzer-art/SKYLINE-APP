"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Photo plein cadre avec repli (dégradé de marque) si l'image manque ou échoue. */
export function Photo({
  src, alt = "", priority, provisional, tagClassName, objectPosition, sizes = "(max-width: 480px) 100vw, 480px", className, imgClassName,
}: {
  src?: string; alt?: string; priority?: boolean; provisional?: boolean; tagClassName?: string; objectPosition?: string; sizes?: string; className?: string; imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[linear-gradient(160deg,#0f1a2e,#080a0d_60%,#3a1d12)]", className)}>
      {src && !failed && (
        <Image
          src={src} alt={alt} fill priority={priority} sizes={sizes}
          onError={() => setFailed(true)} style={objectPosition ? { objectPosition } : undefined}
          className={cn("object-cover", imgClassName)}
        />
      )}
      {provisional && (
        <span className={cn("pointer-events-none absolute right-3 top-3 rounded-full border border-cloud/25 bg-jet/45 px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-cloud/70 backdrop-blur", tagClassName)}>
          Visuel provisoire
        </span>
      )}
    </div>
  );
}

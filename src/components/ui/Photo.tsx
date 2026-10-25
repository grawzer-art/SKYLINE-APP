"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Photo plein cadre avec repli (dégradé de marque) si l'image manque ou échoue. */
export function Photo({
  src, alt = "", priority, sizes = "(max-width: 480px) 100vw, 480px", className, imgClassName,
}: {
  src?: string; alt?: string; priority?: boolean; sizes?: string; className?: string; imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[linear-gradient(160deg,#0f1a2e,#080a0d_60%,#3a1d12)]", className)}>
      {src && !failed && (
        <Image
          src={src} alt={alt} fill priority={priority} sizes={sizes}
          onError={() => setFailed(true)}
          className={cn("object-cover", imgClassName)}
        />
      )}
    </div>
  );
}

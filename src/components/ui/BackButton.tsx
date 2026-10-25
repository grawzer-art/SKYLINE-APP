"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Retour cohérent : historique si possible, sinon accueil. */
export function BackButton({ label = "Retour" }: { label?: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="inline-flex min-h-11 items-center gap-2 rounded-full pr-3 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-dim transition hover:text-cloud">
      <ArrowLeft size={18} strokeWidth={1.5} aria-hidden /> {label}
    </button>
  );
}

"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Backdrop } from "@/components/v3/visual";
import { Wordmark } from "@/components/ui/Wordmark";
import { images } from "@/data/demo";
import { rememberSpace, type Space } from "@/lib/space";

/** Écran d'ouverture : choisir son espace. Le choix est mémorisé ; l'accès STAFF reste vérifié par le serveur. */
export function SpaceChooser() {
  const tile = (space: Space, href: string, eyebrow: string, title: string, text: string, staff = false) => (
    <Link href={href} onClick={() => rememberSpace(space)} className={`group relative isolate flex min-h-[13rem] flex-1 flex-col justify-end overflow-hidden rounded-[14px] border p-6 transition active:scale-[0.99] ${staff ? "border-sky/50 bg-surface-1" : "border-cloud/20"}`}>
      {!staff && <Backdrop src={images.before} position="30% 62%" strength="deep" className="!rounded-[14px]" />}
      {staff && <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[#10151c] via-jet to-[#0b1018]" />}
      <span className={`font-mono text-[0.75rem] uppercase tracking-[0.22em] ${staff ? "text-sky" : "text-sunset"}`}>{eyebrow}</span>
      <span className="font-display mt-2 block text-[1.9rem] leading-none">{title}</span>
      <span className="mt-3 flex items-end justify-between gap-4 text-[0.98rem] leading-snug text-cloud/85"><span className="max-w-[24ch]">{text}</span><span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full border border-cloud/40"><ArrowRight size={18} strokeWidth={1.5} className="transition group-hover:translate-x-0.5" /></span></span>
    </Link>
  );
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+1.5rem)]">
      <div><Wordmark /></div>
      <p className="mt-10 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Ibiza 2027</p>
      <h1 className="font-display mt-2 text-[clamp(2rem,10vw,2.8rem)] leading-[0.95]">Choisissez votre espace</h1>
      <div className="mt-8 flex flex-1 flex-col gap-4">
        {tile("members", "/", "Participant", "Members", "Mon voyage, mon pass, mon Club et SKYLINE SOUND.")}
        {tile("staff", "/staff", "Organisation", "Staff HQ", "Coordination, planning, communication et équipe. Accès réservé.", true)}
      </div>
      <p className="mt-6 text-[0.82rem] leading-relaxed text-dim">Votre choix est mémorisé sur cet appareil et modifiable dans votre profil. Données de démonstration.</p>
    </main>
  );
}

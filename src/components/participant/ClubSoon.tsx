"use client";
import Link from "next/link";
import { Block, ScreenTitle } from "@/components/v3/ui";

/** Fonctions communautaires pas encore branchées sur la base (messagerie, demandes de contact, activation) : état explicite, aucune conversation fictive. */
export function ClubSoon({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <ScreenTitle eyebrow={eyebrow} title={title} back={{ href: "/v3/club", label: "Club" }} />
      <Block>
        <div role="status" data-testid="club-soon" className="rounded-[8px] border border-silver/40 p-5">
          <p className="font-display text-[1.1rem]">Bientôt disponible</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-cloud/80">Cette fonction ouvrira avec l&apos;édition : elle reposera sur votre réservation confirmée par l&apos;équipe. En attendant, vous pouvez compléter votre profil CLUB et découvrir les membres qui l&apos;ont publié.</p>
          <Link href="/v3/club/space" className="mt-4 inline-flex min-h-11 items-center font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">My Space →</Link>
        </div>
      </Block>
    </>
  );
}

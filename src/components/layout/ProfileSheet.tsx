"use client";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { crew, practicalInfo, profileLinks, user } from "@/data/demo";
import { Emblem } from "@/components/ui/Emblem";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[0.95rem]">{title}</span>
        <ChevronDown size={18} strokeWidth={1.5} aria-hidden className="text-silver transition group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-dim">{children}</div>
    </details>
  );
}

/** Profil : identité membre, informations pratiques et réglages de compte (remplace l'onglet MORE). */
export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  /** Ferme le panneau (qui retire son entrée d'historique) puis navigue, sans que les deux s'annulent. */
  const goTo = (href: string) => {
    let done = false;
    const go = () => { if (!done) { done = true; router.push(href); } };
    window.addEventListener("popstate", go, { once: true });
    window.setTimeout(go, 500);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Profil · Démo" title={user.fullName}>
      <div className="flex items-center gap-4 pb-5">
        <Emblem size={64} />
        <div>
          <p className="font-medium">{user.memberLine}</p>
          <p className="text-sm text-dim">Profil de démonstration</p>
        </div>
      </div>

      <Row title="Informations légales et pratiques">
        <ul className="space-y-3">
          {practicalInfo.map((i) => <li key={i.id}><p className="text-cloud">{i.title}</p><p>{i.text}</p></li>)}
        </ul>
        <p className="mt-3 text-xs">Informations de démonstration.</p>
      </Row>
      <Row title="Aide & contact"><p>{profileLinks.help}</p></Row>
      <Row title="À propos de SKYLINE"><p>{profileLinks.about}</p></Row>
      <button type="button" onClick={() => goTo("/crew")} className="flex min-h-14 w-full items-center justify-between border-b border-line text-left text-[0.95rem]">
        Mon crew · {crew.members.length} membres <Icon name="arrow" size={18} className="text-silver" />
      </button>
    </Sheet>
  );
}

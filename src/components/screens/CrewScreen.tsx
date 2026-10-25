"use client";
import { useState } from "react";
import { crew, type CrewMember } from "@/data/demo";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

export function CrewScreen() {
  const [selected, setSelected] = useState<CrewMember | null>(null);
  return (
    <div className="px-5 pt-28">
      <BackButton />
      <p className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-sky">My Crew · Démo</p>
      <h1 className="font-display mt-3 text-[clamp(2.4rem,12vw,3.6rem)]">{crew.name}</h1>
      <p className="mt-4 max-w-[34ch] text-dim">{crew.members.length} voyageurs fictifs. Touche un profil pour le consulter.</p>

      <ul className="mt-8 space-y-2">
        {crew.members.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => setSelected(m)} aria-haspopup="dialog"
              className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface-1 p-4 text-left transition hover:bg-surface-2 active:scale-[0.99]">
              <Avatar name={m.name} hue={m.hue} size={52} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.name}</span>
                <span className="block text-sm text-dim">{m.role} · {m.city}</span>
              </span>
              <span className="font-mono text-xs text-dim">{m.seat}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-dim">
        La messagerie du crew arrive en phase 2. Cet écran est une démonstration : aucune donnée réelle.
      </p>

      <Sheet open={!!selected} onClose={() => setSelected(null)} eyebrow="Profil · Démo" title={selected?.name ?? ""}>
        {selected && (
          <div>
            <div className="flex items-center gap-4">
              <Avatar name={selected.name} hue={selected.hue} size={72} />
              <div>
                <p className="font-medium">{selected.role}</p>
                <p className="text-sm text-dim">{selected.city}</p>
              </div>
            </div>
            <p className="mt-5 leading-relaxed text-cloud/85">{selected.bio}</p>
            <p className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-dim">Siège fictif · {selected.seat}</p>
            <Button variant="ghost" onClick={() => setSelected(null)} className="mt-6 w-full">Fermer</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

"use client";
import { useState } from "react";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { Photo } from "@/components/ui/Photo";
import { Sheet } from "@/components/ui/Sheet";
import { images } from "@/data/demo";
import { useExperience } from "@/lib/experience/useExperience";

const archive = [
  { src: images.dj, alt: "DJ set à bord de l'avion", pos: "50% 40%" },
  { src: images.during, alt: "Fête dans la cabine", pos: "50% 40%" },
  { src: images.before, alt: "Coucher de soleil vu du hublot", pos: "30% 60%" },
  { src: images.airport, alt: "Arrivée à l'aéroport d'Ibiza", pos: "50% 55%" },
  { src: images.after, alt: "Descente de l'escalier de l'avion, de nuit", pos: "50% 40%" },
  { src: images.champagne, alt: "Moment de fête dans la cabine", pos: "50% 40%" },
];

/** SOUVENIRS : archives SKYLINE. Aucune affirmation historique (nombre ou rang d'édition) : seules les photographies d'archives sont affichées. */
export function V3Memories() {
  const x = useExperience();
  const [view, setView] = useState<(typeof archive)[number] | null>(null);
  return (
    <>
      <ScreenTitle eyebrow="Club" title="Souvenirs" back={{ href: "/v3/club", label: "Club" }}>
        <p className="mt-3 flex items-center gap-2 text-[0.85rem] text-cloud/70"><DemoTag>Archives SKYLINE</DemoTag></p>
      </ScreenTitle>
      {x.phase !== "after" && <Block><p className="border-l border-sky pl-4 text-[0.85rem] text-cloud/80">Les souvenirs d&apos;Ibiza 2027 s&apos;ajouteront ici après l&apos;événement. Revivez les moments SKYLINE.</p></Block>}
      <Block label="Photographies">
        <ul className="grid grid-cols-2 gap-2">
          {archive.map((a, i) => (
            <li key={a.src}>
              <button type="button" onClick={() => setView(a)} aria-haspopup="dialog" aria-label={`Agrandir : ${a.alt}`} className={`relative block w-full overflow-hidden rounded-[3px] ${i % 3 === 0 ? "aspect-[4/5]" : "aspect-square"}`}>
                <Photo src={a.src} alt="" objectPosition={a.pos} sizes="(max-width: 480px) 50vw, 240px" />
              </button>
            </li>
          ))}
        </ul>
      </Block>
      <Sheet open={!!view} onClose={() => setView(null)} eyebrow="Archives SKYLINE" title="Souvenir">
        {view && <div className="relative -mx-5 aspect-[4/5] overflow-hidden"><Photo src={view.src} alt={view.alt} objectPosition={view.pos} sizes="(max-width: 480px) 100vw, 480px" /></div>}
      </Sheet>
    </>
  );
}

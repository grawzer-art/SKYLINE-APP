import type { Metadata } from "next";
import { V3Sound } from "@/components/v3/V3Sound";
import { getSoundCollections } from "@/data/sound";
import { demoContentFromProcess } from "@/lib/experience/demoContent";

export const metadata: Metadata = { title: "Skyline Sound" };
/** Prérendue : les liens aux droits non confirmés et l'outil de test sont décidés ici, au build (fermés par défaut). */
export default function Page() {
  const demoOk = demoContentFromProcess();
  return <V3Sound collections={getSoundCollections(demoOk)} testTools={demoOk} />;
}

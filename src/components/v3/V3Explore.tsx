"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScreenTitle, Block, Empty } from "./ui";
import { Photo } from "@/components/ui/Photo";
import { images } from "@/data/demo";

/** EXPLORE : SKYLINE RADIO en tête, puis line-up, artistes et contenus (emplacements tant que rien n'est confirmé). */
export function V3Explore({ signals }: { signals: React.ReactNode }) {
  return (
    <>
      <ScreenTitle eyebrow="Skyline culture" title="Explore" />
      <Block>
        <Link href="/v3/explore/radio" className="group relative isolate flex aspect-[16/10] items-end overflow-hidden rounded-[4px] border border-cloud/15 p-5">
          <Photo src={images.before} alt="" objectPosition="30% 75%" sizes="(max-width: 480px) 100vw, 480px" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/50 to-jet/10" />
          <span className="relative flex w-full items-end justify-between">
            <span><span className="block font-mono text-[0.58rem] uppercase tracking-[0.2em] text-sunset">Sélections officielles</span><span className="font-display mt-1.5 block text-[1.4rem]">Skyline Radio</span></span>
            <span className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em]">Écouter <ArrowRight size={15} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1" /></span>
          </span>
        </Link>
      </Block>
      <Block label="Line-up"><Empty title="Line-up à annoncer" text="Les artistes confirmés apparaîtront ici, avec leur profil officiel." /></Block>
      {signals}
      <Block label="Expériences à Ibiza"><Empty title="À venir" text="Lieux et expériences confirmés par l'équipe." /></Block>
      <div className="h-8" />
    </>
  );
}

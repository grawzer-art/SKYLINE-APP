import { placeholders, type NavId } from "@/data/demo";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";

/** Écran temporaire soigné pour les sections non développées. */
export function ComingSoon({ id }: { id: Exclude<NavId, "home"> }) {
  const p = placeholders[id];
  return (
    <section aria-labelledby="soon-title" className="relative isolate flex min-h-dvh flex-col justify-end px-5 pb-10 pt-32">
      <div className="absolute inset-0 -z-10">
        <Photo src={p.image} />
        <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/80 via-45% to-jet/30" />
      </div>
      <span className="grid size-14 place-items-center rounded-full border border-line bg-cloud/10 text-sunset backdrop-blur"><Icon name={p.icon} size={26} /></span>
      <p className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-sky">Bientôt à bord</p>
      <h1 id="soon-title" className="font-display mt-3 text-[clamp(2.6rem,13vw,4rem)]">{p.title}</h1>
      <p className="mt-4 max-w-[32ch] text-[1.02rem] text-cloud/85">{p.subtitle}</p>
      <ul className="mt-8 space-y-2">
        {p.upcoming.map((u) => (
          <li key={u} className="flex items-center gap-3 rounded-2xl border border-line bg-jet/50 px-4 py-3.5 text-sm backdrop-blur">
            <span className="size-1.5 rounded-full bg-sunset" aria-hidden /> {u}
            <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">Phase 2</span>
          </li>
        ))}
      </ul>
      <ButtonLink href="/" variant="ghost" className="mt-8 w-full">Retour à l&apos;accueil</ButtonLink>
    </section>
  );
}

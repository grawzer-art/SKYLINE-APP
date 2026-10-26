import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-dvh flex-col justify-end px-5 pb-[calc(var(--nav-h)+var(--safe-bottom)+2rem)] pt-32">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-sky">Erreur 404</p>
      <h1 className="font-display mt-3 text-[clamp(1.75rem,8.4vw,2.5rem)]">Contenu introuvable</h1>
      <p className="mt-4 max-w-[34ch] text-[0.95rem] text-cloud/75">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 w-fit items-center border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">Retour à l&apos;accueil</Link>
    </section>
  );
}

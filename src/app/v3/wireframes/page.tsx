import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Box, Chip, Line, Lines, Phone, Row, Tabs, Top } from "@/components/v3/wire";

export const metadata: Metadata = { title: "SKYLINE V3 — Wireframes", robots: { index: false } };

export default function Page() {
  return (
    <div className="px-5 pb-16 pt-10">
      <Link href="/v3/screens" className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-sky">← Plan des écrans</Link>
      <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sunset">Prototype V3 · conception</p>
      <h1 className="font-display mt-2 text-[clamp(1.7rem,8.4vw,2.5rem)]">Wireframes</h1>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-cloud/75">Basse fidélité, mobile-first (iPhone 375–430 px). Les repères orange renvoient aux notes sous chaque écran. Le rendu final reprend le brand book ; les écrans cliquables sont dans le prototype.</p>
      <nav aria-label="Sommaire" className="mt-5 flex flex-wrap gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em]">
        {["home", "now", "flight", "explore", "radio", "space", "members", "messages", "club", "hq"].map((a) => <a key={a} href={`#${a}`} className="min-h-9 border border-cloud/25 px-2.5 py-2">{a}</a>)}
      </nav>

      <div className="mt-12 space-y-20">
        <Phone id="home" title="HOME — avant le voyage" route="/v3" notes={["Photographie plein cadre, wordmark officiel, statut membre discret.", "Slogan en 4 lignes maximum.", "Compte à rebours discret + accès immédiat à MY FLIGHT.", "Une seule carte SKYLINE SIGNAL (NEW, titre, DÉCOUVRIR) → révélation plein écran."]}>
          <Top />
          <Box h={250} dark n={1} label="Photo plein cadre"><div className="absolute bottom-3 left-3 right-3 space-y-2 text-left"><Chip>Statut membre</Chip><Box h={34} n={2} label="Slogan" className="!justify-start px-2" /></div></Box>
          <Row className="mt-2 justify-between"><Box h={28} n={3} label="J · H · M" className="w-24" /><Box h={28} label="My Flight →" className="w-24" /></Row>
          <Box h={78} n={4} className="mt-2" dashed><div className="w-full space-y-2 px-3 text-left"><Row className="justify-between"><Chip>Skyline Signal</Chip><Chip on>New</Chip></Row><Line w="70%" /><Row className="justify-end"><Chip>Découvrir →</Chip></Row></div></Box>
          <Tabs active={0} />
        </Phone>

        <Phone id="now" title="HOME — pendant Ibiza (SKYLINE NOW / LIVE)" route="/v3 · phase « pendant »" notes={["Le hero change d'ambiance (solaire).", "Prochaine activité CONFIRMÉE : titre, horaire, lieu officiels — jamais inventés.", "Transfert et annonce de l'équipe : champs renseignés par l'organisation uniquement.", "Sans information confirmée : état vide « rien d'annoncé »."]}>
          <Top />
          <Box h={150} dark n={1} label="Photo (ambiance Ibiza)" />
          <Box h={120} n={2} className="mt-2" dashed><div className="w-full space-y-2 px-3 text-left"><Chip on>Skyline Now</Chip><Chip>Prochaine activité confirmée</Chip><Line w="75%" /><Line w="45%" /><Chip>Voir le programme →</Chip></div></Box>
          <Box h={44} n={3} label="Transfert · [info officielle]" className="mt-2" />
          <Box h={44} n={4} label="Annonce de l'équipe · [message]" className="mt-2" />
          <Tabs active={0} />
        </Phone>

        <Phone id="flight" title="MY FLIGHT" route="/v3/flight" notes={["Pass événementiel SKYLINE (emblème officiel, pseudo, édition, statut, n° de pass).", "Mention permanente : le pass n'est PAS un titre de transport.", "Réservation et départ vérifié : champs « Confirmé / À confirmer ».", "Programme pratique : vide tant que non publié.", "Documents essentiels (ouverture dans un panneau)."]}>
          <Box h={118} dark n={1} label="Pass SKYLINE" className="!justify-start p-2" />
          <Box h={36} n={2} label="≠ titre de transport" className="mt-2" dashed />
          <div className="mt-2 space-y-1.5"><Box h={24} n={3} label="Réservation · À confirmer" /><Box h={24} label="Aéroport · [à confirmer]" /><Box h={24} label="Date et heure · [à confirmer]" /></div>
          <Box h={52} n={4} label="Programme à venir" className="mt-2" dashed />
          <Box h={50} n={5} label="Documents essentiels →" className="mt-2" />
          <Tabs active={1} />
        </Phone>

        <Phone id="explore" title="EXPLORE" route="/v3/explore" notes={["Entrée SKYLINE RADIO en grande carte photographique.", "Line-up : confirmés uniquement, sinon « à annoncer ».", "Révélations SIGNAL (liste datée, NEW) — existant en production.", "Expériences à Ibiza : contenus validés par l'équipe."]}>
          <div className="mb-2"><Line w="40%" /></div>
          <Box h={120} dark n={1} label="Skyline Radio" />
          <Box h={52} n={2} label="Line-up · à annoncer" className="mt-2" dashed />
          <div className="mt-2 space-y-1.5"><Box h={34} n={3} label="Signal · Artiste · New" /><Box h={34} label="Signal · Lieu" /><Box h={34} label="Signal · Mix" /></div>
          <Box h={44} n={4} label="Expériences à Ibiza" className="mt-2" dashed />
          <Tabs active={2} />
        </Phone>

        <Phone id="radio" title="SKYLINE RADIO" route="/v3/explore/radio" notes={["Sélections officielles : pochette, titre, auteur.", "Lecteur réutilisable : s'ouvre au toucher, JAMAIS d'autoplay.", "DJ : portraits et profils officiels.", "Mixes exclusifs ; « indisponible » sans source autorisée."]}>
          <Line w="35%" />
          <div className="mt-3 space-y-2"><Row><Box h={40} className="w-10" label="1:1" n={1} /><div className="flex-1"><Lines n={2} /></div><Chip>▶</Chip></Row><Box h={44} n={2} label="Lecteur · lecture volontaire" dashed /></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Box h={90} n={3} label="DJ · 4:5" /><Box h={90} label="DJ · 4:5" /></div>
          <div className="mt-3 space-y-2"><Row><Box h={40} className="w-10" label="1:1" n={4} /><div className="flex-1"><Lines n={2} /></div><Chip>▶</Chip></Row></div>
          <Tabs active={2} />
        </Phone>

        <Phone id="space" title="MY SPACE" route="/v3/club/space" notes={["Photo facultative (initiales par défaut).", "Pseudo (jamais le nom complet), ville CHOISIE dans une liste.", "Description 140 caractères, préférences musicales (5 max).", "Visibilité : interrupteur désactivé par défaut (opt-in).", "Aperçu fidèle de ce que verront les autres."]}>
          <Row><Avatar n={1} /><Chip>Ajouter une photo</Chip></Row>
          <div className="mt-3 space-y-2"><Box h={30} n={2} label="Pseudo" /><Box h={30} label="Ville ▾" /><Box h={54} n={3} label="Description 0/140" /></div>
          <div className="mt-2 flex flex-wrap gap-1.5"><Chip on>House</Chip><Chip>Techno</Chip><Chip on>Melodic</Chip><Chip>Disco</Chip></div>
          <Box h={36} n={4} label="Visible dans l'annuaire  ◯" className="mt-3" />
          <Box h={64} n={5} label="Aperçu" className="mt-3" dashed />
          <Tabs active={3} />
        </Phone>

        <Phone id="members" title="MEMBERS (annuaire)" route="/v3/club/members" notes={["Réciprocité : accès réservé aux membres visibles.", "Recherche pseudo/ville + filtre ville.", "Affinités musicales (multi-sélection).", "Seuls les profils visibles ; contact / en attente affichés ; aucun classement."]}>
          <Box h={30} n={2} label="🔍 Pseudo ou ville" />
          <Box h={30} label="Toutes les villes ▾" className="mt-2" />
          <div className="mt-2 flex gap-1.5 overflow-hidden"><Chip on>House</Chip><Chip>Techno</Chip><Chip>Disco</Chip><Chip>Melodic</Chip></div>
          <p className="mt-3 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-cloud/50">8 membres visibles</p>
          <div className="mt-2 space-y-2.5">{[1, 2, 3, 4].map((i) => <Row key={i}><Avatar n={i === 1 ? 4 : undefined} /><div className="flex-1"><Line w="45%" /><div className="mt-1.5"><Line w="70%" /></div></div>{i === 2 && <Chip>En attente</Chip>}</Row>)}</div>
          <Box h={40} n={1} label="Profil masqué → « Rendre visible »" className="mt-3" dashed />
          <Tabs active={3} />
        </Phone>

        <Phone id="messages" title="MESSAGES + conversation" route="/v3/club/messages · /[id]" notes={["Onglets Conversations / Demandes.", "Demande : Accepter / Refuser (sans justification).", "Conversation : composeur, bloquer, signaler toujours accessibles.", "Aucun accusé de lecture, aucun statut « en ligne »."]}>
          <Box h={30} n={1} label="Conversations | Demandes (1)" />
          <div className="mt-3 space-y-2.5">{[1, 2].map((i) => <Row key={i}><Avatar /><div className="flex-1"><Line w="40%" /><div className="mt-1.5"><Line w="80%" /></div></div></Row>)}</div>
          <Box h={64} n={2} label="Demande · Accepter / Refuser" className="mt-3" dashed />
          <div className="mt-3 border-t border-cloud/25 pt-3"><Row className="justify-between"><Chip>← Alba</Chip><Row><Chip>Bloquer</Chip><Chip>Signaler</Chip></Row></Row></div>
          <div className="mt-2 space-y-2"><Box h={26} className="w-2/3" /><Box h={26} className="ml-auto w-1/2" dark /></div>
          <Box h={36} n={3} label="Écrire…  [Envoyer]" className="mt-auto" />
          <Tabs active={3} />
        </Phone>

        <Phone id="club" title="CLUB" route="/v3/club" notes={["Carte membre noir / argent / blanc, emblème officiel (aucun niveau VIP).", "Quatre espaces : My Space, Members, Messages, Souvenirs.", "Historique des éditions réellement fréquentées.", "Accès anticipé : uniquement quand il existe réellement."]}>
          <Box h={140} dark n={1} label="Carte membre" className="!justify-start p-3" />
          <div className="mt-3 space-y-2"><Box h={38} n={2} label="My Space →" /><Box h={38} label="Members →" /><Box h={38} label="Messages → New" /><Box h={38} label="Souvenirs →" /></div>
          <Box h={44} n={3} label="Historique · Ibiza 2027" className="mt-3" dashed />
          <Tabs active={3} />
        </Phone>

        <section id="hq" className="scroll-mt-6">
          <p className="font-display text-[1rem]">SKYLINE HQ — environnement organisateurs</p>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-sky">Application séparée · bureau d&apos;abord</p>
          <div className="mt-3 overflow-x-auto"><div className="grid h-[420px] w-[720px] grid-cols-[150px_1fr] border-2 border-cloud/35">
            <div className="space-y-2 border-r border-cloud/25 p-3 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-cloud/60"><p className="text-cloud">SKYLINE HQ</p>{["Tableau de bord", "Signals", "Programme & LIVE", "Radio & médias", "Membres", "Modération", "Messages d'équipe", "Rôles & accès", "Journal d'audit"].map((x, i) => <div key={x} className={i === 5 ? "border-l border-sky pl-2 text-sky" : "pl-2"}>{x}</div>)}</div>
            <div className="space-y-3 p-4"><Row className="justify-between"><Chip on>Modération · 3 signalements</Chip><Chip>Rôle : modérateur</Chip></Row>
              <div className="grid grid-cols-3 gap-2"><Box h={60} label="À traiter" /><Box h={60} label="En cours" /><Box h={60} label="Résolus" /></div>
              <Box h={200} dashed label="File de signalements · motif · contexte limité · actions : avertir / suspendre / clore · journalisé" /></div>
          </div></div>
          <ol className="mt-3 space-y-1.5 text-[0.78rem] text-cloud/80"><li>Accès par rôles (propriétaire, publication, modération, lecture seule) avec double authentification obligatoire.</li><li>Chaque action sensible est journalisée (qui, quoi, quand).</li><li>Les modérateurs ne voient que le contexte du signalement, jamais l&apos;ensemble des messages.</li></ol>
        </section>
      </div>
    </div>
  );
}

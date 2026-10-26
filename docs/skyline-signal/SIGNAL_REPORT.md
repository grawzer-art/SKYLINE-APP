# SKYLINE SIGNAL — Mission 003 · Private Reveal Experience

Branche : `feat/skyline-signal-experience` (non fusionnée dans `main`). Captures : `captures/` · démonstration : `demo-signal.mp4` · tests : `tests-signal.cjs`.

## Ce qui a été construit
- **Une vraie page plein écran** `/signal/[slug]` (et non une modale) : URL propre, retour navigateur natif, accès direct possible.
- **Séquence courte, jamais bloquante** (≈ 1,4 s) : cercle d'ouverture depuis la carte touchée → photo en fondu + léger zoom arrière → titre mot à mot (masque) → accroche, texte, médias. Tout est cliquable dès le début ; Fermer visible immédiatement ; Échap ; retour Safari.
- **Animations réduites** : simple fondu, aucun cercle, zoom ni cascade (vérifié).
- **Trois types** : Artist Reveal, Location Reveal, Exclusive Mix, par un modèle de données commun.
- **HOME** : une carte photographique SKYLINE SIGNAL (la plus récente publiée) — nom, **NEW**, type, titre court, **DÉCOUVRIR** (→ « Revoir » après consultation).
- **EXPLORE** : toutes les révélations publiées, classées par date décroissante, avec vignette, NEW par ligne et accès direct.
- **Lecteur audio** : lecture déclenchée volontairement (jamais d'autoplay), pause, barre de position accessible au clavier, arrêt à la fermeture ; état « Extrait audio indisponible » si la source manque ou est inaccessible. Vidéo facultative prise en charge de la même façon (contrôles natifs, pas d'autoplay).
- **Lien complémentaire** facultatif (interne ou externe en nouvel onglet avec `rel="noopener noreferrer"`).
- **Mémoire locale** (démo) des Signaux consultés : masque NEW, ne supprime jamais un contenu. Point orange sur l'onglet Explore tant qu'il reste une révélation non consultée.
- Page 404 SKYLINE en français.

## Modèle de données (`src/data/`)
`signal-types.ts` (types, libellés, formatage de date — sans données) · `signals.ts` (contenus, **serveur uniquement**). Champs : `id`, `slug`, `type`, `title`, `hook`, `description[]`, `publishedAt`, `status` (published/draft), `image{src,alt,position,slot}`, `media?`, `link?`, champs propres au type (`artistName`, `locationName`, `mixTitle`/`djName`, `facts[]`), `demo`.
Ajouter une révélation = ajouter une entrée dans `signals.ts` ; la plus récente publiée passe sur HOME.

## Sécurité / confidentialité
- Les **brouillons ne sont jamais envoyés au navigateur** : 0 occurrence dans le JavaScript client et dans le HTML de toutes les pages (vérifié). Les composants clients reçoivent uniquement des Signaux publiés, en props.
- Un brouillon ou un slug inconnu renvoie un **vrai 404 dès la première requête** (`src/proxy.ts`).
- Aucune dépendance ni service ajouté. Aucun média privé exposé ; aucune musique lancée automatiquement.

## Tests (Chromium/Playwright, 375 / 390 / 430 / 1280 px) — 54 vérifications OK, 0 erreur console, 0 débordement
HOME→SIGNAL→retour ; EXPLORE→SIGNAL→retour (même page, défilement conservé) ; Échap ; retour navigateur ; NEW / déjà consulté (HOME, EXPLORE, onglet) ; ordre par date ; brouillon exclu ; image manquante ; média indisponible ; lien direct ; clavier (Tab atteint Fermer en premier) ; animations réduites ; lecteur audio (source de test temporaire, retirée : pas d'autoplay, lecture, pause, recherche clavier, source cassée).
**Non testé** : Safari iOS réel, safe areas réelles, performances sur appareil (variables CSS `env(safe-area-inset-*)` prévues).

## Limites / contenus à fournir
| Sujet | État |
|---|---|
| Contenus officiels (artiste, lieu, mix) | **À fournir** — les 3 Signaux sont des **démonstrations** (pastille « Démo »), aucun nom inventé |
| Photo de l'artiste | **À fournir** — emplacement identifié (aucun visage de participant n'illustre un faux artiste) |
| Source audio autorisée du mix | **À fournir** — état « indisponible » en attendant |
| Vidéo du lieu | **À fournir** (optionnelle) |
| Statut des Signaux, « NEW » | Mémoire **locale** à l'appareil (pas de comptes ni de backend, comme demandé) |
| Publication programmée / mises à jour sans redéploiement | Non prévu (nécessiterait un backend/CMS) |

# SKYLINE APP — V1 · écran PRE-BOARDING

Application mobile-first (Next.js App Router · TypeScript · Tailwind v4 · Motion · Lucide) pour les participants de SKYLINE IBIZA 2027.
**Tout le contenu est fictif** (données de démonstration, signalées dans l'interface).

## Lancer le projet

```bash
npm install
npm run dev          # http://localhost:3000
# ou version de production
npm run build && npm start
```

### Aperçu sur téléphone
1. Téléphone et ordinateur sur le même Wi‑Fi.
2. `npm run dev -- -H 0.0.0.0` puis ouvrir `http://<IP-de-l'ordinateur>:3000` dans Safari (iPhone).
3. Option : Safari › Partager › « Sur l'écran d'accueil » pour l'ouvrir en plein écran (manifest PWA inclus).
4. Sans téléphone : DevTools › mode responsive (iPhone SE 320 px → Pro Max 430 px).

## Architecture

```
src/
  app/                 Pages (/, /pass, /explore, /club, /more, /crew) + manifest PWA
  components/
    ui/                Briques réutilisables : Button, Sheet (modale), Photo, Avatar, Icon, Section, BackButton
    layout/            AppShell, Header, BottomNav, nav-items (les 5 entrées)
    preboarding/       Hero, Countdown, ExperienceCard, UpdatesFeed, Checklist, CrewPreview
    screens/           Écrans secondaires : ComingSoon (sections futures), CrewScreen
  data/demo.ts         ★ Fichier central des données fictives (date de départ, news, checklist, crew…)
  design/              tokens.ts (couleurs) + motion.ts (courbes, variantes d'animation)
  lib/                 useCountdown, useLocalStorage, useHydrated, cn
public/images/         Visuels (placeholders générés) ; icônes PWA
scripts/generate-images.cjs   Régénère les placeholders
```

Extensible : une nouvelle section (réservations, documents, programme, archives…) = un dossier dans `src/app`, une ligne dans `nav-items.ts`, ses données dans `src/data`.

## Configuration rapide
- **Date du compte à rebours** : `event.departureISO` dans `src/data/demo.ts` (ISO 8601). Date dépassée ou invalide → message dédié.
- **Photos** : remplacez les fichiers de `public/images/` (mêmes noms) ou changez `images` dans `demo.ts`. Une image manquante affiche un dégradé de marque.
- **Typographies** : Helvetica Now n'est pas fournie. Substituts actuels : Helvetica Neue / Arimo / Arial (titres en gras majuscule) et JetBrains Mono → monospace système. Pour les polices officielles (licence requise), déposez les `.woff2` dans `public/fonts/` et ajoutez `url("/fonts/….woff2") format("woff2")` aux `@font-face` de `src/app/globals.css` (noms prévus : `HelveticaNowDisplay-ExtendedBold`, `HelveticaNowText-Regular`, `HelveticaNowText-Medium`). Pour JetBrains Mono (open source), ajoutez-la de la même manière.

## Fonctionnalités terminées (V1)
- Header : logo, notifications (panneau + pastille « non lues »), avatar → More, indicateur PRE-BOARDING / 2027.
- Hero plein cadre, titre « VOTRE VOYAGE APPROCHE. », dégradés de lisibilité, léger mouvement d'image.
- Compte à rebours j/h/min/s animé, sans dérive, cas date passée / invalide, sans décalage d'hydratation.
- SKYLINE Experience : carte + panneau « Découvrir le concept ».
- Latest Updates : filtres (Tout / Artistes / Voyage / Programme), articles en panneau, état vide.
- Travel Checklist : cases accessibles, progression animée, persistance `localStorage`, réinitialisation.
- My Crew : aperçu + écran `/crew` + fiches en panneau (pas de messagerie).
- Navigation 5 entrées avec état actif ; écrans temporaires soignés pour My Pass / Explore / Club / More.
- Panneaux : Échap, clic fond, bouton ✕, **bouton retour du navigateur/iPhone**, focus piégé et restauré, scroll verrouillé.
- Accessibilité : `prefers-reduced-motion`, focus visible, lien d'évitement, cibles tactiles ≥ 44 px, `aria-*`, safe areas iPhone.
- Vérifié (Playwright) : aucun débordement horizontal à 320 / 390 / 430 / 1280 px, aucune erreur console, interactions et persistance OK.

## Limites connues
- **Photos = placeholders générés** (ciel, cabine, coucher de soleil) : la planche graphique SKYLINE n'était pas dans le dépôt, la composition suit donc le brief écrit, pas la planche. À remplacer par les vraies photos/vidéo ; la carte Experience n'a pas encore de vidéo.
- Polices officielles absentes (voir ci‑dessus) : rendu des titres approximatif, sans vraie largeur « Extended ».
- Pas de service worker / mode hors‑ligne (le manifest est prêt).
- Checklist stockée localement, par navigateur.
- Hors périmètre, volontairement : authentification, paiement, carte d'embarquement, QR codes, base de données, messagerie, push, compagnie aérienne.

## V1.1 — direction artistique
Refonte visuelle de PRE-BOARDING d'après la planche validée. Rapport, comparatif et assets manquants : `docs/skyline-v1.1/work/V1.1_REPORT.md`.
Typographies : titres en **Archivo** (licence OFL, substitut de Helvetica Now Extended), chiffres en **JetBrains Mono** ; voir `public/fonts/README.md` pour brancher les fichiers officiels.

## V2 — Private Members Experience (branche `v2-private-members`)
HOME redessinée, navigation à 4 onglets (HOME / MY FLIGHT / EXPLORE / CLUB), profil à la place de MORE, checklist supprimée, **SKYLINE SIGNAL** (révélations privées).
Logos officiels : `public/brand/` (dérivés du fichier fourni), branchés dans `src/data/demo.ts` (`brand.*`) — aucun logo n'est recréé. Photos authentiques : `public/photos/`.
Rapport, captures et assets requis : `docs/skyline-v2/V2_REPORT.md`. Ambiances : `/?phase=before|during|after`.

## SKYLINE SIGNAL (branche `feat/skyline-signal-experience`)
Révélations privées en plein écran (`/signal/[slug]`) : Artist, Location, Exclusive Mix. Données : `src/data/signals.ts` (serveur uniquement) + `signal-types.ts`. Rapport, captures, démonstration : `docs/skyline-signal/SIGNAL_REPORT.md`.

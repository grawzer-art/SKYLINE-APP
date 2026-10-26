# 05 — Composants existants à réutiliser

Inventaire du code actuel (`main`, SKYLINE SIGNAL inclus) et ce qu'il devient en V3.

## À réutiliser tel quel
| Composant | Fichier | Usage V3 |
|---|---|---|
| Sheet (panneau modal accessible, historique, focus piégé) | `ui/Sheet.tsx` | Blocage, signalement, documents, confirmations |
| Photo (image + emplacement « photo à fournir ») | `ui/Photo.tsx` | Toutes les images ; états d'image manquante |
| Wordmark / Emblem (fichiers officiels fournis) | `ui/Wordmark.tsx`, `ui/Emblem.tsx` | En-têtes, carte membre, pass |
| Button / ButtonLink | `ui/Button.tsx` | Actions principales et secondaires |
| Icon (Lucide, trait fin) | `ui/Icon.tsx` | Navigation, actions |
| AudioPlayer (lecture volontaire, états « indisponible ») | `signal/AudioPlayer.tsx` | **SKYLINE RADIO**, mixes, SIGNAL |
| SignalCard / SignalList / SignalExperience | `signal/*` | HOME, EXPLORE, révélation plein écran |
| Hooks : useCountdown, useLocalStorage, useHydrated, useReducedMotion | `lib/*` | Compte à rebours, états locaux (démo), animations réduites |
| Tokens & polices | `globals.css`, `design/*` | Brand book (couleurs, Archivo/JetBrains Mono, substituts) |
| Proxy 404 + not-found | `proxy.ts`, `not-found.tsx` | Contenus non publiés |

## À adapter
| Composant | Changement |
|---|---|
| BottomNav / nav-items | Déjà 4 onglets ; renommer les cibles (HOME, MY FLIGHT, EXPLORE, CLUB), badge NEW réel (demandes, signaux) |
| Header + ProfileSheet | Le profil devient un écran complet (`/profile`) ; l'avatar y mène |
| HomeHero | Piloté par la **phase** (configurée côté HQ) et non plus par une date locale |
| Avatar | Monochrome conservé ; ajouter la photo facultative modérée |
| UpdatesFeed | À fusionner dans EXPLORE éditorial (ou retirer) |
| Données `demo.ts` / `signals.ts` | Remplacées par l'API ; **les brouillons ne quittent jamais le serveur** (règle déjà appliquée) |

## À retirer
`CrewScreen` / `CrewPreview` (remplacés par MEMBERS), `ComingSoon` (remplacé par les vrais écrans), anciennes routes `/pass`, `/crew`.

## Nouveaux composants (déjà prototypés dans `src/components/v3/`)
`V3Shell` (en-tête, navigation, phase), `ui.tsx` (Toggle, Switch, Initials, ScreenTitle, Block, Empty, DemoTag), écrans `V3Home / Flight / Explore / Radio / Club / Space / Members / Member / Messages / Chat / Memories / Profile`, état `useProto`, utilitaire `closeThenGo` (fermeture de panneau puis navigation).
À créer pour la production : **MemberCard** (carte membre), **PassCard**, **ContactRequestButton**, **ReportSheet**, **Composer** (messagerie), **PhaseProvider**, **OfflineBanner**.

## Dette connue à traiter avant V3
- Le composant `Sheet` utilise l'historique : deux panneaux ouverts/fermés en séquence peuvent se contrarier (corrigé par `closeThenGo` et par des panneaux à contenu variable).
- Logos livrés en PNG dérivés : remplacer par les SVG officiels.
- Polices : Helvetica Now non fournie (substituts).

## Ajouts de la phase « interfaces communautaires »
| Élément | Fichier | Rôle |
|---|---|---|
| Règles métier pures + tests | `src/domain/community.ts`, `tests/community.test.mts` | Éligibilité, validation, quotas, débit, annuaire (réutilisable côté serveur) |
| i18n FR/EN typée | `src/i18n/*`, `tests/i18n.test.mts` | Traductions, pluriels, repli |
| Actions « contrat » | `src/lib/useCommunity.ts` | Interface unique entre écrans et (futur) serveur |
| Horloge sûre au pré-rendu | `src/lib/useClock.ts` | Quotas sans `Date.now()` au rendu |
| Lecture → écriture sûre | `useLocalStorage` (`latest`) | Évite d'écraser un état stocké avec un instantané périmé (bug corrigé) |
| Accès conditionnel | `components/v3/community.tsx`, `V3Community.tsx` | Gate + activation |
| Signalement partagé | `components/v3/ReportForm.tsx` | Fiche, conversation, message |
| Lecteur global | `components/v3/PlayerProvider.tsx`, `radio.tsx` | Un lecteur, lecture volontaire |
| Signal de test | `src/lib/testTone.ts` | Tonalité de validation du lecteur (jamais un mix) |

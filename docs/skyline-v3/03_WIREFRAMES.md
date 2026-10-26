# 03 — Wireframes mobile-first

Format : iPhone 375–430 px, basse fidélité, repères numérotés (légendes dans le fichier d'origine **`/v3/wireframes`**, navigable). Le rendu final applique le brand book SKYLINE : palette officielle, wordmark et emblème **fournis** (aucune variante inventée), photographies authentiques, jamais de fausse photo d'événement.

| Écran | Wireframe | Prototype cliquable |
|---|---|---|
| HOME — avant | `wireframes/wf-home.png` | `prototype/01-home-avant.png` |
| HOME — pendant (NOW / LIVE) | `wireframes/wf-now.png` | `prototype/02-home-pendant.png` |
| MY FLIGHT | `wireframes/wf-flight.png` | `prototype/03-my-flight.png` |
| EXPLORE | `wireframes/wf-explore.png` | `prototype/04-explore.png` |
| SKYLINE RADIO | `wireframes/wf-radio.png` | `prototype/05-radio.png` |
| CLUB | `wireframes/wf-club.png` | `prototype/06-club.png` |
| MY SPACE | `wireframes/wf-space.png` | `prototype/07-my-space.png` |
| MEMBERS | `wireframes/wf-members.png` | `prototype/08-members.png` · `14-members-reciprocite.png` |
| Fiche membre | — | `prototype/09-fiche-membre.png` |
| MESSAGES + conversation | `wireframes/wf-messages.png` | `prototype/10-messages.png` · `11-conversation.png` |
| SOUVENIRS | — | `prototype/12-souvenirs.png` |
| Profil & paramètres | — | `prototype/13-profil.png` |
| SKYLINE HQ | `wireframes/wf-hq.png` | (document) |

Vue d'ensemble : `prototype/00-apercu.png`. Plan des écrans : `prototype/plan-des-ecrans.png`.

## Décisions de conception clés
1. **HOME : une seule annonce, une seule action principale** (MY FLIGHT). Pas de widgets.
2. **MY FLIGHT : la distinction pass / titre de transport est permanente**, pas une mention juridique cachée.
3. **Champs officiels = emplacements** (« [À confirmer] ») : l'interface ne peut pas afficher une information que HQ n'a pas publiée.
4. **Annuaire : réciprocité** — pour voir les autres, il faut accepter d'être vu (visibilité désactivée par défaut).
5. **Contact : demande → acceptation → conversation.** Pas de message à un inconnu. Refus silencieux, sans justification.
6. **Messagerie : texte seul**, pas de pièces jointes ni de liens cliquables en V3 (réduit abus et risques de sécurité), pas de « en ligne », pas d'accusé de lecture.
7. **Aucun like, classement, badge ou compteur** ; les notifications sont opt-in et jamais relancées.
8. **Prototype navigable** : tout bouton visible fonctionne (état local, aucun envoi réel).

# 01 — Arborescence des écrans

Principe : **4 onglets**, le profil via l'avatar, **SKYLINE HQ** dans un environnement séparé. Chaque écran a une raison d'être unique ; rien n'est dupliqué entre onglets. Le plan est aussi navigable : `/v3/screens`.

```
SKYLINE APP (membres)
│
├─ HOME ................................ émotion, statut membre, MY FLIGHT en un geste
│   ├─ [avant]  hero photo · slogan · compte à rebours · SKYLINE SIGNAL (1 seule carte)
│   │     └─ Révélation plein écran  /signal/[slug]            (existant en production)
│   ├─ [pendant] hero Ibiza · SKYLINE NOW (prochaine activité confirmée · transfert · annonce équipe)
│   └─ [après]  hero club · accès Souvenirs / Club
│
├─ MY FLIGHT ........................... accès personnel, informations OFFICIELLES uniquement
│   ├─ Pass événementiel SKYLINE (≠ titre de transport — mention permanente)
│   ├─ Réservation (statut, référence)          ← champs « Confirmé / À confirmer »
│   ├─ Départ vérifié (aéroport, date/heure)    ← renseigné par SKYLINE HQ, horodaté
│   ├─ Programme pratique                       ← vide tant que non publié par l'équipe
│   └─ Documents essentiels  → panneau de lecture
│
├─ EXPLORE ............................. culture, musique, Ibiza
│   ├─ SKYLINE RADIO  /explore/radio
│   │     ├─ Sélections officielles   ├─ DJ   └─ Mixes exclusifs   (lecteur réutilisable, jamais d'autoplay)
│   ├─ Line-up (confirmés uniquement, sinon « à annoncer »)
│   ├─ Révélations SIGNAL (liste datée, NEW)    → /signal/[slug]
│   └─ Expériences à Ibiza (validées par l'équipe)
│
├─ CLUB ................................ appartenance, après Ibiza aussi
│   ├─ Carte membre (noir · argent · blanc, emblème officiel)
│   ├─ MY SPACE  /club/space ............ pseudo · ville choisie · description 140 · préférences · visibilité (opt-in)
│   ├─ MEMBERS   /club/members .......... annuaire des profils VISIBLES (réciprocité)
│   │     └─ Fiche membre /club/members/[id] ... demander un contact · bloquer · signaler
│   ├─ MESSAGES  /club/messages ......... Conversations | Demandes
│   │     └─ Conversation /club/messages/[id] ... texte seul · bloquer · signaler
│   ├─ SOUVENIRS /club/memories ......... archives officielles
│   └─ Historique de participation · accès anticipé (uniquement s'il existe réellement)
│
└─ PROFIL & PARAMÈTRES (avatar, partout) /profile
    ├─ Visibilité · qui peut me contacter · membres bloqués
    ├─ Notifications (messages, SIGNAL) — jamais de relance
    └─ Mes données (export · suppression) · Aide & contact

SKYLINE HQ (organisateurs) — application SÉPARÉE, voir 04_SKYLINE_HQ.md
```

## Règles de navigation
- **Retour** : toujours vers l'écran d'origine (historique natif ; panneaux = entrée d'historique dédiée).
- **Pas de 5ᵉ onglet** : MORE est supprimé ; paramètres dans le profil.
- **Profondeur max : 3 niveaux** (onglet → section → détail).
- **États vides explicites** pour tout contenu officiel non publié (« à venir », jamais un faux contenu).
- **Phase du voyage** (avant / pendant / après) : pilotée par des dates configurables côté HQ ; elle change l'ambiance de HOME et l'ordre des blocs de MY FLIGHT et CLUB, **jamais la navigation**.

## Écrans transverses
| Écran | Déclencheur |
|---|---|
| Notifications | Cloche (HOME) |
| Panneau Bloquer / Signaler | Fiche membre, conversation |
| 404 SKYLINE | URL inconnue / brouillon |
| Hors ligne (futur PWA) | Perte de réseau pendant le séjour |

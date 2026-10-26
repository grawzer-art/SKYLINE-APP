# 09 — Spécification des interfaces communautaires

Interfaces **complètes** de MY SPACE, MEMBERS, MESSAGES et SKYLINE RADIO, prototypées dans `/v3` (données fictives, état local). Chaque règle citée est implémentée dans `src/domain/community.ts` (testée) et reflétée par l'interface.

## 0. Accès communautaire (`/v3/club/community`)
Cinq conditions : réservation confirmée (par l'équipe) · compte activé · 18+ (attestation) · charte acceptée · consentement aux fonctions communautaires.
- **Verrouillé** : chaque écran communautaire (MEMBERS, fiche, MESSAGES, conversation) affiche « Accès à la communauté » + l'état de chaque condition ; aucun contenu partiel.
- **Activation** : les trois attestations sont d'abord un *brouillon* ; rien n'est enregistré avant le bouton « Activer la communauté » (acte explicite). Réservation non confirmée → bouton désactivé, message « En attente de confirmation ».
- **Retrait** : « Quitter la communauté » → profil masqué, conversations en pause, plus aucun contact possible ; les données restent jusqu'à demande de suppression.
- Pas de liste de tâches : état des conditions en lecture seule, un seul bouton.

## 1. MY SPACE (`/v3/club/space`)
| Zone | Règles |
|---|---|
| Photo (facultative) | JPG / PNG / WebP, 5 Mo max ; aperçu local ; mention « en cours de vérification avant affichage » (modération avant publication) ; retrait immédiat ; **prototype : jamais envoyée** |
| Pseudo | 2–24 car. ; lettres, chiffres, espaces, `. _ ' -` ; **pas de lien ni d'identifiant** ; erreur annoncée (`role="alert"`) |
| Ville | Liste fermée (pas de saisie libre, jamais de localisation précise) |
| Description | 140 car. max, compteur |
| Préférences musicales | 5 max ; la 6ᵉ est refusée |
| Visibilité | **Désactivée par défaut** ; impossible tant que l'accès communautaire n'est pas ouvert (lien vers l'activation) |
| Qui peut me contacter | Membres visibles / Personne |
| Aperçu | Exactement ce que verront les autres (ou « visible par personne ») |
| Mes éditions | L'espace **persiste d'une édition à l'autre** : Ibiza 2027 + « les prochaines s'ajouteront ici » |
| Mes contacts | Contacts acceptés, accès direct à la conversation |
Enregistrement automatique (local dans le prototype).

## 2. MEMBERS (`/v3/club/members`, `/[id]`)
- **Réciprocité** : profil privé → écran explicatif + « Rendre mon profil visible ».
- Recherche (pseudo / ville), filtre ville, affinités musicales (multi-sélection), compteur annoncé aux lecteurs d'écran.
- **Ordre alphabétique** — aucun classement, aucun score. Pagination (6 puis « Voir plus »).
- Les profils non visibles, bloqués ou soi-même ne sont **jamais** listés (règle testée).
- « En commun : House, Melodic » : affinités partagées, affichées sans notation.
- Quota visible : « Demandes restantes aujourd'hui : 7/10 ».
- **Fiche** : demande de contact avec mot d'introduction facultatif (140 car., mêmes filtres), états *non envoyée / envoyée (annulable) / contact*, blocage, signalement. Une seule modale à contenu variable (pas d'enchaînement de panneaux).
- Limites : 10 demandes / 24 h, 30 en attente ; refus silencieux (le demandeur voit « envoyée ») ; nouvelle demande possible 30 jours après un refus.

## 3. MESSAGES (`/v3/club/messages`, `/[id]`)
- Onglets **Conversations** / **Demandes (n)** (rôles ARIA tab/tabpanel).
- Liste : dernier message, horodatage, **non lus** (compteur privé, aucun accusé de lecture envoyé à l'autre), icône « silencieux ».
- Demandes : mot d'introduction cité, « Voir le profil », Accepter / Refuser (sans justification).
- **Conversation** : texte seul, 500 car. max ; erreurs annoncées et expliquées :
  - lien / e-mail / identifiant de réseau → refusé ; numéro de téléphone → refusé ;
  - rafale (5 messages / 10 s) → « Doucement… » ;
  - hors ligne → composeur désactivé + explication (jamais de message perdu silencieusement).
- **Conseil de sécurité** à la première conversation (masquable).
- Menu : mettre en silencieux, signaler, bloquer, supprimer la conversation (de mon côté).
- **Signaler un message précis** : citation jointe + motif ; bloquer à tout moment.
- Aucun « en ligne », aucun accusé de lecture, aucune pièce jointe.

## 4. SKYLINE RADIO (`/v3/explore/radio`, `/sel/[id]`, `/dj/[id]`)
- À la une · Playlists officielles · DJ · Mixes exclusifs ; pages DJ et playlist.
- **Lecteur global unique** : lecture sur geste uniquement (aucun autoplay, testé), persiste pendant la navigation, pause / position (curseur accessible au clavier) / fermeture ; masqué dans une conversation (le son continue).
- **Contenus : tous « à confirmer »** — aucun titre, artiste ou mix inventé. Sans média autorisé : « Extrait audio indisponible pour le moment ».
- Prototype : un **signal de test** (simple tonalité, clairement étiqueté) permet de valider le comportement du lecteur ; ce n'est pas un contenu musical.

## 5. Langue (français / anglais)
Dictionnaires typés (`src/i18n/fr.ts`, `en.ts`, 223 clés) : le compilateur et un test vérifient mêmes clés, mêmes variables, pluriels (`_one` / `_other`). Les écrans communautaires sont traduits ; les autres écrans du prototype restent en français. Choix de la langue : Profil ou panneau « Simuler le parcours ». Repli automatique sur le français si une clé manque.

## 6. Accessibilité
Cibles ≥ 44 px ; champs étiquetés ; erreurs en `role="alert"` ; état des onglets / interrupteurs / groupes radio exposé ; focus visible ; lecteur et modales utilisables au clavier ; animations réduites respectées ; contraste du texte secondaire > 7:1.

## 7. États couverts
Verrouillé · en attente de réservation · profil privé (réciprocité) · aucun résultat · aucune conversation · aucune demande · quota atteint · trop de demandes en attente · message refusé (4 motifs) · limite de débit · hors ligne · conversation supprimée / bloquée · média indisponible · image manquante · photo invalide.

# STAFF HQ — Phase 2 : MISSIONS (V1)

Branche `feat/staff-missions` (depuis `feat/staff-hq`, qui n'est pas encore fusionnée dans `main`). Non fusionnée.

## Équipe active
TOM (Fondateur), GRAW (Directeur Artistique & Digital), QAFARD (Photographe) — `src/data/staff.ts`. Sarah, Loïck, Bastien : **absents** (leurs identifiants sont refusés partout, testé). Architecture évolutive : chaque membre porte `active: true/false` ; l'annuaire, les responsables et les validateurs lisent `activeMembers()`. Ajouter quelqu'un = une entrée de données + un compte serveur.

## Fonctionnement
- `/staff/missions` (sous l'onglet HQ : toujours 4 onglets ; HQ affiche un aperçu « Missions » avec lien).
- En-tête : compteurs À faire / En cours / Terminées (+ « n en validation », « n en retard »), « Mes missions » / « Toutes » (coordinateurs seulement), filtres membre / statut / priorité, « + Nouvelle mission ».
- Fiche et formulaire dans un panneau unique : titre (obligatoire), description, responsable, validation par, échéance, priorité (normale/haute/urgente), statut (à faire / en cours / en validation / terminée) ; modification ; suppression avec confirmation ; historique simple (création, modification, changement de statut, validation, renvoi).
- **Validation** : un responsable de validation est désigné (jamais l'assigné). « En validation » ≠ terminée : seul le validateur (ou un coordinateur) peut valider (→ Terminée) ou renvoyer en cours.
- Retards : échéance passée et mission non terminée → « En retard · n j », tri prioritaire, compteur.

## Droits (règles pures dans `src/domain/missions.ts`, testées)
| Action | Qui |
|---|---|
| Voir | coordinateur : tout ; sinon : missions dont on est assigné, créateur ou validateur |
| Créer | tout membre ; confier à un autre : coordinateur seulement ; pas de création directe en « Terminée » (hors coordinateur) |
| Changer le statut | assigné : à faire ↔ en cours ↔ en validation (jamais « Terminée ») ; validateur : valider / renvoyer ; coordinateur : tout |
| Modifier / supprimer | créateur ou coordinateur |
**Hypothèse à confirmer** : coordinateur = rôle d'accès `admin` ; dans la démo, Tom et Graw sont admin, Qafard est staff.

## Persistance : LOCALE uniquement
Stockage `localStorage` (clé `skyline.staff.missions.v1`) **de l'appareil** : les trois comptes ne se voient pas entre eux (sur un même appareil, ils partagent les données, ce qui sert à la démonstration). L'interface le dit en permanence. Les droits ci-dessus sont appliqués dans le navigateur : **ils ne protègent rien tant que le serveur ne les applique pas**.

## Modèle pour la synchronisation multi-utilisateur (à faire)
```
missions(id, title, description, assignee_id, creator_id, validator_id, due_date, priority, status, created_at, updated_at)
mission_history(id, mission_id, at, by_user_id, kind, from_status, to_status, note)
```
API serveur (mêmes fonctions que `useMissions`) : `GET /missions` (filtré par droits), `POST /missions`, `PATCH /missions/:id`, `POST /missions/:id/status`, `DELETE /missions/:id`. **Chaque route revérifie la session et les règles de `src/domain/missions.ts` côté serveur** (le module est pur et réutilisable), refuse tout identifiant hors équipe active, écrit l'historique dans la même transaction et ne fait jamais confiance à l'acteur envoyé par le client. Politiques RLS équivalentes en base. Mise à jour en temps réel / notifications : non prévues en V1.

## Tests
tsc ✔ · lint ✔ · build ✔ · unitaires ✔ (dont 29 règles MISSIONS) · e2e v3, v3.2, sound, pass, staff ✔ · **`tests/e2e-missions.cjs`** ✔ : création (titre obligatoire, choix restreints), modification, statuts, validation (≠ terminée ; valider ; renvoyer), filtres combinés, suppression avec confirmation, persistance après rechargement, retards, droits (Qafard / Tom), exemples, HQ + navigation, 375/390/430 px, textes ≥ 11 px, cibles ≥ 40 px. **Non testé** : iPhone réel, multi-appareils (non synchronisé par conception).

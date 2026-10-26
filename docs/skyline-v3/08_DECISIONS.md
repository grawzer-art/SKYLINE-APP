# 08 — Décisions produit validées

Journal des décisions de l'équipe SKYLINE (réponses aux 11 questions du document `00_README.md`) et de leur traduction dans la conception. Toute évolution doit passer par une mise à jour de ce fichier.

| # | Décision validée | Traduction produit / technique | Où |
|---|---|---|---|
| 1 | **Messagerie accessible avant le voyage**, dès que : réservation confirmée + compte activé + fonctions communautaires acceptées | Accès conditionnel à 5 conditions (réservation confirmée, compte activé, 18+, charte, consentement). Un écran explique ce qui manque ; rien de communautaire n'est affiché partiellement. | `domain/community.ts` (`isEligible`), écran `/club/community`, `CommunityGate` |
| 2 | Participants **majeurs (18+)**, conformément aux conditions de l'événement (à vérifier) | Attestation 18+ obligatoire à l'activation ; **la vérification juridique reste à faire** (voir risques) | Activation |
| 3 | **Profils privés par défaut**, visibilité volontaire | Visibilité désactivée à la création ; réciprocité (il faut être visible pour voir les autres) | MY SPACE, MEMBERS |
| 4 | **Demande de contact avant toute conversation** | Demande → acceptation → conversation ; mot d'introduction facultatif (140 car.) ; quotas | MEMBERS, MESSAGES |
| 5 | Accès au CLUB réservé aux **participants vérifiés** | L'accès aux espaces communautaires dépend de l'éligibilité ; la vérification est faite côté serveur (réservation confirmée par l'équipe) | Gate |
| 6 | Messagerie **avant, pendant et après** Ibiza | Aucune coupure à la fin de l'événement ; conservation et retrait gérés par la personne | MESSAGES |
| 7 | **Modération par une équipe SKYLINE désignée**, renforcée pendant le voyage | File de modération (HQ), SLA différenciés, astreinte pendant le séjour | `04_SKYLINE_HQ.md`, `07_…` |
| 8 | Conservation des messages : **hypothèse 12 mois** après la dernière activité, **à confirmer en validation RGPD** ; profils et souvenirs : règles propres | Durée paramétrable (non figée en dur) ; profils : tant que le compte existe ; souvenirs : selon droits | `07_…`, `10_BACKEND_CONTRACT.md` |
| 9 | Base de données **dans l'Union européenne** ; **devis et validation avant tout service payant** | Aucun service n'est connecté ni souscrit. Le contrat serveur est écrit sans présupposer de prestataire. | `10_…`, `06_ROADMAP.md` |
| 10 | **SKYLINE RADIO** : contenus musicaux **autorisés** uniquement | Lecteur global à lecture volontaire ; « indisponible » sans source ; registre des droits obligatoire avant publication | RADIO |
| 11 | Informations de voyage **publiées par l'équipe** à partir de sources confirmées | Saisie humaine dans HQ, validation à deux, horodatage ; l'app n'affiche que du « confirmé » | MY FLIGHT |
| 12 | **Français d'abord, architecture compatible avec l'anglais** | Dictionnaires typés FR/EN (même clés vérifiées par test), pluriels, dates par locale ; écrans communautaires traduits | `src/i18n/` |
| 13 | **Autorisations photographiques vérifiées avant publication** | Photo de profil : modération avant affichage ; souvenirs : droit de retrait ; registre des droits | MY SPACE, SOUVENIRS |
| 14 | **MY SPACE persistant d'une édition à l'autre** | L'espace est rattaché à la personne, pas à l'édition ; « Mes éditions » liste l'historique | MY SPACE |
| 15 | **Ne pas sacrifier la dimension communautaire à la sécurité** | Sécurité par conception : demande/acceptation, quotas, filtres, blocage, signalement, modération — sans supprimer la rencontre avant l'événement | `07_…` |

## Conséquences sur le plan de développement
- La messagerie n'est plus « après l'événement » : elle ouvre **dès la première activation communautaire**, donc **la modération et la validation juridique doivent être prêtes avant l'ouverture à la première personne** (pas avant l'événement). Voir `06_ROADMAP.md` (portes révisées).
- Le prototype couvre désormais les interfaces complètes MY SPACE, MEMBERS, MESSAGES et SKYLINE RADIO ; le développement fonctionnel reste soumis aux portes de sécurité.

## Points encore ouverts
1. **Vérification juridique du 18+** (conditions de l'événement, preuve exigée).
2. **Durée de conservation** définitive des messages (RGPD).
3. Identité et astreinte de l'équipe de modération pendant le séjour.
4. Choix du prestataire d'hébergement UE et budget (devis).
5. Régime des droits de chaque média de la radio.

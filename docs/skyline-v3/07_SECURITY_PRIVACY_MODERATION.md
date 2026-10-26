# 07 — Sécurité, confidentialité et modération

Contraintes à respecter **avant** toute connexion de vrais comptes, messages ou réservations. Elles s'appliquent à l'app membres et à SKYLINE HQ. *(Document de conception : à faire valider par un juriste / DPO ; il ne constitue pas un avis juridique.)*

## 1. Principes
1. **Minimisation** : ne collecter que pseudo, ville choisie, description, préférences, photo (facultative) ; jamais de localisation précise, ni de date de naissance exacte, ni de numéro de téléphone.
2. **Opt-in partout** : visibilité, demandes de contact, notifications — désactivés par défaut.
3. **Contrôle par la personne** : modifier, masquer, exporter, supprimer à tout moment.
4. **Pas de pistage** : aucune publicité, aucun profilage de comportement, aucun « en ligne », aucun accusé de lecture.
5. **Sécurité par défaut** : l'interface ne peut pas afficher ce que le serveur n'a pas autorisé.

## 2. Identité et accès
- Invitation personnelle → lien de connexion à usage unique (pas de mot de passe, pas de connexion sociale). Durée courte, rotation, limites de débit.
- Attestation **18+** ; compte rattaché à une réservation.
- Appareil : session renouvelable, déconnexion à distance.
- HQ : double authentification obligatoire, rôles, validation à deux pour les informations de voyage et annonces importantes, journal d'audit non modifiable.

## 3. Confidentialité des profils
| Règle | Détail |
|---|---|
| Visibilité | **Désactivée par défaut** ; réversible ; effet immédiat (le profil disparaît des résultats) |
| Réciprocité | Voir les autres = être visible soi-même |
| Filtrage serveur | Un profil non visible, bloqué ou suspendu n'est **jamais envoyé** au client (pas de masquage côté interface) |
| Données affichées | Pseudo, ville (liste fermée), description ≤ 140 car., préférences ≤ 5, photo facultative |
| Énumération | Pas d'identifiant séquentiel ; limites de débit sur la recherche ; pas d'export de liste |
| Photo | Recadrage carré, métadonnées (EXIF/GPS) supprimées, **modération avant affichage** |

## 4. Contact et messagerie
- **Demande → acceptation → conversation** ; aucun message à un inconnu.
- Quotas : max. 10 demandes par jour et 30 en attente ; après un refus, pas de nouvelle demande pendant 30 jours ; refus **silencieux**.
- Réglage « qui peut me demander un contact » : membres visibles / personne.
- **Texte seul** (pas de pièce jointe, pas de lien cliquable en V3) ; 500 caractères max ; limites de débit ; filtres automatiques (liens, numéros de téléphone, motifs de spam).
- **Blocage** : immédiat, réciproque (le bloqué ne voit plus, n'écrit plus, n'est pas prévenu), annulable.
- Conservation : 12 mois après la dernière activité, puis purge ; suppression d'une conversation de son côté à tout moment.
- Chiffrement en transit ; chiffrement au repos ; **pas de lecture des conversations par l'équipe**, sauf contexte joint à un signalement.
- Conseils de sécurité à la première conversation (courts, non paternalistes) ; contact d'urgence de l'équipe sur place.

## 4 bis. Interdits de produit (non négociables)
Publications publiques, likes, classements, badges, scores, séries/quotas d'usage, notifications de relance, statut « en ligne », accusés de lecture, géolocalisation, recommandations par algorithme opaque, vente ou partage de données à des tiers.

## 4 ter. Messagerie avant le voyage : risques propres et réponses
Décision : la messagerie ouvre avant l'événement. Des personnes qui ne se connaissent pas peuvent donc échanger pendant des mois. Réponses retenues (sans retirer la fonction) :
| Risque | Réponse |
|---|---|
| Sollicitation / harcèlement | Demande → acceptation ; quotas (10/jour, 30 en attente) ; refus silencieux ; blocage réciproque immédiat |
| Sortie de la plateforme (réseaux, téléphone) | Messages en texte seul ; liens, e-mails, identifiants et numéros refusés (filtre **indicatif**, voir limites) ; conseil de sécurité à la première conversation |
| Usurpation / faux profils | Compte rattaché à une réservation confirmée ; pseudo contrôlé ; photo modérée ; signalement « faux profil » |
| Mineurs | 18+ attesté, vérifié selon les conditions de l'événement (à valider juridiquement) |
| Fuite de profils | Profils privés par défaut ; filtrage serveur ; pas d'énumération ; pas d'export de liste |
| Rafales / spam | Limite de débit (5 messages / 10 s) |
| Abus non détectés | Signalement d'un message précis, contexte joint, modération humaine, sanctions graduées, appels |
| Incident grave | Interrupteur d'urgence + procédure d'escalade + astreinte (renforcée pendant le séjour) |

**Limites assumées des filtres :** un filtre par motifs est **contournable** (écriture détournée, espaces, abréviations). Il réduit le bruit mais ne remplace ni les signalements ni la modération humaine ; il doit être complété côté serveur (et éventuellement par des outils de détection plus avancés, soumis à validation et à analyse d'impact).

## 5. Modération
### Signalement
Motifs : comportement inapproprié, faux profil / usurpation, spam ou sollicitation, autre. Depuis la fiche membre et la conversation. Les **derniers messages** de la conversation sont joints au signalement (seul contenu lu par la modération). Accusé de réception neutre au signaleur ; **le signalé n'est pas informé**.

### Traitement (HQ › Modération)
| Priorité | Cas | Délai cible |
|---|---|---|
| Urgente | Menace, harcèlement grave, contenu illégal, danger sur place | < 1 h pendant le séjour, escalade immédiate |
| Normale | Spam, faux profil, comportement inapproprié | < 24 h |

Échelle de sanctions : clôture → avertissement → restriction (demandes/messages) → suspension → exclusion. Toute décision est motivée, journalisée et **contestable** (procédure d'appel). Les cas graves peuvent être transmis aux autorités.

### Modérateurs
Rôle dédié, formés, accès limité au contexte du signalement, charte de confidentialité signée, rotation et soutien. Aucun modérateur ne peut s'auto-attribuer un cas qui le concerne.

## 6. Contenus et médias
- **Registre des droits** pour tout audio, vidéo et photo officiels (ayant droit, périmètre, durée) : pas de publication sans entrée valide.
- Photographies de personnes : consentement et **droit de retrait** (suppression sous 72 h après demande).
- Aucun média privé exposé par une URL publique ; accès signés et temporaires pour les médias réservés.
- Les **brouillons** ne sont jamais envoyés au navigateur (déjà appliqué et testé en production).

## 7. RGPD
Base légale (contrat / consentement selon le traitement), registre des traitements, **analyse d'impact** (messagerie entre participants, données de voyage), hébergement UE, sous-traitants encadrés, durées de conservation écrites, droits (accès, export, rectification, effacement, opposition) accessibles dans Profil › Mes données, procédure de violation de données (notification sous 72 h).

## 8. Sécurité technique (liste de contrôle)
- Règles d'accès **au niveau des lignes** : un membre ne lit que ses données, les profils visibles et ses conversations.
- Validation côté serveur de toutes les entrées ; protection CSRF / XSS (en-têtes de sécurité, politique de contenu) ; échappement systématique du texte des messages.
- Limites de débit (connexion, recherche, demandes, messages) ; détection d'abus.
- Secrets hors du dépôt ; moindre privilège ; sauvegardes chiffrées et restauration testée.
- Journal d'audit (HQ) ; alertes sur actions sensibles.
- **Test d'intrusion avant l'ouverture de la messagerie** ; revue des dépendances.
- Accessibilité : cibles ≥ 44 px, VoiceOver, taille dynamique, contrastes ; animations réduites respectées.

## 9. Conditions de mise en ligne (portes)
| Porte | Condition |
|---|---|
| Comptes réels | P0 juridique validé, authentification testée |
| Annuaire | Filtrage serveur testé (énumération), file de modération prête |
| **Messagerie (dès la 1re activation)** | **Modération opérationnelle + analyse d'impact validée + validation du 18+ + test d'intrusion + équipe joignable + interrupteur d'urgence** |
| Médias | Registre des droits renseigné |
| Informations de voyage | Validation à deux + horodatage |

## 10. Ce que le prototype fait — et ne fait pas
Le prototype V3 (`/v3`) illustre ces règles (visibilité par défaut off, réciprocité, quotas non simulés, blocage, signalement, texte seul) mais **n'applique aucune sécurité** : tout reste dans la mémoire locale de l'appareil, aucun compte, message ou réservation réel n'existe.

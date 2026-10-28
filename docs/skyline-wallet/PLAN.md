# SKYLINE PASS → Apple Wallet : étude de faisabilité et plan technique

**Verdict : faisable depuis Next.js/Vercel, mais uniquement une fois que le système de réservation et un compte Apple Developer existent.** Rien n'est implémenté dans l'app (pas de faux bouton Wallet). Cette étude s'appuie sur la documentation PassKit d'Apple telle que je la connais ; je n'ai pas pu la consulter en ligne depuis cet environnement : **chaque point marqué (à vérifier) doit être confirmé sur developer.apple.com avant de s'engager.**

## 1. Prérequis
| Prérequis | Détail | Coût |
|---|---|---|
| Apple Developer Program | Compte organisation SKYLINE (ou individuel) — obligatoire pour obtenir un certificat de pass | ~99 USD / an (à vérifier) |
| Pass Type ID | Identifiant `pass.<domaine>.skyline` créé dans Certificates, Identifiers & Profiles | inclus |
| Certificat Pass Type ID | CSR généré par SKYLINE → certificat `.cer` → export `.p12`/PEM (clé privée + certificat) | inclus (valable ~1 an, **à renouveler**, sinon plus de nouveaux passes ni mises à jour) |
| Certificat intermédiaire WWDR | Apple Worldwide Developer Relations (G4), téléchargeable chez Apple | gratuit |
| Team ID | Identifiant d'équipe Apple (dans `pass.json`) | inclus |
| Visuels | `icon.png` (29/58/87 px), `logo.png`, éventuellement `strip`/`thumbnail`, à partir des **visuels officiels** SKYLINE | — |
| HTTPS | Domaine de production (Vercel : inclus) | — |
Aucun abonnement tiers n'est nécessaire côté code : bibliothèque open source (`passkit-generator`, MIT, à vérifier) ou génération manuelle (zip + manifeste + signature).

## 2. Architecture cible
1. **Réservation vérifiée** (futur système) → déclenche l'émission d'un pass : un pass = un participant = une réservation.
2. **Route serveur Node.js** (`app/api/wallet/pass/route.ts`, runtime `nodejs`, jamais Edge) : vérifie la session du membre, charge sa réservation, construit le pass et répond `Content-Type: application/vnd.apple.pkpass`.
3. **Contenu du pass** (`pass.json`, style `eventTicket`) : `passTypeIdentifier`, `teamIdentifier`, `serialNumber` (UUID unique), `organizationName`, `description`, couleurs Jet Black / Cloud White / Sky Blue, champs : participant, édition « Ibiza 2027 », trajet « France → Ibiza », statut ; `relevantDate` (date de l'événement, une fois confirmée) ; `barcodes` : QR (`PKBarcodeFormatQR`).
4. **Signature** : `manifest.json` (SHA-1 de chaque fichier du pass) signé en PKCS#7 détaché avec le certificat Pass Type ID + WWDR, puis archive `.pkpass` (zip). Clés/certificats dans des **variables d'environnement Vercel chiffrées** (jamais dans le dépôt).
5. **QR code unique** : jeton opaque, long et non devinable (≥ 128 bits), lié côté serveur à `{réservation, pass, version}` ; **aucune donnée personnelle dans le QR**. Validation à l'entrée : endpoint authentifié (agents SKYLINE) qui vérifie existence, statut (valide / révoqué / déjà scanné) et journalise. Jeton révocable et régénérable si un pass fuite.
6. **Mises à jour du pass** (changement d'horaire, de statut…) : champs `webServiceURL` + `authenticationToken` dans `pass.json`, et implémentation des routes PassKit Web Service : enregistrement/désinscription d'un appareil, liste des passes modifiés depuis une date, récupération du dernier pass ; notification par **APNs** (push vide) vers le token d'appareil enregistré. Exige une **base de données persistante** (appareils enregistrés, version des passes) — hébergement UE conforme à la décision produit.
7. **Bouton** : uniquement le badge officiel « Ajouter à Apple Wallet » (ressources officielles Apple, **à télécharger et à utiliser sans modification**, selon les consignes de marque d'Apple ; je ne le recrée pas). Affiché seulement si : réservation confirmée + pass émis + appareil iOS/macOS compatible. Sinon : rien (pas de bouton factice).

## 3. Points d'attention
- **PWA installée sur iPhone** : l'ouverture d'un `.pkpass` depuis une PWA standalone peut être bloquée ou mal gérée (à tester) ; solution de repli : ouvrir le lien dans Safari (`target=_blank`) ou proposer le pass par e-mail/lien.
- **Navigateurs** : l'ajout fonctionne depuis Safari iOS/macOS ; Chrome iOS peut ne pas proposer l'ajout (à vérifier).
- **Android** : Google Wallet est l'équivalent (compte Issuer Google, API REST, gratuit en principe — à vérifier) ; à prévoir si des participants Android sont concernés.
- **Sécurité** : certificats en variables chiffrées, rotation annuelle, journalisation des émissions, rate-limit sur l'émission, protection contre l'énumération des `serialNumber`.
- **RGPD** : minimiser les données dans le pass (prénom/pseudo, édition) ; le QR ne contient aucune donnée personnelle ; durée de conservation des enregistrements d'appareils à définir.
- **Distinction légale** : le pass est un pass événementiel, jamais une carte d'embarquement ni un titre de transport (mention conservée sur le pass).

## 4. Dépendances avec le futur système de réservation
1. Identité fiable du participant (compte authentifié) et lien compte ↔ réservation.
2. Statut de réservation officiel (confirmée / annulée / modifiée) qui déclenche émission, mise à jour ou révocation du pass.
3. Source officielle des horaires/lieux publiés (alimente `relevantDate`, champs et mises à jour).
4. Base de données UE (pass, jetons de QR, appareils enregistrés).
5. Application de contrôle d'accès (scan) côté équipe, avec comptes agents.

## 5. Plan de réalisation (ordre conseillé)
1. Créer le compte Apple Developer, le Pass Type ID et le certificat ; stocker en variables d'environnement.
2. Prototype hors production : générer **un pass de test signé** (données fictives, marquées « Démo ») et l'ouvrir sur un iPhone réel — valide la chaîne certificat/signature avant tout le reste.
3. Brancher l'émission sur une réservation vérifiée + jeton QR unique.
4. Endpoint de validation du QR + outil de scan équipe.
5. PassKit Web Service + APNs + base de données pour les mises à jour.
6. Bouton officiel, tests iPhone (Safari et PWA), recette, revue de conformité Apple.
Ordre de grandeur : chaîne de signature de test ≈ 1 à 2 jours ; émission + QR + validation ≈ 1 semaine ; mises à jour (web service + APNs) ≈ 1 semaine ; hors dépendance au système de réservation.

## 6. Coûts
- Obligatoire : Apple Developer Program (~99 USD/an).
- Aucun autre service payant requis par la solution (calcul serverless, APNs et bibliothèque open source gratuits ; base de données UE selon l'offre retenue, **devis à valider avant tout engagement**).

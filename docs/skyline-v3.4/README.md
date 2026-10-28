# V3.4 — HOME et MY FLIGHT épurés

Branche `design/v3.4-home-flight-epure` (depuis `main`). Non fusionnée. Rien touché : SKYLINE SOUND, mini-lecteur, animations 3D du pass, Apple Wallet, autres écrans.

**HOME** : slogan, grand visuel, compte à rebours, accès My Flight et dernière annonce conservés. Identité réduite au nom, sur-titre « Pre-boarding » (sans « / 2027 »), plus d'espace entre slogan, compte à rebours et annonce. Annonce allégée : sans bordure ni libellé « Signal » ni badge NEW encadré (simple point bleu + libellé masqué pour les lecteurs d'écran), flèche ronde à la place de « Découvrir ».
**MY FLIGHT** : pass agrandi comme pièce maîtresse (nom plus grand, emblème 54 px, QR 96 px), titre de page réduit, sur-titre de phase retiré. Libellés « Participant », « Accès », « N° de pass / Attribué par l'équipe » retirés ; conservés : nom, édition, destination, statut d'accès, QR, « Pas un titre de transport », mention Démo. Onglets « Vol / Séjour / Infos » (sans numérotation) ; « Informations importantes » (légal, documents) déplacé dans l'onglet Infos (et dans l'écran « après Ibiza »).
Tests : tsc, lint, build, unitaires, e2e v3 / v3.2 (nouveaux contrôles V3.4) / sound / pass ✔. Non testé sur iPhone réel.

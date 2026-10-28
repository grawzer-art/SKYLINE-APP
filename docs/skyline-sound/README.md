# SKYLINE SOUND — prototype SoundCloud

Branche `feat/skyline-sound` (non fusionnée). Route `/v3/explore/sound` ; l'ancienne `/v3/explore/radio` y redirige. Liens Explore, Home et Club mis à jour. Aucune authentification, aucun autre onglet touché, aucun service payant.

## Ce qui est construit
- `src/data/sound.ts` : **fichier de configuration** des 4 collections (Sunset Club, Above The Clouds, After Hours, Island Mode). `soundcloudUrl: null` partout : **aucun lien inventé**. Coller l'URL publique SoundCloud d'une playlist suffit.
- `src/domain/sound.ts` : validation stricte (https + domaines soundcloud.com uniquement) et construction de l'URL du widget officiel (`auto_play=false`).
- `src/components/v3/SoundCloudEmbed.tsx` : iframe officielle `w.soundcloud.com/player` + API officielle du widget **uniquement pour lire l'état** (prêt / lecture / pause / erreur). Aucun faux lecteur, aucun fichier audio téléchargé ou réhébergé, aucun élément du widget masqué, lien « Écouter sur SoundCloud » en secours. L'iframe et le script SoundCloud ne sont chargés **qu'après le choix d'une collection** (aucune requête tierce à l'ouverture de la page).
- `src/components/v3/V3Sound.tsx` : pochettes (visuels authentiques sans visage), états « Bientôt », état vide global, champ prototype « Tester une URL SoundCloud » pour essayer n'importe quelle URL embarquable sans modifier le code.
- Le lecteur radio factice précédent n'est plus lié (pages `radio/dj` et `radio/sel` conservées mais orphelines) ; la lecture SoundCloud ferme l'éventuel lecteur interne.

## Tests exécutés
tsc ✔ · lint ✔ · build ✔ · unitaires (45 + 7 + 16 nouveaux) ✔ · e2e v3, v3.2 et sound ✔.
**Limites importantes** : depuis l'environnement de développement, `soundcloud.com` et `w.soundcloud.com` sont **bloqués** (403 proxy). Donc :
- la **lecture réelle SoundCloud n'a PAS été testée** ; les tests e2e utilisent un faux widget (route interceptée) pour valider *notre* intégration (états, erreurs, mises en page 375/390/430, animations réduites) ;
- le cas « SoundCloud injoignable » a lui été testé pour de vrai (message d'erreur + lien de secours) ;
- **Safari iPhone et PWA installée : non testés** (pas d'iPhone, pas de WebKit ici). Les conditions et la documentation SoundCloud n'ont pas pu être consultées à la source (developers.soundcloud.com injoignable).

## Points à vérifier avant production (bloquants potentiels)
1. **Conditions SoundCloud** : lire les Terms of Use (section « players and widgets », qui interdit notamment de construire un service de streaming concurrent) et les API Terms, pour un usage dans une application commerciale privée réservée aux membres. À faire valider par SKYLINE.
2. **Droits** : n'intégrer que des playlists appartenant à SKYLINE ou dont l'ayant droit a donné son accord ; l'intégration doit être activée côté SoundCloud (« Embeddable »). Les titres restreints (région, offre payante) peuvent n'offrir qu'un extrait : à contrôler avec les vraies URL.
3. **Lecture en arrière-plan / écran verrouillé / PWA iOS** : non vérifiable ici et rien n'est promis dans l'interface (mention : « dépend de votre appareil et n'est pas garantie »). À tester sur iPhone réel (Safari et PWA) : démarrage au toucher, pause au verrouillage, reprise après retour dans l'app, navigation pendant la lecture (le lecteur est dans la page : quitter l'écran arrête l'iframe, contrairement à l'ancien mini-lecteur global).
4. **Confidentialité (RGPD / ePrivacy)** : le widget dépose des traceurs SoundCloud ; prévoir la mention dans la politique de confidentialité et, si nécessaire, un consentement avant chargement (aujourd'hui : chargement uniquement après le geste de sélection).
5. Aucun CSP n'est défini aujourd'hui ; si un CSP est ajouté, autoriser `frame-src` et `script-src` `https://w.soundcloud.com`.

## Pour passer à un test réel
Coller une URL de playlist SoundCloud embarquable dans `src/data/sound.ts` (ou dans le champ « Tester une URL » de la page), ouvrir la Preview sur iPhone, puis dérouler la liste du point 3.

## Validation réelle — SUNSET CLUB (provisoire)
URL renseignée : `https://soundcloud.com/luk_music/sets/afro-house-remix-songs-afro` (playlist « AFRO HOUSE REMIX SONGS » du compte LUK, trouvée par recherche web ; l'adresse vient du paramètre `in=` des pages de ses mixes).
**Non vérifiés depuis cet environnement (SoundCloud bloqué)** : que la playlist soit toujours en ligne, que le propriétaire autorise l'intégration, que la lecture démarre. Ces mixes sont majoritairement des remixes de titres connus (Tiësto, Guetta, Rihanna…) : **inadaptés à une production** (droits). Les trois autres collections restent à `null`.
À tester à la main sur iPhone : voir la liste du message de livraison.

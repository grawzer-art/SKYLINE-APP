# Polices SKYLINE
Déposer ici les fichiers licenciés Helvetica Now (.woff2) :
- `HelveticaNowDisplay-ExtendedBold.woff2` (titres)
- `HelveticaNowText-Regular.woff2`, `HelveticaNowText-Medium.woff2` (texte)

Puis, dans `src/app/globals.css`, ajouter à chaque `@font-face` correspondant :
`src: local("…"), url("/fonts/<fichier>.woff2") format("woff2");`
Tant que les fichiers sont absents, le substitut OFL Archivo (titres) et Helvetica Neue / Arial (texte) s'applique.

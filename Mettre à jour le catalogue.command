#!/bin/zsh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
node catalogue.mjs || { read "?Échec. Appuyez sur Entrée pour fermer."; exit 1; }
# Republie la page en ligne (https://jeanml250.github.io/recherche-joueur-lexer/)
if [ -d .git ] && ! git diff --quiet catalogue.js; then
  git add catalogue.js && git commit -q -m "Catalogue Bowl4U du $(date +%Y-%m-%d)" && git push -q && echo "Page en ligne mise à jour (1 à 2 minutes)."
fi
echo; read "?Terminé. Appuyez sur Entrée pour fermer."

#!/bin/zsh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
node catalogue.mjs
echo; read "?Terminé. Appuyez sur Entrée pour fermer."

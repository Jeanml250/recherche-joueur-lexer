@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
node catalogue.mjs
if exist .git (
  git add catalogue.js
  git commit -q -m "Catalogue Bowl4U"
  git push -q
)
pause

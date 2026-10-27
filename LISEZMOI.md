# Recherche d'un quilleur — résultats EZ Lexer

Cherche un joueur dans toutes les ligues et tous les tournois publiés sur Bowl4U
(la page `lexerbowling.com/gotobowl4u` renvoie vers ce site) et produit une fiche imprimable :
date, salon, ligue, parties, moyenne, puis un résumé par variante du nom.

## Utilisation

**Mac** : double-cliquer sur `Lancer.command`. **Windows** : double-cliquer sur `Lancer.bat`.
(Node.js doit être installé : https://nodejs.org)

La page s'ouvre dans le navigateur. La fenêtre noire affiche aussi une adresse du genre
`http://192.168.1.25:8790` : la taper dans Safari ou Chrome sur un iPhone, un iPad ou un
Android branché **sur le même Wi-Fi** pour s'en servir là aussi. Laisser la fenêtre ouverte.

1. Choisir la ou les **saisons** (août à juillet), le **pays**, puis le ou les **salons**.
   Chaque liste a une case « Tout cocher » ; la liste des salons a un filtre.
2. Cocher **Ligues**, **Tournois** ou les deux.
3. Taper le **nom du joueur** et appuyer sur **Rechercher**.
4. La liste **Variantes du nom** se remplit avec chaque orthographe trouvée
   (identique, mots inversés, orthographe proche, nom abrégé ou complété).
   Les noms identiques sont cochés d'office ; cocher les autres s'il s'agit du même joueur.
   La fiche se met à jour à chaque case.
5. **Imprimer la fiche** (ou « Enregistrer en PDF » dans la fenêtre d'impression).

La recherche lit les pages en direct sur bowling.lexerbowling.com : les moyennes sont donc
toujours à jour. Plus il y a de salons et de saisons cochés, plus la lecture est longue
(environ 1 à 2 secondes par tranche de 10 ligues).

## Mettre à jour la liste des salons et des ligues

La liste des salons et des ligues (le catalogue) vient de Bowl4U, qui ne s'affiche que dans
un vrai navigateur. Pour l'actualiser (nouvelle saison, nouveau tournoi) :
double-cliquer sur `Mettre à jour le catalogue.command` (Mac) ou
`Mettre a jour le catalogue.bat` (Windows). Il faut Google Chrome ou Microsoft Edge.
Compter une quinzaine de minutes pour le monde entier ; pour un seul pays, en Terminal :

```bash
node catalogue.mjs CA
```

## Fichiers

- `index.html` : la page de recherche (formulaire et fiche).
- `catalogue.js` : salons et événements, produit par `catalogue.mjs`.
- `serveur.mjs` : serveur web local (ordinateur + appareils du même Wi-Fi).

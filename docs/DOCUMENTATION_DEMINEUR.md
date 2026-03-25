# DOCUMENTATION_DEMINEUR.md — Plan d'implémentation du jeu Démineur

Ce document est le guide de réalisation du jeu Démineur dans le cadre du projet PlaygroundJS. Chaque bloc est indépendant et correspond à un commit logique. Le projet peut être repris à n'importe quelle étape en consultant ce plan.

> **Prérequis :** la Phase 0 (Shell / Infrastructure) doit être implémentée avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

---

## Vue d'ensemble de la chaîne de commits

```
Bloc 01 — constantesDemineur
Bloc 02 — Cellule (modèle)
Bloc 03 — GenerateurMines
Bloc 04 — GrilleDemineur (grille 2D + accès cellules)
Bloc 05 — FloodFill (expansion des cellules vides)
Bloc 06 — Jeu (orchestrateur interne)
Bloc 07 — JeuDemineur (adaptateur InterfaceJeu)
Bloc 08 — PlateauDemineur (rendu DOM de la grille)
Bloc 09 — DemineurUI (HUD, timer, sélecteur de difficulté)
Bloc 10 — DemineurScoresUI (tableau des scores)
Bloc 11 — CSS Démineur
Bloc 12 — Intégration finale et recette
```

> **Note :** les blocs Profil, GestionnaireProfils, Score et DepotScores sont gérés par la Phase 0 (shell partagé). Ils ne sont plus spécifiques au Démineur.

---

## Bloc 01 — constantesDemineur

### Objectif
Centraliser toutes les valeurs numériques et chaînes de configuration spécifiques au Démineur dans `js/jeux/demineur/constantesDemineur.js`. Aucun magic number ne doit apparaître dans le reste du code du démineur.

### Fichier : `js/jeux/demineur/constantesDemineur.js`

```js
// Niveaux de difficulté
export const DIFFICULTES = Object.freeze({
  FACILE: {
    id: 'facile',
    nom: 'Facile',
    colonnes: 9,
    lignes: 9,
    mines: 10,
  },
  MOYEN: {
    id: 'moyen',
    nom: 'Moyen',
    colonnes: 16,
    lignes: 16,
    mines: 40,
  },
  DIFFICILE: {
    id: 'difficile',
    nom: 'Difficile',
    colonnes: 30,
    lignes: 16,
    mines: 99,
  },
});

// Difficulté par défaut au lancement
export const DIFFICULTE_PAR_DEFAUT = DIFFICULTES.FACILE;

// Timer
export const INTERVALLE_TIMER_MS = 1000;
export const TEMPS_MAX_AFFICHE = 999;

// États d'une cellule (pour la logique interne)
export const ETATS_CELLULE = Object.freeze({
  CACHEE:   'cachee',
  REVELEE:  'revelee',
  DRAPEAU:  'drapeau',
});

// Classes CSS des cellules
export const CSS_GRILLE           = 'demineur__grille';
export const CSS_CELLULE          = 'demineur__cellule';
export const CSS_CELLULE_CACHEE   = 'demineur__cellule--cachee';
export const CSS_CELLULE_REVELEE  = 'demineur__cellule--revelee';
export const CSS_CELLULE_DRAPEAU  = 'demineur__cellule--drapeau';
export const CSS_CELLULE_MINE     = 'demineur__cellule--mine';
export const CSS_CELLULE_EXPLOSION = 'demineur__cellule--explosion';
export const CSS_CELLULE_ERREUR   = 'demineur__cellule--erreur';

// Préfixe pour les classes CSS de chiffres (1 à 8)
// Utilisation : `demineur__cellule--n1`, `demineur__cellule--n2`, etc.
export const CSS_PREFIXE_NOMBRE = 'demineur__cellule--n';

// Couleurs des chiffres 1-8 (référence pour le CSS, pas utilisé en JS)
// 1=bleu, 2=vert, 3=rouge, 4=bleu foncé, 5=rouge foncé, 6=teal, 7=noir, 8=gris

// Vecteurs des 8 voisins (deltaLigne, deltaColonne)
export const VOISINS = Object.freeze([
  { dl: -1, dc: -1 }, { dl: -1, dc: 0 }, { dl: -1, dc: 1 },
  { dl:  0, dc: -1 },                     { dl:  0, dc: 1 },
  { dl:  1, dc: -1 }, { dl:  1, dc: 0 }, { dl:  1, dc: 1 },
]);
```

> Les clés localStorage ne sont pas ici. Elles sont gérées par `DepotLocal` du shell avec le namespace `playground_global`.

### Vérification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur. Vérifier que `DIFFICULTES.FACILE.mines` vaut `10`.

### Texte du commit
```
feat(demineur): constantes spécifiques au jeu Démineur

Toutes les valeurs configurables du Démineur (difficultés, timer,
états de cellule, classes CSS, vecteurs voisins) sont centralisées
dans constantesDemineur.js.
```

---

## Bloc 02 — Cellule (modèle)

### Objectif
Créer la classe `Cellule` qui modélise une case individuelle de la grille. Cette classe est un pur modèle de données : elle ne touche jamais au DOM.

### Fichier : `js/jeux/demineur/Cellule.js`

**Propriétés internes :**
- `this.ligne` : entier, position verticale dans la grille
- `this.colonne` : entier, position horizontale dans la grille
- `this.estMine` : booléen, `false` par défaut (mis à `true` par le générateur)
- `this.estRevelee` : booléen, `false` par défaut
- `this.estDrapeau` : booléen, `false` par défaut
- `this.nbMinesAdjacentes` : entier, 0 par défaut (calculé après placement des mines)

**Interface publique :**
```js
class Cellule {
  constructor(ligne, colonne)

  reveler()                  // marque la cellule comme révélée (ignore si drapeau posé)
  basculerDrapeau()          // toggle drapeau (uniquement si cellule cachée)
  placerMine()               // marque la cellule comme mine
  definirMinesAdjacentes(n)  // setter pour nbMinesAdjacentes

  get estVide()              // true si pas mine ET nbMinesAdjacentes === 0
  get estCachee()            // true si ni révélée ni drapeau

  reinitialiser()            // remet tous les flags à leur état initial
}
```

**Règles métier :**
- `reveler()` : ne fait rien si la cellule a un drapeau (protection contre le clic accidentel) ou si elle est déjà révélée. Met `estRevelee` à `true`.
- `basculerDrapeau()` : ne fonctionne que sur une cellule cachée (ni révélée ni déjà en cours de révélation). Toggle `estDrapeau` entre `true` et `false`.
- `placerMine()` : met `estMine` à `true`. Appelé uniquement par le `GenerateurMines`.

**Dépendances :** aucune (modèle pur).

### Vérification
Instancier une `Cellule(3, 5)`. Vérifier : `estMine === false`, `estRevelee === false`. Appeler `placerMine()` → `estMine === true`. Appeler `basculerDrapeau()` → `estDrapeau === true`. Appeler `reveler()` → `estRevelee` reste `false` (protégé par le drapeau). Retirer le drapeau, `reveler()` → `estRevelee === true`.

### Texte du commit
```
feat(demineur): implémentation de Cellule — modèle de données

Classe modèle pure pour une case de la grille. Gère les états
(mine, révélée, drapeau, nombre adjacent) sans couplage au DOM.
Le drapeau protège contre la révélation accidentelle.
```

---

## Bloc 03 — GenerateurMines

### Objectif
Créer la classe `GenerateurMines` qui place les mines aléatoirement sur la grille en respectant la zone de sécurité du premier clic, puis calcule les compteurs d'adjacence.

### Fichier : `js/jeux/demineur/GenerateurMines.js`

**Interface publique :**
```js
class GenerateurMines {
  constructor()

  generer(grille, nbMines, ligneCliquee, colonneCliquee)
  // - grille : tableau 2D de Cellule
  // - nbMines : nombre de mines à placer
  // - ligneCliquee, colonneCliquee : position du premier clic (zone exclue)
}
```

**Algorithme de placement (`generer`) :**
1. Construire l'ensemble des positions exclues : la cellule cliquée `(ligneCliquee, colonneCliquee)` et ses 8 voisins (ceux qui sont dans les limites de la grille). Cela crée une zone de sécurité de 9 cases maximum.
2. Construire la liste de toutes les positions éligibles : toutes les positions `(l, c)` de la grille qui ne sont PAS dans la zone exclue.
3. Mélanger cette liste (algorithme de Fisher-Yates).
4. Prendre les `nbMines` premières positions du tableau mélangé.
5. Pour chaque position sélectionnée : appeler `grille[l][c].placerMine()`.
6. Après le placement de toutes les mines : calculer les compteurs d'adjacence.

**Calcul d'adjacence (`_calculerAdjacences` privé) :**
- Pour chaque cellule de la grille qui n'est PAS une mine :
  - Compter le nombre de voisins (8 directions, via `VOISINS`) qui sont des mines
  - Appeler `cellule.definirMinesAdjacentes(compteur)`

**Méthode utilitaire (`_obtenirVoisins` privé) :**
```js
_obtenirVoisins(grille, ligne, colonne)
// Retourne un tableau de Cellule : les voisins valides (dans les limites)
```

**Sécurité du premier clic :**
Les mines ne sont JAMAIS placées avant le premier clic. C'est `Jeu` qui appelle `generer()` au moment du premier clic, pas avant. Cela garantit que le premier clic ouvre toujours une zone sûre (au moins 1 cellule, souvent plus grâce au flood fill sur la zone vide).

**Dépendances :** `VOISINS` depuis `./constantesDemineur.js`

### Vérification
Créer une grille 9x9 de `Cellule`. Appeler `generer(grille, 10, 4, 4)`. Vérifier :
- Exactement 10 cellules ont `estMine === true`
- Aucune mine dans la zone 3x3 autour de (4, 4)
- Les compteurs `nbMinesAdjacentes` sont corrects pour quelques cellules vérifiées à la main

### Texte du commit
```
feat(demineur): implémentation de GenerateurMines — placement procédural

Placement aléatoire des mines par Fisher-Yates avec zone d'exclusion
autour du premier clic (9 cases). Calcul automatique des compteurs
d'adjacence après placement. Aucune mine possible sur le premier clic.
```

---

## Bloc 04 — GrilleDemineur (grille 2D + accès cellules)

### Objectif
Créer la classe `GrilleDemineur` qui gère le tableau 2D de `Cellule` et expose les méthodes d'accès et de comptage. Cette classe ne gère ni le DOM, ni les règles du jeu : elle est un conteneur structuré de cellules.

### Fichier : `js/jeux/demineur/GrilleDemineur.js`

**Constructeur :**
```js
constructor(lignes, colonnes)
```
- Crée `this.cellules` : tableau 2D `[ligne][colonne]` de nouvelles instances `Cellule`
- Stocke `this.lignes` et `this.colonnes`

**Interface publique :**
```js
class GrilleDemineur {
  constructor(lignes, colonnes)

  obtenirCellule(ligne, colonne)         // retourne la Cellule à cette position (ou null si hors limites)
  obtenirVoisins(ligne, colonne)         // retourne un tableau de Cellule voisines valides
  estDansLimites(ligne, colonne)         // true si la position est dans la grille

  compterCellulesRevelees()              // nombre total de cellules révélées
  compterDrapeaux()                      // nombre total de drapeaux posés
  compterCellulesNonMinees()             // lignes × colonnes - nbMines (calculé dynamiquement)

  toutesNonMineesRevelees()              // true si toutes les cellules non-mines sont révélées (victoire)

  reinitialiser()                        // recrée toutes les cellules à l'état initial

  get totalCellules()                    // lignes × colonnes
}
```

**Méthode `obtenirVoisins` :**
- Utilise le tableau `VOISINS` de `constantesDemineur.js`
- Pour chaque vecteur `{ dl, dc }` : calcule `(ligne + dl, colonne + dc)`
- Filtre les positions hors limites via `estDansLimites`
- Retourne un tableau de `Cellule`

**Méthode `toutesNonMineesRevelees` :**
- Itère sur toutes les cellules
- Retourne `true` si chaque cellule non-mine a `estRevelee === true`
- C'est la condition de victoire du démineur

**Dépendances :** `Cellule` depuis `./Cellule.js`, `VOISINS` depuis `./constantesDemineur.js`

### Vérification
Instancier `GrilleDemineur(9, 9)`. Vérifier que `obtenirCellule(0, 0)` retourne une `Cellule`. Vérifier que `obtenirCellule(-1, 0)` retourne `null`. Vérifier que `obtenirVoisins(0, 0)` retourne 3 cellules (coin). Vérifier que `obtenirVoisins(4, 4)` retourne 8 cellules (centre).

### Texte du commit
```
feat(demineur): implémentation de GrilleDemineur — grille 2D de cellules

Conteneur structuré pour les cellules du démineur. Accès par position,
récupération des voisins, comptage des états. Aucune logique de jeu
ni de rendu : SRP respecté.
```

---

## Bloc 05 — FloodFill (expansion des cellules vides)

### Objectif
Implémenter l'algorithme de flood fill qui, lorsqu'une cellule vide (0 mines adjacentes) est révélée, révèle automatiquement toutes les cellules vides connectées et les cellules numérotées en bordure.

### Fichier : `js/jeux/demineur/GrilleDemineur.js` (ajout de méthode)

Le flood fill est une responsabilité de la grille car il opère exclusivement sur la structure des cellules. Il est ajouté comme méthode de `GrilleDemineur` plutôt que dans une classe séparée, car il a besoin d'un accès direct à `obtenirVoisins` et aux cellules.

**Méthode ajoutée :**
```js
revelerAvecExpansion(ligne, colonne)
// Révèle la cellule ciblée.
// Si la cellule est vide (nbMinesAdjacentes === 0), lance le flood fill.
// Retourne un tableau de toutes les cellules révélées lors de cette opération.
```

**Algorithme (itératif avec pile, pas de récursion) :**
```
1. Créer une pile (tableau) et y ajouter la cellule (ligne, colonne)
2. Créer un Set de cellules déjà visitées
3. Créer un tableau de cellules révélées (résultat)
4. Tant que la pile n'est pas vide :
   a. Dépiler une cellule
   b. Si déjà visitée → passer
   c. Marquer comme visitée
   d. Si la cellule est un drapeau ou déjà révélée → passer
   e. Appeler cellule.reveler()
   f. Ajouter la cellule au tableau des résultats
   g. Si cellule.estVide (nbMinesAdjacentes === 0) :
      - Pour chaque voisin (via obtenirVoisins) :
        - Si non visité et non mine → empiler
5. Retourner le tableau des cellules révélées
```

**Pourquoi itératif :**
- Sur une grille 30x16 en mode Difficile, un flood fill récursif peut atteindre des centaines de niveaux de profondeur et provoquer un stack overflow
- L'approche itérative avec pile explicite est plus sûre et tout aussi lisible

**Comportement attendu :**
- Clic sur une cellule vide (0 adjacentes) → toute la zone vide connectée est révélée d'un coup, ainsi que les cellules numérotées qui bordent cette zone
- Clic sur une cellule numérotée (1-8) → seule cette cellule est révélée (pas d'expansion)
- Clic sur une cellule avec drapeau → rien ne se passe (le drapeau protège)

**Dépendances :** aucune nouvelle (utilise les méthodes existantes de `GrilleDemineur`)

### Vérification
Sur une grille 9x9 avec mines placées manuellement, cliquer sur une cellule vide et vérifier que toute la zone connectée est révélée. Vérifier que les cellules numérotées en bordure sont révélées mais que l'expansion s'arrête à elles. Vérifier qu'aucune mine n'est révélée par le flood fill.

### Texte du commit
```
feat(demineur): implémentation du flood fill — expansion des cellules vides

Algorithme itératif (pile explicite) pour révéler en cascade les zones
vides connectées. S'arrête aux cellules numérotées (révélées mais
sans récursion). Protège contre le stack overflow sur grandes grilles.
```

---

## Bloc 06 — Jeu (orchestrateur interne)

### Objectif
Créer la classe `Jeu` qui coordonne toutes les entités du Démineur. C'est le cerveau interne : il gère le premier clic, les interactions gauche/droite, le chord-click, la détection de victoire et de défaite, et le timer.

### Fichier : `js/jeux/demineur/Jeu.js`

**Constructeur (injection de dépendances) :**
```js
constructor({ difficulte, surFinDePartie, surMinesRestantesChange, surTempsChange, surCelluleRevelee, surCelluleDrapeau, surPartieGagnee, surPartiPerdue })
```
- `difficulte` : objet de `DIFFICULTES` (ex : `DIFFICULTES.FACILE`)
- Callbacks pour notifier l'UI des événements

**État interne :**
- `this.grille` : instance de `GrilleDemineur`
- `this.generateurMines` : instance de `GenerateurMines`
- `this.difficulte` : la configuration active
- `this.premierClic` : booléen, `true` tant que le joueur n'a pas encore cliqué
- `this.partieTerminee` : booléen
- `this.tempsEcoule` : entier (secondes depuis le premier clic)
- `this.idTimer` : référence du `setInterval` du timer
- `this.nbDrapeaux` : compteur de drapeaux posés

**Interface publique :**
```js
class Jeu {
  constructor(options)

  initialiser()              // crée la grille, remet l'état à zéro
  revelerCellule(lig, col)   // clic gauche : révèle une cellule
  basculerDrapeau(lig, col)  // clic droit : pose ou retire un drapeau
  revelerVoisins(lig, col)   // chord-click : révèle les voisins si drapeaux corrects
  changerDifficulte(diff)    // change la difficulté et réinitialise

  get minesRestantes()       // difficulte.mines - nbDrapeaux
  get tempsActuel()          // tempsEcoule en secondes
  get estTerminee()          // booléen

  arreter()                  // arrête le timer et marque la partie comme terminée
  detruire()                 // arrête tout, null les références
}
```

**Logique du premier clic (`revelerCellule` quand `premierClic === true`) :**
1. Appeler `generateurMines.generer(grille, difficulte.mines, lig, col)` — les mines sont placées MAINTENANT, en excluant la zone cliquée
2. Mettre `premierClic` à `false`
3. Démarrer le timer (`setInterval` à `INTERVALLE_TIMER_MS`)
4. Continuer avec la révélation normale (étape suivante)

**Logique de `revelerCellule(lig, col)` (après le premier clic) :**
1. Si partie terminée → ignorer
2. Récupérer la cellule via `grille.obtenirCellule(lig, col)`
3. Si cellule est drapeau ou déjà révélée → ignorer
4. Si cellule est mine → `_declencherDefaite(lig, col)`
5. Sinon : appeler `grille.revelerAvecExpansion(lig, col)`
6. Notifier l'UI via `surCelluleRevelee` avec les cellules révélées
7. Vérifier victoire : `grille.toutesNonMineesRevelees()` → si oui, `_declencherVictoire()`

**Logique de `basculerDrapeau(lig, col)` :**
1. Si partie terminée ou premier clic pas encore fait → ignorer
2. Récupérer la cellule
3. Si cellule révélée → ignorer
4. Appeler `cellule.basculerDrapeau()`
5. Mettre à jour `nbDrapeaux` (+1 ou -1)
6. Notifier via `surCelluleDrapeau` et `surMinesRestantesChange`

**Logique du chord-click (`revelerVoisins(lig, col)`) :**
1. Si partie terminée → ignorer
2. Récupérer la cellule — elle doit être révélée et numérotée
3. Compter les drapeaux parmi les voisins
4. Si le nombre de drapeaux !== `cellule.nbMinesAdjacentes` → ignorer (pas assez ou trop de drapeaux)
5. Pour chaque voisin non révélé et sans drapeau :
   - Si c'est une mine → `_declencherDefaite(voisin.ligne, voisin.colonne)`
   - Sinon → `grille.revelerAvecExpansion(voisin.ligne, voisin.colonne)`
6. Notifier l'UI, vérifier victoire

**`_declencherDefaite(ligExplosion, colExplosion)` :**
1. Arrêter le timer
2. Marquer `partieTerminee = true`
3. Stocker la position de l'explosion (pour le rendu spécifique)
4. Révéler toutes les mines de la grille
5. Marquer les drapeaux mal placés (drapeau sur une cellule non-mine) comme erreurs
6. Notifier via `surPartiPerdue(ligExplosion, colExplosion)`

**`_declencherVictoire()` :**
1. Arrêter le timer
2. Marquer `partieTerminee = true`
3. Placer automatiquement des drapeaux sur toutes les mines non marquées
4. Notifier via `surPartieGagnee(tempsEcoule)`

**Timer :**
- Démarre au premier clic, s'incrémente de 1 chaque seconde
- S'arrête sur victoire ou défaite
- Plafonné à `TEMPS_MAX_AFFICHE` (999) pour l'affichage
- Notifie l'UI via `surTempsChange(tempsEcoule)` à chaque seconde

**Dépendances :** `GrilleDemineur`, `GenerateurMines`, constantes depuis `./constantesDemineur.js`

### Vérification
Instancier `Jeu` avec la difficulté Facile et des callbacks console. Simuler un premier clic → vérifier que les mines sont placées et le timer démarre. Simuler la révélation d'une mine → vérifier que `surPartiPerdue` est appelé. Simuler une partie gagnante → vérifier que `surPartieGagnee` est appelé avec le temps.

### Texte du commit
```
feat(demineur): implémentation de Jeu — orchestrateur principal

Coordination complète du démineur : premier clic sécurisé, révélation,
drapeaux, chord-click, détection victoire/défaite, timer. Les mines
ne sont générées qu'au premier clic pour garantir une zone sûre.
```

---

## Bloc 07 — JeuDemineur (adaptateur InterfaceJeu)

### Objectif
Créer la classe `JeuDemineur` qui étend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS.

### Fichier : `js/jeux/demineur/JeuDemineur.js`

**Propriétés statiques :**
```js
static ID = 'demineur';
static NOM = 'Démineur';
static DESCRIPTION = 'Révélez toutes les cases sans déclencher de mine. Logique, drapeaux et flood fill.';
static ICONE = '💣';
static UTILISE_SCORES = true;
```

**Interface :**
```js
class JeuDemineur extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()        // Crée le DOM wrapper .jeu-demineur, instancie DemineurUI et Jeu
  demarrer()           // Affiche l'UI, prépare le jeu (sans le lancer — le premier clic lance)
  mettreEnPause()      // Met le timer en pause (le jeu est jouable au clic, pas en temps réel)
  reprendre()          // Reprend le timer
  arreter()            // Arrête le timer, marque la partie comme terminée
  detruire()           // Appelle arreter(), retire le DOM, null les références

  get scoreActuel()    // { points: tempsEcoule, difficulte: difficulte.id, jeuId: 'demineur' }
}
```

**Particularité du Démineur :**
Contrairement au Snake, le Démineur n'a pas de boucle de jeu continue. Le jeu avance uniquement en réponse aux clics du joueur. Le seul élément temporel est le timer (cosmétique / scoring). `demarrer()` affiche la grille vide et attend le premier clic. Le premier clic déclenche la génération des mines et le timer.

**Score :**
- Le score du Démineur est le temps en secondes (plus bas = meilleur)
- Le score n'est enregistré qu'en cas de victoire
- Le champ `difficulte` est stocké avec le score pour permettre le filtrage

**Rôle :** adaptateur (pattern Adapter) entre l'orchestrateur interne `Jeu` et le contrat `InterfaceJeu` attendu par le shell. Le shell ne connaît que `JeuDemineur`, jamais `Jeu` directement.

**Dépendances :** `InterfaceJeu` depuis `../../commun/InterfaceJeu.js`, `Jeu` depuis `./Jeu.js`, `DemineurUI` depuis `./ui/DemineurUI.js`, `DIFFICULTE_PAR_DEFAUT` depuis `./constantesDemineur.js`

### Vérification
Enregistrer `JeuDemineur` dans le routeur, naviguer vers `#demineur`, vérifier que la grille s'affiche. Naviguer ailleurs puis revenir → vérifier que le jeu repart de zéro sans fuite mémoire.

### Texte du commit
```
feat(demineur): implémentation de JeuDemineur — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne Jeu et le contrat InterfaceJeu
du shell PlaygroundJS. Gère le cycle de vie (init, start, pause, destroy).
Score basé sur le temps, enregistré uniquement en cas de victoire.
```

---

## Bloc 08 — PlateauDemineur (rendu DOM de la grille)

### Objectif
Créer la classe `PlateauDemineur` qui génère la grille HTML du démineur et gère le rendu visuel de chaque cellule. Cette classe ne connaît pas les règles du jeu : elle reçoit des instructions de mise à jour.

### Fichier : `js/jeux/demineur/ui/PlateauDemineur.js` (dans le dossier `ui/` car c'est du rendu)

**Constructeur :**
```js
constructor(elementParent, lignes, colonnes, { surClicGauche, surClicDroit, surDoubleClick })
```
- `surClicGauche(lig, col)` : callback pour le clic gauche (révéler)
- `surClicDroit(lig, col)` : callback pour le clic droit (drapeau)
- `surDoubleClick(lig, col)` : callback pour le double-clic / clic molette (chord)

**Interface publique :**
```js
class PlateauDemineur {
  constructor(elementParent, lignes, colonnes, callbacks)

  creer()                              // génère le DOM de la grille
  mettreAJourCellule(cellule)          // met à jour le rendu d'une seule cellule
  mettreAJourPlusieurs(cellules)       // met à jour plusieurs cellules (batch après flood fill)
  revelerToutesMines(mines, explosion) // fin de partie : affiche toutes les mines
  marquerErreursdrapeaux(cellules)     // affiche les drapeaux mal placés
  bloquerInteractions()                // désactive les clics (après victoire/défaite)
  detruire()                           // retire le DOM et les listeners
}
```

**Structure HTML générée par `creer()` :**
```html
<div class="demineur__grille" style="grid-template-columns: repeat(9, 1fr);">
  <div class="demineur__cellule demineur__cellule--cachee" data-lig="0" data-col="0"></div>
  <div class="demineur__cellule demineur__cellule--cachee" data-lig="0" data-col="1"></div>
  <!-- ... lignes × colonnes cellules -->
</div>
```

**Rendu d'une cellule (`mettreAJourCellule`) :**
La méthode lit l'état de l'objet `Cellule` et applique les classes CSS correspondantes.

| État de la Cellule | Classes CSS appliquées | Contenu textuel |
|---|---|---|
| Cachée (non révélée, pas de drapeau) | `demineur__cellule--cachee` | *(vide)* |
| Drapeau | `demineur__cellule--drapeau` | 🚩 |
| Révélée, 0 mines adjacentes | `demineur__cellule--revelee` | *(vide)* |
| Révélée, N mines adjacentes (1-8) | `demineur__cellule--revelee demineur__cellule--nN` | `N` |
| Mine (défaite) | `demineur__cellule--mine` | 💣 |
| Mine explosée (celle cliquée) | `demineur__cellule--explosion` | 💥 |
| Drapeau mal placé (défaite) | `demineur__cellule--erreur` | ❌ |

**Gestion des clics :**
- Un seul `addEventListener` sur le conteneur de grille (délégation d'événements)
- `click` → identifie la cellule via `data-lig` et `data-col`, appelle `surClicGauche`
- `contextmenu` → `preventDefault()`, appelle `surClicDroit`
- `dblclick` → appelle `surDoubleClick` (chord-click)
- Alternative au double-clic : clic molette (`mousedown` avec `event.button === 1`)

**Règle de rendu :**
- Ne jamais recréer les `<div>` : seulement manipuler `classList` et `textContent`
- Stocker les références DOM dans un tableau 2D `this.elementsCellules[lig][col]` pour un accès O(1)
- Le `grid-template-columns` est défini dynamiquement selon le nombre de colonnes

**Dépendances :** constantes CSS depuis `./constantesDemineur.js`

### Vérification
Instancier `PlateauDemineur` avec un élément DOM, 9 lignes, 9 colonnes, et des callbacks console. Vérifier dans le DOM que la grille contient 81 div. Cliquer gauche, droit, et double-cliquer → vérifier les callbacks dans la console.

### Texte du commit
```
feat(demineur): implémentation de PlateauDemineur — rendu DOM de la grille

Grille DOM avec délégation d'événements (clic gauche, droit, double-clic).
Rendu par classes CSS sans recréation d'éléments. Chiffres 1-8 colorés,
mines, drapeaux et explosions gérés par mettreAJourCellule.
```

---

## Bloc 09 — DemineurUI (HUD, timer, sélecteur de difficulté)

### Objectif
Créer la classe `DemineurUI` qui gère tout le chrome autour de la grille : le compteur de mines, le timer, le bouton de réinitialisation, le sélecteur de difficulté, et les overlays de victoire/défaite.

### Fichier : `js/jeux/demineur/ui/DemineurUI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu, depotScores, profilActif, { surRetourMenu, surRejouer, surChangerDifficulte })
```

**Interface publique :**
```js
class DemineurUI {
  constructor(elementConteneur, jeu, depotScores, profilActif, callbacks)

  afficher()                                 // construit et injecte tout le DOM du démineur
  masquer()                                  // nettoie le DOM
  mettreAJourMinesRestantes(nombre)          // met à jour l'affichage du compteur de mines
  mettreAJourTimer(secondes)                 // met à jour l'affichage du timer
  afficherVictoire(tempsEnSecondes)          // overlay de victoire
  afficherDefaite()                          // overlay de défaite
  detruire()                                 // retire tout le DOM et les références
}
```

**Structure HTML complète :**
```html
<div class="jeu-demineur">
  <header class="demineur__entete">
    <div class="demineur__selecteur-difficulte">
      <button class="btn--difficulte actif" data-diff="facile">Facile</button>
      <button class="btn--difficulte" data-diff="moyen">Moyen</button>
      <button class="btn--difficulte" data-diff="difficile">Difficile</button>
    </div>
  </header>

  <div class="demineur__barre-info">
    <span class="demineur__compteur-mines">🚩 10</span>
    <button class="demineur__btn-reset">😊</button>
    <span class="demineur__timer">⏱ 000</span>
  </div>

  <div class="demineur__conteneur-grille">
    <!-- PlateauDemineur injecte la grille ici -->
  </div>
</div>
```

**Compteur de mines :**
- Affiche `difficulte.mines - nbDrapeaux`
- Peut devenir négatif si le joueur pose plus de drapeaux que de mines (affiché en rouge)
- Format : 3 chiffres avec zéros de remplissage (ex : `010`, `003`, `-02`)

**Timer :**
- Affiche `000` au démarrage
- S'incrémente à chaque seconde après le premier clic
- Format : 3 chiffres avec zéros de remplissage (ex : `042`, `999`)
- Plafonné à 999

**Bouton de réinitialisation (smiley) :**
- `😊` : partie en cours
- `😎` : partie gagnée
- `😵` : partie perdue
- Clic → réinitialise la partie avec la même difficulté

**Sélecteur de difficulté :**
- 3 boutons (Facile, Moyen, Difficile)
- Le bouton actif a la classe `actif`
- Changer de difficulté → réinitialise la partie avec la nouvelle difficulté

**Overlay de victoire :**
```html
<div class="demineur__overlay demineur__overlay--victoire">
  <h2>Victoire !</h2>
  <p>Temps : 42 secondes</p>
  <p>Meilleur temps (Facile) : 38 secondes</p>
  <button class="btn--rejouer">Rejouer</button>
  <button class="btn--menu">Accueil</button>
</div>
```

**Overlay de défaite :**
```html
<div class="demineur__overlay demineur__overlay--defaite">
  <h2>Perdu !</h2>
  <p>Une mine a explosé.</p>
  <button class="btn--rejouer">Rejouer</button>
  <button class="btn--menu">Accueil</button>
</div>
```

**Enregistrement du score (victoire uniquement) :**
- Lors de `afficherVictoire`, le score (temps en secondes) est enregistré via `depotScores.ajouterScore(...)`
- Le score inclut le `jeuId = 'demineur'` et la difficulté
- Le meilleur temps pour cette difficulté est affiché dans l'overlay

**Dépendances :** `PlateauDemineur`, `Score` depuis `../../score/Score.js`, `DIFFICULTES` depuis `../constantesDemineur.js`

### Vérification
Instancier `DemineurUI` avec un élément DOM et un `Jeu`. Vérifier que la grille, le compteur et le timer s'affichent. Changer de difficulté → la grille change de taille. Simuler une victoire/défaite → l'overlay correspondant apparaît.

### Texte du commit
```
feat(demineur): implémentation de DemineurUI — HUD et overlays

Interface complète avec compteur de mines, timer, smiley de reset,
sélecteur de difficulté et overlays victoire/défaite. Score enregistré
uniquement en cas de victoire, filtré par difficulté.
```

---

## Bloc 10 — DemineurScoresUI (tableau des scores)

### Objectif
Créer la classe `DemineurScoresUI` qui affiche les scores spécifiques au Démineur, filtrables par difficulté et par profil.

### Fichier : `js/jeux/demineur/ui/DemineurScoresUI.js`

**Constructeur :**
```js
constructor(elementConteneur, depotScores, gestionnaireProfils, { surRetour })
```

**Interface publique :**
```js
class DemineurScoresUI {
  afficher()   // injecte la vue dans elementConteneur
  masquer()    // vide elementConteneur
}
```

**Structure HTML :**
```html
<div class="scores-ui">
  <h2>Scores — Démineur</h2>
  <div class="scores-filtres">
    <div class="scores-filtres__difficulte">
      <button class="filtre--diff actif" data-diff="facile">Facile</button>
      <button class="filtre--diff" data-diff="moyen">Moyen</button>
      <button class="filtre--diff" data-diff="difficile">Difficile</button>
    </div>
    <div class="scores-filtres__profil">
      <button class="filtre--tous actif">Tous</button>
      <!-- un bouton par profil -->
    </div>
  </div>
  <table class="scores-tableau">
    <thead>
      <tr><th>Rang</th><th>Joueur</th><th>Temps</th><th>Difficulté</th><th>Date</th></tr>
    </thead>
    <tbody><!-- lignes dynamiques --></tbody>
  </table>
  <button class="btn--retour">Retour</button>
</div>
```

**Particularités par rapport au Snake :**
- Le score affiché est un temps en secondes (format `MM:SS`) et non des points
- Le tri est ascendant (meilleur temps = plus bas) et non descendant
- Double filtre : par difficulté ET par profil
- Les scores sont filtrés par `jeuId = 'demineur'` et par `difficulte`

**Comportements :**
- Filtre par défaut : difficulté Facile, tous les profils
- Résolution `profilId → nom` via `gestionnaireProfils`
- Si aucun score : message "Aucun score enregistré pour cette difficulté"
- Tri par temps croissant (meilleur en premier)

**Dépendances :** `DepotScores`, `GestionnaireProfils`, `DIFFICULTES` depuis `../constantesDemineur.js`

### Texte du commit
```
feat(demineur): implémentation de DemineurScoresUI — tableau des scores

Vue de classement filtré par jeu Démineur avec double filtre
(difficulté + profil). Tri par temps croissant, format MM:SS.
```

---

## Bloc 11 — CSS Démineur (`css/jeux/demineur.css`)

### Objectif
Écrire les styles spécifiques au jeu Démineur, scopés sous `.jeu-demineur`.

### Fichier : `css/jeux/demineur.css`

**Organisation :**
```css
/* === Conteneur principal === */
.jeu-demineur {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* === En-tête et sélecteur de difficulté === */
.demineur__entete { /* flexbox centré */ }
.demineur__selecteur-difficulte { /* groupe de boutons */ }
.btn--difficulte { /* style bouton inactif */ }
.btn--difficulte.actif { /* style bouton actif */ }

/* === Barre d'info (compteur + smiley + timer) === */
.demineur__barre-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* fond enfoncé style classique, police monospace */
}
.demineur__compteur-mines,
.demineur__timer {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  /* affichage style LCD rouge sur fond noir */
}
.demineur__btn-reset { /* bouton smiley carré */ }

/* === Grille === */
.demineur__grille {
  display: grid;
  /* grid-template-columns défini dynamiquement par JS */
  gap: 1px;
  background-color: var(--couleur-bordure-grille);
}

/* === Cellules === */
.demineur__cellule {
  width: var(--taille-cellule-demineur, 28px);
  height: var(--taille-cellule-demineur, 28px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.85rem;
  cursor: pointer;
  user-select: none;
}

/* Cellule cachée : effet 3D enfoncé/relevé (style classique Windows) */
.demineur__cellule--cachee {
  background-color: var(--couleur-cellule-cachee);
  border: 2px outset var(--couleur-bordure-cellule);
}
.demineur__cellule--cachee:active {
  border-style: inset;
}

/* Cellule révélée : plate, fond plus clair */
.demineur__cellule--revelee {
  background-color: var(--couleur-cellule-revelee);
  border: 1px solid var(--couleur-bordure-revelee);
}

/* Drapeau */
.demineur__cellule--drapeau {
  background-color: var(--couleur-cellule-cachee);
  border: 2px outset var(--couleur-bordure-cellule);
}

/* Mine (défaite) */
.demineur__cellule--mine {
  background-color: var(--couleur-cellule-revelee);
}

/* Mine explosée (celle sur laquelle le joueur a cliqué) */
.demineur__cellule--explosion {
  background-color: var(--couleur-explosion, #ff0000);
}

/* Drapeau mal placé */
.demineur__cellule--erreur {
  background-color: var(--couleur-cellule-revelee);
  text-decoration: line-through;
}

/* === Couleurs des chiffres 1-8 (classique Minesweeper) === */
.demineur__cellule--n1 { color: #0000ff; } /* bleu */
.demineur__cellule--n2 { color: #008000; } /* vert */
.demineur__cellule--n3 { color: #ff0000; } /* rouge */
.demineur__cellule--n4 { color: #000080; } /* bleu foncé */
.demineur__cellule--n5 { color: #800000; } /* rouge foncé */
.demineur__cellule--n6 { color: #008080; } /* teal */
.demineur__cellule--n7 { color: #000000; } /* noir */
.demineur__cellule--n8 { color: #808080; } /* gris */

/* === Overlays === */
.demineur__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  z-index: 10;
}
.demineur__overlay--victoire h2 { color: #4caf50; }
.demineur__overlay--defaite h2 { color: #f44336; }
```

**Variables CSS (à ajouter dans `commun.css` ou dans le scope `.jeu-demineur`) :**
```css
.jeu-demineur {
  --taille-cellule-demineur: 28px;
  --couleur-cellule-cachee: #c0c0c0;
  --couleur-cellule-revelee: #e0e0e0;
  --couleur-bordure-cellule: #d4d4d4;
  --couleur-bordure-revelee: #b0b0b0;
  --couleur-bordure-grille: #808080;
  --couleur-explosion: #ff0000;
}
```

**Responsive :**
- Sur petits écrans, `--taille-cellule-demineur` peut être réduit via une media query
- La grille Difficile (30 colonnes) nécessite un scroll horizontal ou une réduction de la taille des cellules

### Texte du commit
```
feat(demineur): styles CSS du jeu Démineur

Grille DOM avec effet 3D classique (outset/inset), couleurs des chiffres
1-8 fidèles au Démineur original. Overlays victoire/défaite, barre
d'info style LCD. Sélecteurs scopés sous .jeu-demineur.
```

---

## Bloc 12 — Intégration finale et recette

### Objectif
Vérifier le jeu Démineur bout en bout dans le contexte PlaygroundJS, corriger les bugs d'intégration, valider tous les scénarios.

### Checklist de recette

**Navigation :**
- [ ] Depuis l'accueil, cliquer sur la carte Démineur → arrive sur le jeu
- [ ] Bouton "Accueil" / navigation retour → revient à l'accueil sans fuite mémoire
- [ ] Re-naviguer vers Démineur → le jeu repart de zéro
- [ ] Le timer ne continue pas après navigation vers l'accueil

**Premier clic :**
- [ ] La grille s'affiche vide au chargement (toutes les cellules cachées)
- [ ] Le timer est à 000 avant le premier clic
- [ ] Le premier clic révèle toujours une zone sûre (jamais une mine)
- [ ] Le premier clic et ses 8 voisins ne contiennent jamais de mine
- [ ] Le timer démarre après le premier clic

**Clic gauche (révélation) :**
- [ ] Clic sur une cellule cachée → la révèle
- [ ] Clic sur une cellule vide (0 adjacentes) → flood fill, toute la zone vide est révélée
- [ ] Le flood fill s'arrête aux cellules numérotées (elles sont révélées mais pas leurs voisins)
- [ ] Clic sur une cellule avec drapeau → rien ne se passe
- [ ] Clic sur une mine → défaite immédiate

**Clic droit (drapeau) :**
- [ ] Clic droit sur une cellule cachée → pose un drapeau (🚩)
- [ ] Clic droit sur un drapeau → retire le drapeau
- [ ] Clic droit sur une cellule révélée → rien ne se passe
- [ ] Le menu contextuel du navigateur ne s'affiche pas
- [ ] Le compteur de mines se met à jour (augmente quand on retire, diminue quand on pose)
- [ ] Le compteur peut devenir négatif (affiché en rouge)

**Chord-click (double-clic / clic molette) :**
- [ ] Double-clic sur une cellule numérotée révélée dont le nombre de drapeaux adjacents == nombre → révèle les voisins non marqués
- [ ] Si un drapeau est mal placé lors du chord-click → défaite (mine révélée)
- [ ] Double-clic sur une cellule où les drapeaux ne correspondent pas → rien ne se passe

**Victoire :**
- [ ] Toutes les cellules non-mines révélées → victoire
- [ ] Le timer s'arrête
- [ ] Les mines restantes reçoivent automatiquement un drapeau
- [ ] Le smiley devient 😎
- [ ] L'overlay de victoire affiche le temps
- [ ] Le score est enregistré (temps en secondes + difficulté)
- [ ] Le meilleur temps pour cette difficulté est affiché

**Défaite :**
- [ ] Clic sur une mine → toutes les mines sont révélées
- [ ] La mine cliquée est en rouge (explosion 💥)
- [ ] Les drapeaux mal placés sont marqués ❌
- [ ] Le timer s'arrête
- [ ] Le smiley devient 😵
- [ ] L'overlay de défaite s'affiche
- [ ] Aucun score n'est enregistré

**Difficulté :**
- [ ] Facile : grille 9×9, 10 mines, compteur affiche 10
- [ ] Moyen : grille 16×16, 40 mines, compteur affiche 40
- [ ] Difficile : grille 30×16, 99 mines, compteur affiche 99
- [ ] Changer de difficulté réinitialise la partie
- [ ] Le timer revient à 000 lors du changement

**Rejouer :**
- [ ] Bouton "Rejouer" dans l'overlay → nouvelle partie même difficulté
- [ ] Bouton smiley → nouvelle partie même difficulté
- [ ] Le timer revient à 000, le compteur est réinitialisé

**Scores :**
- [ ] Score enregistré uniquement en cas de victoire avec `jeuId = 'demineur'`
- [ ] Classement Démineur filtrable par difficulté
- [ ] Classement filtrable par profil
- [ ] Tri par temps croissant (meilleur en premier)
- [ ] Format du temps : MM:SS

**Cycle de vie :**
- [ ] `detruire()` retire tout le DOM démineur de `#app`
- [ ] Aucun `setInterval` (timer) ne continue après `detruire()`
- [ ] Aucun `click` / `contextmenu` / `dblclick` listener ne reste après `detruire()`

**Performance :**
- [ ] Le flood fill ne provoque pas de stack overflow sur la grille 30×16 (mode Difficile)
- [ ] Le rendu est fluide même sur une grande grille (pas de recréation DOM)

### Texte du commit
```
fix(demineur): recette finale — corrections post-intégration

Résolution des bugs découverts lors de la recette bout en bout.
Vérification de la navigation, des interactions, du scoring et
de la persistance sur les trois niveaux de difficulté.
```

---

## Résumé des dépendances entre blocs

```
Bloc 01 (constantesDemineur)
  ├── Bloc 02 (Cellule)
  ├── Bloc 03 (GenerateurMines)
  └── Bloc 04 (GrilleDemineur)

Bloc 02 (Cellule)
  └── Bloc 04 (GrilleDemineur)

Bloc 03 (GenerateurMines)
  └── Bloc 06 (Jeu)

Bloc 04 (GrilleDemineur)
  └── Bloc 05 (FloodFill — ajouté à GrilleDemineur)

Blocs 04+05+03
  └── Bloc 06 (Jeu orchestrateur)

Bloc 06 + Shell (InterfaceJeu)
  └── Bloc 07 (JeuDemineur adaptateur)

Bloc 06 + Bloc 01
  └── Bloc 08 (PlateauDemineur)

Bloc 06 + Bloc 08 + Shell (DepotScores, Score)
  ├── Bloc 09 (DemineurUI)
  └── Bloc 10 (DemineurScoresUI)

Blocs 07+08+09+10
  └── Bloc 11 (CSS)

Bloc 11
  └── Bloc 12 (Intégration finale)
```

---

## Récapitulatif technique

| Concept | Implémentation |
|---|---|
| **Premier clic sécurisé** | Mines générées APRÈS le premier clic, zone 3×3 exclue |
| **Flood fill** | Algorithme itératif (pile explicite), pas de récursion |
| **Chord-click** | Double-clic ou clic molette sur cellule numérotée |
| **Timer** | `setInterval` à 1000ms, démarre au premier clic |
| **Score** | Temps en secondes (plus bas = meilleur), victoire uniquement |
| **3 difficultés** | Facile 9×9/10, Moyen 16×16/40, Difficile 30×16/99 |
| **Couleurs 1-8** | Bleu, vert, rouge, bleu foncé, rouge foncé, teal, noir, gris |
| **Rendu** | DOM pur (classList + textContent), pas de canvas |
| **Événements** | Délégation sur le conteneur de grille |

---

*Document créé le 2026-03-20. Maintenir à jour si des décisions d'architecture évoluent en cours de réalisation.*

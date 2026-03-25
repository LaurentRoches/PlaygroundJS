# DOCUMENTATION_TETRIS.md — Plan d'implémentation du jeu Tetris

Ce document est le guide de réalisation du jeu Tetris dans le cadre du projet PlaygroundJS. Chaque bloc est indépendant et correspond à un commit logique. Le projet peut être repris à n'importe quelle étape en consultant ce plan.

> **Prérequis :** la Phase 0 (Shell / Infrastructure) doit être implémentée avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

> **Particularité :** Tetris est le **seul jeu du projet** qui utilise `<canvas>` pour le rendu. Tous les autres jeux utilisent le DOM (grille de `<div>`). Ce choix est motivé par les besoins de performance du rendu pixel par pixel (pièce fantôme, animations de verrouillage, aperçu de pièces).

---

## Vue d'ensemble de la chaîne de commits

```
Bloc 01 — constantesTetris
Bloc 02 — Piece (modèle d'un tétromino)
Bloc 03 — RotationMatrice (rotation + wall kicks)
Bloc 04 — GrilleJeu (grille logique 10×20)
Bloc 05 — PlateauTetris (rendu canvas du plateau)
Bloc 06 — CanvasApercu (aperçu pièce suivante / réserve)
Bloc 07 — Fantome (pièce fantôme)
Bloc 08 — BoucleDeJeuTetris (boucle rAF + gravité)
Bloc 09 — SystemeDeScore (scoring Nintendo)
Bloc 10 — GestionnaireEntrees (clavier avec DAS/ARR)
Bloc 11 — Jeu (orchestrateur interne)
Bloc 12 — JeuTetris (adaptateur InterfaceJeu)
Bloc 13 — TetrisUI (HUD)
Bloc 14 — TetrisScoresUI (tableau des scores)
Bloc 15 — CSS Tetris
Bloc 16 — Intégration finale et recette
```

> **Note :** les blocs Profil, GestionnaireProfils, Score et DepotScores sont gérés par la Phase 0 (shell partagé). Ils ne sont plus spécifiques au Tetris.

---

## Bloc 01 — constantesTetris

### Objectif
Centraliser toutes les valeurs numériques et chaînes de configuration spécifiques au Tetris dans `js/jeux/tetris/constantesTetris.js`. Aucun magic number ne doit apparaître dans le reste du code du Tetris.

### Fichier : `js/jeux/tetris/constantesTetris.js`

```js
// ──────────────────────────────────────
// Dimensions de la grille
// ──────────────────────────────────────
export const COLONNES = 10;
export const LIGNES = 20;
export const LIGNES_CACHEES = 2; // lignes au-dessus du champ visible (zone de spawn)

// ──────────────────────────────────────
// Dimensions canvas (en pixels)
// ──────────────────────────────────────
export const TAILLE_CELLULE = 30;       // côté d'une cellule en px
export const EPAISSEUR_BORDURE = 1;     // bordure interne de chaque cellule
export const LARGEUR_PLATEAU = COLONNES * TAILLE_CELLULE;
export const HAUTEUR_PLATEAU = LIGNES * TAILLE_CELLULE;

// Aperçu (pièce suivante / réserve)
export const TAILLE_CELLULE_APERCU = 22;
export const COLONNES_APERCU = 6;
export const LIGNES_APERCU = 6;

// ──────────────────────────────────────
// Couleurs
// ──────────────────────────────────────
export const COULEUR_FOND = '#1a1a2e';
export const COULEUR_GRILLE = '#2a2a4a';
export const COULEUR_BORDURE = '#0f0f1a';
export const COULEUR_FANTOME = 'rgba(255, 255, 255, 0.15)';

// ──────────────────────────────────────
// Définition des 7 tétrominos
// ──────────────────────────────────────
// Chaque pièce est définie par :
//   type     : identifiant unique (lettre)
//   matrice  : forme initiale (état de rotation 0)
//   couleur  : couleur de remplissage
//
// Convention matrice : matrice[ligne][colonne], 1 = cellule pleine, 0 = vide
// L'origine (0,0) est le coin supérieur gauche de la matrice

export const PIECES = {
  I: {
    type: 'I',
    matrice: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    couleur: '#00f0f0', // cyan
  },
  O: {
    type: 'O',
    matrice: [
      [1, 1],
      [1, 1],
    ],
    couleur: '#f0f000', // jaune
  },
  T: {
    type: 'T',
    matrice: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    couleur: '#a000f0', // violet
  },
  S: {
    type: 'S',
    matrice: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    couleur: '#00f000', // vert
  },
  Z: {
    type: 'Z',
    matrice: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    couleur: '#f00000', // rouge
  },
  J: {
    type: 'J',
    matrice: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    couleur: '#0000f0', // bleu
  },
  L: {
    type: 'L',
    matrice: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    couleur: '#f0a000', // orange
  },
};

// Ordre pour le sac aléatoire (7-bag)
export const TYPES_PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ──────────────────────────────────────
// Vitesses par niveau (gravité)
// ──────────────────────────────────────
// Intervalle en millisecondes entre chaque descente automatique d'une ligne
// Inspiré du système NES : la gravité accélère à chaque niveau

export const VITESSES_PAR_NIVEAU = [
  800,  // niveau 1
  720,  // niveau 2
  630,  // niveau 3
  550,  // niveau 4
  470,  // niveau 5
  380,  // niveau 6
  300,  // niveau 7
  220,  // niveau 8
  150,  // niveau 9
  100,  // niveau 10
  80,   // niveau 11
  60,   // niveau 12
  50,   // niveau 13
  50,   // niveau 14
  50,   // niveau 15
  33,   // niveau 16+
];

export const VITESSE_CHUTE_DOUCE = 50; // soft drop : descente accélérée (ms)

// ──────────────────────────────────────
// Scoring (système Nintendo)
// ──────────────────────────────────────
// Points = POINTS_PAR_LIGNES[nbLignes] × niveau

export const POINTS_PAR_LIGNES = {
  1: 100,   // Simple
  2: 300,   // Double
  3: 500,   // Triple
  4: 800,   // Tetris
};

export const POINTS_CHUTE_DOUCE = 1;    // +1 point par ligne en soft drop
export const POINTS_CHUTE_FORTE = 2;    // +2 points par ligne en hard drop
export const LIGNES_PAR_NIVEAU = 10;    // passage au niveau suivant tous les 10 lignes

// ──────────────────────────────────────
// Temporisation
// ──────────────────────────────────────
export const DELAI_VERROUILLAGE = 500;    // ms avant verrouillage quand la pièce touche le sol
export const MAX_RESETS_VERROUILLAGE = 15; // nombre max de remises à zéro du délai de verrouillage

// ──────────────────────────────────────
// Auto-repeat (DAS / ARR)
// ──────────────────────────────────────
export const DAS = 170;  // Delayed Auto Shift : délai initial avant répétition (ms)
export const ARR = 50;   // Auto Repeat Rate : intervalle entre répétitions (ms)

// ──────────────────────────────────────
// Touches clavier
// ──────────────────────────────────────
export const TOUCHES = {
  ArrowLeft:  'GAUCHE',
  ArrowRight: 'DROITE',
  ArrowDown:  'CHUTE_DOUCE',
  ArrowUp:    'ROTATION_HORAIRE',
  z:          'ROTATION_ANTIHORAIRE',
  ' ':        'CHUTE_FORTE',   // barre espace
  c:          'RESERVE',
  Escape:     'PAUSE',
};

// ──────────────────────────────────────
// Position de spawn
// ──────────────────────────────────────
export const SPAWN_COLONNE = 3; // colonne de départ (coin gauche de la matrice)
export const SPAWN_LIGNE = 0;   // ligne de départ (dans la zone cachée)
```

### Vérification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur. Vérifier que `PIECES.I.matrice` est bien un tableau 4×4 et que `VITESSES_PAR_NIVEAU` contient 16 entrées.

### Texte du commit
```
feat(tetris): constantes spécifiques au jeu Tetris

Toutes les valeurs configurables du Tetris (dimensions grille 10×20,
7 tétrominos avec matrices et couleurs, vitesses par niveau, scoring
Nintendo, DAS/ARR, délai de verrouillage) centralisées dans
constantesTetris.js.
```

---

## Bloc 02 — Piece (modèle d'un tétromino)

### Objectif
Créer la classe `Piece` qui modélise un tétromino : son type, sa matrice de forme, sa couleur, sa position sur la grille et son état de rotation. Cette classe ne touche jamais au canvas ni au DOM.

### Fichier : `js/jeux/tetris/Piece.js`

**Représentation interne :**
- `this.type` : lettre identifiant la pièce (`'I'`, `'O'`, `'T'`, etc.)
- `this.matrice` : tableau 2D représentant la forme actuelle (après rotations)
- `this.couleur` : code couleur hexadécimal
- `this.col` : colonne du coin supérieur gauche de la matrice sur la grille
- `this.lig` : ligne du coin supérieur gauche de la matrice sur la grille
- `this.etatRotation` : entier 0-3 (0 = état initial, 1 = 90° horaire, etc.)

**Interface publique :**
```js
class Piece {
  constructor(definition)              // reçoit un objet de PIECES (ex : PIECES.T)

  obtenirCellules()                    // retourne un tableau de { col, lig } absolus
  clone()                              // retourne une copie profonde de la pièce
  deplacer(deltaCol, deltaLig)         // modifie col/lig
  definirPosition(col, lig)            // positionne directement

  get type()
  get matrice()
  get couleur()
  get col()
  get lig()
  get etatRotation()
  set matrice(nouvelleMatrice)
  set etatRotation(nouvelEtat)
}
```

**Détail de `obtenirCellules()` :**
- Parcourir `this.matrice` avec deux boucles (ligne, colonne)
- Pour chaque cellule valant `1`, ajouter `{ col: this.col + colonne, lig: this.lig + ligne }` au résultat
- C'est la méthode clé : elle convertit la matrice locale en coordonnées absolues sur la grille

```js
obtenirCellules() {
  const cellules = [];
  for (let l = 0; l < this.matrice.length; l++) {
    for (let c = 0; c < this.matrice[l].length; c++) {
      if (this.matrice[l][c]) {
        cellules.push({ col: this.col + c, lig: this.lig + l });
      }
    }
  }
  return cellules;
}
```

**Détail de `clone()` :**
- Copie profonde de la matrice (`.map(ligne => [...ligne])`)
- Copie de toutes les propriétés scalaires
- Utilisé pour calculer le fantôme et tester les rotations sans modifier la pièce active

**Position initiale :**
- Définie par `SPAWN_COLONNE` et `SPAWN_LIGNE` depuis les constantes
- La pièce spawn centrée horizontalement dans la grille

**Dépendances :** `SPAWN_COLONNE`, `SPAWN_LIGNE` depuis `./constantesTetris.js`

### Vérification
Instancier une `Piece` avec `PIECES.T`, appeler `obtenirCellules()`, vérifier que les 4 positions retournées correspondent à la forme T en position initiale. Cloner la pièce, modifier le clone, vérifier que l'original est inchangé.

### Texte du commit
```
feat(tetris): implémentation de Piece — modèle de tétromino

Modélisation d'un tétromino (type, matrice, couleur, position, rotation).
La méthode obtenirCellules() convertit la matrice locale en coordonnées
absolues. Clone profond pour tester rotations et calculer le fantôme.
```

---

## Bloc 03 — RotationMatrice (rotation par multiplication matricielle + wall kicks)

### Objectif
Créer la classe `RotationMatrice` qui effectue la rotation d'une matrice de pièce par transposition et inversion de lignes, et qui gère les wall kicks (décalages alternatifs quand la rotation provoque une collision).

### Fichier : `js/jeux/tetris/RotationMatrice.js`

**Principe de la rotation matricielle :**

La rotation d'une matrice 2D s'effectue en deux étapes :
- **Rotation horaire (90° CW)** : transposer la matrice (lignes → colonnes), puis inverser chaque ligne
- **Rotation antihoraire (90° CCW)** : inverser chaque ligne, puis transposer

```
Exemple — pièce T, rotation horaire :

État 0 :          Transposée :       Lignes inversées :
[0, 1, 0]         [0, 1, 0]          [0, 1, 0]
[1, 1, 1]    →    [1, 1, 0]    →     [0, 1, 1]
[0, 0, 0]         [0, 1, 0]          [0, 1, 0]

Résultat = état 1 (T tourné à droite)
```

**Interface publique :**
```js
class RotationMatrice {
  static tournerHoraire(matrice)           // retourne une nouvelle matrice tournée CW
  static tournerAntihoraire(matrice)       // retourne une nouvelle matrice tournée CCW
  static testerRotation(piece, grille, sensHoraire)
    // retourne { matrice, etatRotation, decalageCol, decalageLig } ou null si impossible
}
```

**Détail de `tournerHoraire(matrice)` :**
```js
static tournerHoraire(matrice) {
  const taille = matrice.length;
  const resultat = Array.from({ length: taille }, () => Array(taille).fill(0));
  for (let l = 0; l < taille; l++) {
    for (let c = 0; c < taille; c++) {
      resultat[c][taille - 1 - l] = matrice[l][c];
    }
  }
  return resultat;
}
```

**Détail de `tournerAntihoraire(matrice)` :**
```js
static tournerAntihoraire(matrice) {
  const taille = matrice.length;
  const resultat = Array.from({ length: taille }, () => Array(taille).fill(0));
  for (let l = 0; l < taille; l++) {
    for (let c = 0; c < taille; c++) {
      resultat[taille - 1 - c][l] = matrice[l][c];
    }
  }
  return resultat;
}
```

**Wall kicks (SRS simplifié) :**

Quand une rotation provoque une collision, on tente jusqu'à 4 décalages alternatifs (offsets). Si un décalage produit une position valide, la rotation est acceptée avec ce décalage. Si tous échouent, la rotation est refusée.

Les offsets dépendent du type de pièce et de la transition de rotation (état initial → état final).

**Tables de wall kick — Pièces J, L, S, T, Z (matrice 3×3) :**

| Transition | Offset 1 | Offset 2 | Offset 3 | Offset 4 |
|---|---|---|---|---|
| 0 → 1 | (-1, 0) | (-1, -1) | (0, +2) | (-1, +2) |
| 1 → 2 | (+1, 0) | (+1, +1) | (0, -2) | (+1, -2) |
| 2 → 3 | (+1, 0) | (+1, -1) | (0, +2) | (+1, +2) |
| 3 → 0 | (-1, 0) | (-1, +1) | (0, -2) | (-1, -2) |
| 1 → 0 | (+1, 0) | (+1, -1) | (0, +2) | (+1, +2) |
| 2 → 1 | (-1, 0) | (-1, +1) | (0, -2) | (-1, -2) |
| 3 → 2 | (-1, 0) | (-1, -1) | (0, +2) | (-1, +2) |
| 0 → 3 | (+1, 0) | (+1, +1) | (0, -2) | (+1, -2) |

> Format : `(deltaCol, deltaLig)` — les valeurs positives de `deltaLig` vont vers le bas.

**Tables de wall kick — Pièce I (matrice 4×4) :**

| Transition | Offset 1 | Offset 2 | Offset 3 | Offset 4 |
|---|---|---|---|---|
| 0 → 1 | (-2, 0) | (+1, 0) | (-2, +1) | (+1, -2) |
| 1 → 2 | (-1, 0) | (+2, 0) | (-1, -2) | (+2, +1) |
| 2 → 3 | (+2, 0) | (-1, 0) | (+2, -1) | (-1, +2) |
| 3 → 0 | (+1, 0) | (-2, 0) | (+1, +2) | (-2, -1) |
| 1 → 0 | (+2, 0) | (-1, 0) | (+2, -1) | (-1, +2) |
| 2 → 1 | (+1, 0) | (-2, 0) | (+1, +2) | (-2, -1) |
| 3 → 2 | (-2, 0) | (+1, 0) | (-2, +1) | (+1, -2) |
| 0 → 3 | (-1, 0) | (+2, 0) | (-1, -2) | (+2, +1) |

> La pièce O ne subit jamais de rotation (matrice symétrique).

**Représentation en code des tables d'offsets :**
```js
// Clé : "etatInitial>etatFinal"
const OFFSETS_JLSTZ = {
  '0>1': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[1, 0], [1, -1], [0, 2], [1, 2]],   // correction ici : les valeurs inversées par rapport à 0>1
  '2>1': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[1, 0], [1, -1], [0, 2], [1, 2]],    // correction : sens inverse de 3>0
};

const OFFSETS_I = {
  '0>1': [[-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[-1, 0], [2, 0], [-1, -2], [2, 1]],
};
```

**Détail de `testerRotation(piece, grille, sensHoraire)` :**
1. Cloner la pièce
2. Appliquer `tournerHoraire` ou `tournerAntihoraire` sur la matrice du clone
3. Calculer le nouvel état de rotation : `(etat + (sensHoraire ? 1 : 3)) % 4`
4. Tester la position de base (sans décalage) via `grille` — si valide, retourner le résultat
5. Sinon, récupérer la table d'offsets correspondante (I ou JLSTZ, selon le type)
6. Pour chaque offset `[dc, dl]`, tester la position `(piece.col + dc, piece.lig + dl)` via `grille`
7. Si un offset produit une position valide, retourner `{ matrice, etatRotation, decalageCol: dc, decalageLig: dl }`
8. Si aucun offset ne fonctionne, retourner `null` (rotation refusée)

**Dépendances :** aucune dépendance directe aux constantes — reçoit `piece` et `grille` en paramètre

### Vérification
Tourner la pièce T deux fois en horaire, vérifier que la matrice revient à l'état 2. Tester un wall kick : placer une pièce T contre le mur gauche en état 0, tourner en horaire → la pièce doit se décaler de 1 vers la droite.

### Texte du commit
```
feat(tetris): implémentation de RotationMatrice — rotation + wall kicks

Rotation par transposition/inversion matricielle (CW et CCW).
Tables de wall kick SRS simplifiées pour pièces JLSTZ et I.
Algorithme de test : position de base puis 4 offsets alternatifs.
```

---

## Bloc 04 — GrilleJeu (grille logique 10×20)

### Objectif
Créer la classe `GrilleJeu` qui représente l'état logique de la grille de jeu : un tableau 2D contenant les cellules verrouillées (les pièces posées). Cette classe ne connaît pas le canvas.

### Fichier : `js/jeux/tetris/GrilleJeu.js`

**Représentation interne :**
- `this.cellules` : tableau 2D de dimensions `(LIGNES + LIGNES_CACHEES) × COLONNES`
- Chaque cellule vaut `null` (vide) ou une chaîne de couleur (ex : `'#00f0f0'`)
- Les `LIGNES_CACHEES` lignes supérieures sont la zone de spawn invisible

**Interface publique :**
```js
class GrilleJeu {
  constructor()

  estVide(col, lig)                       // vrai si la cellule est null
  estOccupee(col, lig)                    // vrai si la cellule contient une couleur
  estDansLimites(col, lig)                // vrai si col et lig sont dans les bornes
  estPositionValide(cellules)             // vérifie un tableau de {col, lig} : toutes dans les limites et vides
  verrouiller(piece)                      // inscrit la couleur de la pièce dans les cellules correspondantes
  supprimerLignesCompletes()              // supprime les lignes pleines, retourne le nombre de lignes supprimées
  estLigneComplete(lig)                   // vrai si toutes les cellules de la ligne sont occupées
  obtenirCouleur(col, lig)               // retourne la couleur de la cellule ou null
  reinitialiser()                         // vide toute la grille
}
```

**Détail de `estPositionValide(cellules)` :**
```js
estPositionValide(cellules) {
  return cellules.every(({ col, lig }) =>
    this.estDansLimites(col, lig) && this.estVide(col, lig)
  );
}
```
- Utilisé par `RotationMatrice.testerRotation()` et par l'orchestrateur pour valider chaque déplacement
- `cellules` provient de `piece.obtenirCellules()` après un déplacement hypothétique

**Détail de `verrouiller(piece)` :**
```js
verrouiller(piece) {
  for (const { col, lig } of piece.obtenirCellules()) {
    this.cellules[lig][col] = piece.couleur;
  }
}
```

**Détail de `supprimerLignesCompletes()` :**
1. Parcourir toutes les lignes de bas en haut
2. Pour chaque ligne complète : la retirer du tableau (`splice`)
3. Ajouter une ligne vide en haut du tableau (`unshift`)
4. Retourner le nombre de lignes supprimées

```js
supprimerLignesCompletes() {
  let lignesSupprimees = 0;
  for (let l = this.cellules.length - 1; l >= 0; l--) {
    if (this.estLigneComplete(l)) {
      this.cellules.splice(l, 1);
      this.cellules.unshift(Array(COLONNES).fill(null));
      lignesSupprimees++;
      l++; // re-vérifier la même position car les lignes ont glissé
    }
  }
  return lignesSupprimees;
}
```

**Dépendances :** `COLONNES`, `LIGNES`, `LIGNES_CACHEES` depuis `./constantesTetris.js`

### Vérification
Créer une `GrilleJeu`, verrouiller une pièce, vérifier que les cellules sont occupées. Remplir une ligne entière, appeler `supprimerLignesCompletes()`, vérifier que la ligne a disparu et qu'une ligne vide est apparue en haut.

### Texte du commit
```
feat(tetris): implémentation de GrilleJeu — grille logique 10×20

Grille 2D stockant les cellules verrouillées (couleur ou null).
Validation de positions, verrouillage de pièces, suppression des
lignes complètes avec effondrement. Zone de spawn cachée au-dessus.
```

---

## Bloc 05 — PlateauTetris (rendu canvas du plateau)

### Objectif
Créer la classe `PlateauTetris` qui dessine la grille de jeu, les pièces verrouillées, la pièce active et la pièce fantôme sur un élément `<canvas>`. C'est le seul fichier du projet qui interagit directement avec l'API Canvas 2D.

### Fichier : `js/jeux/tetris/PlateauTetris.js`

**Représentation interne :**
- `this.canvas` : élément `<canvas>` créé dynamiquement
- `this.ctx` : contexte 2D (`canvas.getContext('2d')`)
- Dimensions du canvas : `LARGEUR_PLATEAU × HAUTEUR_PLATEAU`

**Interface publique :**
```js
class PlateauTetris {
  constructor(elementParent)               // crée le canvas et l'injecte dans elementParent

  dessiner(grille, pieceActive, fantome)   // redessine tout le plateau
  detruire()                               // retire le canvas du DOM

  get canvas()                             // accès au canvas pour positionnement CSS
}
```

**Détail de `dessiner(grille, pieceActive, fantome)` :**
L'ordre de dessin est important (les couches ultérieures recouvrent les précédentes) :

1. **Effacer le canvas** : `ctx.fillStyle = COULEUR_FOND; ctx.fillRect(0, 0, largeur, hauteur)`
2. **Dessiner la grille de fond** : quadrillage discret avec `COULEUR_GRILLE`
3. **Dessiner les cellules verrouillées** : parcourir `grille.cellules` (lignes visibles seulement, ignorer `LIGNES_CACHEES`), dessiner un rectangle coloré pour chaque cellule non-null
4. **Dessiner la pièce fantôme** : si `fantome` n'est pas null, dessiner ses cellules avec `COULEUR_FANTOME` (semi-transparent)
5. **Dessiner la pièce active** : dessiner ses cellules avec sa couleur pleine

**Méthode privée `_dessinerCellule(col, lig, couleur)` :**
```js
_dessinerCellule(col, lig, couleur) {
  // Convertir les coordonnées grille en pixels
  // lig est relatif à la zone visible (soustraire LIGNES_CACHEES)
  const ligVisible = lig - LIGNES_CACHEES;
  if (ligVisible < 0) return; // ne pas dessiner dans la zone cachée

  const x = col * TAILLE_CELLULE;
  const y = ligVisible * TAILLE_CELLULE;

  // Fond de la cellule
  this.ctx.fillStyle = couleur;
  this.ctx.fillRect(x, y, TAILLE_CELLULE, TAILLE_CELLULE);

  // Bordure interne
  this.ctx.strokeStyle = COULEUR_BORDURE;
  this.ctx.lineWidth = EPAISSEUR_BORDURE;
  this.ctx.strokeRect(x, y, TAILLE_CELLULE, TAILLE_CELLULE);
}
```

**Dessin de la grille de fond :**
```js
_dessinerGrille() {
  this.ctx.strokeStyle = COULEUR_GRILLE;
  this.ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLONNES; c++) {
    this.ctx.beginPath();
    this.ctx.moveTo(c * TAILLE_CELLULE, 0);
    this.ctx.lineTo(c * TAILLE_CELLULE, HAUTEUR_PLATEAU);
    this.ctx.stroke();
  }
  for (let l = 0; l <= LIGNES; l++) {
    this.ctx.beginPath();
    this.ctx.moveTo(0, l * TAILLE_CELLULE);
    this.ctx.lineTo(LARGEUR_PLATEAU, l * TAILLE_CELLULE);
    this.ctx.stroke();
  }
}
```

**Pourquoi canvas et pas DOM pour Tetris :**
- Le rendu pixel par pixel permet de dessiner la pièce fantôme en semi-transparence sans créer de complexité CSS
- Les 200+ cellules de la grille seraient lourdes à manipuler en DOM à 60fps
- La rotation et le mouvement fluides sont plus naturels en canvas

**Dépendances :** `TAILLE_CELLULE`, `EPAISSEUR_BORDURE`, `LARGEUR_PLATEAU`, `HAUTEUR_PLATEAU`, `COLONNES`, `LIGNES`, `LIGNES_CACHEES`, `COULEUR_FOND`, `COULEUR_GRILLE`, `COULEUR_BORDURE`, `COULEUR_FANTOME` depuis `./constantesTetris.js`

### Vérification
Instancier `PlateauTetris` avec un élément DOM, créer une `GrilleJeu` avec quelques cellules verrouillées et une pièce active, appeler `dessiner()`. Vérifier visuellement que le canvas affiche la grille, les cellules et la pièce.

### Texte du commit
```
feat(tetris): implémentation de PlateauTetris — rendu canvas

Rendu intégral via Canvas 2D : grille de fond, cellules verrouillées,
pièce fantôme semi-transparente, pièce active. Zone de spawn cachée
au-dessus du champ visible. Seul fichier du projet utilisant canvas.
```

---

## Bloc 06 — CanvasApercu (aperçu pièce suivante / réserve)

### Objectif
Créer la classe `CanvasApercu` qui dessine une pièce isolée dans un petit canvas. Utilisée deux fois : une fois pour la pièce suivante (next), une fois pour la pièce en réserve (hold).

### Fichier : `js/jeux/tetris/CanvasApercu.js`

**Interface publique :**
```js
class CanvasApercu {
  constructor(elementParent, options = {})   // crée un petit canvas et l'injecte
  dessinerPiece(definition)                  // dessine la pièce centrée (ou null pour effacer)
  effacer()                                  // vide le canvas
  detruire()                                 // retire le canvas du DOM
}
```

**Détail de `dessinerPiece(definition)` :**
- `definition` est un objet de `PIECES` (ex : `PIECES.T`) — on dessine la matrice initiale (état 0)
- Si `definition` est `null`, efface le canvas
- Calcul du centrage : décaler la pièce pour qu'elle apparaisse centrée dans le canvas d'aperçu
  - `decalageX = (COLONNES_APERCU * TAILLE_CELLULE_APERCU - matrice[0].length * TAILLE_CELLULE_APERCU) / 2`
  - `decalageY = (LIGNES_APERCU * TAILLE_CELLULE_APERCU - matrice.length * TAILLE_CELLULE_APERCU) / 2`
- Dessiner chaque cellule à `1` de la matrice comme un rectangle coloré

```js
dessinerPiece(definition) {
  this.effacer();
  if (!definition) return;

  const { matrice, couleur } = definition;
  const decX = Math.floor(
    (this.largeur - matrice[0].length * TAILLE_CELLULE_APERCU) / 2
  );
  const decY = Math.floor(
    (this.hauteur - matrice.length * TAILLE_CELLULE_APERCU) / 2
  );

  this.ctx.fillStyle = couleur;
  for (let l = 0; l < matrice.length; l++) {
    for (let c = 0; c < matrice[l].length; c++) {
      if (matrice[l][c]) {
        const x = decX + c * TAILLE_CELLULE_APERCU;
        const y = decY + l * TAILLE_CELLULE_APERCU;
        this.ctx.fillRect(x, y, TAILLE_CELLULE_APERCU, TAILLE_CELLULE_APERCU);
        this.ctx.strokeStyle = COULEUR_BORDURE;
        this.ctx.lineWidth = EPAISSEUR_BORDURE;
        this.ctx.strokeRect(x, y, TAILLE_CELLULE_APERCU, TAILLE_CELLULE_APERCU);
      }
    }
  }
}
```

**Dépendances :** `TAILLE_CELLULE_APERCU`, `COLONNES_APERCU`, `LIGNES_APERCU`, `COULEUR_FOND`, `COULEUR_BORDURE`, `EPAISSEUR_BORDURE` depuis `./constantesTetris.js`

### Vérification
Instancier deux `CanvasApercu`, dessiner la pièce T dans l'un et la pièce I dans l'autre. Vérifier visuellement que les pièces sont centrées et colorées correctement.

### Texte du commit
```
feat(tetris): implémentation de CanvasApercu — aperçu de pièces

Petit canvas réutilisable pour afficher une pièce isolée (pièce
suivante ou pièce en réserve). Centrage automatique de la pièce
dans le canvas. Utilisé deux fois dans l'UI.
```

---

## Bloc 07 — Fantome (pièce fantôme)

### Objectif
Créer la classe `Fantome` qui calcule la position de projection de la pièce active : l'endroit où elle atterrirait si le joueur effectuait un hard drop. La pièce fantôme aide le joueur à viser.

### Fichier : `js/jeux/tetris/Fantome.js`

**Interface publique :**
```js
class Fantome {
  static calculer(piece, grille)   // retourne une Piece positionnée au point d'atterrissage
}
```

**Détail de `calculer(piece, grille)` :**
```js
static calculer(piece, grille) {
  const fantome = piece.clone();

  // Descendre le clone ligne par ligne tant que la position est valide
  while (true) {
    fantome.deplacer(0, 1);
    if (!grille.estPositionValide(fantome.obtenirCellules())) {
      fantome.deplacer(0, -1); // remonter d'une ligne : dernière position valide
      break;
    }
  }

  return fantome;
}
```

- Le fantôme a la même forme, la même colonne et la même rotation que la pièce active
- Seule la ligne change : c'est la ligne la plus basse où la pièce est encore en position valide
- Le `PlateauTetris` dessine ensuite le fantôme avec `COULEUR_FANTOME` (semi-transparent)

**Pourquoi une classe séparée :**
- Respect de SRP : le calcul de projection est une responsabilité distincte de la pièce et de la grille
- Facilite les tests : on peut tester `Fantome.calculer` indépendamment

**Dépendances :** `Piece` (pour `clone()`, `deplacer()`, `obtenirCellules()`)

### Vérification
Créer une grille vide et une pièce I en haut. Appeler `Fantome.calculer(piece, grille)`. Vérifier que le fantôme est positionné tout en bas de la grille (ligne 19 pour la pièce I horizontale).

### Texte du commit
```
feat(tetris): implémentation de Fantome — pièce fantôme de projection

Calcul de la position d'atterrissage par descente itérative d'un
clone de la pièce active. Permet au joueur de visualiser où la
pièce se posera en cas de hard drop.
```

---

## Bloc 08 — BoucleDeJeuTetris (boucle rAF + gravité)

### Objectif
Créer la classe `BoucleDeJeuTetris` qui orchestre le timing du jeu : boucle de rendu à 60fps via `requestAnimationFrame`, et gravité sur un accumulateur temporel indépendant dont l'intervalle diminue à chaque niveau.

### Fichier : `js/jeux/tetris/BoucleDeJeuTetris.js`

**Représentation interne :**
- `this.callbackRendu` : fonction appelée à chaque frame (rendu)
- `this.callbackGravite` : fonction appelée quand l'accumulateur de gravité expire (descente d'une ligne)
- `this.intervalleGravite` : millisecondes entre deux descentes (dépend du niveau)
- `this.accumulateurGravite` : temps accumulé depuis la dernière descente
- `this.dernierTimestamp` : timestamp du dernier frame
- `this.idAnimation` : ID retourné par `requestAnimationFrame`
- `this.enCours` : booléen

**Interface publique :**
```js
class BoucleDeJeuTetris {
  constructor(callbackRendu, callbackGravite)

  demarrer()                              // lance la boucle rAF
  arreter()                               // stoppe la boucle rAF
  changerIntervalleGravite(intervalle)    // met à jour la vitesse de gravité (changement de niveau)
  reinitialiserAccumulateur()             // remet l'accumulateur à 0 (après un hard/soft drop)

  get enCours()
}
```

**Boucle principale (`_boucle(timestamp)`) :**
```js
_boucle(timestamp) {
  if (!this.enCours) return;

  const delta = timestamp - this.dernierTimestamp;
  this.dernierTimestamp = timestamp;

  // Accumuler le temps de gravité
  this.accumulateurGravite += delta;

  // Si l'accumulateur dépasse l'intervalle : déclencher la gravité
  while (this.accumulateurGravite >= this.intervalleGravite) {
    this.accumulateurGravite -= this.intervalleGravite;
    this.callbackGravite();
  }

  // Rendu à chaque frame (60fps)
  this.callbackRendu();

  this.idAnimation = requestAnimationFrame((t) => this._boucle(t));
}
```

**Pourquoi `requestAnimationFrame` et pas `setInterval` :**
- `rAF` synchronise le rendu avec le taux de rafraîchissement de l'écran (pas de tearing)
- La gravité est gérée par un accumulateur interne, pas par le timer lui-même
- `setInterval` est utilisé pour Snake car le rendu y est discret (tick par tick). Tetris a besoin d'un rendu continu pour le fantôme et les animations futures

**Pourquoi un accumulateur plutôt qu'un timer séparé :**
- Un seul `requestAnimationFrame` gère tout le timing
- L'accumulateur permet de rattraper le retard si un frame est lent (le `while` traite plusieurs ticks de gravité si nécessaire)
- Plus prévisible que deux timers indépendants

**Dépendances :** `VITESSES_PAR_NIVEAU` depuis `./constantesTetris.js` (utilisé par l'appelant pour calculer l'intervalle)

### Vérification
Instancier `BoucleDeJeuTetris` avec des callbacks console. Démarrer, vérifier que le callback de rendu est appelé ~60 fois par seconde et que le callback de gravité est appelé selon l'intervalle configuré. Arrêter, vérifier que tout s'arrête.

### Texte du commit
```
feat(tetris): implémentation de BoucleDeJeuTetris — boucle rAF + gravité

Boucle de jeu basée sur requestAnimationFrame avec rendu à 60fps.
Gravité gérée par accumulateur temporel indépendant avec intervalle
configurable par niveau. Rattrapage automatique si un frame est lent.
```

---

## Bloc 09 — SystemeDeScore (scoring Nintendo)

### Objectif
Créer la classe `SystemeDeScore` qui gère le calcul du score, le suivi du niveau et le comptage des lignes supprimées. Le système de scoring est basé sur le modèle Nintendo : les points dépendent du nombre de lignes supprimées simultanément, multipliés par le niveau actuel.

### Fichier : `js/jeux/tetris/SystemeDeScore.js`

**Représentation interne :**
- `this.score` : entier, commence à 0
- `this.niveau` : entier, commence à 1
- `this.lignesSupprimees` : entier total, commence à 0
- `this.surChangement` : callback appelé à chaque changement (score, niveau, lignes)

**Interface publique :**
```js
class SystemeDeScore {
  constructor(surChangement = null)

  ajouterLignes(nombreLignes)             // calcule les points pour 1-4 lignes et les ajoute
  ajouterPointsChuteDouce(nombreLignes)   // +POINTS_CHUTE_DOUCE par ligne descendue en soft drop
  ajouterPointsChuteFort(nombreLignes)    // +POINTS_CHUTE_FORTE par ligne descendue en hard drop
  reinitialiser()                         // remet tout à zéro

  get score()
  get niveau()
  get lignesSupprimees()
  get vitesseActuelle()                   // retourne VITESSES_PAR_NIVEAU[niveau - 1] (plafonné)
}
```

**Détail de `ajouterLignes(nombreLignes)` :**
```js
ajouterLignes(nombreLignes) {
  if (nombreLignes < 1 || nombreLignes > 4) return;

  const points = POINTS_PAR_LIGNES[nombreLignes] * this.niveau;
  this.score += points;
  this.lignesSupprimees += nombreLignes;

  // Vérifier passage de niveau
  const nouveauNiveau = 1 + Math.floor(this.lignesSupprimees / LIGNES_PAR_NIVEAU);
  if (nouveauNiveau !== this.niveau) {
    this.niveau = nouveauNiveau;
  }

  this._notifier();
}
```

**Table de scoring :**

| Lignes | Nom | Points (× niveau) |
|--------|-----|--------------------|
| 1 | Simple | 100 |
| 2 | Double | 300 |
| 3 | Triple | 500 |
| 4 | Tetris | 800 |

**Exemples de calcul :**
- 1 ligne au niveau 3 → 100 × 3 = 300 points
- 4 lignes (Tetris) au niveau 5 → 800 × 5 = 4000 points
- Hard drop de 15 lignes → 15 × 2 = 30 points bonus

**Détail de `vitesseActuelle` :**
```js
get vitesseActuelle() {
  const index = Math.min(this.niveau - 1, VITESSES_PAR_NIVEAU.length - 1);
  return VITESSES_PAR_NIVEAU[index];
}
```

**Dépendances :** `POINTS_PAR_LIGNES`, `POINTS_CHUTE_DOUCE`, `POINTS_CHUTE_FORTE`, `LIGNES_PAR_NIVEAU`, `VITESSES_PAR_NIVEAU` depuis `./constantesTetris.js`

### Vérification
Créer un `SystemeDeScore`, ajouter 10 lignes simples, vérifier que le niveau passe à 2. Ajouter un Tetris (4 lignes) au niveau 2 : score attendu = (10 × 100 × 1) + (800 × 2) = 2600.

### Texte du commit
```
feat(tetris): implémentation de SystemeDeScore — scoring Nintendo

Calcul des points selon le modèle Nintendo (100/300/500/800 × niveau).
Bonus pour soft drop et hard drop. Passage de niveau tous les 10 lignes.
Vitesse de gravité déduite du niveau courant.
```

---

## Bloc 10 — GestionnaireEntrees (clavier avec DAS/ARR)

### Objectif
Créer la classe `GestionnaireEntrees` qui écoute les événements clavier et les traduit en actions de jeu. Elle gère le DAS (Delayed Auto Shift) et l'ARR (Auto Repeat Rate) pour les déplacements latéraux maintenus.

### Fichier : `js/jeux/tetris/GestionnaireEntrees.js`

**Représentation interne :**
- `this.touchesActives` : `Map<touche, { action, timestampDebut, enRepetition }>` — touches actuellement enfoncées
- `this.callbacks` : objet `{ GAUCHE, DROITE, CHUTE_DOUCE, ROTATION_HORAIRE, ROTATION_ANTIHORAIRE, CHUTE_FORTE, RESERVE, PAUSE }` — fonctions à appeler
- `this._onKeyDown` / `this._onKeyUp` : handlers liés (arrow functions pour `removeEventListener`)

**Interface publique :**
```js
class GestionnaireEntrees {
  constructor(callbacks)

  activer()                 // attache les listeners keydown/keyup sur document
  desactiver()              // détache les listeners
  mettreAJour(timestamp)    // appelé à chaque frame : gère DAS/ARR pour les touches maintenues
}
```

**Détail du DAS/ARR :**

Le DAS/ARR est un système de répétition automatique pour les déplacements latéraux (gauche/droite) :
1. **Première pression** : exécute l'action immédiatement
2. **Touche maintenue** : après `DAS` ms (170ms), commence à répéter l'action tous les `ARR` ms (50ms)
3. **Relâchement** : arrête la répétition

```
Pression          DAS (170ms)           ARR  ARR  ARR  ARR ...
   |──────────────────|────────|────────|────────|────────|
   ↑                  ↑        ↑        ↑        ↑        ↑
   Action 1           Action 2 Action 3 Action 4 Action 5 ...
```

**Détail de `mettreAJour(timestamp)` :**
```js
mettreAJour(timestamp) {
  for (const [touche, etat] of this.touchesActives) {
    // DAS/ARR uniquement pour GAUCHE et DROITE
    if (etat.action !== 'GAUCHE' && etat.action !== 'DROITE') continue;

    const tempsEcoule = timestamp - etat.timestampDebut;

    if (!etat.enRepetition) {
      // Phase DAS : attendre le délai initial
      if (tempsEcoule >= DAS) {
        etat.enRepetition = true;
        etat.dernierRepeat = timestamp;
        this.callbacks[etat.action]?.();
      }
    } else {
      // Phase ARR : répéter à intervalle régulier
      if (timestamp - etat.dernierRepeat >= ARR) {
        etat.dernierRepeat = timestamp;
        this.callbacks[etat.action]?.();
      }
    }
  }
}
```

**Gestion de `keydown` :**
- Ignorer si la touche n'est pas dans `TOUCHES`
- Ignorer si `event.repeat` est `true` (le navigateur gère son propre repeat, on le remplace par DAS/ARR)
- Ajouter la touche à `touchesActives`
- Exécuter l'action immédiatement (sauf pour GAUCHE/DROITE dont la première exécution est aussi immédiate, mais les suivantes passent par DAS/ARR)
- Actions non-répétables (exécutées une seule fois) : `ROTATION_HORAIRE`, `ROTATION_ANTIHORAIRE`, `CHUTE_FORTE`, `RESERVE`, `PAUSE`

**Gestion de `keyup` :**
- Retirer la touche de `touchesActives`
- Si c'est `CHUTE_DOUCE` : notifier le callback d'arrêt de soft drop

**Pourquoi `mettreAJour` dans la boucle rAF :**
- Le DAS/ARR est basé sur des timestamps, pas sur des timers
- Appeler `mettreAJour(timestamp)` à chaque frame de `BoucleDeJeuTetris` synchronise la répétition avec le rendu

**Dépendances :** `TOUCHES`, `DAS`, `ARR` depuis `./constantesTetris.js`

### Vérification
Activer `GestionnaireEntrees` avec des callbacks console. Appuyer sur flèche gauche : une exécution immédiate. Maintenir : après 170ms, répétitions toutes les 50ms. Relâcher : stop. Appuyer sur espace : une seule exécution (pas de repeat).

### Texte du commit
```
feat(tetris): implémentation de GestionnaireEntrees — clavier DAS/ARR

Gestion des inputs clavier avec DAS (170ms) et ARR (50ms) pour les
déplacements latéraux maintenus. Actions immédiates pour rotations,
hard drop, réserve et pause. Synchronisé avec la boucle rAF.
```

---

## Bloc 11 — Jeu (orchestrateur interne)

### Objectif
Créer la classe `Jeu` qui coordonne toutes les entités du jeu Tetris. C'est le cerveau interne : il gère la pièce active, la pièce suivante, la réserve, la gravité, le verrouillage, la suppression de lignes et la détection de game over.

### Fichier : `js/jeux/tetris/Jeu.js`

**Constructeur (injection de dépendances) :**
```js
constructor(elementConteneur, { surFinDePartie, surScoreChange } = {})
```
- Instancie en interne : `GrilleJeu`, `PlateauTetris`, `BoucleDeJeuTetris`, `SystemeDeScore`, `GestionnaireEntrees`, `CanvasApercu` (×2 : suivante + réserve)
- Enregistre les callbacks `surFinDePartie(score, niveau, lignes)` et `surScoreChange(score, niveau, lignes)`

**État interne :**
- `this.grille` : instance de `GrilleJeu`
- `this.pieceActive` : instance de `Piece` (la pièce qui tombe)
- `this.pieceSuivante` : instance de `Piece` (la prochaine pièce)
- `this.pieceReserve` : instance de `Piece` ou `null` (la pièce en réserve / hold)
- `this.aUtiliseReserve` : booléen, empêche de réserver plus d'une fois par pièce
- `this.sac` : tableau des prochaines pièces (système 7-bag)
- `this.timerVerrouillage` : accumulateur pour le lock delay
- `this.resetsVerrouillage` : compteur de remises à zéro du lock delay
- `this.pieceAuSol` : booléen, vrai quand la pièce ne peut plus descendre

**Interface publique :**
```js
class Jeu {
  constructor(elementConteneur, options)

  demarrer()          // initialise la grille, génère les premières pièces, lance la boucle
  mettreEnPause()     // arrête la boucle sans réinitialiser
  reprendre()         // relance la boucle
  arreter()           // arrête la boucle et détache les inputs
  detruire()          // appelle arreter(), retire le DOM, null les références

  get score()
  get niveau()
  get lignesSupprimees()
}
```

**Système 7-bag (génération aléatoire) :**

Le système 7-bag garantit que chaque pièce apparaît exactement une fois dans chaque lot de 7 :
```js
_genererSac() {
  const sac = [...TYPES_PIECES]; // ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
  // Mélange Fisher-Yates
  for (let i = sac.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sac[i], sac[j]] = [sac[j], sac[i]];
  }
  return sac;
}

_prochainepiece() {
  if (this.sac.length === 0) {
    this.sac = this._genererSac();
  }
  const type = this.sac.pop();
  return new Piece(PIECES[type]);
}
```

**Logique de gravité (callback de `BoucleDeJeuTetris`) :**
```
_gravite():
  1. Tenter de déplacer la pièce active d'une ligne vers le bas
  2. Si la position est valide → appliquer le déplacement, réinitialiser le timer de verrouillage
  3. Si la position n'est PAS valide → la pièce est au sol :
     a. Incrémenter le timer de verrouillage
     b. Si timer >= DELAI_VERROUILLAGE → verrouiller la pièce
```

**Logique de verrouillage (`_verrouiller()`) :**
```
_verrouiller():
  1. grille.verrouiller(pieceActive)
  2. lignes = grille.supprimerLignesCompletes()
  3. Si lignes > 0 : systemeDeScore.ajouterLignes(lignes)
  4. Mettre à jour la vitesse de gravité selon le nouveau niveau
  5. Générer la pièce suivante (_prochainepiece)
  6. Vérifier game over : si la nouvelle pièce chevauche des cellules verrouillées → fin de partie
  7. Réinitialiser aUtiliseReserve = false
  8. Réinitialiser timerVerrouillage et resetsVerrouillage
```

**Lock delay (délai de verrouillage) :**

Quand la pièce touche le sol, elle ne se verrouille pas immédiatement. Le joueur dispose de `DELAI_VERROUILLAGE` ms (500ms) pour la déplacer ou la tourner :
- Chaque déplacement ou rotation réussi remet le timer à 0
- Mais le nombre de resets est limité à `MAX_RESETS_VERROUILLAGE` (15) pour éviter le stalling infini
- Si le timer expire OU si le max de resets est atteint → verrouillage immédiat

```js
_gererVerrouillage(delta) {
  if (!this.pieceAuSol) return;

  this.timerVerrouillage += delta;

  if (this.timerVerrouillage >= DELAI_VERROUILLAGE) {
    this._verrouiller();
  }
}

_reinitialiserVerrouillage() {
  if (this.resetsVerrouillage < MAX_RESETS_VERROUILLAGE) {
    this.timerVerrouillage = 0;
    this.resetsVerrouillage++;
  }
}
```

**Actions clavier (callbacks injectés dans `GestionnaireEntrees`) :**

| Action | Comportement |
|--------|-------------|
| `GAUCHE` | Tenter de déplacer la pièce de (-1, 0). Si au sol : reset lock delay |
| `DROITE` | Tenter de déplacer la pièce de (+1, 0). Si au sol : reset lock delay |
| `CHUTE_DOUCE` | Changer l'intervalle de gravité à `VITESSE_CHUTE_DOUCE`. Ajouter des points de soft drop par ligne descendue |
| `ROTATION_HORAIRE` | Appeler `RotationMatrice.testerRotation(piece, grille, true)`. Si réussi : appliquer. Si au sol : reset lock delay |
| `ROTATION_ANTIHORAIRE` | Idem avec `false` |
| `CHUTE_FORTE` | Calculer la distance via `Fantome.calculer()`, déplacer la pièce à la position du fantôme, verrouiller immédiatement. Ajouter des points de hard drop (2 × distance) |
| `RESERVE` | Si `aUtiliseReserve` est `true` : ignorer. Sinon : échanger la pièce active avec `pieceReserve` (ou stocker si réserve vide), `aUtiliseReserve = true` |
| `PAUSE` | Appeler `mettreEnPause()` ou `reprendre()` selon l'état |

**Logique de réserve (hold) :**
```js
_reserver() {
  if (this.aUtiliseReserve) return;

  this.aUtiliseReserve = true;

  if (this.pieceReserve === null) {
    // Première réserve : stocker la pièce active, en tirer une nouvelle
    this.pieceReserve = PIECES[this.pieceActive.type];
    this.pieceActive = this._prochainepiece();
  } else {
    // Échange : la réserve devient active, l'active devient réserve
    const typeReserve = this.pieceReserve.type;
    this.pieceReserve = PIECES[this.pieceActive.type];
    this.pieceActive = new Piece(PIECES[typeReserve]);
  }

  // Mettre à jour l'aperçu de la réserve
  this.canvasReserve.dessinerPiece(this.pieceReserve);
}
```

**Rendu (callback de `BoucleDeJeuTetris`) :**
```js
_rendu() {
  const fantome = Fantome.calculer(this.pieceActive, this.grille);
  this.plateau.dessiner(this.grille, this.pieceActive, fantome);
}
```

**Détection de game over :**
- Lors de la création d'une nouvelle pièce, vérifier si ses cellules initiales chevauchent des cellules verrouillées
- Si oui : appeler `_terminerPartie()`

**Dépendances :** `GrilleJeu`, `PlateauTetris`, `BoucleDeJeuTetris`, `SystemeDeScore`, `GestionnaireEntrees`, `CanvasApercu`, `Piece`, `RotationMatrice`, `Fantome`, constantes depuis `./constantesTetris.js`

### Vérification
Instancier `Jeu` avec un élément DOM et des callbacks console. Vérifier que la pièce tombe, que les rotations fonctionnent (y compris les wall kicks contre les murs), que le hard drop verrouille immédiatement, que la réserve fonctionne une seule fois par pièce, que les lignes complètes sont supprimées et que le score augmente.

### Texte du commit
```
feat(tetris): implémentation de Jeu — orchestrateur principal

Coordination de toutes les entités (grille, pièce, boucle, score,
inputs). Système 7-bag, lock delay avec max resets, hard/soft drop,
réserve (hold), détection game over. Callbacks pour l'UI.
```

---

## Bloc 12 — JeuTetris (adaptateur InterfaceJeu)

### Objectif
Créer la classe `JeuTetris` qui étend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS.

### Fichier : `js/jeux/tetris/JeuTetris.js`

**Propriétés statiques :**
```js
static ID = 'tetris';
static NOM = 'Tetris';
static DESCRIPTION = 'Empilez les tétrominos, complétez des lignes et visez le score le plus haut.';
static ICONE = '🧱';
static UTILISE_SCORES = true;
```

**Interface :**
```js
class JeuTetris extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()       // Crée le DOM wrapper .jeu-tetris, instancie Jeu en interne
  demarrer()          // Délègue à this.jeu.demarrer()
  mettreEnPause()     // Délègue à this.jeu.mettreEnPause()
  reprendre()         // Délègue à this.jeu.reprendre()
  arreter()           // Délègue à this.jeu.arreter()
  detruire()          // Appelle arreter(), retire le DOM, null les références

  get etat()          // 'pret' | 'en_cours' | 'en_pause' | 'termine'
  get scoreActuel()   // { points, niveau, lignesSupprimees, jeuId: 'tetris' }
}
```

**Rôle :** c'est un adaptateur (pattern Adapter) entre l'orchestrateur interne `Jeu` (qui garde sa logique métier intacte) et le contrat `InterfaceJeu` attendu par le shell. Le shell ne connaît que `JeuTetris`, jamais `Jeu` directement.

**Gestion de l'état :**
```js
get etat() {
  return this._etat; // mis à jour par les méthodes du cycle de vie
}

initialiser() {
  this._etat = 'pret';
  // Créer le conteneur .jeu-tetris, instancier Jeu avec les callbacks
}

demarrer() {
  this._etat = 'en_cours';
  this.jeu.demarrer();
}

mettreEnPause() {
  this._etat = 'en_pause';
  this.jeu.mettreEnPause();
}
```

**Dépendances :** `Jeu`, `InterfaceJeu` depuis `../../commun/InterfaceJeu.js`

### Vérification
Enregistrer `JeuTetris` dans le routeur, naviguer vers `#tetris`, vérifier que le jeu se lance et que la navigation retour fonctionne. Vérifier que `etat` et `scoreActuel` retournent les bonnes valeurs.

### Texte du commit
```
feat(tetris): implémentation de JeuTetris — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne Jeu et le contrat InterfaceJeu
du shell PlaygroundJS. Gère le cycle de vie (init, start, pause,
resume, stop, destroy) et expose l'état et le score.
```

---

## Bloc 13 — TetrisUI (HUD)

### Objectif
Créer la classe `TetrisUI` qui affiche le HUD pendant la partie : score, niveau, lignes, aperçu de la pièce suivante, aperçu de la pièce en réserve, et l'écran de fin de partie.

### Fichier : `js/jeux/tetris/ui/TetrisUI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu, depotScores, profilActif, { surRetourMenu, surRejouer })
```

**Interface publique :**
```js
afficher()                                    // injecte le HUD et démarre la partie
masquer()                                     // nettoie et arrête la partie
mettreAJourScore(score, niveau, lignes)       // appelé par le callback surScoreChange du Jeu
afficherFinDePartie(score, niveau, lignes)    // appelé par surFinDePartie
```

**Structure HTML du HUD :**
```html
<div class="jeu-tetris">
  <aside class="tetris-panneau tetris-panneau--gauche">
    <div class="tetris-reserve">
      <h3>Réserve</h3>
      <!-- CanvasApercu réserve injecté ici -->
    </div>
  </aside>

  <main class="tetris-plateau">
    <!-- PlateauTetris canvas injecté ici -->
  </main>

  <aside class="tetris-panneau tetris-panneau--droite">
    <div class="tetris-suivante">
      <h3>Suivante</h3>
      <!-- CanvasApercu suivante injecté ici -->
    </div>
    <div class="tetris-infos">
      <div class="tetris-infos__score">
        <span class="label">Score</span>
        <span class="valeur" id="tetris-score">0</span>
      </div>
      <div class="tetris-infos__niveau">
        <span class="label">Niveau</span>
        <span class="valeur" id="tetris-niveau">1</span>
      </div>
      <div class="tetris-infos__lignes">
        <span class="label">Lignes</span>
        <span class="valeur" id="tetris-lignes">0</span>
      </div>
    </div>
    <div class="tetris-controles">
      <button class="btn--pause" id="tetris-pause">Pause</button>
    </div>
  </aside>
</div>
```

**Écran de fin de partie (superposition) :**
```html
<div class="overlay-fin">
  <h2>Game Over</h2>
  <p class="overlay-fin__score">Score : X</p>
  <p class="overlay-fin__details">Niveau Y — Z lignes</p>
  <p class="overlay-fin__meilleur">Meilleur score : W</p>
  <button class="btn--rejouer">Rejouer</button>
  <button class="btn--menu">Accueil</button>
</div>
```

**Comportements :**
- `afficherFinDePartie` : enregistre le score via `depotScores.ajouterScore(...)`, affiche l'overlay avec le meilleur score filtré par `jeuId = 'tetris'`
- Bouton "Rejouer" : réinitialise le jeu sans revenir à l'accueil
- Bouton "Pause" : appelle `jeu.mettreEnPause()`, change le label en "Reprendre". Nouveau clic → `jeu.reprendre()`

**Mise à jour des informations :**
```js
mettreAJourScore(score, niveau, lignes) {
  document.getElementById('tetris-score').textContent = score;
  document.getElementById('tetris-niveau').textContent = niveau;
  document.getElementById('tetris-lignes').textContent = lignes;
}
```

**Dépendances :** `Jeu`, `DepotScores`, `Score`

### Vérification
Lancer une partie, vérifier que le score, le niveau et les lignes s'affichent en temps réel. Vérifier l'aperçu de la pièce suivante et de la réserve. Perdre, vérifier l'overlay de fin de partie avec le score enregistré.

### Texte du commit
```
feat(tetris): implémentation de TetrisUI — HUD et écran de fin

Affichage du score, niveau et lignes en temps réel. Aperçus canvas
pour la pièce suivante et la réserve. Overlay de fin de partie avec
enregistrement automatique du score et meilleur score.
```

---

## Bloc 14 — TetrisScoresUI (tableau des scores)

### Objectif
Créer la classe `TetrisScoresUI` qui affiche les scores spécifiques au Tetris.

### Fichier : `js/jeux/tetris/ui/TetrisScoresUI.js`

**Constructeur :**
```js
constructor(elementConteneur, depotScores, gestionnaireProfils, { surRetour })
```

**Interface publique :**
```js
afficher()   // injecte la vue dans elementConteneur
masquer()    // vide elementConteneur
```

**Structure HTML :**
```html
<div class="scores-ui">
  <h2>Scores — Tetris</h2>
  <div class="scores-filtres">
    <button class="filtre--tous actif">Classement général</button>
    <!-- un bouton par profil -->
  </div>
  <table class="scores-tableau">
    <thead>
      <tr>
        <th>Rang</th>
        <th>Joueur</th>
        <th>Score</th>
        <th>Niveau</th>
        <th>Lignes</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody><!-- lignes dynamiques --></tbody>
  </table>
  <button class="btn--retour">Retour</button>
</div>
```

**Comportements :**
- Filtre par défaut sur `jeuId = 'tetris'`
- Résolution `profilId → nom` via `gestionnaireProfils`
- Tri par score décroissant
- Si aucun score : message "Aucun score enregistré"
- Colonne "Lignes" spécifique au Tetris (information supplémentaire par rapport au Snake)

**Dépendances :** `DepotScores`, `GestionnaireProfils`

### Vérification
Jouer quelques parties, vérifier que les scores apparaissent dans le tableau. Filtrer par profil, vérifier le tri.

### Texte du commit
```
feat(tetris): implémentation de TetrisScoresUI — tableau des scores Tetris

Vue de classement filtré par jeu Tetris avec colonnes score, niveau
et lignes. Filtrage par profil, résolution des noms depuis les ids.
```

---

## Bloc 15 — CSS Tetris (`css/jeux/tetris.css`)

### Objectif
Écrire les styles spécifiques au jeu Tetris, scopés sous `.jeu-tetris`.

### Fichier : `css/jeux/tetris.css`

**Organisation :**
```css
/* ──────────────────────────────────────
   Layout principal : panneau gauche + canvas central + panneau droit
   ────────────────────────────────────── */
.jeu-tetris {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  padding: 1rem;
}

/* ──────────────────────────────────────
   Canvas du plateau
   ────────────────────────────────────── */
.jeu-tetris .tetris-plateau {
  flex-shrink: 0;
}

.jeu-tetris .tetris-plateau canvas {
  display: block;
  border: 2px solid var(--couleur-bordure-tetris, #444);
  border-radius: 4px;
}

/* ──────────────────────────────────────
   Panneaux latéraux (réserve à gauche, infos à droite)
   ────────────────────────────────────── */
.jeu-tetris .tetris-panneau {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 160px;
}

.jeu-tetris .tetris-panneau h3 {
  text-align: center;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  color: var(--couleur-texte-secondaire, #aaa);
}

/* ──────────────────────────────────────
   Canvas d'aperçu (pièce suivante / réserve)
   ────────────────────────────────────── */
.jeu-tetris .tetris-reserve canvas,
.jeu-tetris .tetris-suivante canvas {
  display: block;
  margin: 0 auto;
  border: 1px solid var(--couleur-bordure-tetris, #444);
  border-radius: 4px;
  background: var(--couleur-fond-apercu, #1a1a2e);
}

/* ──────────────────────────────────────
   Informations (score, niveau, lignes)
   ────────────────────────────────────── */
.jeu-tetris .tetris-infos {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.jeu-tetris .tetris-infos > div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.jeu-tetris .tetris-infos .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--couleur-texte-secondaire, #aaa);
}

.jeu-tetris .tetris-infos .valeur {
  font-size: 1.5rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  color: var(--couleur-texte-principal, #fff);
}

/* ──────────────────────────────────────
   Boutons
   ────────────────────────────────────── */
.jeu-tetris .tetris-controles {
  display: flex;
  justify-content: center;
}

.jeu-tetris .btn--pause {
  padding: 0.5rem 1.5rem;
  cursor: pointer;
}

/* ──────────────────────────────────────
   Overlay fin de partie
   ────────────────────────────────────── */
.jeu-tetris .overlay-fin {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10;
}

.jeu-tetris .overlay-fin h2 {
  font-size: 2rem;
  color: #ff4444;
}

.jeu-tetris .overlay-fin button {
  padding: 0.75rem 2rem;
  cursor: pointer;
}
```

**Variables CSS utilisées :**
- `--couleur-bordure-tetris` : bordure du canvas et des aperçus
- `--couleur-fond-apercu` : fond des canvas d'aperçu
- `--couleur-texte-principal` / `--couleur-texte-secondaire` : typographie

**Note :** le canvas gère son propre rendu interne. Le CSS ne contrôle que le positionnement, les bordures et le layout autour du canvas.

### Texte du commit
```
feat(tetris): styles CSS du jeu Tetris

Layout flexbox : panneau gauche (réserve) + canvas central + panneau
droit (suivante, score, niveau, lignes). Overlay fin de partie.
Tous les sélecteurs scopés sous .jeu-tetris.
```

---

## Bloc 16 — Intégration finale et recette

### Objectif
Vérifier le jeu Tetris bout en bout dans le contexte PlaygroundJS, corriger les bugs d'intégration.

### Checklist de recette

**Navigation :**
- [ ] Depuis l'accueil, cliquer sur la carte Tetris → arrive sur le jeu
- [ ] Bouton "Accueil" / navigation retour → revient à l'accueil sans fuite mémoire
- [ ] Re-naviguer vers Tetris → le jeu repart de zéro

**Pièces :**
- [ ] Les 7 tétrominos apparaissent tous (vérifier le 7-bag)
- [ ] La pièce suivante est affichée correctement dans l'aperçu
- [ ] La rotation horaire (flèche haut) fonctionne
- [ ] La rotation antihoraire (Z) fonctionne
- [ ] Les wall kicks fonctionnent : tourner une pièce T contre le mur gauche → elle se décale
- [ ] La pièce I peut tourner correctement (wall kicks spécifiques)
- [ ] La pièce O ne change pas d'apparence en tournant

**Déplacements :**
- [ ] Flèches gauche/droite : déplacement latéral
- [ ] DAS/ARR : maintenir la touche → déplacement rapide après un délai
- [ ] Flèche bas (soft drop) : descente accélérée + points bonus
- [ ] Barre espace (hard drop) : descente instantanée + verrouillage + points bonus
- [ ] La pièce fantôme indique correctement la position d'atterrissage

**Verrouillage :**
- [ ] La pièce au sol ne se verrouille pas immédiatement (lock delay ~500ms)
- [ ] Déplacer ou tourner la pièce au sol remet le timer à zéro
- [ ] Après 15 resets, la pièce se verrouille

**Réserve (hold) :**
- [ ] Appuyer sur C : la pièce active est mise en réserve, une nouvelle pièce apparaît
- [ ] Appuyer à nouveau sur C dans la même pièce : rien ne se passe
- [ ] Après verrouillage, on peut à nouveau utiliser la réserve
- [ ] L'aperçu de la réserve est mis à jour

**Suppression de lignes :**
- [ ] Compléter une ligne : elle disparaît et les lignes au-dessus descendent
- [ ] Compléter 2, 3, 4 lignes simultanément fonctionne
- [ ] Score correct : 100/300/500/800 × niveau

**Scoring et progression :**
- [ ] Score s'affiche et se met à jour en temps réel
- [ ] Niveau augmente tous les 10 lignes
- [ ] La vitesse de gravité augmente à chaque niveau
- [ ] Soft drop : +1 point par ligne
- [ ] Hard drop : +2 points par ligne

**Game over :**
- [ ] Quand une nouvelle pièce ne peut pas spawner → game over
- [ ] L'overlay de fin affiche le score, le niveau et les lignes
- [ ] Le score est enregistré avec `jeuId = 'tetris'`
- [ ] Le meilleur score est affiché dans l'overlay
- [ ] Bouton "Rejouer" relance une partie
- [ ] Bouton "Accueil" revient au menu

**Scores :**
- [ ] Score enregistré après chaque partie avec `jeuId = 'tetris'`
- [ ] Classement Tetris correct (tri par score décroissant)
- [ ] Filtrage par profil correct
- [ ] Colonne "Lignes" présente dans le tableau

**Cycle de vie :**
- [ ] `detruire()` retire tout le DOM tetris de `#app`
- [ ] Aucun `requestAnimationFrame` ne continue après `detruire()`
- [ ] Aucun `keydown`/`keyup` listener ne reste après `detruire()`

### Texte du commit
```
fix(tetris): recette finale — corrections post-intégration

Résolution des bugs découverts lors de la recette bout en bout.
Vérification de la navigation, du jeu complet et de la persistance.
```

---

## Résumé des dépendances entre blocs

```
Bloc 01 (constantesTetris)
  ├── Bloc 02 (Piece)
  ├── Bloc 03 (RotationMatrice)
  ├── Bloc 04 (GrilleJeu)
  ├── Bloc 05 (PlateauTetris)
  ├── Bloc 06 (CanvasApercu)
  ├── Bloc 08 (BoucleDeJeuTetris)
  ├── Bloc 09 (SystemeDeScore)
  └── Bloc 10 (GestionnaireEntrees)

Bloc 02 (Piece)
  └── Bloc 07 (Fantome) — utilise Piece.clone()

Bloc 04 (GrilleJeu)
  └── Bloc 03 (RotationMatrice) — utilise grille.estPositionValide()
  └── Bloc 07 (Fantome) — utilise grille.estPositionValide()

Blocs 02+03+04+05+06+07+08+09+10
  └── Bloc 11 (Jeu orchestrateur)

Bloc 11 + Shell (InterfaceJeu)
  └── Bloc 12 (JeuTetris adaptateur)

Bloc 11 + Shell (DepotScores, Score)
  ├── Bloc 13 (TetrisUI)
  └── Bloc 14 (TetrisScoresUI)

Blocs 12+13+14
  └── Bloc 15 (CSS)

Bloc 15
  └── Bloc 16 (Intégration finale)
```

---

## Arborescence des fichiers Tetris

```
js/jeux/tetris/
├── constantesTetris.js
├── Piece.js
├── RotationMatrice.js
├── GrilleJeu.js
├── PlateauTetris.js
├── CanvasApercu.js
├── Fantome.js
├── BoucleDeJeuTetris.js
├── SystemeDeScore.js
├── GestionnaireEntrees.js
├── Jeu.js
├── JeuTetris.js
└── ui/
    ├── TetrisUI.js
    └── TetrisScoresUI.js

css/jeux/
└── tetris.css
```

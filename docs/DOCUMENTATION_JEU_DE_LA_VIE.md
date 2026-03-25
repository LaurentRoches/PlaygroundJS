# DOCUMENTATION_JEU_DE_LA_VIE.md — Plan d'implémentation du Jeu de la Vie

Ce document est le guide de réalisation du Jeu de la Vie (Conway, 1970) dans le cadre du projet PlaygroundJS. Chaque bloc est indépendant et correspond à un commit logique. Le projet peut être repris à n'importe quelle étape en consultant ce plan.

> **Prérequis :** la Phase 0 (Shell / Infrastructure) doit être implémentée avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

---

## Vue d'ensemble de la chaîne de commits

```
Bloc 01 — constantesVie (constantes spécifiques)
Bloc 02 — Grille (structure de données 2D avec double buffering)
Bloc 03 — Simulateur (application des règles de Conway)
Bloc 04 — BanqueDeMotifs (motifs prédéfinis)
Bloc 05 — PlateauVie (rendu DOM de la grille)
Bloc 06 — Jeu (orchestrateur interne)
Bloc 07 — JeuDeLaVie (adaptateur InterfaceJeu)
Bloc 08 — VieUI (HUD et contrôles)
Bloc 09 — CSS Jeu de la Vie
Bloc 10 — Intégration finale et recette
```

> **Note :** le Jeu de la Vie est un sandbox / automate cellulaire. Il n'y a **aucun score**, **aucun game over**, **aucun profil**. `UTILISE_SCORES = false`. Les modules Profil, Score et DepotScores ne sont pas utilisés par ce jeu.

---

## Bloc 01 — constantesVie

### Objectif
Centraliser toutes les valeurs numériques et chaînes de configuration spécifiques au Jeu de la Vie dans `js/jeux/jeu-de-la-vie/constantesVie.js`. Aucun magic number ne doit apparaître dans le reste du code.

### Fichier : `js/jeux/jeu-de-la-vie/constantesVie.js`

```js
// Dimensions de la grille
export const COLONNES = 50;
export const LIGNES = 30;

// Vitesse de simulation (millisecondes par génération)
export const VITESSE_MIN = 50;       // le plus rapide
export const VITESSE_MAX = 1000;     // le plus lent
export const VITESSE_PAR_DEFAUT = 200;
export const PAS_VITESSE = 50;       // incrément du slider

// Classes CSS des cellules
export const CSS_CELLULE        = 'cellule-vie';
export const CSS_CELLULE_VIVANTE = 'cellule-vie--vivante';
export const CSS_CELLULE_MORTE   = 'cellule-vie--morte';

// Règles de Conway (paramétrables pour extensions futures)
export const VOISINS_NAISSANCE = 3;       // cellule morte → nait si exactement 3 voisins vivants
export const VOISINS_SURVIE_MIN = 2;      // cellule vivante → survit si 2 ou 3 voisins
export const VOISINS_SURVIE_MAX = 3;

// États de la simulation
export const ETATS_SIMULATION = {
  ARRETEE: 'arretee',
  EN_COURS: 'en_cours',
  EN_PAUSE: 'en_pause',
};

// Identifiant du plateau DOM
export const ID_PLATEAU_VIE = 'plateau-vie';
```

**Choix de conception :**
- `COLONNES = 50` et `LIGNES = 30` offrent une grille suffisamment grande pour observer les motifs complexes (Gosper Glider Gun nécessite environ 40x20) tout en restant performante en rendu DOM.
- Les règles de Conway sont exposées comme constantes plutôt que codées en dur, permettant d'expérimenter avec d'autres variantes (HighLife, Day & Night) sans modifier le `Simulateur`.
- `VITESSE_MIN = 50` garantit que même au maximum de vitesse, le navigateur a le temps de rendre chaque frame sans blocage.

### Vérification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur de module.

### Texte du commit
```
feat(vie): constantes spécifiques au Jeu de la Vie

Toutes les valeurs configurables (dimensions 50×30, vitesses de simulation,
classes CSS, règles de Conway) sont centralisées dans constantesVie.js.
```

---

## Bloc 02 — Grille (structure de données 2D avec double buffering)

### Objectif
Créer la classe `Grille` qui modélise la grille de cellules sous forme de deux tableaux 2D de booléens. Le double buffering garantit qu'on ne lit jamais et n'écrit jamais dans la même grille pendant le calcul d'une génération.

### Fichier : `js/jeux/jeu-de-la-vie/Grille.js`

**Représentation interne :**
- `this._grilleCourante` : tableau 2D `[ligne][colonne]` de booléens (`true` = vivante, `false` = morte). C'est la grille **lue** pendant le calcul.
- `this._grilleSuivante` : tableau 2D de mêmes dimensions, initialisé à `false`. C'est la grille **écrite** pendant le calcul.
- Après chaque génération, les références sont échangées : `_grilleCourante` et `_grilleSuivante` sont swappées.

**Pourquoi le double buffering :**
Sans double buffering, mettre à jour une cellule modifie l'état de la grille en cours de lecture. Les voisins qui n'ont pas encore été calculés verraient l'état de la génération N+1 au lieu de la génération N, produisant des résultats incorrects. Le double buffering sépare strictement la lecture (grille courante) de l'écriture (grille suivante).

**Interface publique :**
```js
class Grille {
  constructor(colonnes, lignes)

  // Lecture (toujours sur grilleCourante)
  estVivante(colonne, ligne)           // retourne booléen
  compterVoisinsVivants(colonne, ligne) // retourne entier 0-8 (voisinage de Moore)

  // Écriture (toujours sur grilleSuivante)
  definirSuivante(colonne, ligne, vivante)  // écrit dans _grilleSuivante

  // Transition de génération
  permuter()                           // swap _grilleCourante ↔ _grilleSuivante, réinit _grilleSuivante à false

  // Interaction utilisateur
  basculerCellule(colonne, ligne)      // toggle directement dans _grilleCourante (hors simulation)

  // Utilitaires
  effacer()                            // remet _grilleCourante à false partout
  get population()                     // compte le nombre de cellules vivantes dans _grilleCourante
  get colonnes()                       // retourne this._colonnes
  get lignes()                         // retourne this._lignes

  // Itération
  pourChaqueCellule(callback)          // appelle callback(colonne, ligne, vivante) pour chaque cellule de _grilleCourante
}
```

**Détail `compterVoisinsVivants(colonne, ligne)` :**
- Parcourir les 8 voisins (voisinage de Moore) : les décalages `[-1, 0, +1]` sur les deux axes, en excluant `(0, 0)`.
- Pour chaque voisin : vérifier que la position est dans les limites de la grille (`>= 0` et `< dimension`). Les cellules hors grille sont considérées mortes (pas de wrapping torique).
- Incrémenter un compteur pour chaque voisin vivant.

```js
compterVoisinsVivants(colonne, ligne) {
  let compteur = 0;
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dl === 0 && dc === 0) continue;
      const l = ligne + dl;
      const c = colonne + dc;
      if (l >= 0 && l < this._lignes && c >= 0 && c < this._colonnes) {
        if (this._grilleCourante[l][c]) compteur++;
      }
    }
  }
  return compteur;
}
```

**Détail `permuter()` :**
```js
permuter() {
  const temp = this._grilleCourante;
  this._grilleCourante = this._grilleSuivante;
  this._grilleSuivante = temp;
  // Réinitialiser _grilleSuivante à false pour la prochaine génération
  for (let l = 0; l < this._lignes; l++) {
    for (let c = 0; c < this._colonnes; c++) {
      this._grilleSuivante[l][c] = false;
    }
  }
}
```

**Détail `basculerCellule(colonne, ligne)` :**
- Écrit directement dans `_grilleCourante` (utilisé uniquement quand la simulation est en pause ou arrêtée).
- `this._grilleCourante[ligne][colonne] = !this._grilleCourante[ligne][colonne]`

**Détail du constructeur :**
```js
constructor(colonnes, lignes) {
  this._colonnes = colonnes;
  this._lignes = lignes;
  this._grilleCourante = this._creerGrilleVide();
  this._grilleSuivante = this._creerGrilleVide();
}

_creerGrilleVide() {
  return Array.from({ length: this._lignes }, () =>
    new Array(this._colonnes).fill(false)
  );
}
```

**Dépendances :** aucune (la grille est une structure de données pure, les dimensions sont injectées via le constructeur).

### Vérification
- Instancier `Grille(5, 5)`.
- `basculerCellule(2, 2)` → `estVivante(2, 2)` retourne `true`.
- `compterVoisinsVivants(2, 2)` retourne `0` (aucun voisin vivant).
- `basculerCellule(1, 1)` → `compterVoisinsVivants(2, 2)` retourne `1`.
- Tester `permuter()` : après permutation, `_grilleCourante` contient l'ancienne `_grilleSuivante`.
- `effacer()` remet tout à `false`, `population` retourne `0`.

### Texte du commit
```
feat(vie): implémentation de Grille — structure 2D avec double buffering

Tableau 2D de booléens avec lecture/écriture séparées pour garantir
un calcul correct des générations. Comptage des voisins de Moore,
toggle de cellule pour l'interaction utilisateur.
```

---

## Bloc 03 — Simulateur (application des règles de Conway)

### Objectif
Créer la classe `Simulateur` qui applique les règles de Conway sur une `Grille`. Le simulateur ne connaît pas le DOM : il manipule uniquement la grille en lecture/écriture.

### Fichier : `js/jeux/jeu-de-la-vie/Simulateur.js`

**Responsabilités :**
- Appliquer les règles de naissance, survie et mort à chaque cellule de la grille.
- Utiliser le double buffering de `Grille` : lire depuis `grilleCourante`, écrire dans `grilleSuivante`, puis permuter.
- Maintenir un compteur de générations.

**Interface publique :**
```js
class Simulateur {
  constructor(grille)

  calculerGeneration()    // applique les règles et avance d'une génération
  reinitialiser()         // remet le compteur de générations à 0

  get generation()        // retourne le numéro de la génération courante
}
```

**Détail `calculerGeneration()` :**
```js
calculerGeneration() {
  for (let l = 0; l < this._grille.lignes; l++) {
    for (let c = 0; c < this._grille.colonnes; c++) {
      const voisins = this._grille.compterVoisinsVivants(c, l);
      const vivante = this._grille.estVivante(c, l);

      if (vivante) {
        // Survie : 2 ou 3 voisins → reste vivante. Sinon → meurt.
        this._grille.definirSuivante(c, l, voisins >= VOISINS_SURVIE_MIN && voisins <= VOISINS_SURVIE_MAX);
      } else {
        // Naissance : exactement 3 voisins → naît.
        this._grille.definirSuivante(c, l, voisins === VOISINS_NAISSANCE);
      }
    }
  }

  this._grille.permuter();
  this._generation++;
}
```

**Rappel des règles de Conway :**

| État actuel | Nombre de voisins vivants | État suivant |
|---|---|---|
| Morte | Exactement 3 | Naissance (vivante) |
| Morte | Autre | Reste morte |
| Vivante | 2 ou 3 | Survie (vivante) |
| Vivante | < 2 (sous-population) | Mort |
| Vivante | > 3 (surpopulation) | Mort |

**Dépendances :** `Grille` (injectée via constructeur), `VOISINS_NAISSANCE`, `VOISINS_SURVIE_MIN`, `VOISINS_SURVIE_MAX` depuis `./constantesVie.js`

### Vérification
- Créer une `Grille(5, 5)` avec un **blinker** (oscillateur période 2) : trois cellules horizontales `(1,2), (2,2), (3,2)`.
- `calculerGeneration()` → les trois cellules deviennent verticales `(2,1), (2,2), (2,3)`.
- `calculerGeneration()` → retour à l'état horizontal initial.
- Vérifier que `generation` s'incrémente de 1 à chaque appel.
- Créer un **block** (nature morte 2x2) : `(1,1), (2,1), (1,2), (2,2)`. Vérifier qu'il ne change pas après `calculerGeneration()`.

### Texte du commit
```
feat(vie): implémentation de Simulateur — règles de Conway

Application des règles de naissance (3 voisins), survie (2-3 voisins)
et mort sur la grille avec double buffering. Compteur de générations.
```

---

## Bloc 04 — BanqueDeMotifs (motifs prédéfinis)

### Objectif
Créer la classe `BanqueDeMotifs` qui fournit une collection de motifs classiques du Jeu de la Vie. Chaque motif est un tableau de coordonnées relatives `{ dc, dl }` (delta colonne, delta ligne) par rapport à un point d'ancrage. Cela permet de placer le motif n'importe où sur la grille.

### Fichier : `js/jeux/jeu-de-la-vie/BanqueDeMotifs.js`

**Responsabilités :**
- Stocker les motifs prédéfinis sous forme de coordonnées relatives.
- Fournir la liste des motifs disponibles pour le menu de sélection.
- Appliquer un motif sur une `Grille` à une position donnée.

**Interface publique :**
```js
class BanqueDeMotifs {
  static MOTIFS                                   // objet { cle: { nom, description, cellules } }
  static obtenirListeMotifs()                     // retourne [ { cle, nom, description }, ... ]
  static appliquerMotif(grille, cleMotif, colonneOrigine, ligneOrigine)  // place le motif sur la grille
}
```

**Détail `appliquerMotif` :**
```js
static appliquerMotif(grille, cleMotif, colonneOrigine, ligneOrigine) {
  const motif = BanqueDeMotifs.MOTIFS[cleMotif];
  if (!motif) return;

  for (const { dc, dl } of motif.cellules) {
    const c = colonneOrigine + dc;
    const l = ligneOrigine + dl;
    // Ne placer que les cellules dans les limites de la grille
    if (c >= 0 && c < grille.colonnes && l >= 0 && l < grille.lignes) {
      if (!grille.estVivante(c, l)) {
        grille.basculerCellule(c, l);
      }
    }
  }
}
```

**Catalogue des motifs :**

Chaque motif est défini par un objet `{ nom, description, cellules }` où `cellules` est un tableau de `{ dc, dl }` (coordonnées relatives au point de clic).

**1. Natures mortes (Still lifes) :**

```js
bloc: {
  nom: 'Bloc',
  description: 'Nature morte 2×2, stable indéfiniment.',
  cellules: [
    { dc: 0, dl: 0 }, { dc: 1, dl: 0 },
    { dc: 0, dl: 1 }, { dc: 1, dl: 1 },
  ],
},
ruche: {
  nom: 'Ruche',
  description: 'Nature morte en forme de losange aplati.',
  cellules: [
    { dc: 1, dl: 0 }, { dc: 2, dl: 0 },
    { dc: 0, dl: 1 }, { dc: 3, dl: 1 },
    { dc: 1, dl: 2 }, { dc: 2, dl: 2 },
  ],
},
```

**2. Oscillateurs (Oscillators) :**

```js
clignotant: {
  nom: 'Clignotant',
  description: 'Oscillateur de période 2 (3 cellules).',
  cellules: [
    { dc: 0, dl: 0 }, { dc: 1, dl: 0 }, { dc: 2, dl: 0 },
  ],
},
pulsar: {
  nom: 'Pulsar',
  description: 'Oscillateur de période 3 (48 cellules). Un des plus beaux motifs.',
  cellules: [
    // Quadrant haut-gauche (les 3 autres sont symétriques)
    // Lignes supérieures
    { dc: 2, dl: 0 }, { dc: 3, dl: 0 }, { dc: 4, dl: 0 },
    { dc: 8, dl: 0 }, { dc: 9, dl: 0 }, { dc: 10, dl: 0 },
    // Colonnes gauche
    { dc: 0, dl: 2 }, { dc: 0, dl: 3 }, { dc: 0, dl: 4 },
    { dc: 0, dl: 8 }, { dc: 0, dl: 9 }, { dc: 0, dl: 10 },
    // Colonnes intérieures gauche
    { dc: 5, dl: 2 }, { dc: 5, dl: 3 }, { dc: 5, dl: 4 },
    { dc: 5, dl: 8 }, { dc: 5, dl: 9 }, { dc: 5, dl: 10 },
    // Colonnes intérieures droite
    { dc: 7, dl: 2 }, { dc: 7, dl: 3 }, { dc: 7, dl: 4 },
    { dc: 7, dl: 8 }, { dc: 7, dl: 9 }, { dc: 7, dl: 10 },
    // Colonnes droite
    { dc: 12, dl: 2 }, { dc: 12, dl: 3 }, { dc: 12, dl: 4 },
    { dc: 12, dl: 8 }, { dc: 12, dl: 9 }, { dc: 12, dl: 10 },
    // Lignes intérieures supérieures
    { dc: 2, dl: 5 }, { dc: 3, dl: 5 }, { dc: 4, dl: 5 },
    { dc: 8, dl: 5 }, { dc: 9, dl: 5 }, { dc: 10, dl: 5 },
    // Lignes intérieures inférieures
    { dc: 2, dl: 7 }, { dc: 3, dl: 7 }, { dc: 4, dl: 7 },
    { dc: 8, dl: 7 }, { dc: 9, dl: 7 }, { dc: 10, dl: 7 },
    // Lignes inférieures
    { dc: 2, dl: 12 }, { dc: 3, dl: 12 }, { dc: 4, dl: 12 },
    { dc: 8, dl: 12 }, { dc: 9, dl: 12 }, { dc: 10, dl: 12 },
  ],
},
```

**3. Vaisseaux (Spaceships) :**

```js
planeur: {
  nom: 'Planeur',
  description: 'Le plus petit vaisseau. Se déplace en diagonale, période 4.',
  cellules: [
    { dc: 1, dl: 0 },
    { dc: 2, dl: 1 },
    { dc: 0, dl: 2 }, { dc: 1, dl: 2 }, { dc: 2, dl: 2 },
  ],
},
vaisseauLeger: {
  nom: 'Vaisseau léger (LWSS)',
  description: 'Vaisseau horizontal, période 4, vitesse c/2.',
  cellules: [
    { dc: 1, dl: 0 }, { dc: 4, dl: 0 },
    { dc: 0, dl: 1 },
    { dc: 0, dl: 2 }, { dc: 4, dl: 2 },
    { dc: 0, dl: 3 }, { dc: 1, dl: 3 }, { dc: 2, dl: 3 }, { dc: 3, dl: 3 },
  ],
},
```

**4. Canons (Guns) :**

```js
canonGosper: {
  nom: 'Canon de Gosper',
  description: 'Émet un planeur toutes les 30 générations. Premier motif à croissance infinie découvert.',
  cellules: [
    // Bloc gauche
    { dc: 0, dl: 4 }, { dc: 0, dl: 5 },
    { dc: 1, dl: 4 }, { dc: 1, dl: 5 },
    // Partie gauche du canon
    { dc: 10, dl: 4 }, { dc: 10, dl: 5 }, { dc: 10, dl: 6 },
    { dc: 11, dl: 3 }, { dc: 11, dl: 7 },
    { dc: 12, dl: 2 }, { dc: 12, dl: 8 },
    { dc: 13, dl: 2 }, { dc: 13, dl: 8 },
    { dc: 14, dl: 5 },
    { dc: 15, dl: 3 }, { dc: 15, dl: 7 },
    { dc: 16, dl: 4 }, { dc: 16, dl: 5 }, { dc: 16, dl: 6 },
    { dc: 17, dl: 5 },
    // Partie droite du canon
    { dc: 20, dl: 2 }, { dc: 20, dl: 3 }, { dc: 20, dl: 4 },
    { dc: 21, dl: 2 }, { dc: 21, dl: 3 }, { dc: 21, dl: 4 },
    { dc: 22, dl: 1 }, { dc: 22, dl: 5 },
    { dc: 24, dl: 0 }, { dc: 24, dl: 1 },
    { dc: 24, dl: 5 }, { dc: 24, dl: 6 },
    // Bloc droit
    { dc: 34, dl: 2 }, { dc: 34, dl: 3 },
    { dc: 35, dl: 2 }, { dc: 35, dl: 3 },
  ],
},
```

**5. Mathusalems (long-lived patterns) :**

```js
acorn: {
  nom: 'Gland (Acorn)',
  description: 'Mathusalem : 7 cellules qui génèrent 633 générations de chaos avant stabilisation.',
  cellules: [
    { dc: 1, dl: 0 },
    { dc: 3, dl: 1 },
    { dc: 0, dl: 2 }, { dc: 1, dl: 2 },
    { dc: 4, dl: 2 }, { dc: 5, dl: 2 }, { dc: 6, dl: 2 },
  ],
},
pieceR: {
  nom: 'R-pentomino',
  description: 'Mathusalem : 5 cellules, se stabilise après 1103 générations.',
  cellules: [
    { dc: 1, dl: 0 }, { dc: 2, dl: 0 },
    { dc: 0, dl: 1 }, { dc: 1, dl: 1 },
    { dc: 1, dl: 2 },
  ],
},
diehard: {
  nom: 'Diehard',
  description: 'Mathusalem : disparaît complètement après exactement 130 générations.',
  cellules: [
    { dc: 6, dl: 0 },
    { dc: 0, dl: 1 }, { dc: 1, dl: 1 },
    { dc: 1, dl: 2 }, { dc: 5, dl: 2 }, { dc: 6, dl: 2 }, { dc: 7, dl: 2 },
  ],
},
```

**Dépendances :** aucune (classe statique, la `Grille` est injectée dans `appliquerMotif`).

### Vérification
- `BanqueDeMotifs.obtenirListeMotifs()` retourne un tableau d'au moins 10 motifs avec `cle`, `nom` et `description`.
- Instancier `Grille(50, 30)`, appliquer le motif `planeur` en `(5, 5)`, vérifier que les 5 cellules sont vivantes aux bonnes positions.
- Appliquer un motif au bord de la grille : les cellules hors limites sont ignorées sans erreur.

### Texte du commit
```
feat(vie): implémentation de BanqueDeMotifs — motifs prédéfinis

Catalogue de motifs classiques (bloc, clignotant, pulsar, planeur,
LWSS, canon de Gosper, R-pentomino, etc.) en coordonnées relatives.
Placement sur grille avec gestion des débordements.
```

---

## Bloc 05 — PlateauVie (rendu DOM de la grille)

### Objectif
Créer la classe `PlateauVie` qui génère la grille HTML de `LIGNES × COLONNES` cellules `<div>` et met à jour leur apparence visuelle à chaque génération. Cette classe ne connaît pas les règles de Conway : elle reçoit une `Grille` et reflète son état dans le DOM.

### Fichier : `js/jeux/jeu-de-la-vie/PlateauVie.js`

**Responsabilités :**
- Créer le conteneur `<div id="plateau-vie">` et ses `LIGNES × COLONNES` cellules `<div class="cellule-vie">`.
- Stocker les références DOM dans un tableau 2D `this._cellules[ligne][colonne]`.
- Mettre à jour les classes CSS pour refléter l'état de la grille.
- Gérer les clics sur les cellules pour permettre le toggle.

**Interface publique :**
```js
class PlateauVie {
  constructor(elementParent, grille, { surClicCellule })

  mettreAJour()              // synchronise le DOM avec l'état de la grille
  detruire()                 // retire le conteneur du DOM et détache les écouteurs
}
```

**Détail du constructeur :**
```js
constructor(elementParent, grille, { surClicCellule }) {
  this._grille = grille;
  this._surClicCellule = surClicCellule;
  this._cellules = [];

  this._conteneur = document.createElement('div');
  this._conteneur.id = ID_PLATEAU_VIE;
  this._conteneur.style.setProperty('--colonnes-vie', grille.colonnes);

  for (let l = 0; l < grille.lignes; l++) {
    this._cellules[l] = [];
    for (let c = 0; c < grille.colonnes; c++) {
      const cellule = document.createElement('div');
      cellule.classList.add(CSS_CELLULE);
      cellule.dataset.colonne = c;
      cellule.dataset.ligne = l;
      this._conteneur.appendChild(cellule);
      this._cellules[l][c] = cellule;
    }
  }

  // Délégation d'événements : un seul listener sur le conteneur
  this._gestionClicCellule = this._gestionClicCellule.bind(this);
  this._conteneur.addEventListener('click', this._gestionClicCellule);

  elementParent.appendChild(this._conteneur);
}
```

**Détail `_gestionClicCellule(evenement)` :**
```js
_gestionClicCellule(evenement) {
  const cellule = evenement.target;
  if (!cellule.classList.contains(CSS_CELLULE)) return;

  const colonne = parseInt(cellule.dataset.colonne, 10);
  const ligne = parseInt(cellule.dataset.ligne, 10);

  if (this._surClicCellule) {
    this._surClicCellule(colonne, ligne);
  }
}
```

**Détail `mettreAJour()` :**
```js
mettreAJour() {
  this._grille.pourChaqueCellule((colonne, ligne, vivante) => {
    const cellule = this._cellules[ligne][colonne];
    if (vivante) {
      cellule.classList.add(CSS_CELLULE_VIVANTE);
    } else {
      cellule.classList.remove(CSS_CELLULE_VIVANTE);
    }
  });
}
```

**Règles de rendu :**
- Ne jamais recréer les `<div>` : uniquement manipuler `classList`.
- La grille est affichée avec CSS Grid, le nombre de colonnes est injecté via la custom property `--colonnes-vie`.
- La délégation d'événements (un seul listener sur le conteneur) est préférée à un listener par cellule (1500 cellules = 1500 listeners serait trop coûteux).

**Dépendances :** `Grille` (injectée), `CSS_CELLULE`, `CSS_CELLULE_VIVANTE`, `ID_PLATEAU_VIE` depuis `./constantesVie.js`

### Vérification
- Instancier `PlateauVie` avec un élément DOM et une `Grille(50, 30)`. Vérifier dans le DOM que 1500 `<div>` sont créées.
- Activer une cellule dans la grille via `basculerCellule()`, appeler `mettreAJour()`, vérifier que la classe `cellule-vie--vivante` est bien ajoutée.
- Cliquer sur une cellule : le callback `surClicCellule` est appelé avec les bonnes coordonnées.

### Texte du commit
```
feat(vie): implémentation de PlateauVie — rendu DOM de la grille

Grille LIGNES×COLONNES en <div> avec CSS Grid piloté par custom property.
Mise à jour par classList sans recréation des éléments.
Délégation d'événements pour le clic sur cellule.
```

---

## Bloc 06 — Jeu (orchestrateur interne)

### Objectif
Créer la classe `Jeu` qui coordonne `Grille`, `Simulateur`, `PlateauVie` et `BanqueDeMotifs`. C'est le cerveau interne : il pilote la boucle de simulation, gère les interactions utilisateur (toggle, placement de motifs) et expose des méthodes de contrôle.

### Fichier : `js/jeux/jeu-de-la-vie/Jeu.js`

**Constructeur (injection de dépendances) :**
```js
constructor(elementConteneur, { surMiseAJour } = {})
```
- Instancie en interne : `Grille`, `Simulateur`, `PlateauVie`
- Enregistre le callback `surMiseAJour(generation, population)` appelé après chaque génération

**État interne :**
- `this._grille` : instance de `Grille`
- `this._simulateur` : instance de `Simulateur`
- `this._plateau` : instance de `PlateauVie`
- `this._intervalId` : référence `setInterval` (ou `null` si arrêté)
- `this._vitesse` : vitesse courante en ms
- `this._motifSelectionne` : clé du motif sélectionné (ou `null` pour le mode toggle)
- `this._etat` : état courant (ARRETEE, EN_COURS, EN_PAUSE)

**Interface publique :**
```js
class Jeu {
  constructor(elementConteneur, { surMiseAJour } = {})

  // Contrôles de simulation
  demarrerSimulation()         // lance le setInterval
  mettreEnPause()              // clearInterval sans réinitialiser
  reprendre()                  // reprend le setInterval
  avancerUnPas()               // exécute une seule génération (mode step)
  reinitialiser()              // efface la grille, remet génération à 0

  // Vitesse
  changerVitesse(nouvelleVitesse)  // modifie la vitesse, redémarre le timer si en cours

  // Motifs
  selectionnerMotif(cleMotif)  // active le mode placement de motif (null = mode toggle)

  // État
  get etat()                   // retourne ETATS_SIMULATION
  get generation()             // délègue à this._simulateur.generation
  get population()             // délègue à this._grille.population
  get vitesse()                // retourne this._vitesse

  // Nettoyage
  detruire()                   // arrête la simulation, détruit le plateau
}
```

**Logique de simulation (callback de `setInterval`) :**
```js
_tick() {
  this._simulateur.calculerGeneration();
  this._plateau.mettreAJour();

  if (this._surMiseAJour) {
    this._surMiseAJour(this._simulateur.generation, this._grille.population);
  }
}
```

**Gestion du clic sur cellule (callback passé à `PlateauVie`) :**
```js
_surClicCellule(colonne, ligne) {
  if (this._motifSelectionne) {
    // Mode placement de motif
    BanqueDeMotifs.appliquerMotif(this._grille, this._motifSelectionne, colonne, ligne);
  } else {
    // Mode toggle simple
    this._grille.basculerCellule(colonne, ligne);
  }
  this._plateau.mettreAJour();

  // Mettre à jour les compteurs même en pause
  if (this._surMiseAJour) {
    this._surMiseAJour(this._simulateur.generation, this._grille.population);
  }
}
```

**Détail `demarrerSimulation()` :**
```js
demarrerSimulation() {
  if (this._intervalId !== null) return; // protection contre double démarrage
  this._etat = ETATS_SIMULATION.EN_COURS;
  this._intervalId = setInterval(() => this._tick(), this._vitesse);
}
```

**Détail `mettreEnPause()` :**
```js
mettreEnPause() {
  if (this._intervalId === null) return;
  clearInterval(this._intervalId);
  this._intervalId = null;
  this._etat = ETATS_SIMULATION.EN_PAUSE;
}
```

**Détail `changerVitesse(nouvelleVitesse)` :**
```js
changerVitesse(nouvelleVitesse) {
  this._vitesse = nouvelleVitesse;
  if (this._etat === ETATS_SIMULATION.EN_COURS) {
    clearInterval(this._intervalId);
    this._intervalId = setInterval(() => this._tick(), this._vitesse);
  }
}
```

**Détail `avancerUnPas()` :**
```js
avancerUnPas() {
  if (this._etat === ETATS_SIMULATION.EN_COURS) return; // pas de step pendant l'exécution
  this._tick();
}
```

**Détail `reinitialiser()` :**
```js
reinitialiser() {
  this.mettreEnPause();
  this._grille.effacer();
  this._simulateur.reinitialiser();
  this._plateau.mettreAJour();
  this._etat = ETATS_SIMULATION.ARRETEE;

  if (this._surMiseAJour) {
    this._surMiseAJour(0, 0);
  }
}
```

**Dépendances :** `Grille`, `Simulateur`, `PlateauVie`, `BanqueDeMotifs`, constantes depuis `./constantesVie.js`

### Vérification
- Instancier `Jeu` avec un élément DOM et un callback console.
- Placer un clignotant manuellement via `_surClicCellule(5,5)`, `_surClicCellule(6,5)`, `_surClicCellule(7,5)`.
- `avancerUnPas()` : vérifier que le blinker oscille.
- `demarrerSimulation()` : la simulation avance automatiquement, `surMiseAJour` est appelé.
- `mettreEnPause()` : la simulation s'arrête.
- `changerVitesse(500)` pendant la simulation : le rythme change.
- `reinitialiser()` : grille vide, génération = 0.
- `selectionnerMotif('planeur')`, cliquer sur la grille : le planeur est placé.

### Texte du commit
```
feat(vie): implémentation de Jeu — orchestrateur interne

Coordination de la grille, du simulateur et du plateau.
Boucle de simulation (setInterval), contrôles play/pause/step/reset,
gestion de la vitesse et du placement de motifs.
```

---

## Bloc 07 — JeuDeLaVie (adaptateur InterfaceJeu)

### Objectif
Créer la classe `JeuDeLaVie` qui étend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS. Ce jeu déclare `UTILISE_SCORES = false`.

### Fichier : `js/jeux/jeu-de-la-vie/JeuDeLaVie.js`

**Propriétés statiques :**
```js
static ID = 'jeu-de-la-vie';
static NOM = 'Jeu de la Vie';
static DESCRIPTION = 'Automate cellulaire de Conway. Dessinez des motifs et observez leur évolution.';
static ICONE = '🧬';
static UTILISE_SCORES = false;
```

**Interface :**
```js
class JeuDeLaVie extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()       // Crée le DOM wrapper .jeu-vie, instancie Jeu et VieUI
  demarrer()          // Délègue à VieUI.afficher(), la simulation ne démarre pas automatiquement
  mettreEnPause()     // Délègue à this._jeu.mettreEnPause()
  reprendre()         // Délègue à this._jeu.reprendre()
  arreter()           // Délègue à this._jeu.mettreEnPause()
  detruire()          // Appelle arreter(), détruit VieUI et Jeu, retire le DOM, null les références

  get etat()          // retourne this._jeu.etat
  get scoreActuel()   // retourne null (pas de scores)
}
```

**Particularités par rapport à JeuSnake :**
- `UTILISE_SCORES = false` : le shell sait ne pas afficher de bouton "Scores" ni enregistrer quoi que ce soit.
- `scoreActuel` retourne `null` systématiquement.
- `demarrer()` n'active pas la simulation automatiquement : l'utilisateur doit cliquer "Play" dans le HUD. Le Jeu de la Vie est un sandbox interactif.
- Les callbacks `surFinDePartie` et `surScoreChange` ne sont jamais appelés.

**Dépendances :** `InterfaceJeu` depuis `../../commun/InterfaceJeu.js`, `Jeu` depuis `./Jeu.js`, `VieUI` depuis `./ui/VieUI.js`

### Vérification
- Enregistrer `JeuDeLaVie` dans le routeur, naviguer vers `#jeu-de-la-vie`.
- Vérifier que le jeu s'affiche avec la grille et les contrôles, mais que la simulation ne tourne pas.
- Naviguer en arrière : le DOM est nettoyé, aucun `setInterval` ne persiste.

### Texte du commit
```
feat(vie): implémentation de JeuDeLaVie — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne et le contrat InterfaceJeu.
UTILISE_SCORES = false, pas de scoring ni de game over.
La simulation démarre manuellement via les contrôles utilisateur.
```

---

## Bloc 08 — VieUI (HUD et contrôles)

### Objectif
Créer la classe `VieUI` qui affiche les contrôles de la simulation et les compteurs (génération, population). C'est l'interface utilisateur du Jeu de la Vie.

### Fichier : `js/jeux/jeu-de-la-vie/ui/VieUI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu)
```

**Interface publique :**
```js
class VieUI {
  constructor(elementConteneur, jeu)

  afficher()    // injecte le HUD et les contrôles dans elementConteneur
  masquer()     // retire le HUD, détache les listeners
  detruire()    // nettoyage complet
}
```

**Structure HTML :**
```html
<div class="vie-ui">
  <header class="vie-hud">
    <span class="vie-hud__generation">Génération : 0</span>
    <span class="vie-hud__population">Population : 0</span>
  </header>

  <div class="vie-controles">
    <button class="vie-btn vie-btn--play" title="Démarrer">▶</button>
    <button class="vie-btn vie-btn--pause" title="Pause" disabled>⏸</button>
    <button class="vie-btn vie-btn--pas" title="Avancer d'un pas">⏭</button>
    <button class="vie-btn vie-btn--effacer" title="Effacer la grille">🗑</button>

    <label class="vie-controle-vitesse">
      <span>Vitesse :</span>
      <input type="range"
             class="vie-slider-vitesse"
             min="50" max="1000" step="50" value="200" />
      <span class="vie-vitesse-valeur">200 ms</span>
    </label>

    <label class="vie-controle-motif">
      <span>Motif :</span>
      <select class="vie-select-motif">
        <option value="">Cellule libre</option>
        <!-- options générées dynamiquement depuis BanqueDeMotifs -->
      </select>
    </label>
  </div>

  <div id="conteneur-plateau-vie">
    <!-- PlateauVie est injecté ici par Jeu -->
  </div>
</div>
```

**Comportements des boutons :**

| Bouton | Action | État des boutons après clic |
|---|---|---|
| **Play** (▶) | `jeu.demarrerSimulation()` ou `jeu.reprendre()` | Play désactivé, Pause activé, Pas désactivé |
| **Pause** (⏸) | `jeu.mettreEnPause()` | Play activé, Pause désactivé, Pas activé |
| **Pas** (⏭) | `jeu.avancerUnPas()` | Pas de changement d'état des boutons |
| **Effacer** (🗑) | `jeu.reinitialiser()` | Play activé, Pause désactivé, Pas activé |

**Comportement du slider de vitesse :**
- L'événement `input` (temps réel pendant le glissement) appelle `jeu.changerVitesse(valeur)`.
- La valeur affichée (`200 ms`) est mise à jour en temps réel.
- Le slider est inversé visuellement : curseur à gauche = rapide (50ms), curseur à droite = lent (1000ms). Cela peut être géré soit en inversant `min/max`, soit en inversant la valeur en JS. L'important est que le comportement soit intuitif : glisser vers la droite = plus rapide.

**Alternative recommandée :** garder `min=50, max=1000` mais inverser la direction avec `direction: rtl` en CSS, ou bien utiliser la convention `min=50, max=1000, step=50` et afficher "Rapide ← → Lent" comme étiquettes. Choix au développeur, tant que l'UX est cohérente.

**Comportement du sélecteur de motif :**
- Peuplé dynamiquement via `BanqueDeMotifs.obtenirListeMotifs()`.
- L'option `"Cellule libre"` (valeur vide) correspond au mode toggle classique.
- Le changement de sélection appelle `jeu.selectionnerMotif(cle)` (ou `null` si valeur vide).
- Le curseur de la grille peut afficher un indicateur visuel quand un motif est sélectionné (optionnel — extension future).

**Mise à jour des compteurs :**
Le callback `surMiseAJour(generation, population)` passé à `Jeu` met à jour les `textContent` des spans :
```js
_mettreAJourCompteurs(generation, population) {
  this._spanGeneration.textContent = `Génération : ${generation}`;
  this._spanPopulation.textContent = `Population : ${population}`;
}
```

**Gestion de l'état des boutons :**
```js
_mettreAJourBoutons(etat) {
  const enCours = etat === ETATS_SIMULATION.EN_COURS;

  this._btnPlay.disabled = enCours;
  this._btnPause.disabled = !enCours;
  this._btnPas.disabled = enCours;
  this._btnEffacer.disabled = enCours;
  this._selectMotif.disabled = enCours;
}
```

> **Note :** pendant la simulation, le clic sur les cellules de la grille reste possible (pour ajouter des cellules "en live"), mais le sélecteur de motif et le bouton pas sont désactivés pour éviter la confusion.

**Dépendances :** `Jeu` (injecté), `BanqueDeMotifs` depuis `../BanqueDeMotifs.js`, `ETATS_SIMULATION`, `VITESSE_MIN`, `VITESSE_MAX`, `PAS_VITESSE`, `VITESSE_PAR_DEFAUT` depuis `../constantesVie.js`

### Vérification
- Afficher le HUD, vérifier que tous les contrôles sont présents.
- Cliquer Play → la simulation démarre, les compteurs s'incrémentent, Play est grisé.
- Cliquer Pause → la simulation s'arrête, Pause est grisé.
- Cliquer Pas → une seule génération avance.
- Déplacer le slider de vitesse → la vitesse de simulation change en temps réel.
- Sélectionner un motif dans le dropdown → cliquer sur la grille place le motif.
- Sélectionner "Cellule libre" → cliquer toggle une cellule individuelle.
- Cliquer Effacer → la grille est vide, génération et population à 0.

### Texte du commit
```
feat(vie): implémentation de VieUI — HUD et contrôles

Barre de contrôles (play/pause/step/clear), slider de vitesse,
sélecteur de motif, compteurs de génération et de population.
Synchronisation en temps réel avec l'orchestrateur Jeu.
```

---

## Bloc 09 — CSS Jeu de la Vie (`css/jeux/jeu-de-la-vie.css`)

### Objectif
Écrire les styles spécifiques au Jeu de la Vie, scopés sous `.jeu-vie`.

### Fichier : `css/jeux/jeu-de-la-vie.css`

**Organisation :**
```css
/* ===========================================
   Jeu de la Vie — Styles scopés sous .jeu-vie
   =========================================== */

/* Conteneur principal */
.jeu-vie {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

/* --- Grille --- */
.jeu-vie #plateau-vie {
  display: grid;
  grid-template-columns: repeat(var(--colonnes-vie), var(--taille-cellule-vie, 14px));
  gap: 0px;
  border: 2px solid var(--couleur-bordure-grille, #444);
  background-color: var(--couleur-fond-grille, #111);
  cursor: pointer;
  user-select: none;
}

/* --- Cellules --- */
.jeu-vie .cellule-vie {
  width: var(--taille-cellule-vie, 14px);
  height: var(--taille-cellule-vie, 14px);
  background-color: var(--couleur-cellule-morte, #1a1a2e);
  transition: background-color 0.05s ease;
}

.jeu-vie .cellule-vie--vivante {
  background-color: var(--couleur-cellule-vivante, #00ff88);
  box-shadow: 0 0 2px var(--couleur-cellule-vivante, #00ff88);
}

/* Hover pour indiquer la cellule ciblée */
.jeu-vie .cellule-vie:hover {
  outline: 1px solid var(--couleur-survol, rgba(255, 255, 255, 0.4));
}

/* --- HUD (compteurs) --- */
.jeu-vie .vie-hud {
  display: flex;
  gap: 2rem;
  font-family: monospace;
  font-size: 1.1rem;
  color: var(--couleur-texte-hud, #e0e0e0);
}

/* --- Contrôles --- */
.jeu-vie .vie-controles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: var(--couleur-fond-controles, #1e1e2f);
  border-radius: 8px;
}

.jeu-vie .vie-btn {
  padding: 0.4rem 0.8rem;
  font-size: 1.1rem;
  border: 1px solid var(--couleur-bordure-btn, #555);
  border-radius: 4px;
  background-color: var(--couleur-fond-btn, #2a2a3d);
  color: var(--couleur-texte-btn, #e0e0e0);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.jeu-vie .vie-btn:hover:not(:disabled) {
  background-color: var(--couleur-fond-btn-hover, #3a3a5d);
}

.jeu-vie .vie-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Slider de vitesse --- */
.jeu-vie .vie-controle-vitesse {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--couleur-texte-hud, #e0e0e0);
  font-size: 0.9rem;
}

.jeu-vie .vie-slider-vitesse {
  width: 120px;
  accent-color: var(--couleur-cellule-vivante, #00ff88);
}

/* --- Sélecteur de motif --- */
.jeu-vie .vie-controle-motif {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--couleur-texte-hud, #e0e0e0);
  font-size: 0.9rem;
}

.jeu-vie .vie-select-motif {
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--couleur-bordure-btn, #555);
  background-color: var(--couleur-fond-btn, #2a2a3d);
  color: var(--couleur-texte-btn, #e0e0e0);
  font-size: 0.9rem;
}
```

**Points de conception :**
- Toutes les couleurs utilisent des custom properties CSS pour permettre le theming futur.
- `gap: 0px` sur la grille (pas d'espace entre les cellules) pour un rendu dense typique du Jeu de la Vie.
- La transition sur `background-color` est très rapide (50ms) pour ne pas créer de lag visuel à haute vitesse de simulation.
- `user-select: none` sur la grille empêche la sélection de texte lors du clic rapide.
- Le `box-shadow` sur les cellules vivantes crée un léger effet de lueur (glow) qui rend la grille plus vivante.
- La taille des cellules (`--taille-cellule-vie: 14px`) est calibrée pour que la grille 50x30 tienne confortablement dans un viewport de 800px de large (50 × 14 = 700px).

**Note :** les variables CSS globales sont définies dans `commun.css`. Ce fichier peut les surcharger si nécessaire. `--colonnes-vie` est injectée depuis JS via `conteneur.style.setProperty('--colonnes-vie', COLONNES)`.

### Texte du commit
```
feat(vie): styles CSS du Jeu de la Vie

Grille DOM dense pilotée par custom properties. Cellules avec glow
pour les vivantes. Contrôles stylisés. Tout scopé sous .jeu-vie.
```

---

## Bloc 10 — Intégration finale et recette

### Objectif
Vérifier le Jeu de la Vie bout en bout dans le contexte PlaygroundJS, corriger les bugs d'intégration.

### Checklist de recette

**Navigation :**
- [ ] Depuis l'accueil, cliquer sur la carte "Jeu de la Vie" → arrive sur le jeu
- [ ] Bouton "Accueil" / navigation retour → revient à l'accueil sans fuite mémoire
- [ ] Re-naviguer vers Jeu de la Vie → la grille repart vide, génération 0
- [ ] La carte n'affiche PAS de bouton "Scores" (car `UTILISE_SCORES = false`)

**Grille et interaction :**
- [ ] La grille 50×30 s'affiche correctement (1500 cellules)
- [ ] Clic sur une cellule morte → elle devient vivante (et inversement)
- [ ] Le compteur de population se met à jour au clic
- [ ] Le clic est fluide, pas de lag perceptible

**Simulation :**
- [ ] Bouton Play → la simulation démarre, les compteurs s'incrémentent
- [ ] Bouton Pause → la simulation s'arrête, la grille est figée
- [ ] Bouton Pas → exactement une génération avance
- [ ] Bouton Effacer → grille vide, génération = 0, population = 0
- [ ] Le blinker (3 cellules en ligne) oscille correctement (période 2)
- [ ] Le bloc (2×2) reste stable indéfiniment

**Vitesse :**
- [ ] Le slider change la vitesse en temps réel
- [ ] À 50ms, la simulation est rapide mais pas saccadée
- [ ] À 1000ms, la simulation est lente et chaque génération est distincte

**Motifs :**
- [ ] Le sélecteur liste au moins 10 motifs
- [ ] Sélectionner "Planeur", cliquer sur la grille → le planeur apparaît
- [ ] Le planeur se déplace en diagonale quand la simulation tourne
- [ ] Sélectionner "Canon de Gosper", le placer → il émet des planeurs toutes les 30 générations
- [ ] Sélectionner "Cellule libre" → retour au mode toggle
- [ ] Placer un motif au bord de la grille → les cellules hors grille sont ignorées, pas d'erreur

**Règles de Conway :**
- [ ] Cellule morte avec exactement 3 voisins → naît
- [ ] Cellule vivante avec 2 ou 3 voisins → survit
- [ ] Cellule vivante avec < 2 voisins → meurt (sous-population)
- [ ] Cellule vivante avec > 3 voisins → meurt (surpopulation)
- [ ] Les cellules hors grille sont considérées comme mortes (pas de wrapping)

**Cycle de vie :**
- [ ] `detruire()` retire tout le DOM du Jeu de la Vie de `#app`
- [ ] Aucun `setInterval` ne continue après `detruire()`
- [ ] Aucun listener DOM ne reste après `detruire()`
- [ ] Pas de fuite mémoire observable (vérifier via DevTools → Memory)

### Texte du commit
```
fix(vie): recette finale — corrections post-intégration

Résolution des bugs découverts lors de la recette bout en bout.
Vérification de la navigation, de la simulation et du cycle de vie.
```

---

## Résumé des dépendances entre blocs

```
Bloc 01 (constantesVie)
  ├── Bloc 02 (Grille)
  ├── Bloc 03 (Simulateur)     ← dépend de Bloc 02
  ├── Bloc 04 (BanqueDeMotifs) ← indépendant (classe statique)
  └── Bloc 05 (PlateauVie)     ← dépend de Bloc 02

Blocs 02 + 03 + 04 + 05
  └── Bloc 06 (Jeu orchestrateur)

Bloc 06 + Shell (InterfaceJeu)
  └── Bloc 07 (JeuDeLaVie adaptateur)

Bloc 06 + Bloc 04
  └── Bloc 08 (VieUI)

Blocs 07 + 08
  └── Bloc 09 (CSS)

Bloc 09
  └── Bloc 10 (Intégration finale)
```

---

## Arborescence des fichiers créés

```
js/jeux/jeu-de-la-vie/
├── constantesVie.js
├── Grille.js
├── Simulateur.js
├── BanqueDeMotifs.js
├── PlateauVie.js
├── Jeu.js
├── JeuDeLaVie.js
└── ui/
    └── VieUI.js

css/jeux/
└── jeu-de-la-vie.css
```

---

*Document créé le 2026-03-20 pour la Phase 3 du projet PlaygroundJS.*

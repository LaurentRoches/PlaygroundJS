# DOCUMENTATION_PUISSANCE4.md — Plan d'implémentation du jeu Puissance 4

Ce document est le guide de réalisation du jeu Puissance 4 (Connect Four) dans le cadre du projet PlaygroundJS. Chaque bloc est indépendant et correspond à un commit logique. Le projet peut être repris à n'importe quelle étape en consultant ce plan.

> **Prérequis :** la Phase 0 (Shell / Infrastructure) doit être implémentée avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

---

## Vue d'ensemble de la chaîne de commits

```
Bloc 01 — constantesPuissance4
Bloc 02 — PlateauP4 (modèle de la grille)
Bloc 03 — DetecteurVictoire
Bloc 04 — EvaluateurPosition (heuristique pour l'IA)
Bloc 05 — IAMinimax (algorithme Minimax avec élagage alpha-beta)
Bloc 06 — Jeu (orchestrateur interne)
Bloc 07 — JeuPuissance4 (adaptateur InterfaceJeu)
Bloc 08 — PlateauP4UI (rendu DOM de la grille)
Bloc 09 — AnimationChute (animation de dépôt de jeton)
Bloc 10 — Puissance4UI (HUD, sélecteur de niveau, overlay fin de partie)
Bloc 11 — Puissance4ScoresUI (tableau des scores)
Bloc 12 — CSS Puissance 4
Bloc 13 — Intégration finale et recette
```

> **Note :** les blocs Profil, GestionnaireProfils, Score et DepotScores sont gérés par la Phase 0 (shell partagé). Ils ne sont plus spécifiques au Puissance 4.

---

## Contexte du jeu

Le Puissance 4 est un jeu de stratégie à deux joueurs sur une grille verticale de 7 colonnes et 6 lignes. Les joueurs déposent alternativement des jetons depuis le haut d'une colonne ; le jeton tombe jusqu'à la position la plus basse disponible. Le premier joueur à aligner 4 jetons consécutifs (horizontalement, verticalement ou en diagonale) remporte la partie. Si la grille est pleine sans alignement, la partie est nulle.

**Mode de jeu :** Joueur contre IA uniquement. L'IA utilise l'algorithme Minimax avec élagage alpha-beta. Trois niveaux de difficulté sont proposés (Facile, Moyen, Difficile), chacun correspondant à une profondeur de recherche différente.

---

## Bloc 01 — constantesPuissance4

### Objectif
Centraliser toutes les valeurs numériques et chaînes de configuration spécifiques au Puissance 4 dans `js/jeux/puissance4/constantesPuissance4.js`. Aucun magic number ne doit apparaître dans le reste du code du jeu.

### Fichier : `js/jeux/puissance4/constantesPuissance4.js`

```js
// Dimensions de la grille
export const NB_COLONNES = 7;
export const NB_LIGNES = 6;

// Longueur d'alignement pour gagner
export const LONGUEUR_VICTOIRE = 4;

// Identifiants des joueurs (valeurs dans la grille)
export const JETON_VIDE   = 0;
export const JETON_JOUEUR = 1;
export const JETON_IA     = 2;

// Niveaux de difficulté de l'IA (profondeur Minimax)
export const NIVEAUX_IA = {
  FACILE:    { nom: 'Facile',    profondeur: 2 },
  MOYEN:     { nom: 'Moyen',    profondeur: 4 },
  DIFFICILE: { nom: 'Difficile', profondeur: 6 },
};
export const NIVEAU_IA_DEFAUT = 'MOYEN';

// Scores d'évaluation heuristique
export const SCORE_VICTOIRE        = 100000;
export const SCORE_TROIS_ALIGNES   = 50;
export const SCORE_DEUX_ALIGNES    = 10;
export const SCORE_MENACE_ADVERSE  = -40;
export const SCORE_COLONNE_CENTRE  = 30;

// Valeurs extrêmes pour alpha-beta
export const SCORE_INFINI_POSITIF = Infinity;
export const SCORE_INFINI_NEGATIF = -Infinity;

// Délai avant le coup de l'IA (en millisecondes)
export const DELAI_COUP_IA = 500;

// Identifiant du jeu (pour le système de scores)
export const JEU_ID = 'puissance4';

// Classes CSS
export const CSS_CONTENEUR      = 'jeu-puissance4';
export const CSS_GRILLE         = 'grille-p4';
export const CSS_COLONNE        = 'colonne-p4';
export const CSS_CELLULE        = 'cellule-p4';
export const CSS_JETON          = 'jeton-p4';
export const CSS_JETON_JOUEUR   = 'jeton-p4--joueur';
export const CSS_JETON_IA       = 'jeton-p4--ia';
export const CSS_JETON_GAGNANT  = 'jeton-p4--gagnant';
export const CSS_JETON_PREVIEW  = 'jeton-p4--preview';
export const CSS_COLONNE_HOVER  = 'colonne-p4--hover';
export const CSS_ANIMATION_CHUTE = 'jeton-p4--chute';
```

**Pourquoi `JETON_VIDE = 0`, `JETON_JOUEUR = 1`, `JETON_IA = 2` :**
- La grille interne est un tableau 2D d'entiers, initialisé à 0. Les valeurs 1 et 2 identifient le propriétaire de chaque cellule.
- Ces constantes sont utilisées partout : dans le modèle, l'IA, l'évaluateur et le rendu DOM.

**Pourquoi trois niveaux de profondeur 2/4/6 :**
- Profondeur 2 (Facile) : l'IA ne voit qu'un coup à l'avance, facile à battre.
- Profondeur 4 (Moyen) : l'IA anticipe deux coups complets (coup + réponse × 2), défi modéré.
- Profondeur 6 (Difficile) : l'IA anticipe trois coups complets, très difficile à battre.
- Au-delà de 6, le temps de calcul devient perceptible sur des machines modestes.

### Vérification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur.

### Texte du commit
```
feat(puissance4): constantes spécifiques au jeu Puissance 4

Toutes les valeurs configurables du Puissance 4 (dimensions grille,
niveaux IA, scores heuristiques, classes CSS) sont centralisées
dans constantesPuissance4.js. Aucun magic number dans le reste du code.
```

---

## Bloc 02 — PlateauP4 (modèle de la grille)

### Objectif
Créer la classe `PlateauP4` qui modélise l'état interne de la grille de jeu. Cette classe est purement logique : elle ne touche jamais au DOM. Elle représente le plateau comme un tableau 2D et expose les opérations de base (déposer un jeton, vérifier une colonne, lister les colonnes disponibles, copier l'état pour la simulation IA).

### Fichier : `js/jeux/puissance4/PlateauP4.js`

**Représentation interne :**
- `this.grille` : tableau 2D de dimensions `NB_LIGNES × NB_COLONNES`, initialisé à `JETON_VIDE`
- Convention d'indexation : `grille[ligne][colonne]` — la ligne 0 est le **haut** de la grille, la ligne `NB_LIGNES - 1` est le bas
- Le jeton tombe donc de la ligne 0 vers la ligne `NB_LIGNES - 1`

**Interface publique :**
```js
class PlateauP4 {
  constructor()

  // Trouve la ligne la plus basse disponible dans la colonne (gravité)
  // Retourne l'index de ligne, ou -1 si la colonne est pleine
  obtenirLigneDisponible(colonne)

  // Dépose un jeton dans la colonne pour le joueur donné
  // Retourne { ligne, colonne } de la position finale, ou null si coup invalide
  deposerJeton(colonne, joueur)

  // Vrai si la colonne est pleine (ligne 0 occupée)
  estColonnePleine(colonne)

  // Retourne un tableau des indices de colonnes non pleines
  obtenirColonnesDisponibles()

  // Vrai si toutes les colonnes sont pleines
  estPlein()

  // Retourne la valeur de la cellule (JETON_VIDE, JETON_JOUEUR ou JETON_IA)
  obtenirCellule(ligne, colonne)

  // Crée une copie profonde du plateau (indispensable pour la simulation IA)
  copier()

  // Remet toutes les cellules à JETON_VIDE
  reinitialiser()
}
```

**Détail de `obtenirLigneDisponible(colonne)` :**
- Parcourir la colonne de bas en haut (de `NB_LIGNES - 1` à 0)
- Retourner le premier index de ligne où `grille[ligne][colonne] === JETON_VIDE`
- Si aucune ligne n'est vide, retourner -1

**Détail de `deposerJeton(colonne, joueur)` :**
1. Appeler `obtenirLigneDisponible(colonne)`
2. Si -1 : retourner `null` (colonne pleine, coup invalide)
3. Sinon : `grille[ligne][colonne] = joueur`, retourner `{ ligne, colonne }`

**Détail de `copier()` :**
- Créer une nouvelle instance de `PlateauP4`
- Copier chaque valeur de `this.grille` dans la nouvelle grille : `nouveauPlateau.grille[l][c] = this.grille[l][c]`
- Retourner la nouvelle instance
- Cette méthode est critique pour l'IA : l'algorithme Minimax simule des coups sur des copies sans modifier le plateau réel

**Dépendances :** `NB_COLONNES`, `NB_LIGNES`, `JETON_VIDE` depuis `./constantesPuissance4.js`

### Vérification
Instancier `PlateauP4`, déposer quelques jetons, vérifier que `obtenirLigneDisponible` retourne les bonnes lignes. Tester `copier()` : modifier la copie ne doit pas affecter l'original.

### Texte du commit
```
feat(puissance4): implémentation de PlateauP4 — modèle de la grille 7×6

Grille 2D avec gravité (dépôt de jeton, recherche de ligne disponible),
détection de colonne pleine, et copie profonde pour simulation Minimax.
Aucun couplage DOM : modèle purement logique.
```

---

## Bloc 03 — DetecteurVictoire

### Objectif
Créer la classe `DetecteurVictoire` qui vérifie si un joueur a aligné 4 jetons consécutifs. La classe est stateless : toutes les méthodes sont statiques et reçoivent le plateau en paramètre. Elle vérifie les quatre directions possibles (horizontale, verticale, diagonale montante, diagonale descendante) et retourne les positions gagnantes le cas échéant.

### Fichier : `js/jeux/puissance4/DetecteurVictoire.js`

**Interface publique (méthodes statiques) :**
```js
class DetecteurVictoire {
  // Vérifie si le joueur donné a gagné
  // Retourne un tableau de 4 positions [{ ligne, colonne }, ...] formant l'alignement gagnant
  // Retourne null si aucun alignement de 4
  static verifierVictoire(plateau, joueur)

  // Vérifie si la partie est nulle (grille pleine, aucun gagnant)
  static estPartieNulle(plateau)
}
```

**Détail de `verifierVictoire(plateau, joueur)` :**

L'algorithme parcourt chaque cellule de la grille et teste les 4 directions à partir de cette cellule :

```
Directions testées :
→ Horizontale  : (0, +1)  — vers la droite
↓ Verticale    : (+1, 0)  — vers le bas
↘ Diag. desc.  : (+1, +1) — vers le bas-droite
↗ Diag. mont.  : (-1, +1) — vers le haut-droite
```

Pour chaque cellule `(l, c)` et chaque direction `(dl, dc)` :
1. Vérifier que les 4 positions `(l + i*dl, c + i*dc)` pour `i = 0..3` sont dans les limites de la grille
2. Vérifier que les 4 cellules contiennent le jeton du joueur recherché
3. Si oui : retourner les 4 positions `[{ ligne: l, colonne: c }, { ligne: l+dl, colonne: c+dc }, ...]`
4. Si aucune direction ne donne 4 alignés, retourner `null`

**Optimisation :** on ne teste que les directions "positives" (droite, bas, bas-droite, haut-droite) pour éviter les doublons. Tester la direction gauche revient à avoir déjà trouvé l'alignement en testant la direction droite depuis une cellule précédente.

**Détail de `estPartieNulle(plateau)` :**
- Retourner `plateau.estPlein()` — si la grille est pleine et qu'aucun joueur n'a gagné, c'est un match nul
- En pratique, cette méthode est appelée après avoir vérifié qu'il n'y a pas de victoire

**Dépendances :** `NB_COLONNES`, `NB_LIGNES`, `LONGUEUR_VICTOIRE`, `JETON_VIDE` depuis `./constantesPuissance4.js`

### Vérification
Créer un plateau, y déposer des jetons formant un alignement horizontal, vérifier que `verifierVictoire` retourne les 4 bonnes positions. Répéter pour les 3 autres directions. Tester un plateau sans victoire : retourne `null`. Tester un plateau plein sans victoire : `estPartieNulle` retourne `true`.

### Texte du commit
```
feat(puissance4): implémentation de DetecteurVictoire — détection d'alignement

Vérification des 4 directions (horizontale, verticale, diagonales) pour
détecter un alignement de 4 jetons. Retourne les positions gagnantes
pour le surlignage visuel. Détection du match nul incluse.
```

---

## Bloc 04 — EvaluateurPosition (heuristique pour l'IA)

### Objectif
Créer la classe `EvaluateurPosition` qui attribue un score numérique à un état de plateau donné du point de vue de l'IA. Ce score guide l'algorithme Minimax dans le choix du meilleur coup. La classe est stateless (méthodes statiques).

### Fichier : `js/jeux/puissance4/EvaluateurPosition.js`

**Interface publique :**
```js
class EvaluateurPosition {
  // Évalue la position du point de vue de l'IA
  // Retourne un entier : positif = favorable à l'IA, négatif = favorable au joueur
  static evaluer(plateau)
}
```

**Principe de l'évaluation par fenêtres de 4 :**

L'heuristique repose sur le concept de "fenêtre" (window) : un groupe de 4 cellules consécutives dans une direction donnée. Pour chaque fenêtre, on compte les jetons de chaque camp et les cellules vides, puis on attribue un score.

**Détail de l'algorithme :**

1. **Bonus colonne centrale :** compter les jetons IA dans la colonne centrale (`Math.floor(NB_COLONNES / 2)`). Chaque jeton IA au centre rapporte `SCORE_COLONNE_CENTRE` (+30 points). La colonne centrale est stratégiquement avantageuse car elle participe à plus de combinaisons gagnantes.

2. **Parcours de toutes les fenêtres de 4 :** pour chaque fenêtre de 4 cellules consécutives dans les 4 directions :
   - Compter `nbIA` (jetons IA), `nbJoueur` (jetons joueur), `nbVide` (cellules vides)
   - Appeler `_scorerFenetre(nbIA, nbJoueur, nbVide)` pour obtenir le score de cette fenêtre
   - Cumuler le score total

**Détail de `_scorerFenetre(nbIA, nbJoueur, nbVide)` (méthode privée) :**
```
Si nbIA === 4                      → +SCORE_VICTOIRE       (+100 000)
Si nbIA === 3 et nbVide === 1      → +SCORE_TROIS_ALIGNES  (+50)
Si nbIA === 2 et nbVide === 2      → +SCORE_DEUX_ALIGNES   (+10)
Si nbJoueur === 3 et nbVide === 1  → +SCORE_MENACE_ADVERSE (-40)
Sinon                               → 0
```

**Pourquoi `SCORE_MENACE_ADVERSE = -40` (supérieur en valeur absolue à `SCORE_TROIS_ALIGNES = +50`) :**
- La priorité de blocage est presque aussi haute que celle d'attaque. L'IA doit bloquer les alignements dangereux de l'adversaire, mais en gardant une légère préférence pour ses propres opportunités offensives.

**Extraction des fenêtres de 4 :**

```js
// Horizontales : pour chaque ligne, fenêtres de c à c+3
pour l = 0..NB_LIGNES-1 :
  pour c = 0..NB_COLONNES-4 :
    fenetre = [grille[l][c], grille[l][c+1], grille[l][c+2], grille[l][c+3]]

// Verticales : pour chaque colonne, fenêtres de l à l+3
pour c = 0..NB_COLONNES-1 :
  pour l = 0..NB_LIGNES-4 :
    fenetre = [grille[l][c], grille[l+1][c], grille[l+2][c], grille[l+3][c]]

// Diagonales descendantes (↘) :
pour l = 0..NB_LIGNES-4 :
  pour c = 0..NB_COLONNES-4 :
    fenetre = [grille[l][c], grille[l+1][c+1], grille[l+2][c+2], grille[l+3][c+3]]

// Diagonales montantes (↗) :
pour l = 3..NB_LIGNES-1 :
  pour c = 0..NB_COLONNES-4 :
    fenetre = [grille[l][c], grille[l-1][c+1], grille[l-2][c+2], grille[l-3][c+3]]
```

**Dépendances :** `NB_COLONNES`, `NB_LIGNES`, `JETON_IA`, `JETON_JOUEUR`, `JETON_VIDE`, `SCORE_VICTOIRE`, `SCORE_TROIS_ALIGNES`, `SCORE_DEUX_ALIGNES`, `SCORE_MENACE_ADVERSE`, `SCORE_COLONNE_CENTRE` depuis `./constantesPuissance4.js`

### Vérification
Créer des plateaux avec des configurations connues :
- Plateau avec 3 jetons IA alignés + 1 vide : score doit être positif et élevé
- Plateau avec 3 jetons joueur alignés + 1 vide : score doit être négatif (menace)
- Plateau vide : score doit être 0
- Vérifier que l'IA au centre obtient un bonus

### Texte du commit
```
feat(puissance4): implémentation de EvaluateurPosition — heuristique IA

Évaluation de la position par analyse des fenêtres de 4 cellules dans
les 4 directions. Scoring : victoire, alignement de 3, alignement de 2,
blocage des menaces adverses, bonus colonne centrale.
```

---

## Bloc 05 — IAMinimax (algorithme Minimax avec élagage alpha-beta)

### Objectif
Créer la classe `IAMinimax` qui implémente l'algorithme Minimax avec élagage alpha-beta pour choisir le meilleur coup de l'IA. C'est le coeur de l'intelligence artificielle du jeu. La profondeur de recherche varie selon le niveau de difficulté choisi.

### Fichier : `js/jeux/puissance4/IAMinimax.js`

**Interface publique :**
```js
class IAMinimax {
  constructor(evaluateur, detecteurVictoire)

  // Point d'entrée principal : choisit la meilleure colonne pour l'IA
  // niveau : clé de NIVEAUX_IA ('FACILE', 'MOYEN', 'DIFFICILE')
  // Retourne l'index de la colonne choisie
  choisirColonne(plateau, niveau)
}
```

**Dépendances injectées :**
- `evaluateur` : instance ou classe `EvaluateurPosition` (pour évaluer les positions feuilles)
- `detecteurVictoire` : classe `DetecteurVictoire` (pour détecter les états terminaux)

**Explication de l'algorithme Minimax :**

L'algorithme Minimax modélise le jeu comme un arbre de décisions alternées entre deux joueurs :
- **Noeud MAX** (tour de l'IA) : l'IA choisit le coup qui maximise son score
- **Noeud MIN** (tour du joueur) : le joueur est supposé choisir le coup qui minimise le score de l'IA (meilleur coup pour lui)

L'arbre est exploré en profondeur limitée. Aux noeuds feuilles (profondeur 0 ou état terminal), l'évaluateur heuristique attribue un score.

**Élagage alpha-beta :**

L'élagage alpha-beta est une optimisation qui coupe les branches de l'arbre qui ne peuvent pas influencer le résultat final :
- `alpha` : le meilleur score que l'IA (MAX) peut garantir sur le chemin actuel
- `beta` : le meilleur score que le joueur (MIN) peut garantir sur le chemin actuel
- Si `alpha >= beta`, on coupe la branche (pruning) : le joueur adverse ne choisira jamais cette branche car il dispose d'un meilleur choix ailleurs

**Pseudocode de l'algorithme :**

```
fonction minimax(plateau, profondeur, alpha, beta, estMaximisant):

    // Cas terminaux
    victoire_ia = detecteurVictoire.verifierVictoire(plateau, JETON_IA)
    SI victoire_ia ALORS retourner SCORE_VICTOIRE

    victoire_joueur = detecteurVictoire.verifierVictoire(plateau, JETON_JOUEUR)
    SI victoire_joueur ALORS retourner -SCORE_VICTOIRE

    SI plateau.estPlein() ALORS retourner 0  // match nul

    SI profondeur === 0 ALORS retourner evaluateur.evaluer(plateau)

    colonnesDisponibles = plateau.obtenirColonnesDisponibles()

    SI estMaximisant ALORS   // Tour de l'IA (MAX)
        meilleurScore = -Infinity

        POUR CHAQUE colonne DANS colonnesDisponibles:
            copiePlateau = plateau.copier()
            copiePlateau.deposerJeton(colonne, JETON_IA)

            score = minimax(copiePlateau, profondeur - 1, alpha, beta, FAUX)

            meilleurScore = max(meilleurScore, score)
            alpha = max(alpha, score)

            SI alpha >= beta ALORS SORTIR  // élagage beta

        RETOURNER meilleurScore

    SINON   // Tour du joueur (MIN)
        meilleurScore = +Infinity

        POUR CHAQUE colonne DANS colonnesDisponibles:
            copiePlateau = plateau.copier()
            copiePlateau.deposerJeton(colonne, JETON_JOUEUR)

            score = minimax(copiePlateau, profondeur - 1, alpha, beta, VRAI)

            meilleurScore = min(meilleurScore, score)
            beta = min(beta, score)

            SI alpha >= beta ALORS SORTIR  // élagage alpha

        RETOURNER meilleurScore
```

**Détail de `choisirColonne(plateau, niveau)` :**

```
fonction choisirColonne(plateau, niveau):
    profondeur = NIVEAUX_IA[niveau].profondeur
    colonnesDisponibles = plateau.obtenirColonnesDisponibles()
    meilleurScore = -Infinity
    meilleureColonne = colonnesDisponibles[0]  // fallback

    POUR CHAQUE colonne DANS colonnesDisponibles:
        copiePlateau = plateau.copier()
        copiePlateau.deposerJeton(colonne, JETON_IA)

        score = minimax(copiePlateau, profondeur - 1, -Infinity, +Infinity, FAUX)

        SI score > meilleurScore ALORS
            meilleurScore = score
            meilleureColonne = colonne

    RETOURNER meilleureColonne
```

**Pourquoi `choisirColonne` appelle `minimax` avec `estMaximisant = FAUX` :**
- `choisirColonne` simule déjà le coup de l'IA (dépôt du jeton IA). Le prochain tour dans l'arbre est celui du joueur (MIN), donc `estMaximisant = false`.

**Complexité :**
- Sans élagage : O(b^d) où b = nombre de colonnes disponibles (~7), d = profondeur
- Avec élagage alpha-beta dans le cas optimal : O(b^(d/2)), soit une réduction drastique
- Profondeur 2 : ~49 noeuds max (quasi instantané)
- Profondeur 4 : ~2 401 noeuds max (< 10ms)
- Profondeur 6 : ~117 649 noeuds max (< 100ms sur machine moderne)

**Dépendances :** `NIVEAUX_IA`, `JETON_IA`, `JETON_JOUEUR`, `SCORE_VICTOIRE`, `SCORE_INFINI_POSITIF`, `SCORE_INFINI_NEGATIF` depuis `./constantesPuissance4.js`

### Vérification
- Niveau Facile : l'IA joue des coups raisonnables mais manque des menaces évidentes
- Niveau Moyen : l'IA bloque les alignements de 3 adverses et construit les siens
- Niveau Difficile : l'IA est quasi imbattable et détecte les pièges à 3 coups d'avance
- Tester que `choisirColonne` retourne toujours un index de colonne valide (non pleine)
- Vérifier que l'IA joue le coup gagnant immédiat s'il existe (victoire en 1 coup)

### Texte du commit
```
feat(puissance4): implémentation de IAMinimax — algorithme Minimax alpha-beta

IA avec recherche Minimax et élagage alpha-beta. Trois niveaux de
difficulté par profondeur de recherche (2/4/6). L'évaluateur et le
détecteur de victoire sont injectés via le constructeur (SOLID-D).
```

---

## Bloc 06 — Jeu (orchestrateur interne)

### Objectif
Créer la classe `Jeu` qui coordonne le déroulement d'une partie de Puissance 4. C'est le cerveau interne : il alterne les tours joueur/IA, valide les coups, vérifie la victoire ou le match nul après chaque coup, et notifie l'extérieur des événements.

### Fichier : `js/jeux/puissance4/Jeu.js`

**Constructeur (injection de dépendances) :**
```js
constructor({ surFinDePartie, surScoreChange, surCoupJoue, surTourChange } = {})
```
- Instancie en interne : `PlateauP4`, `IAMinimax`, `EvaluateurPosition`, `DetecteurVictoire`
- Enregistre les callbacks :
  - `surFinDePartie(resultat)` — `resultat` = `{ gagnant, positionsGagnantes, estNul }`
  - `surScoreChange(score)` — déclenché quand le score interne change
  - `surCoupJoue(ligne, colonne, joueur)` — déclenché après chaque coup validé
  - `surTourChange(joueur)` — déclenché quand le tour change

**État interne :**
- `this.plateau` : instance de `PlateauP4`
- `this.ia` : instance de `IAMinimax`
- `this.niveauIA` : clé de `NIVEAUX_IA` (par défaut `NIVEAU_IA_DEFAUT`)
- `this.tourDuJoueur` : booléen, `true` quand c'est au joueur humain de jouer
- `this.partieEnCours` : booléen
- `this.partieTerminee` : booléen
- `this.resultat` : `null` ou `{ gagnant, positionsGagnantes, estNul }`

**Interface publique :**
```js
class Jeu {
  constructor(options)

  demarrer()               // réinitialise le plateau et commence une nouvelle partie
  jouerCoup(colonne)       // le joueur humain dépose un jeton dans la colonne
  changerNiveauIA(niveau)  // change le niveau avant ou pendant la partie
  arreter()                // stoppe la partie en cours

  get etatPlateau()        // retourne la grille actuelle (lecture seule)
  get estTourJoueur()      // vrai si c'est au joueur de jouer
  get estTerminee()        // vrai si la partie est finie
}
```

**Détail de `jouerCoup(colonne)` :**
1. Vérifier que la partie est en cours et que c'est le tour du joueur
2. Vérifier que la colonne n'est pas pleine via `plateau.estColonnePleine(colonne)`
3. Déposer le jeton : `plateau.deposerJeton(colonne, JETON_JOUEUR)`
4. Appeler `surCoupJoue(ligne, colonne, JETON_JOUEUR)`
5. Vérifier victoire du joueur : `DetecteurVictoire.verifierVictoire(plateau, JETON_JOUEUR)`
   - Si victoire : `_terminerPartie({ gagnant: JETON_JOUEUR, positionsGagnantes, estNul: false })`
   - Retourner (la partie est finie)
6. Vérifier match nul : `DetecteurVictoire.estPartieNulle(plateau)`
   - Si nul : `_terminerPartie({ gagnant: null, positionsGagnantes: null, estNul: true })`
   - Retourner
7. Passer le tour à l'IA : `this.tourDuJoueur = false`, appeler `surTourChange(JETON_IA)`
8. Déclencher le coup de l'IA après un délai : `setTimeout(() => this._jouerCoupIA(), DELAI_COUP_IA)`

**Détail de `_jouerCoupIA()` (méthode privée) :**
1. Choisir la colonne : `ia.choisirColonne(plateau, niveauIA)`
2. Déposer le jeton : `plateau.deposerJeton(colonne, JETON_IA)`
3. Appeler `surCoupJoue(ligne, colonne, JETON_IA)`
4. Vérifier victoire de l'IA → si oui : `_terminerPartie(...)`
5. Vérifier match nul → si oui : `_terminerPartie(...)`
6. Passer le tour au joueur : `this.tourDuJoueur = true`, appeler `surTourChange(JETON_JOUEUR)`

**Pourquoi le `setTimeout` de 500ms avant le coup de l'IA :**
- Sans délai, l'IA joue quasi instantanément après le joueur, ce qui est perturbant visuellement
- Le délai donne l'impression que l'IA "réfléchit" et laisse le temps à l'animation de chute du jeton joueur de se terminer
- La valeur est configurable via `DELAI_COUP_IA` dans les constantes

**Détail de `_terminerPartie(resultat)` (méthode privée) :**
1. `this.partieEnCours = false`
2. `this.partieTerminee = true`
3. `this.resultat = resultat`
4. Appeler `surFinDePartie(resultat)`

**Dépendances :** `PlateauP4`, `IAMinimax`, `EvaluateurPosition`, `DetecteurVictoire`, constantes depuis `./constantesPuissance4.js`

### Vérification
- Instancier `Jeu` avec des callbacks console
- Jouer un coup (`jouerCoup(3)`), vérifier que le callback `surCoupJoue` est déclenché
- Vérifier que l'IA joue automatiquement après le délai
- Jouer une partie complète jusqu'à victoire ou match nul
- Vérifier que jouer dans une colonne pleine est ignoré
- Vérifier que jouer pendant le tour de l'IA est ignoré

### Texte du commit
```
feat(puissance4): implémentation de Jeu — orchestrateur de partie

Alternance joueur/IA avec validation des coups, vérification de victoire
et match nul après chaque dépôt. Délai UX avant le coup de l'IA.
Callbacks pour notifier l'UI des événements de jeu.
```

---

## Bloc 07 — JeuPuissance4 (adaptateur InterfaceJeu)

### Objectif
Créer la classe `JeuPuissance4` qui étend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS. C'est un adaptateur (pattern Adapter).

### Fichier : `js/jeux/puissance4/JeuPuissance4.js`

**Propriétés statiques :**
```js
static ID = 'puissance4';
static NOM = 'Puissance 4';
static DESCRIPTION = 'Alignez 4 jetons avant l\'IA ! Trois niveaux de difficulté avec algorithme Minimax.';
static ICONE = '🔴';
static UTILISE_SCORES = true;
```

**Interface :**
```js
class JeuPuissance4 extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()        // Crée le DOM wrapper .jeu-puissance4, instancie Jeu et Puissance4UI
  demarrer()           // Délègue à this.jeu.demarrer(), active l'UI
  mettreEnPause()      // Bloque les interactions (pas de boucle à pauser)
  reprendre()          // Réactive les interactions
  arreter()            // Délègue à this.jeu.arreter()
  detruire()           // Appelle arreter(), retire le DOM, null les références

  get etat()           // 'pret' | 'en_cours' | 'pause' | 'termine'
  get scoreActuel()    // { points, jeuId: 'puissance4', niveauIA, resultat }
}
```

**Particularité par rapport au Snake :**
- Pas de `BoucleDeJeu` (pas de game loop) : le Puissance 4 est événementiel (clic joueur → réponse IA)
- `mettreEnPause()` désactive les clics sur les colonnes plutôt que d'arrêter un timer
- Le score est binaire : victoire, défaite ou égalité (pas de score numérique progressif)

**Gestion du score :**
- `scoreActuel` retourne un objet contenant :
  - `points` : 1 pour une victoire, 0 pour une défaite ou une égalité
  - `jeuId` : `'puissance4'`
  - `niveauIA` : le niveau de l'IA utilisé pour cette partie
  - `resultat` : `'victoire'`, `'defaite'` ou `'egalite'`

**Dépendances :** `InterfaceJeu` (classe parente), `Jeu`, `Puissance4UI`, constantes

### Vérification
Enregistrer `JeuPuissance4` dans le routeur, naviguer vers `#puissance4`, vérifier que le jeu se lance et que la navigation retour fonctionne.

### Texte du commit
```
feat(puissance4): implémentation de JeuPuissance4 — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne Jeu et le contrat InterfaceJeu du
shell PlaygroundJS. Gère le cycle de vie et expose le score au format
attendu par le système de scores partagé.
```

---

## Bloc 08 — PlateauP4UI (rendu DOM de la grille)

### Objectif
Créer la classe `PlateauP4UI` qui gère le rendu visuel de la grille de Puissance 4 dans le DOM. Elle transforme l'état logique du plateau en éléments HTML et gère les interactions utilisateur (clic sur une colonne, survol avec aperçu).

### Fichier : `js/jeux/puissance4/ui/PlateauP4UI.js`

**Constructeur :**
```js
constructor(elementConteneur, { surClicColonne })
```
- `elementConteneur` : élément DOM dans lequel la grille sera injectée
- `surClicColonne(colonne)` : callback déclenché quand le joueur clique sur une colonne

**Interface publique :**
```js
class PlateauP4UI {
  constructor(elementConteneur, options)

  // Génère la grille HTML initiale (7 colonnes × 6 lignes)
  creer()

  // Met à jour l'affichage d'une seule cellule après un coup
  // Ne re-rend pas toute la grille : modifie uniquement la cellule concernée
  afficherJeton(ligne, colonne, joueur)

  // Affiche un jeton fantôme en haut de la colonne survolée
  afficherPreview(colonne, joueur)

  // Retire l'aperçu
  masquerPreview()

  // Surligne les 4 jetons gagnants avec la classe CSS_JETON_GAGNANT
  surlignerVictoire(positions)

  // Active ou désactive les interactions (clics et survols)
  activerInteractions(actif)

  // Supprime la grille du DOM
  detruire()

  // Remet la grille à l'état initial (toutes les cellules vides)
  reinitialiser()
}
```

**Structure HTML de la grille :**
```html
<div class="grille-p4">
  <!-- 7 colonnes, chacune cliquable -->
  <div class="colonne-p4" data-colonne="0">
    <div class="cellule-p4" data-ligne="0" data-colonne="0">
      <div class="jeton-p4"></div>
    </div>
    <div class="cellule-p4" data-ligne="1" data-colonne="0">
      <div class="jeton-p4"></div>
    </div>
    <!-- ... 6 cellules par colonne -->
  </div>
  <!-- ... 7 colonnes -->
</div>
```

**Pourquoi la structure en colonnes plutôt qu'en lignes :**
- Le Puissance 4 est un jeu de colonnes : le joueur clique sur une colonne, pas sur une cellule
- La colonne entière est la zone cliquable, ce qui est plus naturel pour le clic et le survol
- Chaque `<div class="colonne-p4">` reçoit le listener de clic et de survol

**Détail de `creer()` :**
1. Créer le conteneur `<div class="grille-p4">`
2. Pour chaque colonne (0 à `NB_COLONNES - 1`) :
   - Créer `<div class="colonne-p4" data-colonne="${c}">`
   - Pour chaque ligne (0 à `NB_LIGNES - 1`) :
     - Créer `<div class="cellule-p4" data-ligne="${l}" data-colonne="${c}">`
     - Créer `<div class="jeton-p4">` à l'intérieur (invisible par défaut)
   - Ajouter les listeners `click`, `mouseenter`, `mouseleave` sur la colonne
3. Stocker les références DOM dans `this.cellules[ligne][colonne]` pour accès rapide

**Détail de `afficherJeton(ligne, colonne, joueur)` :**
- Récupérer l'élément `.jeton-p4` de la cellule `[ligne][colonne]`
- Ajouter la classe `CSS_JETON_JOUEUR` ou `CSS_JETON_IA` selon le joueur
- Ne pas recréer d'élément DOM : uniquement modifier le `classList` du jeton existant

**Détail du survol (preview) :**
- Quand la souris entre dans une colonne : afficher un jeton semi-transparent de la couleur du joueur actif dans la première cellule vide (en haut)
- Quand la souris quitte la colonne : retirer le jeton fantôme
- Le preview est désactivé pendant le tour de l'IA

**Dépendances :** constantes CSS depuis `./constantesPuissance4.js`

### Vérification
- Instancier `PlateauP4UI`, vérifier que la grille 7×6 est présente dans le DOM
- Cliquer sur une colonne : le callback `surClicColonne` est déclenché avec le bon index
- Appeler `afficherJeton(5, 3, JETON_JOUEUR)` : un jeton jaune apparaît en bas au centre
- Survoler une colonne : un jeton fantôme apparaît

### Texte du commit
```
feat(puissance4): implémentation de PlateauP4UI — rendu DOM de la grille

Grille 7×6 en colonnes cliquables avec aperçu au survol. Affichage
des jetons par modification de classList (pas de recréation DOM).
Surlignage des jetons gagnants et contrôle d'activation des interactions.
```

---

## Bloc 09 — AnimationChute (animation de dépôt de jeton)

### Objectif
Créer la classe `AnimationChute` qui anime la chute d'un jeton depuis le haut de la colonne jusqu'à sa position finale. L'animation utilise des transitions CSS (`transform: translateY`) pour un rendu fluide.

### Fichier : `js/jeux/puissance4/ui/AnimationChute.js`

**Interface publique :**
```js
class AnimationChute {
  // Anime la chute d'un jeton
  // Retourne une Promise résolue quand l'animation est terminée
  static animer(elementJeton, ligneDepart, ligneCible)
}
```

**Principe de l'animation :**

1. Le jeton est positionné visuellement en haut de la colonne (ligne 0) via `transform: translateY(-Xpx)` où X est la distance entre la ligne cible et la ligne 0
2. L'élément reçoit la classe `CSS_ANIMATION_CHUTE` qui active une transition CSS sur `transform`
3. Au frame suivant (`requestAnimationFrame`), le `translateY` est remis à 0, déclenchant la transition
4. Une Promise est retournée, résolue sur l'événement `transitionend`

**Détail de `animer(elementJeton, ligneDepart, ligneCible)` :**
```js
static animer(elementJeton, ligneDepart, ligneCible) {
  return new Promise((resoudre) => {
    const hauteurCellule = elementJeton.parentElement.offsetHeight;
    const distance = (ligneCible - ligneDepart) * hauteurCellule;

    // Position initiale : au-dessus de la cible
    elementJeton.style.transform = `translateY(-${distance}px)`;

    // Forcer le reflow pour que le navigateur enregistre la position initiale
    elementJeton.offsetHeight;

    // Activer la transition et lancer la chute
    elementJeton.classList.add(CSS_ANIMATION_CHUTE);
    elementJeton.style.transform = 'translateY(0)';

    // Résoudre à la fin de la transition
    elementJeton.addEventListener('transitionend', function gestionFin() {
      elementJeton.removeEventListener('transitionend', gestionFin);
      elementJeton.classList.remove(CSS_ANIMATION_CHUTE);
      resoudre();
    });
  });
}
```

**Pourquoi une Promise :**
- Permet à l'orchestrateur d'attendre la fin de l'animation avant de continuer (par exemple, avant de vérifier la victoire ou de déclencher le coup de l'IA)
- Usage : `await AnimationChute.animer(element, 0, 5)`

**Pourquoi `translateY` plutôt que `top` ou `margin` :**
- `transform` est GPU-accéléré dans les navigateurs modernes
- Pas de reflow du layout pendant l'animation → performances optimales
- La propriété `transition` sur `transform` produit une animation fluide à 60fps

**Dépendances :** `CSS_ANIMATION_CHUTE` depuis `./constantesPuissance4.js`

### Vérification
- Appeler `AnimationChute.animer(jeton, 0, 5)` : le jeton tombe visuellement de la ligne 0 à la ligne 5
- Vérifier que la Promise se résout correctement
- Vérifier que l'animation est fluide (pas de saccade)
- Tester avec différentes distances (chute de 1 ligne vs 5 lignes)

### Texte du commit
```
feat(puissance4): implémentation de AnimationChute — animation de dépôt

Animation de chute du jeton via CSS translateY + transition GPU-accélérée.
Retourne une Promise résolue en fin de transition pour synchroniser
les étapes du jeu avec le rendu visuel.
```

---

## Bloc 10 — Puissance4UI (HUD, sélecteur de niveau, overlay)

### Objectif
Créer la classe `Puissance4UI` qui assemble l'interface complète du jeu : le HUD (indicateur de tour, sélecteur de niveau IA), la grille (via `PlateauP4UI`), et les overlays de fin de partie (victoire, défaite, égalité).

### Fichier : `js/jeux/puissance4/ui/Puissance4UI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu, depotScores, profilActif, { surRetourMenu, surRejouer })
```

**Interface publique :**
```js
class Puissance4UI {
  constructor(elementConteneur, jeu, depotScores, profilActif, callbacks)

  afficher()                           // injecte le HUD, la grille et démarre la partie
  masquer()                            // nettoie et arrête la partie
  mettreAJourTour(joueur)             // met à jour l'indicateur de tour
  afficherFinDePartie(resultat)       // affiche l'overlay de fin
}
```

**Structure HTML complète :**
```html
<div class="jeu-puissance4">
  <header class="hud-p4">
    <span class="hud-p4__profil">NomDuJoueur</span>
    <span class="hud-p4__tour">
      <span class="indicateur-tour" data-joueur="joueur"></span>
      Votre tour
    </span>
    <div class="hud-p4__niveau">
      <label for="select-niveau-ia">Niveau IA :</label>
      <select id="select-niveau-ia" class="select-niveau-ia">
        <option value="FACILE">Facile</option>
        <option value="MOYEN" selected>Moyen</option>
        <option value="DIFFICILE">Difficile</option>
      </select>
    </div>
  </header>

  <div class="conteneur-grille-p4">
    <!-- PlateauP4UI injecte ici la grille -->
  </div>
</div>
```

**Indicateur de tour :**
- Un cercle coloré (`.indicateur-tour`) montre la couleur du joueur actif
- Le texte alterne entre "Votre tour" et "L'IA réfléchit..."
- Pendant le tour de l'IA, un indicateur de chargement (animation CSS `pulse`) est affiché

**Sélecteur de niveau IA :**
- Un `<select>` permet de choisir le niveau avant et pendant la partie
- Le changement de niveau appelle `jeu.changerNiveauIA(niveau)` et prend effet immédiatement
- Le niveau est verrouillé pendant le tour de l'IA (disabled)

**Overlay de fin de partie :**
```html
<div class="overlay-fin-p4">
  <h2 class="overlay-fin-p4__titre">Victoire !</h2>
  <!-- ou "Défaite..." ou "Égalité" -->
  <p class="overlay-fin-p4__detail">Niveau IA : Moyen</p>
  <div class="overlay-fin-p4__actions">
    <button class="btn--rejouer">Rejouer</button>
    <button class="btn--menu">Accueil</button>
  </div>
</div>
```

**Comportements de fin de partie :**
- **Victoire joueur** : titre "Victoire !", les 4 jetons gagnants pulsent (via `PlateauP4UI.surlignerVictoire`), score enregistré avec résultat `'victoire'`
- **Défaite joueur** : titre "Défaite...", jetons gagnants de l'IA surlignés, résultat `'defaite'`
- **Égalité** : titre "Égalité", pas de surlignage, résultat `'egalite'`
- L'enregistrement du score se fait via `depotScores.ajouterScore(...)` avec le `jeuId: 'puissance4'` et le niveau IA

**Câblage des callbacks :**
- `jeu.surCoupJoue` → `plateauUI.afficherJeton` (avec animation via `AnimationChute`)
- `jeu.surTourChange` → `this.mettreAJourTour`
- `jeu.surFinDePartie` → `this.afficherFinDePartie`
- `plateauUI.surClicColonne` → `jeu.jouerCoup`

**Dépendances :** `PlateauP4UI`, `AnimationChute`, `Jeu`, `DepotScores`, `Score`, constantes

### Vérification
- Vérifier que le HUD affiche le nom du joueur et l'indicateur de tour
- Changer le niveau IA dans le sélecteur, vérifier que le changement est pris en compte
- Jouer une partie complète, vérifier l'overlay de fin
- Vérifier que le bouton "Rejouer" lance une nouvelle partie sans retour à l'accueil
- Vérifier que l'indicateur de tour change correctement entre joueur et IA

### Texte du commit
```
feat(puissance4): implémentation de Puissance4UI — interface complète

HUD avec indicateur de tour, sélecteur de niveau IA, grille interactive
et overlay de fin de partie. Enregistrement automatique du score avec
le niveau de difficulté.
```

---

## Bloc 11 — Puissance4ScoresUI (tableau des scores)

### Objectif
Créer la classe `Puissance4ScoresUI` qui affiche les scores spécifiques au Puissance 4, filtrés par `jeuId: 'puissance4'`.

### Fichier : `js/jeux/puissance4/ui/Puissance4ScoresUI.js`

**Constructeur :**
```js
constructor(elementConteneur, depotScores, gestionnaireProfils, { surRetour })
```

**Interface publique :**
```js
class Puissance4ScoresUI {
  constructor(elementConteneur, depotScores, gestionnaireProfils, callbacks)

  afficher()   // injecte la vue dans elementConteneur
  masquer()    // vide elementConteneur
}
```

**Structure HTML :**
```html
<div class="scores-ui-p4">
  <h2>Scores — Puissance 4</h2>
  <div class="scores-filtres-p4">
    <button class="filtre--tous actif">Tous</button>
    <button class="filtre--niveau" data-niveau="FACILE">Facile</button>
    <button class="filtre--niveau" data-niveau="MOYEN">Moyen</button>
    <button class="filtre--niveau" data-niveau="DIFFICILE">Difficile</button>
  </div>
  <table class="scores-tableau-p4">
    <thead>
      <tr>
        <th>Rang</th>
        <th>Joueur</th>
        <th>Résultat</th>
        <th>Niveau IA</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      <!-- lignes dynamiques -->
    </tbody>
  </table>
  <button class="btn--retour">Retour</button>
</div>
```

**Filtrage par niveau IA :**
- Par défaut, tous les scores sont affichés
- Les boutons de filtre permettent de ne voir que les parties jouées contre un niveau donné
- Le filtre actif reçoit la classe `actif`

**Données d'un score Puissance 4 :**
- `jeuId` : `'puissance4'`
- `profilId` : identifiant du profil joueur
- `resultat` : `'victoire'`, `'defaite'` ou `'egalite'`
- `niveauIA` : `'FACILE'`, `'MOYEN'` ou `'DIFFICILE'`
- `date` : timestamp de la partie

**Tri :**
- Victoires d'abord, puis égalités, puis défaites
- À résultat égal : par date décroissante (plus récent en premier)
- Les victoires contre un niveau difficile sont valorisées (affichage différencié)

**Dépendances :** `DepotScores`, `GestionnaireProfils`, constantes

### Vérification
- Ajouter manuellement quelques scores dans le localStorage, vérifier l'affichage
- Filtrer par niveau IA, vérifier que seuls les scores correspondants sont affichés
- Vérifier le tri (victoires en premier)

### Texte du commit
```
feat(puissance4): implémentation de Puissance4ScoresUI — tableau des scores

Affichage des résultats Puissance 4 avec filtrage par niveau IA.
Tri : victoires d'abord, puis par date décroissante.
```

---

## Bloc 12 — CSS Puissance 4

### Objectif
Créer le fichier CSS complet pour le Puissance 4. Tous les styles sont scopés sous `.jeu-puissance4` pour éviter les conflits avec les autres jeux.

### Fichier : `css/jeux/puissance4.css`

**Palette de couleurs :**
- Grille (fond) : bleu royal `#1a5276` — rappelle la couleur classique du plateau Puissance 4
- Jeton joueur : jaune `#f1c40f`
- Jeton IA : rouge `#e74c3c`
- Jeton gagnant (glow) : blanc lumineux
- Fond des cellules vides : bleu plus sombre `#154360`

**Variables CSS (custom properties) :**
```css
.jeu-puissance4 {
  --couleur-grille: #1a5276;
  --couleur-cellule-vide: #154360;
  --couleur-joueur: #f1c40f;
  --couleur-ia: #e74c3c;
  --couleur-gagnant-glow: rgba(255, 255, 255, 0.8);
  --taille-cellule: 60px;
  --gap-cellule: 8px;
  --duree-chute: 0.4s;
  --duree-pulse: 1s;
}
```

**Grille :**
```css
.grille-p4 {
  display: flex;
  gap: var(--gap-cellule);
  background: var(--couleur-grille);
  padding: var(--gap-cellule);
  border-radius: 12px;
  /* Ombre portée pour l'effet profondeur */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.colonne-p4 {
  display: flex;
  flex-direction: column;
  gap: var(--gap-cellule);
  cursor: pointer;
}

.colonne-p4:hover {
  /* Léger éclaircissement au survol pour indiquer la colonne ciblée */
  filter: brightness(1.1);
}
```

**Cellules et jetons :**
```css
.cellule-p4 {
  width: var(--taille-cellule);
  height: var(--taille-cellule);
  border-radius: 50%;
  background: var(--couleur-cellule-vide);
  position: relative;
  overflow: hidden;
}

.jeton-p4 {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 0;
  /* Invisible par défaut */
  opacity: 0;
  transform: scale(0);
  transition: opacity 0.2s, transform 0.2s;
}

.jeton-p4--joueur {
  background: var(--couleur-joueur);
  opacity: 1;
  transform: scale(1);
}

.jeton-p4--ia {
  background: var(--couleur-ia);
  opacity: 1;
  transform: scale(1);
}
```

**Animation de chute :**
```css
.jeton-p4--chute {
  transition: transform var(--duree-chute) cubic-bezier(0.34, 1.56, 0.64, 1);
  /* cubic-bezier avec rebond léger pour simuler l'impact physique du jeton */
}
```

**Pourquoi `cubic-bezier(0.34, 1.56, 0.64, 1)` :**
- Cette courbe produit un léger rebond à l'arrivée, imitant le comportement physique d'un jeton qui tombe dans un plateau plastique
- Le premier overshoot (1.56 > 1) crée l'effet de rebond

**Aperçu au survol (preview) :**
```css
.jeton-p4--preview {
  opacity: 0.4;
  transform: scale(1);
}
```

**Animation des jetons gagnants :**
```css
.jeton-p4--gagnant {
  animation: pulseGagnant var(--duree-pulse) ease-in-out infinite;
}

@keyframes pulseGagnant {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--couleur-gagnant-glow);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 20px 10px var(--couleur-gagnant-glow);
    transform: scale(1.08);
  }
}
```

**HUD :**
```css
.hud-p4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.indicateur-tour {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
}

.indicateur-tour[data-joueur="joueur"] {
  background: var(--couleur-joueur);
}

.indicateur-tour[data-joueur="ia"] {
  background: var(--couleur-ia);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Sélecteur de niveau IA :**
```css
.select-niveau-ia {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
```

**Overlay de fin de partie :**
```css
.overlay-fin-p4 {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 12px;
  /* Animation d'apparition */
  animation: fonduEntree 0.3s ease-out;
}

@keyframes fonduEntree {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

**Responsive :**
```css
@media (max-width: 600px) {
  .jeu-puissance4 {
    --taille-cellule: 40px;
    --gap-cellule: 5px;
  }
}
```

### Vérification
- La grille est bleue avec des emplacements circulaires sombres
- Les jetons joueur sont jaunes, les jetons IA sont rouges
- L'animation de chute a un léger rebond
- Les jetons gagnants pulsent avec un halo blanc
- Sur mobile (<600px), la grille réduit sa taille
- Aucun style ne fuit hors de `.jeu-puissance4`

### Texte du commit
```
feat(puissance4): ajout du CSS complet — grille, jetons, animations

Styles scopés sous .jeu-puissance4 : grille bleue avec jetons circulaires
jaune/rouge, animation de chute avec rebond, pulse des jetons gagnants,
HUD, overlay de fin et responsive mobile.
```

---

## Bloc 13 — Intégration finale et recette

### Objectif
Câbler tous les blocs ensemble, tester le parcours complet de bout en bout, corriger les derniers bugs et valider l'intégration avec le shell PlaygroundJS.

### Checklist de recette

**Lancement :**
- [ ] Depuis l'accueil PlaygroundJS, la carte "Puissance 4" est visible avec l'icône et la description
- [ ] Cliquer sur la carte navigue vers `#puissance4` et charge le jeu
- [ ] Le HUD affiche le nom du profil actif, l'indicateur de tour et le sélecteur de niveau

**Gameplay — tour joueur :**
- [ ] Cliquer sur une colonne dépose un jeton jaune
- [ ] Le jeton tombe avec animation jusqu'à la position la plus basse
- [ ] Cliquer sur une colonne pleine est ignoré (pas d'erreur)
- [ ] Cliquer pendant le tour de l'IA est ignoré
- [ ] Le survol d'une colonne affiche un aperçu semi-transparent du jeton

**Gameplay — tour IA :**
- [ ] L'IA joue automatiquement ~500ms après le coup du joueur
- [ ] L'indicateur de tour affiche "L'IA réfléchit..." pendant le délai
- [ ] Le jeton IA (rouge) tombe avec la même animation

**Niveaux IA :**
- [ ] Niveau Facile : l'IA se fait battre facilement (rate des menaces évidentes)
- [ ] Niveau Moyen : l'IA offre un défi correct (bloque les alignements de 3)
- [ ] Niveau Difficile : l'IA est quasi imbattable (anticipe les pièges à 3 coups)
- [ ] Changer de niveau pendant la partie prend effet au prochain coup de l'IA

**Fin de partie :**
- [ ] Victoire joueur : overlay "Victoire !", 4 jetons gagnants pulsent
- [ ] Défaite joueur : overlay "Défaite...", jetons IA gagnants pulsent
- [ ] Égalité : overlay "Égalité", pas de surlignage
- [ ] Le score est enregistré avec le résultat et le niveau IA
- [ ] Le bouton "Rejouer" lance une nouvelle partie (même niveau IA)
- [ ] Le bouton "Accueil" retourne à l'écran d'accueil

**Scores :**
- [ ] Le tableau des scores affiche les parties de Puissance 4
- [ ] Le filtre par niveau IA fonctionne
- [ ] Le tri place les victoires en premier

**Navigation :**
- [ ] Retour arrière navigateur (`popstate`) revient à l'accueil proprement
- [ ] Relancer le jeu après un retour fonctionne sans erreur
- [ ] Le cycle complet `initialiser → demarrer → arreter → detruire` ne laisse pas de listener orphelin

**Performance :**
- [ ] L'IA Facile (profondeur 2) répond en < 10ms
- [ ] L'IA Moyen (profondeur 4) répond en < 50ms
- [ ] L'IA Difficile (profondeur 6) répond en < 200ms
- [ ] Pas de fuite mémoire après 10 parties consécutives

**Responsive :**
- [ ] La grille est jouable sur mobile (320px de large minimum)
- [ ] Les clics tactiles fonctionnent correctement

### Texte du commit
```
feat(puissance4): intégration finale et recette complète

Câblage de tous les composants, tests de bout en bout du parcours
complet (lancement, gameplay, niveaux IA, fin de partie, scores,
navigation). Corrections des derniers ajustements.
```

---

## Récapitulatif de l'arborescence finale

```
js/jeux/puissance4/
├── constantesPuissance4.js       # Bloc 01 — constantes
├── PlateauP4.js                  # Bloc 02 — modèle de la grille
├── DetecteurVictoire.js          # Bloc 03 — détection d'alignement
├── EvaluateurPosition.js         # Bloc 04 — heuristique IA
├── IAMinimax.js                  # Bloc 05 — algorithme Minimax alpha-beta
├── Jeu.js                        # Bloc 06 — orchestrateur interne
├── JeuPuissance4.js              # Bloc 07 — adaptateur InterfaceJeu
└── ui/
    ├── PlateauP4UI.js            # Bloc 08 — rendu DOM de la grille
    ├── AnimationChute.js         # Bloc 09 — animation de dépôt
    ├── Puissance4UI.js           # Bloc 10 — HUD, sélecteur, overlay
    └── Puissance4ScoresUI.js     # Bloc 11 — tableau des scores

css/jeux/
└── puissance4.css                # Bloc 12 — styles complets
```

---

## Dépendances entre blocs

```
Bloc 01 (constantes)
  ├── Bloc 02 (PlateauP4)
  │     ├── Bloc 03 (DetecteurVictoire)
  │     ├── Bloc 04 (EvaluateurPosition)
  │     └── Bloc 05 (IAMinimax) ← dépend de 03 + 04
  │           └── Bloc 06 (Jeu) ← dépend de 02 + 03 + 05
  │                 └── Bloc 07 (JeuPuissance4) ← dépend de 06
  ├── Bloc 08 (PlateauP4UI)
  │     └── Bloc 09 (AnimationChute)
  │           └── Bloc 10 (Puissance4UI) ← dépend de 06 + 08 + 09
  ├── Bloc 11 (Puissance4ScoresUI)
  └── Bloc 12 (CSS)

Bloc 13 (Intégration) ← dépend de tous les blocs précédents
```

Les blocs logiques (02-06) et les blocs UI (08-11) peuvent être développés en parallèle, à condition de respecter les interfaces publiques définies.

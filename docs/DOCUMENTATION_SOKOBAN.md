# DOCUMENTATION_SOKOBAN.md — Plan d'implementation du jeu Sokoban

Ce document est le guide de realisation du jeu Sokoban dans le cadre du projet PlaygroundJS. Chaque bloc est independant et correspond a un commit logique. Le projet peut etre repris a n'importe quelle etape en consultant ce plan.

> **Prerequis :** la Phase 0 (Shell / Infrastructure) doit etre implementee avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

---

## Vue d'ensemble de la chaine de commits

```
Bloc 01 — constantesSokoban
Bloc 02 — Niveau (parseur de niveaux et collection)
Bloc 03 — Joueur (position et logique de deplacement)
Bloc 04 — Commande (pattern Command)
Bloc 05 — GestionnaireCommandes (piles undo/redo)
Bloc 06 — EtatNiveau (etat du plateau de jeu)
Bloc 07 — DetecteurVictoire
Bloc 08 — Jeu (orchestrateur interne)
Bloc 09 — JeuSokoban (adaptateur InterfaceJeu)
Bloc 10 — PlateauSokoban (rendu DOM de la grille)
Bloc 11 — SokobanUI (HUD et interface utilisateur)
Bloc 12 — SokobanScoresUI (tableau des scores)
Bloc 13 — CSS Sokoban
Bloc 14 — Integration finale et recette
```

> **Note :** les blocs Profil, GestionnaireProfils, Score et DepotScores sont geres par la Phase 0 (shell partage). Ils ne sont plus specifiques au Sokoban.

---

## Bloc 01 — constantesSokoban

### Objectif
Centraliser toutes les valeurs numeriques, symboles et chaines de configuration specifiques au Sokoban dans `js/jeux/sokoban/constantesSokoban.js`. Aucun magic number ne doit apparaitre dans le reste du code du Sokoban.

### Fichier : `js/jeux/sokoban/constantesSokoban.js`

```js
// Symboles du format standard Sokoban
export const SYMBOLES = Object.freeze({
  MUR:             '#',
  SOL:             ' ',
  CIBLE:           '.',
  CAISSE:          '$',
  JOUEUR:          '@',
  JOUEUR_SUR_CIBLE: '+',
  CAISSE_SUR_CIBLE: '*',
});

// Directions (vecteurs [deltaColonne, deltaLigne])
export const DIRECTIONS = Object.freeze({
  HAUT:   { dc:  0, dl: -1 },
  BAS:    { dc:  0, dl:  1 },
  GAUCHE: { dc: -1, dl:  0 },
  DROITE: { dc:  1, dl:  0 },
});

// Touches clavier → direction
export const TOUCHES_DIRECTION = Object.freeze({
  ArrowUp:    'HAUT',
  ArrowDown:  'BAS',
  ArrowLeft:  'GAUCHE',
  ArrowRight: 'DROITE',
  z: 'HAUT',
  s: 'BAS',
  q: 'GAUCHE',
  d: 'DROITE',
});

// Raccourcis clavier pour undo/redo
export const TOUCHE_ANNULER = 'z';       // Ctrl+Z
export const TOUCHE_RETABLIR = 'y';      // Ctrl+Y

// Types de cellules (representation interne apres parsing)
export const TYPES_CELLULE = Object.freeze({
  VIDE:   'vide',
  MUR:    'mur',
  SOL:    'sol',
  CIBLE:  'cible',
});

// Classes CSS des cellules
export const CSS_CONTENEUR      = 'plateau-sokoban';
export const CSS_CELLULE        = 'cellule';
export const CSS_MUR            = 'cellule--mur';
export const CSS_SOL            = 'cellule--sol';
export const CSS_CIBLE          = 'cellule--cible';
export const CSS_CAISSE         = 'cellule--caisse';
export const CSS_CAISSE_CIBLE   = 'cellule--caisse-cible';
export const CSS_JOUEUR         = 'cellule--joueur';
export const CSS_JOUEUR_CIBLE   = 'cellule--joueur-cible';

// Taille maximale d'un niveau (pour le rendu)
export const TAILLE_CELLULE_PX  = 40;

// Limite de l'historique undo (pour eviter une consommation memoire excessive)
export const TAILLE_MAX_HISTORIQUE = 1000;
```

### Verification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur.

### Texte du commit
```
feat(sokoban): constantes specifiques au jeu Sokoban

Tous les symboles du format standard, les directions, les touches
clavier, les types de cellules et les classes CSS sont centralises
dans constantesSokoban.js. Aucun magic number dans le reste du code.
```

---

## Bloc 02 — Niveau (parseur de niveaux et collection)

### Objectif
Creer la classe `Niveau` qui convertit une carte texte au format standard Sokoban en une grille 2D exploitable, et qui embarque une collection d'au moins 10 niveaux classiques de difficulte croissante.

### Fichier : `js/jeux/sokoban/Niveau.js`

**Responsabilites :**
- Parser une chaine multi-lignes representant un niveau au format standard Sokoban
- Extraire la grille de fond (murs, sols, cibles), la position initiale du joueur et les positions initiales des caisses
- Stocker les metadonnees de chaque niveau (nom, numero, auteur)
- Fournir la collection complete de niveaux integres

**Format standard Sokoban :**
```
#   = mur
    = sol (espace)
.   = cible
$   = caisse sur sol
@   = joueur sur sol
+   = joueur sur cible
*   = caisse sur cible
```

**Representation interne apres parsing :**
- `this.grilleFond` : tableau 2D de `TYPES_CELLULE` (`MUR`, `SOL`, `CIBLE`, `VIDE`)
  - Les cellules en dehors du niveau (espaces exterieurs aux murs) sont `VIDE`
  - Les cellules a l'interieur des murs sont `SOL` ou `CIBLE`
- `this.positionJoueur` : `{ col, lig }`
- `this.positionsCaisses` : tableau de `{ col, lig }`
- `this.largeur` : nombre de colonnes (longueur de la ligne la plus longue)
- `this.hauteur` : nombre de lignes

**Interface publique :**
```js
class Niveau {
  constructor(carte, metadonnees = {})

  get grilleFond()            // tableau 2D de TYPES_CELLULE (lecture seule)
  get positionJoueurInitiale() // { col, lig }
  get positionsCaissesInitiales() // [{ col, lig }, ...]
  get positionsCibles()       // [{ col, lig }, ...] extraites de grilleFond
  get largeur()               // nombre de colonnes
  get hauteur()               // nombre de lignes
  get nom()                   // nom du niveau
  get numero()                // numero du niveau dans la collection

  static chargerNiveau(numero)       // retourne une instance Niveau pour le numero donne
  static get nombreDeNiveaux()       // nombre total de niveaux disponibles
  static get listeNiveaux()          // [{ numero, nom }, ...] pour le selecteur
}
```

**Algorithme de parsing (`constructor`) :**
1. Decouper la carte par `\n` en lignes
2. Calculer `largeur` = longueur de la ligne la plus longue
3. Calculer `hauteur` = nombre de lignes
4. Pour chaque caractere `(col, lig)` :
   - `#` → `grilleFond[lig][col] = MUR`
   - ` ` → `grilleFond[lig][col] = SOL` (si a l'interieur des murs, sinon `VIDE`)
   - `.` → `grilleFond[lig][col] = CIBLE`
   - `$` → `grilleFond[lig][col] = SOL`, ajouter `{ col, lig }` a `positionsCaisses`
   - `@` → `grilleFond[lig][col] = SOL`, stocker `positionJoueur = { col, lig }`
   - `+` → `grilleFond[lig][col] = CIBLE`, stocker `positionJoueur = { col, lig }`
   - `*` → `grilleFond[lig][col] = CIBLE`, ajouter `{ col, lig }` a `positionsCaisses`
5. Completer les lignes plus courtes par des `VIDE` pour atteindre `largeur`

**Collection de niveaux integres (au moins 10 niveaux classiques) :**

Les niveaux sont stockes dans un tableau `NIVEAUX_INTEGRES` en tant que constante privee du module. Chaque entree est un objet `{ nom, auteur, carte }`.

```js
const NIVEAUX_INTEGRES = [
  {
    nom: 'Niveau 1 — Premier pas',
    auteur: 'Thinking Rabbit',
    carte: [
      '    #####',
      '    #   #',
      '    #$  #',
      '  ###  $##',
      '  #  $ $ #',
      '### # ## #   ######',
      '#   # ## #####  ..#',
      '# $  $          ..#',
      '##### ### #@##  ..#',
      '    #     #########',
      '    #######',
    ].join('\n'),
  },
  {
    nom: 'Niveau 2 — Couloir',
    auteur: 'Thinking Rabbit',
    carte: [
      '############',
      '#..  #     ###',
      '#..  # $  $  #',
      '#..  #$####  #',
      '#..    @ ##  #',
      '#..  # #  $ ##',
      '###### ##$ $ #',
      '  # $  $ $ $ #',
      '  #    #     #',
      '  ############',
    ].join('\n'),
  },
  {
    nom: 'Niveau 3 — Entrepot',
    auteur: 'Thinking Rabbit',
    carte: [
      '        ########',
      '        #     @#',
      '        # $#$ ##',
      '        # $  $#',
      '        ##$ $ #',
      '######### $ # ###',
      '#....  ## $  $  #',
      '##...    $  $   #',
      '#....  ##########',
      '########',
    ].join('\n'),
  },
  {
    nom: 'Niveau 4 — Croisement',
    auteur: 'Thinking Rabbit',
    carte: [
      '           ########',
      '           #  ....#',
      '############  ....#',
      '#    #  $ $   ....#',
      '# $$$#$  $ #  ....#',
      '#  $     $@# ....#',
      '# $$ #$ $ $########',
      '#  $ #     #',
      '## #########',
      '#    #    #',
      '#     $   #',
      '#  $$#$$  #',
      '#    #    #',
      '###########',
    ].join('\n'),
  },
  {
    nom: 'Niveau 5 — Spirale',
    auteur: 'Thinking Rabbit',
    carte: [
      '        #####',
      '        #   #####',
      '        # #$##  #',
      '        #     $ #',
      '######### ###   #',
      '#....  ## $  $###',
      '#....    $ $$ ##',
      '#....  ##$  $ @#',
      '##########  $  #',
      '         # $ $ #',
      '         ### ###',
      '           #   #',
      '           #####',
    ].join('\n'),
  },
  {
    nom: 'Niveau 6 — Labyrinthe',
    auteur: 'Thinking Rabbit',
    carte: [
      '######  ###',
      '#..  # ##@##',
      '#..  ###   #',
      '#..     $$ #',
      '#..  # # $ #',
      '#..### # $ #',
      '#### $ #$  #',
      '   #  $# $ #',
      '   # $  $  #',
      '   #  ##   #',
      '   #########',
    ].join('\n'),
  },
  {
    nom: 'Niveau 7 — Double depot',
    auteur: 'Thinking Rabbit',
    carte: [
      '       #####',
      ' #######   ##',
      '## # @## $$ #',
      '#    $      #',
      '#  $  ###   #',
      '### #####$###',
      '# $  ### ..#',
      '# $ $ $ ...#',
      '#    ###...#',
      '# $$ # #...#',
      '#  ### #####',
      '####',
    ].join('\n'),
  },
  {
    nom: 'Niveau 8 — Escalier',
    auteur: 'Thinking Rabbit',
    carte: [
      '  ####',
      '  #  ###',
      '  #    #',
      '  # $  #',
      '  ## ##  #',
      '   # # $ #',
      '####   $ #',
      '#  .#  ###',
      '#  .# $##',
      '#  .   @#',
      '#  . # $#',
      '########',
    ].join('\n'),
  },
  {
    nom: 'Niveau 9 — Chambre forte',
    auteur: 'Thinking Rabbit',
    carte: [
      '          #######',
      '          #  ...#',
      '     ######  ...#',
      '     #    $  ...#',
      '     # $  $ ####',
      '     ## ##$$ #',
      '      # ##   #',
      '##### # # $  #',
      '#   ### #$  ##',
      '#  $  # # $  #',
      '# $ @    #   #',
      '#########  ###',
      '         ####',
    ].join('\n'),
  },
  {
    nom: 'Niveau 10 — Le defi',
    auteur: 'Thinking Rabbit',
    carte: [
      '  ###########',
      '  #  .  #   #',
      '  # #.    $ #',
      '  #  .## #$##',
      '  ## .    $ #',
      '  # $.# # $ #',
      '###$.  #    #',
      '# $ ## #  ###',
      '#      # ##',
      '#   @  # #',
      '########  #',
      '        ###',
    ].join('\n'),
  },
  {
    nom: 'Niveau 11 — Expert',
    auteur: 'Thinking Rabbit',
    carte: [
      '####',
      '# .#######',
      '# $   $ @#',
      '# .# # ###',
      '## # $  #',
      ' # $ ## #',
      ' #   .$ #',
      ' ########',
    ].join('\n'),
  },
  {
    nom: 'Niveau 12 — Ultime',
    auteur: 'Thinking Rabbit',
    carte: [
      '   ######',
      '   #    #',
      '   # ## ###',
      '####  $   #',
      '#  . $.@# #',
      '#  . # $  #',
      '#  . $  ###',
      '########',
    ].join('\n'),
  },
];
```

> Les niveaux 1 a 10 proviennent de la collection classique « Original » de Thinking Rabbit (1982). Les niveaux 11 et 12 sont des niveaux supplementaires de difficulte variable.

**Dependances :** `SYMBOLES`, `TYPES_CELLULE` depuis `./constantesSokoban.js`

### Verification
Charger le niveau 1, verifier que `grilleFond` est un tableau 2D, que `positionJoueurInitiale` est correcte, et que le nombre de caisses egale le nombre de cibles.

### Texte du commit
```
feat(sokoban): implementation de Niveau — parseur et collection de niveaux

Parseur du format standard Sokoban (# . $ @ + *) vers une grille 2D
interne. Collection de 12 niveaux classiques de difficulte croissante.
Metadonnees (nom, auteur) pour chaque niveau.
```

---

## Bloc 03 — Joueur (position et logique de deplacement)

### Objectif
Creer la classe `Joueur` qui modelise la position du joueur et la logique de deplacement, y compris la poussee de caisses. Cette classe ne touche jamais au DOM.

### Fichier : `js/jeux/sokoban/Joueur.js`

**Responsabilites :**
- Stocker la position courante du joueur `{ col, lig }`
- Calculer la position apres un deplacement dans une direction donnee
- Valider si un deplacement est possible (cellule adjacente libre ou caisse poussable)

**Interface publique :**
```js
class Joueur {
  constructor(positionInitiale)

  get position()                          // { col, lig }
  set position(nouvellePosition)          // { col, lig }

  calculerPositionSuivante(direction)     // retourne { col, lig } sans modifier l'etat
  reinitialiser(positionInitiale)         // remet le joueur a une position donnee
}
```

**Regles de deplacement (validees par l'orchestrateur, pas par Joueur) :**
Le `Joueur` ne valide pas lui-meme les deplacements. Il fournit seulement le calcul de la position suivante. C'est l'orchestrateur (`Jeu`) qui verifie :

1. Calculer `positionSuivante = joueur.calculerPositionSuivante(direction)`
2. Si `positionSuivante` est un mur → deplacement impossible
3. Si `positionSuivante` est un sol ou une cible libre → deplacement simple
4. Si `positionSuivante` contient une caisse :
   - Calculer `positionDerriereCaisse = positionSuivante + direction`
   - Si `positionDerriereCaisse` est un mur ou contient une caisse → deplacement impossible
   - Sinon → deplacement avec poussee de caisse

**Dependances :** `DIRECTIONS` depuis `./constantesSokoban.js`

### Verification
Instancier un `Joueur` a la position `{ col: 5, lig: 5 }`. Appeler `calculerPositionSuivante('HAUT')`, verifier que le retour est `{ col: 5, lig: 4 }`. Verifier que la position du joueur n'a pas change (methode pure).

### Texte du commit
```
feat(sokoban): implementation de Joueur — position et calcul de deplacement

Modele du joueur avec position courante et calcul de la position
suivante dans une direction donnee. Pas de couplage DOM. La validation
du deplacement est deleguee a l'orchestrateur (SRP).
```

---

## Bloc 04 — Commande (pattern Command)

### Objectif
Creer la classe `Commande` (et sa sous-classe `CommandeDeplacer`) qui encapsule un deplacement du joueur (avec ou sans poussee de caisse) pour permettre le undo/redo.

### Fichier : `js/jeux/sokoban/Commande.js`

**Responsabilites :**
- Encapsuler l'etat avant et apres un deplacement
- Fournir `executer()` pour appliquer le deplacement
- Fournir `annuler()` pour revenir a l'etat precedent
- Stocker optionnellement le deplacement d'une caisse associee

**Interface publique :**
```js
class CommandeDeplacer {
  constructor({
    joueur,                    // reference vers l'instance Joueur
    etatNiveau,                // reference vers l'instance EtatNiveau
    anciennePositionJoueur,    // { col, lig }
    nouvellePositionJoueur,    // { col, lig }
    anciennePositionCaisse,    // { col, lig } ou null (si pas de poussee)
    nouvellePositionCaisse,    // { col, lig } ou null (si pas de poussee)
  })

  executer()    // deplace le joueur (et la caisse si applicable) vers les nouvelles positions
  annuler()     // remet le joueur (et la caisse si applicable) aux anciennes positions

  get aPousseCaisse()   // booleen, true si ce deplacement a pousse une caisse
}
```

**Detail de `executer()` :**
1. Deplacer le joueur : `this.joueur.position = this.nouvellePositionJoueur`
2. Si `anciennePositionCaisse` n'est pas null :
   - `this.etatNiveau.deplacerCaisse(this.anciennePositionCaisse, this.nouvellePositionCaisse)`

**Detail de `annuler()` :**
1. Si `anciennePositionCaisse` n'est pas null :
   - `this.etatNiveau.deplacerCaisse(this.nouvellePositionCaisse, this.anciennePositionCaisse)`
2. Remettre le joueur : `this.joueur.position = this.anciennePositionJoueur`

> **Ordre critique dans `annuler()` :** remettre la caisse *avant* le joueur, car la caisse est a la position ou le joueur va revenir.

**Dependances :** aucune importation de module (recoit ses dependances par injection dans le constructeur)

### Verification
Creer une `CommandeDeplacer` avec des positions simulees. Appeler `executer()`, verifier les positions. Appeler `annuler()`, verifier que les positions sont revenues a l'etat initial.

### Texte du commit
```
feat(sokoban): implementation de Commande — pattern Command pour undo/redo

Chaque deplacement est encapsule dans un objet CommandeDeplacer avec
execute() et annuler(). Stocke la position du joueur et optionnellement
la position de la caisse poussee. Base du systeme undo/redo.
```

---

## Bloc 05 — GestionnaireCommandes (piles undo/redo)

### Objectif
Creer la classe `GestionnaireCommandes` qui gere deux piles (undo et redo) et orchestre l'execution, l'annulation et le retablissement des commandes.

### Fichier : `js/jeux/sokoban/GestionnaireCommandes.js`

**Responsabilites :**
- Maintenir une pile d'historique (undo) et une pile de retablissement (redo)
- Executer une nouvelle commande et la pousser sur la pile undo
- Annuler la derniere commande (undo) et la pousser sur la pile redo
- Retablir la derniere commande annulee (redo) et la repousser sur la pile undo
- Vider la pile redo lorsqu'une nouvelle commande est executee (comportement standard)
- Limiter la taille de l'historique pour eviter la surconsommation memoire

**Interface publique :**
```js
class GestionnaireCommandes {
  constructor(tailleMaxHistorique = TAILLE_MAX_HISTORIQUE)

  executerCommande(commande)    // appelle commande.executer(), push sur pileUndo, vide pileRedo
  annuler()                     // pop pileUndo, appelle commande.annuler(), push sur pileRedo
  retablir()                    // pop pileRedo, appelle commande.executer(), push sur pileUndo

  get peutAnnuler()             // booleen, true si pileUndo non vide
  get peutRetablir()            // booleen, true si pileRedo non vide
  get nombreDeCoups()           // taille de pileUndo (= nombre de mouvements effectues)

  reinitialiser()               // vide les deux piles
}
```

**Detail de `executerCommande(commande)` :**
1. Appeler `commande.executer()`
2. Pousser `commande` sur `this._pileUndo`
3. Vider `this._pileRedo` (un nouveau coup invalide l'historique redo)
4. Si `this._pileUndo.length > this._tailleMaxHistorique` : retirer le premier element (le plus ancien)

**Detail de `annuler()` :**
1. Si `this._pileUndo` est vide → ne rien faire (retourner `false`)
2. Pop la commande du sommet de `this._pileUndo`
3. Appeler `commande.annuler()`
4. Pousser la commande sur `this._pileRedo`
5. Retourner `true`

**Detail de `retablir()` :**
1. Si `this._pileRedo` est vide → ne rien faire (retourner `false`)
2. Pop la commande du sommet de `this._pileRedo`
3. Appeler `commande.executer()`
4. Pousser la commande sur `this._pileUndo`
5. Retourner `true`

**Dependances :** `TAILLE_MAX_HISTORIQUE` depuis `./constantesSokoban.js`

### Verification
Creer un `GestionnaireCommandes`, executer 3 commandes, verifier `nombreDeCoups === 3`. Annuler une fois, verifier `nombreDeCoups === 2` et `peutRetablir === true`. Retablir, verifier `nombreDeCoups === 3`. Executer une nouvelle commande, verifier `peutRetablir === false`.

### Texte du commit
```
feat(sokoban): implementation de GestionnaireCommandes — piles undo/redo

Gestion de l'historique des deplacements avec deux piles. Execution,
annulation et retablissement des commandes. La pile redo est videe
lors d'un nouveau coup. Taille d'historique limitee.
```

---

## Bloc 06 — EtatNiveau (etat du plateau de jeu)

### Objectif
Creer la classe `EtatNiveau` qui represente l'etat courant du plateau de jeu : la grille de fond (immuable), les positions des caisses (mutables) et la position du joueur. Cette classe sert de source de verite pour toutes les verifications de deplacement et le rendu.

### Fichier : `js/jeux/sokoban/EtatNiveau.js`

**Responsabilites :**
- Stocker la grille de fond (murs, sols, cibles) — ne change jamais pendant la partie
- Stocker les positions des caisses — mutables par les deplacements
- Fournir des methodes de consultation : type de cellule, presence d'une caisse, praticabilite
- Deplacer une caisse d'une position a une autre (appele par `CommandeDeplacer`)

**Interface publique :**
```js
class EtatNiveau {
  constructor(niveau)                  // recoit une instance Niveau

  get grilleFond()                      // tableau 2D de TYPES_CELLULE (reference, lecture seule)
  get positionsCaisses()                // copie du tableau des positions de caisses
  get largeur()
  get hauteur()

  typeCellule(col, lig)                // retourne TYPES_CELLULE pour la cellule de fond
  contientCaisse(col, lig)             // booleen
  estPraticable(col, lig)              // true si sol ou cible ET pas de caisse
  estDansLimites(col, lig)             // true si col/lig dans les bornes de la grille

  deplacerCaisse(anciennePos, nouvellePos)   // deplace une caisse (appele par Commande)

  reinitialiser(niveau)                // recharge l'etat depuis un Niveau
}
```

**Detail de `estPraticable(col, lig)` :**
1. Si hors limites → `false`
2. Si `typeCellule(col, lig)` est `MUR` ou `VIDE` → `false`
3. Si `contientCaisse(col, lig)` → `false`
4. Sinon → `true`

**Detail de `contientCaisse(col, lig)` :**
- Parcourir `this._positionsCaisses` et retourner `true` si une caisse se trouve a `(col, lig)`
- Pour la performance, on peut utiliser un `Set` de cles stringifiees `"col,lig"` en plus du tableau

**Detail de `deplacerCaisse(anciennePos, nouvellePos)` :**
1. Trouver la caisse a `anciennePos` dans `this._positionsCaisses`
2. Mettre a jour ses coordonnees vers `nouvellePos`
3. Mettre a jour le `Set` de positions si utilise

**Dependances :** `TYPES_CELLULE` depuis `./constantesSokoban.js`

### Verification
Charger le niveau 1, instancier `EtatNiveau`. Verifier que `typeCellule` retourne `MUR` pour les murs, `contientCaisse` retourne `true` pour les positions initiales des caisses, et `estPraticable` retourne `false` pour les murs et les positions de caisses.

### Texte du commit
```
feat(sokoban): implementation de EtatNiveau — etat mutable du plateau

Source de verite pour l'etat courant de la partie : grille de fond
immuable + positions mutables des caisses. Methodes de consultation
(typeCellule, contientCaisse, estPraticable) et mutation (deplacerCaisse).
```

---

## Bloc 07 — DetecteurVictoire

### Objectif
Creer la classe `DetecteurVictoire` qui verifie si toutes les cibles du niveau ont une caisse dessus. Cette classe est stateless et fonctionne par inspection.

### Fichier : `js/jeux/sokoban/DetecteurVictoire.js`

**Responsabilites :**
- Verifier la condition de victoire : chaque cellule de type `CIBLE` doit etre occupee par une caisse
- Cette classe ne modifie aucun etat

**Interface publique :**
```js
class DetecteurVictoire {
  static verifier(etatNiveau, positionsCibles)
  // retourne true si chaque position dans positionsCibles contient une caisse
}
```

**Detail de `verifier(etatNiveau, positionsCibles)` :**
1. Pour chaque `{ col, lig }` dans `positionsCibles` :
   - Si `etatNiveau.contientCaisse(col, lig)` est `false` → retourner `false`
2. Si toutes les cibles sont couvertes → retourner `true`

> **Alternative non retenue :** verifier que toutes les caisses sont sur des cibles. Cela donnerait le meme resultat si le nombre de caisses egal le nombre de cibles (ce qui est garanti dans un niveau Sokoban valide), mais la verification par cibles est semantiquement plus claire.

**Dependances :** aucune importation directe (recoit `etatNiveau` et `positionsCibles` en parametre)

### Verification
Avec un `EtatNiveau` simule, placer toutes les caisses sur les cibles → `verifier` retourne `true`. Deplacer une caisse → retourne `false`.

### Texte du commit
```
feat(sokoban): implementation de DetecteurVictoire — condition de fin

Classe stateless qui verifie si toutes les cibles sont couvertes par
une caisse. Respecte SRP : aucune logique de deplacement ou de rendu.
```

---

## Bloc 08 — Jeu (orchestrateur interne)

### Objectif
Creer la classe `Jeu` qui coordonne toutes les entites du jeu Sokoban. C'est le cerveau interne : il recoit les inputs clavier, valide les deplacements, cree les commandes, gere l'undo/redo, et verifie la victoire apres chaque coup.

### Fichier : `js/jeux/sokoban/Jeu.js`

**Constructeur (injection de dependances) :**
```js
constructor({ surVictoire, surCoupJoue, surAnnulation, surRetablissement } = {})
```

**Etat interne :**
- `this._niveau` : instance `Niveau` courante
- `this._joueur` : instance `Joueur`
- `this._etatNiveau` : instance `EtatNiveau`
- `this._gestionnaireCommandes` : instance `GestionnaireCommandes`
- `this._positionsCibles` : tableau extrait du niveau (cache pour la verification de victoire)
- `this._niveauCourant` : numero du niveau en cours
- `this._estTermine` : booleen, passe a `true` apres victoire

**Interface publique :**
```js
class Jeu {
  constructor({ surVictoire, surCoupJoue, surAnnulation, surRetablissement } = {})

  chargerNiveau(numero)         // charge un niveau et reinitialise l'etat
  deplacer(nomDirection)        // 'HAUT', 'BAS', 'GAUCHE', 'DROITE'
  annuler()                     // undo du dernier coup
  retablir()                    // redo du dernier coup annule
  reinitialiserNiveau()         // recharge le niveau courant depuis zero

  get nombreDeCoups()           // delegue a gestionnaireCommandes.nombreDeCoups
  get niveauCourant()           // numero du niveau en cours
  get estTermine()              // booleen
  get peutAnnuler()             // delegue
  get peutRetablir()            // delegue

  get etatNiveau()              // reference vers l'EtatNiveau (pour le rendu)
  get positionJoueur()          // delegue a joueur.position

  attacherClavier()             // ajoute le listener keydown
  detacherClavier()             // retire le listener keydown
  detruire()                    // nettoie tout
}
```

**Logique de `deplacer(nomDirection)` :**
1. Si `this._estTermine` → ne rien faire
2. Recuperer le vecteur de direction depuis `DIRECTIONS[nomDirection]`
3. Calculer `positionSuivante = joueur.calculerPositionSuivante(direction)`
4. Si `etatNiveau.estDansLimites(positionSuivante)` est `false` → ne rien faire
5. Si `etatNiveau.typeCellule(positionSuivante)` est `MUR` → ne rien faire
6. Si `etatNiveau.contientCaisse(positionSuivante)` :
   a. Calculer `positionDerriereCaisse = positionSuivante + direction`
   b. Si pas dans les limites OU `typeCellule` est `MUR` OU `contientCaisse` → ne rien faire
   c. Creer `CommandeDeplacer` avec positions joueur ET caisse
7. Sinon (sol ou cible libre) :
   a. Creer `CommandeDeplacer` avec positions joueur seulement (caisse = null)
8. Executer la commande via `gestionnaireCommandes.executerCommande(commande)`
9. Appeler le callback `surCoupJoue(this.nombreDeCoups)`
10. Verifier victoire via `DetecteurVictoire.verifier(etatNiveau, positionsCibles)`
11. Si victoire → `this._estTermine = true`, appeler `surVictoire(this.nombreDeCoups, this._niveauCourant)`

**Gestion clavier :**
```js
this._onKeyDown = (evenement) => {
  // Ctrl+Z → annuler
  if (evenement.ctrlKey && evenement.key === TOUCHE_ANNULER) {
    evenement.preventDefault();
    this.annuler();
    return;
  }
  // Ctrl+Y → retablir
  if (evenement.ctrlKey && evenement.key === TOUCHE_RETABLIR) {
    evenement.preventDefault();
    this.retablir();
    return;
  }
  // Touches de direction
  const direction = TOUCHES_DIRECTION[evenement.key];
  if (direction) {
    evenement.preventDefault();
    this.deplacer(direction);
  }
};
```

- `document.addEventListener('keydown', this._onKeyDown)` dans `attacherClavier()`
- `document.removeEventListener('keydown', this._onKeyDown)` dans `detacherClavier()`

**Dependances :** `Niveau`, `Joueur`, `EtatNiveau`, `GestionnaireCommandes`, `CommandeDeplacer`, `DetecteurVictoire`, `DIRECTIONS`, `TOUCHES_DIRECTION`, `TOUCHE_ANNULER`, `TOUCHE_RETABLIR` depuis les modules respectifs

### Verification
Charger le niveau 1. Envoyer des deplacements via `deplacer()`. Verifier que le joueur se deplace, que les caisses sont poussees, que l'undo revient en arriere. Tester un deplacement impossible (pousser une caisse dans un mur).

### Texte du commit
```
feat(sokoban): implementation de Jeu — orchestrateur principal

Coordination de toutes les entites (Niveau, Joueur, EtatNiveau,
GestionnaireCommandes, DetecteurVictoire). Validation des deplacements,
creation de commandes, undo/redo clavier (Ctrl+Z/Y), detection de
victoire apres chaque coup.
```

---

## Bloc 09 — JeuSokoban (adaptateur InterfaceJeu)

### Objectif
Creer la classe `JeuSokoban` qui etend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS.

### Fichier : `js/jeux/sokoban/JeuSokoban.js`

**Proprietes statiques :**
```js
static ID = 'sokoban';
static NOM = 'Sokoban';
static DESCRIPTION = 'Poussez les caisses sur les cibles en un minimum de coups. Undo/redo disponible.';
static ICONE = '📦';
static UTILISE_SCORES = true;
```

**Interface :**
```js
class JeuSokoban extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()       // Cree le DOM wrapper .jeu-sokoban, instancie Jeu, PlateauSokoban, SokobanUI
  demarrer()          // Charge le niveau 1 (ou le dernier selectionne), attache le clavier
  mettreEnPause()     // Detache le clavier, affiche overlay pause
  reprendre()         // Rattache le clavier, masque overlay pause
  arreter()           // Detache le clavier, marque comme termine
  detruire()          // Appelle arreter(), retire le DOM, null les references

  get etat()          // 'pret' | 'en_cours' | 'en_pause' | 'termine'
  get scoreActuel()   // { points: nombreDeCoups, niveau: niveauCourant, jeuId: 'sokoban' }
}
```

**Role :** adaptateur (pattern Adapter) entre l'orchestrateur interne `Jeu` et le contrat `InterfaceJeu` du shell. Le shell ne connait que `JeuSokoban`, jamais `Jeu` directement.

**Gestion du score :** dans le Sokoban, le score correspond au nombre de coups joues. Un score plus bas est meilleur. Le callback `surScoreChange` est appele a chaque coup et apres chaque undo/redo pour que le HUD se mette a jour.

**Dependances :** `InterfaceJeu` depuis `../../commun/InterfaceJeu.js`, `Jeu`, `PlateauSokoban`, `SokobanUI`

### Verification
Enregistrer `JeuSokoban` dans le routeur, naviguer vers `#sokoban`, verifier que le jeu se lance et que la navigation retour fonctionne sans fuite memoire.

### Texte du commit
```
feat(sokoban): implementation de JeuSokoban — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne Jeu et le contrat InterfaceJeu
du shell PlaygroundJS. Gere le cycle de vie (init, start, pause,
destroy). Score = nombre de coups (moins = mieux).
```

---

## Bloc 10 — PlateauSokoban (rendu DOM de la grille)

### Objectif
Creer la classe `PlateauSokoban` qui genere la grille HTML representant le niveau et met a jour les classes CSS a chaque coup pour refleter l'etat courant.

### Fichier : `js/jeux/sokoban/PlateauSokoban.js`

**Responsabilites :**
- Creer le conteneur `<div class="plateau-sokoban">` et ses cellules `<div class="cellule">`
- Stocker les references DOM dans un tableau 2D `this._cellules[lig][col]`
- Mettre a jour les classes CSS apres chaque deplacement sans recreer les elements DOM
- S'adapter a la taille du niveau (taille variable selon le niveau charge)

**Interface publique :**
```js
class PlateauSokoban {
  constructor(elementParent)

  creerGrille(etatNiveau)          // genere les cellules pour un nouveau niveau
  mettreAJour(etatNiveau, positionJoueur)  // met a jour les classes CSS
  detruire()                        // retire le conteneur du DOM
}
```

**Detail de `creerGrille(etatNiveau)` :**
1. Supprimer la grille precedente si elle existe
2. Creer `<div class="plateau-sokoban">`
3. Injecter la custom property CSS `--colonnes` avec `etatNiveau.largeur`
4. Pour chaque cellule `(col, lig)` de `0` a `hauteur-1` / `0` a `largeur-1` :
   - Creer un `<div class="cellule">`
   - Stocker la reference dans `this._cellules[lig][col]`
5. Inserer le conteneur dans `elementParent`

**Detail de `mettreAJour(etatNiveau, positionJoueur)` :**
1. Pour chaque cellule `(col, lig)` :
   a. Retirer toutes les classes d'etat (`CSS_MUR`, `CSS_SOL`, `CSS_CIBLE`, `CSS_CAISSE`, `CSS_CAISSE_CIBLE`, `CSS_JOUEUR`, `CSS_JOUEUR_CIBLE`)
   b. Lire `typeCellule = etatNiveau.typeCellule(col, lig)`
   c. Appliquer la classe de fond :
      - `MUR` → `CSS_MUR`
      - `SOL` → `CSS_SOL`
      - `CIBLE` → `CSS_CIBLE`
      - `VIDE` → aucune classe supplementaire (cellule invisible)
   d. Superposer les entites :
      - Si `etatNiveau.contientCaisse(col, lig)` ET `typeCellule === CIBLE` → `CSS_CAISSE_CIBLE`
      - Si `etatNiveau.contientCaisse(col, lig)` ET `typeCellule !== CIBLE` → `CSS_CAISSE`
      - Si `positionJoueur.col === col && positionJoueur.lig === lig` ET `typeCellule === CIBLE` → `CSS_JOUEUR_CIBLE`
      - Si `positionJoueur.col === col && positionJoueur.lig === lig` ET `typeCellule !== CIBLE` → `CSS_JOUEUR`

> **Optimisation possible (hors scope initial) :** ne mettre a jour que les cellules qui ont change (delta). Pour l'implementation initiale, le balayage complet est acceptable vu la taille reduite des niveaux Sokoban (generalement < 20x20).

**Dependances :** `CSS_CONTENEUR`, `CSS_CELLULE`, `CSS_MUR`, `CSS_SOL`, `CSS_CIBLE`, `CSS_CAISSE`, `CSS_CAISSE_CIBLE`, `CSS_JOUEUR`, `CSS_JOUEUR_CIBLE`, `TYPES_CELLULE` depuis `./constantesSokoban.js`

### Verification
Charger le niveau 1, instancier `PlateauSokoban`, appeler `creerGrille` puis `mettreAJour`. Inspecter le DOM : les cellules doivent avoir les bonnes classes CSS.

### Texte du commit
```
feat(sokoban): implementation de PlateauSokoban — rendu DOM de la grille

Grille de <div> adaptative a la taille du niveau. Mise a jour par
classes CSS sans recreer les elements DOM. Gestion des superpositions
(caisse sur cible, joueur sur cible).
```

---

## Bloc 11 — SokobanUI (HUD et interface utilisateur)

### Objectif
Creer la classe `SokobanUI` qui affiche le HUD (compteur de coups, boutons undo/redo, selecteur de niveau) et l'overlay de victoire.

### Fichier : `js/jeux/sokoban/ui/SokobanUI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu, plateauSokoban, {
  surRetourMenu,
  surChangementNiveau,
  surRejouer,
})
```

**Interface publique :**
```js
class SokobanUI {
  afficher()                              // injecte le HUD et le plateau
  masquer()                               // nettoie le DOM
  mettreAJourCoups(nombreDeCoups)         // met a jour l'affichage du compteur
  mettreAJourBoutonsUndoRedo(peutAnnuler, peutRetablir) // active/desactive les boutons
  afficherVictoire(nombreDeCoups, numeroNiveau)          // affiche l'overlay de victoire
  masquerVictoire()                       // masque l'overlay
}
```

**Structure HTML :**
```html
<div class="jeu-sokoban">
  <header class="hud-sokoban">
    <div class="hud-sokoban__info">
      <span class="hud-sokoban__niveau">Niveau 1 — Premier pas</span>
      <span class="hud-sokoban__coups">Coups : 0</span>
    </div>
    <div class="hud-sokoban__actions">
      <button class="btn--annuler" title="Annuler (Ctrl+Z)" disabled>↩ Annuler</button>
      <button class="btn--retablir" title="Retablir (Ctrl+Y)" disabled>↪ Retablir</button>
      <button class="btn--reinitialiser" title="Recommencer le niveau">🔄 Recommencer</button>
    </div>
    <div class="hud-sokoban__navigation">
      <select class="selecteur-niveau">
        <option value="1">Niveau 1 — Premier pas</option>
        <option value="2">Niveau 2 — Couloir</option>
        <!-- ... un <option> par niveau -->
      </select>
      <button class="btn--menu">Accueil</button>
    </div>
  </header>

  <div class="conteneur-plateau-sokoban">
    <!-- PlateauSokoban injecte la grille ici -->
  </div>
</div>
```

**Overlay de victoire :**
```html
<div class="overlay-victoire">
  <h2>Niveau termine !</h2>
  <p>Nombre de coups : X</p>
  <p>Meilleur score : Y coups</p>
  <div class="overlay-victoire__actions">
    <button class="btn--niveau-suivant">Niveau suivant</button>
    <button class="btn--rejouer">Rejouer ce niveau</button>
    <button class="btn--menu">Accueil</button>
  </div>
</div>
```

**Comportements :**
- **Selecteur de niveau :** sur `change`, appeler `surChangementNiveau(numero)` qui charge le nouveau niveau
- **Bouton Annuler :** appelle `jeu.annuler()`, desactive si `peutAnnuler === false`
- **Bouton Retablir :** appelle `jeu.retablir()`, desactive si `peutRetablir === false`
- **Bouton Recommencer :** appelle `jeu.reinitialiserNiveau()`
- **Bouton Niveau suivant :** charge le niveau `niveauCourant + 1` (si disponible)
- **Bouton Rejouer :** recharge le meme niveau
- **Bouton Accueil :** appelle `surRetourMenu()`

**Mise a jour du HUD apres chaque coup :**
Le `Jeu` appelle les callbacks qui declenchent :
1. `mettreAJourCoups(nombreDeCoups)` — affiche le compteur
2. `mettreAJourBoutonsUndoRedo(peutAnnuler, peutRetablir)` — active/desactive les boutons
3. Le `PlateauSokoban` est mis a jour par `JeuSokoban`

**Dependances :** `Niveau` (pour `listeNiveaux`), constantes CSS

### Verification
Afficher l'UI, verifier que le selecteur de niveau fonctionne, que les boutons undo/redo sont desactives au debut, que l'overlay de victoire s'affiche quand on complete un niveau.

### Texte du commit
```
feat(sokoban): implementation de SokobanUI — HUD et overlay de victoire

Interface utilisateur complete : compteur de coups, boutons undo/redo
avec etat actif/inactif, selecteur de niveau, bouton recommencer.
Overlay de victoire avec score et navigation vers le niveau suivant.
```

---

## Bloc 12 — SokobanScoresUI (tableau des scores)

### Objectif
Creer la classe `SokobanScoresUI` qui affiche les meilleurs scores par niveau pour le Sokoban. Dans ce jeu, le score correspond au nombre de coups : un score plus bas est meilleur.

### Fichier : `js/jeux/sokoban/ui/SokobanScoresUI.js`

**Constructeur :**
```js
constructor(elementConteneur, depotScores, gestionnaireProfils, { surRetour })
```

**Interface publique :**
```js
class SokobanScoresUI {
  afficher()   // injecte la vue dans elementConteneur
  masquer()    // vide elementConteneur
}
```

**Structure HTML :**
```html
<div class="scores-sokoban">
  <h2>Scores — Sokoban</h2>
  <div class="scores-filtres">
    <select class="filtre-niveau">
      <option value="tous">Tous les niveaux</option>
      <option value="1">Niveau 1</option>
      <!-- ... -->
    </select>
    <select class="filtre-profil">
      <option value="tous">Tous les joueurs</option>
      <!-- un <option> par profil -->
    </select>
  </div>
  <table class="scores-tableau">
    <thead>
      <tr>
        <th>Rang</th>
        <th>Joueur</th>
        <th>Niveau</th>
        <th>Coups</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody><!-- lignes dynamiques --></tbody>
  </table>
  <button class="btn--retour">Retour</button>
</div>
```

**Comportements :**
- Filtre par defaut sur `jeuId = 'sokoban'`
- Tri par nombre de coups croissant (meilleur score = moins de coups)
- Filtrage combinable par niveau et par profil
- Resolution `profilId → nom` via `gestionnaireProfils`
- Si aucun score : message "Aucun score enregistre"
- Un score est enregistre uniquement lorsqu'un niveau est complete (victoire)

**Format du score enregistre :**
```js
{
  jeuId: 'sokoban',
  profilId: '...',
  points: nombreDeCoups,    // moins = mieux
  niveau: numeroNiveau,
  date: new Date().toISOString(),
}
```

**Dependances :** `DepotScores`, `GestionnaireProfils`, `Niveau` (pour la liste des niveaux)

### Verification
Jouer et completer un niveau, verifier que le score est enregistre. Ouvrir le tableau des scores, verifier le tri croissant et le filtrage.

### Texte du commit
```
feat(sokoban): implementation de SokobanScoresUI — tableau des scores

Vue de classement par nombre de coups (croissant). Filtrage combinable
par niveau et par profil. Score enregistre uniquement a la victoire.
```

---

## Bloc 13 — CSS Sokoban (`css/jeux/sokoban.css`)

### Objectif
Ecrire les styles specifiques au jeu Sokoban, scopes sous `.jeu-sokoban`.

### Fichier : `css/jeux/sokoban.css`

**Organisation :**
```css
/* ===========================
   Sokoban — Styles du jeu
   Tous les selecteurs scopes sous .jeu-sokoban
   =========================== */

/* Conteneur principal */
.jeu-sokoban {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

/* --- HUD --- */
.jeu-sokoban .hud-sokoban {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 800px;
  padding: 0.5rem 1rem;
  background: var(--couleur-fond-hud, #2c3e50);
  color: var(--couleur-texte-hud, #ecf0f1);
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.jeu-sokoban .hud-sokoban__info {
  display: flex;
  gap: 1.5rem;
  font-weight: bold;
}

.jeu-sokoban .hud-sokoban__actions {
  display: flex;
  gap: 0.5rem;
}

.jeu-sokoban .hud-sokoban__navigation {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.jeu-sokoban .hud-sokoban__actions button,
.jeu-sokoban .hud-sokoban__navigation button {
  padding: 0.3rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: opacity 0.2s;
}

.jeu-sokoban .hud-sokoban__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Grille / Plateau --- */
.jeu-sokoban .plateau-sokoban {
  display: grid;
  grid-template-columns: repeat(var(--colonnes), var(--taille-cellule-sokoban, 40px));
  gap: 0;
  border: 2px solid var(--couleur-bordure, #34495e);
  background: var(--couleur-fond-exterieur, #1a1a2e);
}

/* --- Cellules --- */
.jeu-sokoban .cellule {
  width: var(--taille-cellule-sokoban, 40px);
  height: var(--taille-cellule-sokoban, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--taille-cellule-sokoban, 40px) * 0.6);
  transition: background-color 0.1s ease;
}

/* Cellule vide (hors du niveau) */
.jeu-sokoban .cellule:not([class*="cellule--"]) {
  background: transparent;
}

/* Mur */
.jeu-sokoban .cellule--mur {
  background: var(--couleur-mur, #5d4e37);
  border: 1px solid var(--couleur-mur-bordure, #3e3224);
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
}

/* Sol */
.jeu-sokoban .cellule--sol {
  background: var(--couleur-sol, #e8d5b7);
}

/* Cible */
.jeu-sokoban .cellule--cible {
  background: var(--couleur-sol, #e8d5b7);
  position: relative;
}

.jeu-sokoban .cellule--cible::after {
  content: '';
  width: 40%;
  height: 40%;
  border-radius: 50%;
  background: var(--couleur-cible, #e74c3c);
  opacity: 0.6;
}

/* Caisse */
.jeu-sokoban .cellule--caisse {
  background: var(--couleur-sol, #e8d5b7);
}

.jeu-sokoban .cellule--caisse::after {
  content: '';
  width: 75%;
  height: 75%;
  background: var(--couleur-caisse, #c0860e);
  border: 2px solid var(--couleur-caisse-bordure, #8b6508);
  border-radius: 4px;
}

/* Caisse sur cible (validee) */
.jeu-sokoban .cellule--caisse-cible {
  background: var(--couleur-sol, #e8d5b7);
}

.jeu-sokoban .cellule--caisse-cible::after {
  content: '';
  width: 75%;
  height: 75%;
  background: var(--couleur-caisse-validee, #27ae60);
  border: 2px solid var(--couleur-caisse-validee-bordure, #1e8449);
  border-radius: 4px;
}

/* Joueur */
.jeu-sokoban .cellule--joueur {
  background: var(--couleur-sol, #e8d5b7);
}

.jeu-sokoban .cellule--joueur::after {
  content: '';
  width: 65%;
  height: 65%;
  background: var(--couleur-joueur, #3498db);
  border-radius: 50%;
  border: 2px solid var(--couleur-joueur-bordure, #2171a5);
}

/* Joueur sur cible */
.jeu-sokoban .cellule--joueur-cible {
  background: var(--couleur-sol, #e8d5b7);
  position: relative;
}

.jeu-sokoban .cellule--joueur-cible::before {
  content: '';
  position: absolute;
  width: 40%;
  height: 40%;
  border-radius: 50%;
  background: var(--couleur-cible, #e74c3c);
  opacity: 0.3;
}

.jeu-sokoban .cellule--joueur-cible::after {
  content: '';
  width: 65%;
  height: 65%;
  background: var(--couleur-joueur, #3498db);
  border-radius: 50%;
  border: 2px solid var(--couleur-joueur-bordure, #2171a5);
  z-index: 1;
}

/* --- Selecteur de niveau --- */
.jeu-sokoban .selecteur-niveau {
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--couleur-bordure, #34495e);
  font-size: 0.85rem;
}

/* --- Overlay de victoire --- */
.jeu-sokoban .overlay-victoire {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  animation: apparitionOverlay 0.3s ease;
}

.jeu-sokoban .overlay-victoire h2 {
  font-size: 2rem;
  color: var(--couleur-caisse-validee, #27ae60);
  margin-bottom: 1rem;
}

.jeu-sokoban .overlay-victoire p {
  color: #ecf0f1;
  font-size: 1.2rem;
  margin: 0.3rem 0;
}

.jeu-sokoban .overlay-victoire__actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.jeu-sokoban .overlay-victoire__actions button {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.2s;
}

.jeu-sokoban .overlay-victoire__actions button:hover {
  transform: scale(1.05);
}

@keyframes apparitionOverlay {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* --- Scores --- */
.jeu-sokoban .scores-sokoban {
  max-width: 700px;
  margin: 0 auto;
  padding: 1rem;
}

.jeu-sokoban .scores-filtres {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.jeu-sokoban .scores-tableau {
  width: 100%;
  border-collapse: collapse;
}

.jeu-sokoban .scores-tableau th,
.jeu-sokoban .scores-tableau td {
  padding: 0.5rem 0.8rem;
  text-align: left;
  border-bottom: 1px solid var(--couleur-bordure, #34495e);
}

.jeu-sokoban .scores-tableau th {
  font-weight: bold;
  background: var(--couleur-fond-hud, #2c3e50);
  color: var(--couleur-texte-hud, #ecf0f1);
}
```

**Variables CSS utilisees :**
Les variables (`--couleur-mur`, `--couleur-sol`, etc.) permettent de changer le theme visuel facilement. Les valeurs par defaut donnent un rendu « entrepot en bois » classique.

**Note :** `--colonnes` et `--taille-cellule-sokoban` sont injectees depuis le JavaScript par `PlateauSokoban` via `style.setProperty()`.

### Texte du commit
```
feat(sokoban): styles CSS du jeu Sokoban

Grille DOM pilotee par custom properties JS. Cellules stylisees par
pseudo-elements (::after pour caisse/joueur, ::before pour cible sous
joueur). Overlay de victoire anime. Tous les selecteurs scopes sous
.jeu-sokoban. Variables CSS pour la personnalisation du theme.
```

---

## Bloc 14 — Integration finale et recette

### Objectif
Verifier le jeu Sokoban bout en bout dans le contexte PlaygroundJS, corriger les bugs d'integration, s'assurer que le cycle de vie est correctement gere.

### Checklist de recette

**Navigation :**
- [ ] Depuis l'accueil, cliquer sur la carte Sokoban → arrive sur le jeu
- [ ] Bouton "Accueil" / navigation retour → revient a l'accueil sans fuite memoire
- [ ] Re-naviguer vers Sokoban → le jeu repart de zero (niveau 1)

**Deplacement et regles :**
- [ ] Les 4 fleches + ZQSD fonctionnent
- [ ] Le joueur ne traverse pas les murs
- [ ] Le joueur pousse une caisse si la cellule derriere est libre
- [ ] Le joueur ne pousse pas une caisse si la cellule derriere est un mur
- [ ] Le joueur ne pousse pas une caisse si la cellule derriere contient une autre caisse
- [ ] Le joueur ne peut pas pousser deux caisses a la fois
- [ ] Le compteur de coups s'incremente a chaque deplacement reussi

**Undo/Redo :**
- [ ] Ctrl+Z annule le dernier coup (joueur revient, caisse aussi si poussee)
- [ ] Ctrl+Y retablit le coup annule
- [ ] Apres un undo suivi d'un nouveau coup, le redo n'est plus disponible
- [ ] Les boutons Annuler/Retablir sont desactives quand non disponibles
- [ ] Le compteur de coups se met a jour lors de l'undo/redo

**Niveaux :**
- [ ] Le selecteur de niveau charge le bon niveau
- [ ] Bouton "Recommencer" recharge le niveau courant (coups remis a zero)
- [ ] Les 12 niveaux sont jouables et completables
- [ ] Changement de niveau remet le compteur a zero et vide l'historique

**Victoire :**
- [ ] L'overlay de victoire s'affiche quand toutes les caisses sont sur les cibles
- [ ] Le nombre de coups est affiche dans l'overlay
- [ ] Bouton "Niveau suivant" charge le niveau suivant
- [ ] Bouton "Rejouer" recharge le meme niveau
- [ ] Apres victoire, les touches de direction ne font plus rien
- [ ] Si le dernier niveau est complete, "Niveau suivant" est desactive ou absent

**Rendu visuel :**
- [ ] Les murs, sols et cibles sont correctement affiches
- [ ] Les caisses sont visibles et distinctes
- [ ] Les caisses sur cible changent de couleur (vert au lieu de dore)
- [ ] Le joueur est visible et distinct
- [ ] Le joueur sur cible affiche les deux indicateurs

**Scores :**
- [ ] Score enregistre uniquement a la victoire (pas a l'abandon)
- [ ] Le score correspond au nombre de coups
- [ ] Le classement est trie par nombre de coups croissant (moins = mieux)
- [ ] Filtrage par niveau et par profil fonctionnel
- [ ] Meilleur score affiche dans l'overlay de victoire

**Cycle de vie :**
- [ ] `detruire()` retire tout le DOM sokoban de `#app`
- [ ] Aucun `keydown` listener ne reste apres `detruire()`
- [ ] Navigation vers un autre jeu puis retour → fonctionne sans bug

### Texte du commit
```
fix(sokoban): recette finale — corrections post-integration

Resolution des bugs decouverts lors de la recette bout en bout.
Verification de la navigation, du jeu, de l'undo/redo, de la
victoire et de la persistance des scores.
```

---

## Resume des dependances entre blocs

```
Bloc 01 (constantesSokoban)
  ├── Bloc 02 (Niveau)
  ├── Bloc 03 (Joueur)
  └── Bloc 10 (PlateauSokoban)

Bloc 02 (Niveau)
  └── Bloc 06 (EtatNiveau)

Bloc 03 (Joueur) + Bloc 06 (EtatNiveau)
  └── Bloc 04 (Commande)

Bloc 04 (Commande)
  └── Bloc 05 (GestionnaireCommandes)

Bloc 06 (EtatNiveau)
  └── Bloc 07 (DetecteurVictoire)

Blocs 02+03+04+05+06+07
  └── Bloc 08 (Jeu orchestrateur)

Bloc 08 + Shell (InterfaceJeu)
  └── Bloc 09 (JeuSokoban adaptateur)

Bloc 08 + Bloc 10 (PlateauSokoban)
  └── Bloc 11 (SokobanUI)

Bloc 09 + Shell (DepotScores, Score)
  └── Bloc 12 (SokobanScoresUI)

Blocs 09+10+11+12
  └── Bloc 13 (CSS)

Bloc 13
  └── Bloc 14 (Integration finale)
```

---

*Document cree le 2026-03-20. Maintenir a jour si des decisions d'architecture evoluent en cours de realisation.*

# DOCUMENTATION_SNAKE.md — Plan d'implémentation du jeu Snake

Ce document est le guide de réalisation du jeu Snake dans le cadre du projet PlaygroundJS. Chaque bloc est indépendant et correspond à un commit logique. Le projet peut être repris à n'importe quelle étape en consultant ce plan.

> **Prérequis :** la Phase 0 (Shell / Infrastructure) doit être implémentée avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

---

## Vue d'ensemble de la chaîne de commits

```
Bloc 01 — constantesSnake
Bloc 02 — Plateau (rendu DOM)
Bloc 03 — Serpent (entité)
Bloc 04 — Nourriture (entité)
Bloc 05 — DetecteurDeCollision
Bloc 06 — BoucleDeJeu
Bloc 07 — Jeu (orchestrateur interne)
Bloc 08 — JeuSnake (adaptateur InterfaceJeu)
Bloc 09 — SnakeUI (HUD)
Bloc 10 — DPad (contrôle mobile)
Bloc 11 — SnakeScoresUI (tableau des scores)
Bloc 12 — CSS Snake (mobile-first)
Bloc 13 — Intégration finale et recette
```

> **Note :** les blocs Profil, GestionnaireProfils, Score et DepotScores sont gérés par la Phase 0 (shell partagé). Ils ne sont plus spécifiques au Snake.

---

## Bloc 01 — constantesSnake

### Objectif
Centraliser toutes les valeurs numériques et chaînes de configuration spécifiques au Snake dans `js/jeux/snake/constantesSnake.js`. Aucun magic number ne doit apparaître dans le reste du code du snake.

### Fichier : `js/jeux/snake/constantesSnake.js`

```js
// Dimensions de la grille
export const COLONNES = 20;
export const LIGNES = 20;

// Vitesse de jeu (en millisecondes par tick)
export const VITESSE_INITIALE = 200;
export const ACCELERATION_PAR_NIVEAU = 10;
export const VITESSE_MINIMALE = 60;

// Scoring
export const POINTS_PAR_NOURRITURE = 10;
export const NOURRITURE_PAR_NIVEAU = 5;

// Directions (vecteurs [deltaColonne, deltaLigne])
export const DIRECTIONS = {
  HAUT:   { dc:  0, dl: -1, opposee: 'BAS'   },
  BAS:    { dc:  0, dl:  1, opposee: 'HAUT'  },
  GAUCHE: { dc: -1, dl:  0, opposee: 'DROITE'},
  DROITE: { dc:  1, dl:  0, opposee: 'GAUCHE'},
};

// Touches clavier
export const TOUCHES = {
  ArrowUp:    'HAUT',
  ArrowDown:  'BAS',
  ArrowLeft:  'GAUCHE',
  ArrowRight: 'DROITE',
  z: 'HAUT',
  s: 'BAS',
  q: 'GAUCHE',
  d: 'DROITE',
};

// Classes CSS des cellules
export const CSS_CELLULE         = 'cellule';
export const CSS_CELLULE_SERPENT = 'cellule--serpent';
export const CSS_CELLULE_TETE    = 'cellule--tete';
export const CSS_CELLULE_NOURR   = 'cellule--nourriture';
```

> Les clés localStorage (`CLE_PROFILS`, `CLE_SCORES`) ne sont plus ici. Elles sont gérées par `DepotLocal` du shell avec le namespace `playground_global`.

### Vérification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur.

### Texte du commit
```
feat(snake): constantes spécifiques au jeu Snake

Toutes les valeurs configurables du Snake (dimensions, vitesse, touches,
classes CSS) sont centralisées dans constantesSnake.js.
```

---

## Bloc 02 — Plateau (rendu DOM de la grille)

### Objectif
Créer la classe `Plateau` qui génère la grille HTML et expose des méthodes pour mettre à jour l'état visuel des cellules. Cette classe ne connaît pas le serpent ni la nourriture : elle reçoit uniquement des positions et des états.

### Fichier : `js/jeux/snake/Plateau.js`

**Responsabilités :**
- Créer le conteneur `<div id="plateau-snake">` et ses `LIGNES × COLONNES` cellules `<div class="cellule">`
- Stocker les références DOM dans un tableau 2D `this.cellules[ligne][colonne]`
- Exposer `mettreAJour(serpent, nourriture)` : retire toutes les classes d'état, puis réapplique celles qui correspondent aux positions actuelles

**Interface publique :**
```js
class Plateau {
  constructor(elementParent)        // injecte le plateau dans elementParent
  mettreAJour(serpent, nourriture)  // seule méthode appelée à chaque tick
  effacer()                          // retire toutes les classes d'état (utile en fin de partie)
  detruire()                         // retire le conteneur du DOM
}
```

**Règle de rendu :**
- Itérer sur `this.cellules` de façon exhaustive à chaque tick : retirer toutes les classes CSS d'état, puis les remettre selon le contenu actuel
- Ne jamais recréer les `<div>` : seulement manipuler `classList`
- La tête du serpent reçoit en plus la classe `cellule--tete` pour pouvoir être stylisée différemment

**Dépendances importées :**
- `COLONNES`, `LIGNES`, `CSS_CELLULE`, `CSS_CELLULE_SERPENT`, `CSS_CELLULE_TETE`, `CSS_CELLULE_NOURR` depuis `./constantesSnake.js`

### Vérification
Instancier `Plateau` avec un élément DOM et vérifier dans le DOM que la grille est présente (20×20 = 400 div).

### Texte du commit
```
feat(snake): implémentation de Plateau — rendu DOM de la grille

Génération de la grille LIGNES×COLONNES en <div> sans canvas.
Les états visuels (serpent, tête, nourriture) sont gérés par classes
CSS sans recréer les éléments DOM à chaque tick.
```

---

## Bloc 03 — Serpent (entité)

### Objectif
Créer la classe `Serpent` qui modélise l'état du serpent : ses segments, sa direction courante, et la logique de déplacement. Cette classe ne touche jamais au DOM.

### Fichier : `js/jeux/snake/Serpent.js`

**Représentation interne :**
- `this.segments` : tableau de positions `{ col, lig }`, index 0 = tête
- `this.direction` : clé de `DIRECTIONS` (ex : `'DROITE'`)
- `this.directionEnAttente` : direction demandée par le joueur, appliquée au prochain tick (évite l'inversion instantanée)
- `this.doitCroitre` : booléen, mis à `true` après avoir mangé

**Interface publique :**
```js
class Serpent {
  constructor()
  demanderDirection(nouvDir)        // valide et stocke la prochaine direction
  avancer()                          // calcule et applique le déplacement
  manger()                           // marque la croissance pour le prochain tick
  get tete()                         // retourne this.segments[0]
  get corps()                        // retourne this.segments (copie)
  get longueur()                     // retourne this.segments.length
  occupePosition(col, lig)          // vrai si un segment est à (col, lig)
  reinitialiser()                    // remet à l'état initial
}
```

**Règle de déplacement (`avancer`) :**
1. Appliquer `directionEnAttente` si elle n'est pas l'opposée de `direction`
2. Calculer la nouvelle tête = tête actuelle + vecteur de direction
3. `unshift` la nouvelle tête dans `segments`
4. Si `doitCroitre` est `false` : `pop` la queue. Sinon : laisser la queue et remettre `doitCroitre` à `false`

**Position initiale :**
- Tête au centre de la grille `{ col: Math.floor(COLONNES/2), lig: Math.floor(LIGNES/2) }`
- Longueur initiale : 3 segments alignés horizontalement vers la gauche
- Direction initiale : `DROITE`

**Dépendances :** `COLONNES`, `LIGNES`, `DIRECTIONS` depuis `./constantesSnake.js`

### Vérification
Tests unitaires manuels : créer un serpent, appeler `avancer()` plusieurs fois, vérifier que les positions progressent correctement. Tester `demanderDirection` avec une direction opposée : elle doit être ignorée.

### Texte du commit
```
feat(snake): implémentation de Serpent — entité et logique de déplacement

Modélisation du serpent (segments, direction, croissance) sans couplage
au DOM. Gestion du tampon de direction pour éviter l'inversion à 180°.
```

---

## Bloc 04 — Nourriture (entité)

### Objectif
Créer la classe `Nourriture` qui gère la position de la nourriture et son replacement aléatoire après avoir été mangée.

### Fichier : `js/jeux/snake/Nourriture.js`

**Interface publique :**
```js
class Nourriture {
  constructor()
  get position()                     // retourne { col, lig }
  replacer(positionsOccupees)        // génère une nouvelle position hors des positionsOccupees
}
```

**Règle de placement (`replacer`) :**
- Générer des positions aléatoires `{ col: random(0, COLONNES-1), lig: random(0, LIGNES-1) }` jusqu'à en trouver une qui n'est pas dans `positionsOccupees`
- `positionsOccupees` est le tableau des segments du serpent passé par l'appelant (injection, pas de couplage direct)

**Dépendances :** `COLONNES`, `LIGNES` depuis `./constantesSnake.js`

### Vérification
Instancier `Nourriture`, appeler `replacer` avec quelques positions, vérifier que la position retournée est libre.

### Texte du commit
```
feat(snake): implémentation de Nourriture — placement aléatoire

Entité nourriture avec replacement garanti hors des segments du serpent.
Aucun couplage direct : les positions occupées sont injectées par l'appelant.
```

---

## Bloc 05 — DetecteurDeCollision

### Objectif
Créer la classe `DetecteurDeCollision` qui regroupe toute la logique de collision. Cette classe est stateless : elle calcule à partir des données qu'on lui passe.

### Fichier : `js/jeux/snake/DetecteurDeCollision.js`

**Interface publique (méthodes statiques) :**
```js
class DetecteurDeCollision {
  static avecMur(position)                   // vrai si position hors grille
  static avecCorps(tete, segments)           // vrai si tête == l'un des segments suivants
  static avecNourriture(tete, posNourriture) // vrai si tête == position nourriture
}
```

**Détail `avecMur(position)` :**
- `position.col < 0 || position.col >= COLONNES || position.lig < 0 || position.lig >= LIGNES`

**Détail `avecCorps(tete, segments)` :**
- Parcourir `segments` à partir de l'index 1 (exclure la tête elle-même)
- Retourner `true` si `tete.col === seg.col && tete.lig === seg.lig`

**Détail `avecNourriture(tete, posNourriture)` :**
- `tete.col === posNourriture.col && tete.lig === posNourriture.lig`

**Dépendances :** `COLONNES`, `LIGNES` depuis `./constantesSnake.js`

### Vérification
Tests manuels avec des positions arbitraires.

### Texte du commit
```
feat(snake): implémentation de DetecteurDeCollision — logique de collision

Classe stateless pour les trois types de collision (mur, corps, nourriture).
Respecte SRP : aucune logique de jeu ou de rendu dans cette classe.
```

---

## Bloc 06 — BoucleDeJeu

### Objectif
Créer la classe `BoucleDeJeu` qui gère le timing des ticks. Elle est découplée de la logique du jeu : elle appelle simplement un callback à intervalle régulier.

### Fichier : `js/jeux/snake/BoucleDeJeu.js`

**Interface publique :**
```js
class BoucleDeJeu {
  constructor(callbackTick)           // fonction appelée à chaque tick
  demarrer(vitesse)                   // démarre setInterval avec la vitesse donnée
  arreter()                           // clearInterval
  changerVitesse(nouvelleVitesse)     // arrête et redémarre avec la nouvelle vitesse
  get enCours()                       // booléen
}
```

**Implémentation :**
- Utiliser `setInterval` / `clearInterval`
- `changerVitesse` doit `arreter()` puis `demarrer(nouvelleVitesse)` pour que l'effet soit immédiat
- Ne jamais appeler `demarrer` si la boucle est déjà en cours (protection contre les doubles démarrages)

**Pourquoi pas `requestAnimationFrame` :**
- `setInterval` est plus simple à contrôler pour un jeu au tick discret avec accélération progressive
- `requestAnimationFrame` est plus adapté aux animations continues 60fps — hors scope ici

### Vérification
Instancier `BoucleDeJeu` avec `() => console.log('tick')`, démarrer à 500ms, vérifier les logs, arrêter.

### Texte du commit
```
feat(snake): implémentation de BoucleDeJeu — gestion du timing

Encapsulation de setInterval avec démarrage/arrêt/changement de vitesse.
Le callback de tick est injecté, BoucleDeJeu ne connaît pas la logique du jeu.
```

---

## Bloc 07 — Jeu (orchestrateur interne)

### Objectif
Créer la classe `Jeu` qui coordonne toutes les entités du jeu Snake. C'est le cerveau interne : il réagit aux inputs clavier, pilote la boucle, applique les règles à chaque tick, et notifie l'extérieur des événements.

### Fichier : `js/jeux/snake/Jeu.js`

**Constructeur (injection de dépendances) :**
```js
constructor(elementConteneur, { surFinDePartie, surScoreChange } = {})
```
- Instancie en interne : `Plateau`, `Serpent`, `Nourriture`, `BoucleDeJeu`, `DetecteurDeCollision`
- Enregistre les callbacks `surFinDePartie(score, niveau)` et `surScoreChange(score, niveau)`

**État interne :**
- `this.score` : entier, commence à 0
- `this.niveau` : entier, commence à 1
- `this.nourrituresMangees` : compteur pour calculer le passage de niveau

**Interface publique :**
```js
demarrer()       // réinitialise l'état et lance la boucle
mettreEnPause()  // arrête/reprend la boucle sans réinitialiser
arreter()        // arrête la boucle et détache les listeners clavier
```

**Logique du tick (`_tick` privé) :**
1. Récupérer la direction en attente et l'appliquer via `serpent.demanderDirection`
2. Avancer le serpent : `serpent.avancer()`
3. Vérifier collision mur → si oui : `_terminerPartie()`
4. Vérifier collision corps → si oui : `_terminerPartie()`
5. Vérifier collision nourriture → si oui :
   - `serpent.manger()`
   - Incrémenter `score` et `nourrituresMangees`
   - `nourriture.replacer(serpent.corps)`
   - Vérifier passage de niveau → si oui : incrémenter `niveau`, accélérer la boucle
   - Appeler `surScoreChange(score, niveau)`
6. Mettre à jour le plateau : `plateau.mettreAJour(serpent, nourriture)`

**Gestion clavier :**
- `document.addEventListener('keydown', this._onKeyDown)` dans `demarrer()`
- `document.removeEventListener('keydown', this._onKeyDown)` dans `arreter()`
- `this._onKeyDown` est une arrow function stockée comme propriété pour permettre le `removeEventListener`

**Calcul du niveau :**
- `niveau = 1 + Math.floor(nourrituresMangees / NOURRITURE_PAR_NIVEAU)`
- Vitesse = `Math.max(VITESSE_MINIMALE, VITESSE_INITIALE - (niveau - 1) * ACCELERATION_PAR_NIVEAU)`

**Dépendances :** `Plateau`, `Serpent`, `Nourriture`, `BoucleDeJeu`, `DetecteurDeCollision`, constantes depuis `./constantesSnake.js`

### Vérification
Instancier `Jeu` avec un élément DOM et des callbacks console. Vérifier que le snake bouge, mange, et que la fin de partie est détectée.

### Texte du commit
```
feat(snake): implémentation de Jeu — orchestrateur principal

Coordination de toutes les entités du jeu (serpent, plateau, boucle,
collisions). Gestion du score, des niveaux et des inputs clavier.
Les callbacks permettent au code UI de réagir aux événements de jeu.
```

---

## Bloc 08 — JeuSnake (adaptateur InterfaceJeu)

### Objectif
Créer la classe `JeuSnake` qui étend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS.

### Fichier : `js/jeux/snake/JeuSnake.js`

**Propriétés statiques :**
```js
static ID = 'snake';
static NOM = 'Snake';
static DESCRIPTION = 'Guidez le serpent, mangez et grandissez sans toucher les murs ni votre propre corps.';
static ICONE = '🐍';
static UTILISE_SCORES = true;
```

**Interface :**
```js
class JeuSnake extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()       // Crée le DOM wrapper .jeu-snake, instancie Jeu en interne
  demarrer()          // Délègue à this.jeu.demarrer()
  mettreEnPause()     // Délègue à this.jeu.mettreEnPause()
  reprendre()         // Délègue à this.jeu.demarrer() (reprend)
  arreter()           // Délègue à this.jeu.arreter()
  detruire()          // Appelle arreter(), retire le DOM, null les références

  get scoreActuel()   // { points: this.jeu.score, niveau: this.jeu.niveau, jeuId: 'snake' }
}
```

**Rôle :** c'est un adaptateur (pattern Adapter) entre l'orchestrateur interne `Jeu` (qui garde sa logique métier intacte) et le contrat `InterfaceJeu` attendu par le shell. Le shell ne connaît que `JeuSnake`, jamais `Jeu` directement.

### Vérification
Enregistrer `JeuSnake` dans le routeur, naviguer vers `#snake`, vérifier que le jeu se lance et que la navigation retour fonctionne.

### Texte du commit
```
feat(snake): implémentation de JeuSnake — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne Jeu et le contrat InterfaceJeu
du shell PlaygroundJS. Gère le cycle de vie (init, start, pause, destroy).
```

---

## Bloc 09 — SnakeUI (HUD en cours de partie)

### Objectif
Créer la classe `SnakeUI` qui affiche le HUD pendant la partie (score, niveau, pause) et l'écran de fin de partie.

### Fichier : `js/jeux/snake/ui/SnakeUI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu, depotScores, profilActif, { surRetourMenu, surRejouer })
```

**Interface publique :**
```js
afficher()                         // injecte le HUD et démarre la partie
masquer()                          // nettoie et arrête la partie
mettreAJourScore(score, niveau)    // appelé par le callback surScoreChange du Jeu
afficherFinDePartie(score, niveau) // appelé par surFinDePartie
```

**Structure HTML du HUD :**
```html
<div class="jeu-snake">
  <header class="hud">
    <span class="hud__profil">NomDuJoueur</span>
    <span class="hud__score">Score : 0</span>
    <span class="hud__niveau">Niveau : 1</span>
    <button class="hud__pause">Pause</button>
  </header>
  <div id="conteneur-plateau-snake"></div>
</div>
```

**Écran de fin de partie (superposition) :**
```html
<div class="overlay-fin">
  <h2>Game Over</h2>
  <p>Score : X — Niveau : Y</p>
  <p>Meilleur score : Z</p>
  <button class="btn--rejouer">Rejouer</button>
  <button class="btn--menu">Accueil</button>
</div>
```

**Comportements :**
- `afficherFinDePartie` : enregistre le score via `depotScores.ajouterScore(...)`, affiche l'overlay avec le meilleur score
- Bouton "Rejouer" : réinitialise le jeu sans revenir à l'accueil
- Bouton "Pause" : appelle `jeu.mettreEnPause()`, change le label en "Reprendre"

**Comportement mobile :**
- Instancie `DPad` et l'injecte dans `.jeu-snake` sous le plateau
- Passe `(dir) => jeu._onDirection(dir)` comme callback — la même logique que `keydown`

**Dépendances :** `Jeu`, `DepotScores`, `Score`, `DPad`

### Texte du commit
```
feat(snake): implémentation de SnakeUI — HUD et écran de fin de partie

Affichage du score et du niveau en temps réel. Écran de fin avec
enregistrement automatique du score et affichage du meilleur score.
Intègre DPad pour le contrôle mobile.
```

---

## Bloc 10 — DPad (contrôle mobile)

### Objectif
Créer la classe `DPad` qui affiche un pavé directionnel on-screen pour les appareils tactiles. Le DPad est la seule source d'input mobile : il traduit les `touchstart` en appels de direction vers l'orchestrateur. Il est toujours présent dans le DOM ; le CSS le masque sur desktop.

### Fichier : `js/jeux/snake/ui/DPad.js`

**Constructeur :**
```js
constructor(elementConteneur, callbackDirection)
// callbackDirection(direction) est appelé à chaque appui, ex : callbackDirection('HAUT')
```

**Interface publique :**
```js
class DPad {
  constructor(elementConteneur, callbackDirection)
  afficher()   // injecte le HTML dans elementConteneur et attache les écouteurs
  detruire()   // retire le DOM et détache les écouteurs
}
```

**Structure HTML générée :**
```html
<div class="dpad">
  <button class="dpad__btn dpad__btn--haut"   aria-label="Haut">▲</button>
  <div class="dpad__milieu">
    <button class="dpad__btn dpad__btn--gauche" aria-label="Gauche">◀</button>
    <button class="dpad__btn dpad__btn--droite" aria-label="Droite">▶</button>
  </div>
  <button class="dpad__btn dpad__btn--bas"    aria-label="Bas">▼</button>
</div>
```

**Comportements :**
- Utiliser `touchstart` (pas `click`) pour éviter le délai de 300 ms sur mobile
- `preventDefault()` sur chaque `touchstart` pour bloquer le scroll accidentel
- Stocker les références des écouteurs pour les retirer proprement dans `detruire()`
- Aucune connaissance de `Jeu` ou `Serpent` : communication uniquement via le callback injecté

**Dépendances :** aucune (classe autonome)

### Texte du commit
```
feat(snake): implémentation de DPad — contrôle mobile on-screen

Pavé directionnel tactile pour Snake. Utilise touchstart (sans délai 300ms)
et preventDefault pour éviter le scroll. Masqué sur desktop via CSS media query.
```

---

## Bloc 11 — SnakeScoresUI (tableau des scores)

### Objectif
Créer la classe `SnakeScoresUI` qui affiche les scores spécifiques au Snake.

### Fichier : `js/jeux/snake/ui/SnakeScoresUI.js`

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
  <h2>Scores — Snake</h2>
  <div class="scores-filtres">
    <button class="filtre--tous actif">Classement général</button>
    <!-- un bouton par profil -->
  </div>
  <table class="scores-tableau">
    <thead>
      <tr><th>Rang</th><th>Joueur</th><th>Score</th><th>Niveau</th><th>Date</th></tr>
    </thead>
    <tbody><!-- lignes dynamiques --></tbody>
  </table>
  <button class="btn--retour">Retour</button>
</div>
```

**Comportements :**
- Filtre par défaut sur `jeuId = 'snake'`
- Résolution `profilId → nom` via `gestionnaireProfils`
- Si aucun score : message "Aucun score enregistré"

### Texte du commit
```
feat(snake): implémentation de SnakeScoresUI — tableau des scores Snake

Vue de classement filtré par jeu Snake avec filtrage par profil.
Résolution des noms depuis les ids stockés.
```

---

## Bloc 12 — CSS Snake mobile-first (`css/jeux/snake.css`)

### Objectif
Écrire les styles spécifiques au jeu Snake, scopés sous `.jeu-snake`, en **mobile-first** : les styles de base ciblent les petits écrans, les surcharges desktop sont dans `@media (min-width: 640px)`.

### Fichier : `css/jeux/snake.css`

**Organisation :**
```css
/* ── Conteneur principal (mobile : colonne centrée) ── */
.jeu-snake {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espace-md);
  padding: var(--espace-sm);
}

/* ── Grille (mobile : cellules en vmin pour s'adapter à l'écran) ── */
.jeu-snake #plateau-snake {
  display: grid;
  grid-template-columns: repeat(var(--colonnes), 1fr);
  width: min(90vmin, 480px);
  height: min(90vmin, 480px);
  gap: 1px;
}

/* ── Cellules et états ── */
.jeu-snake .cellule            { /* fond neutre, transition couleur */ }
.jeu-snake .cellule--serpent   { /* couleur corps */ }
.jeu-snake .cellule--tete      { /* couleur tête, plus vive */ }
.jeu-snake .cellule--nourriture { /* couleur nourriture, animation pulse */ }

/* ── HUD ── */
.jeu-snake .hud { /* flexbox space-between, font-size adapté mobile */ }

/* ── D-Pad (visible sur mobile, masqué sur desktop) ── */
.dpad {
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  justify-items: center;
  gap: var(--espace-xs);
  margin-top: var(--espace-sm);
}
.dpad__milieu   { display: flex; gap: var(--espace-xs); }
.dpad__btn      { /* bouton carré tactile, min 48×48 px (cible WCAG) */ }

/* ── Overlay fin de partie ── */
.jeu-snake .overlay-fin { /* superposition semi-transparente, contenu centré */ }

/* ── Surcharges desktop ── */
@media (min-width: 640px) {
  .dpad { display: none; } /* clavier suffit sur desktop */
}
```

**Note :** `--colonnes` est injectée depuis JS via `this._conteneur.style.setProperty('--colonnes', COLONNES)`. La grille utilise `min(90vmin, 480px)` pour s'adapter à tous les écrans sans valeur fixe.

### Texte du commit
```
feat(snake): styles CSS Snake — mobile-first avec D-pad

Grille responsive via vmin, D-pad visible sur mobile et masqué sur desktop.
Tous les sélecteurs scopés sous .jeu-snake. Cibles tactiles ≥ 48px (WCAG).
```

---

## Bloc 13 — Intégration finale et recette

### Objectif
Vérifier le jeu Snake bout en bout dans le contexte PlaygroundJS, corriger les bugs d'intégration.

### Checklist de recette

**Navigation :**
- [ ] Depuis l'accueil, cliquer sur la carte Snake → arrive sur le jeu
- [ ] Bouton "Accueil" / navigation retour → revient à l'accueil sans fuite mémoire
- [ ] Re-naviguer vers Snake → le jeu repart de zéro

**Jeu :**
- [ ] Le serpent avance tout seul au démarrage
- [ ] Les 4 flèches + ZQSD fonctionnent
- [ ] On ne peut pas faire demi-tour instantané
- [ ] Manger la nourriture : score +10, serpent grandit
- [ ] Nourriture ne réapparaît jamais sur le serpent
- [ ] Niveau augmente tous les `NOURRITURE_PAR_NIVEAU` repas
- [ ] La vitesse augmente à chaque niveau
- [ ] Collision mur → game over
- [ ] Collision corps → game over
- [ ] Pause/Reprendre fonctionne
- [ ] Rejouer réinitialise score et serpent

**Scores :**
- [ ] Score enregistré après chaque partie avec `jeuId = 'snake'`
- [ ] Classement Snake correct
- [ ] Filtrage par profil correct
- [ ] Meilleur score affiché dans l'overlay fin de partie

**Cycle de vie :**
- [ ] `detruire()` retire tout le DOM snake de `#app`
- [ ] Aucun `setInterval` ne continue après `detruire()`
- [ ] Aucun `keydown` listener ne reste après `detruire()`
- [ ] Aucun `touchstart` listener ne reste après `detruire()`

**Mobile :**
- [ ] La grille s'affiche correctement sur un écran 375 px (iPhone SE)
- [ ] Les 4 boutons du D-pad sont visibles et utilisables (min 48×48 px)
- [ ] Le D-pad pilote le serpent correctement (touchstart sans délai)
- [ ] Aucun scroll accidentel lors de l'appui sur le D-pad
- [ ] Le D-pad est masqué sur desktop (≥ 640 px)

### Texte du commit
```
fix(snake): recette finale — corrections post-intégration

Résolution des bugs découverts lors de la recette bout en bout.
Vérification de la navigation, du jeu et de la persistance.
```

---

## Résumé des dépendances entre blocs

```
Bloc 01 (constantesSnake)
  ├── Bloc 02 (Plateau)
  ├── Bloc 03 (Serpent)
  ├── Bloc 04 (Nourriture)
  ├── Bloc 05 (DetecteurDeCollision)
  └── Bloc 06 (BoucleDeJeu)

Blocs 02+03+04+05+06
  └── Bloc 07 (Jeu orchestrateur)

Bloc 07 + Shell (InterfaceJeu)
  └── Bloc 08 (JeuSnake adaptateur)

Bloc 10 (DPad) — autonome, pas de dépendance métier

Bloc 07 + Shell (DepotScores, Score) + Bloc 10 (DPad)
  └── Bloc 09 (SnakeUI)

Shell (DepotScores, GestionnaireProfils)
  └── Bloc 11 (SnakeScoresUI)

Blocs 08+09+10+11
  └── Bloc 12 (CSS mobile-first)

Bloc 12
  └── Bloc 13 (Intégration finale)
```

---

*Document migré depuis DOCUMENTATION.md le 2026-03-20. Adapté à l'architecture multi-jeux PlaygroundJS.*

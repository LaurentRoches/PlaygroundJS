# DOCUMENTATION_MEMORY.md — Plan d'implémentation du jeu Memory

Ce document est le guide de réalisation du jeu Memory dans le cadre du projet PlaygroundJS. Chaque bloc est indépendant et correspond à un commit logique. Le projet peut être repris à n'importe quelle étape en consultant ce plan.

> **Prérequis :** la Phase 0 (Shell / Infrastructure) doit être implémentée avant de commencer ce jeu. Voir `PLAN_GLOBAL.md`.

---

## Vue d'ensemble de la chaîne de commits

```
Bloc 01 — constantesMemory
Bloc 02 — Carte (modèle de données)
Bloc 03 — PlateauMemory (rendu DOM avec flip CSS 3D)
Bloc 04 — MoteurDeJeu (logique de comparaison des paires)
Bloc 05 — Chronometre (suivi du temps écoulé)
Bloc 06 — Jeu (orchestrateur interne)
Bloc 07 — JeuMemory (adaptateur InterfaceJeu)
Bloc 08 — MemoryUI (HUD en cours de partie)
Bloc 09 — MemoryScoresUI (tableau des scores)
Bloc 10 — CSS Memory (styles 3D, grille, animations)
Bloc 11 — Intégration finale et recette
```

> **Note :** les blocs Profil, GestionnaireProfils, Score et DepotScores sont gérés par la Phase 0 (shell partagé). Ils ne sont plus spécifiques au Memory.

---

## Bloc 01 — constantesMemory

### Objectif
Centraliser toutes les valeurs numériques et chaînes de configuration spécifiques au Memory dans `js/jeux/memory/constantesMemory.js`. Aucun magic number ne doit apparaître dans le reste du code du memory.

### Fichier : `js/jeux/memory/constantesMemory.js`

```js
// Niveaux de difficulté : { colonnes, lignes, paires }
export const DIFFICULTES = Object.freeze({
  FACILE:    { colonnes: 4, lignes: 3, paires: 6,  nom: 'Facile'    },
  NORMAL:    { colonnes: 4, lignes: 4, paires: 8,  nom: 'Normal'    },
  DIFFICILE: { colonnes: 6, lignes: 4, paires: 12, nom: 'Difficile' },
});

export const DIFFICULTE_PAR_DEFAUT = 'NORMAL';

// Timing (en millisecondes)
export const DUREE_AFFICHAGE_PAIRE_INCORRECTE = 1000;
export const DUREE_ANIMATION_FLIP = 600;
export const INTERVALLE_CHRONOMETRE = 1000;

// Scoring
export const POINTS_PAR_PAIRE = 100;
export const BONUS_TEMPS_BASE = 5000;
export const PENALITE_ERREUR = 10;
export const SEUIL_TEMPS_BONUS = 120;  // au-delà de 120s, pas de bonus temps

// Symboles pour les faces des cartes (emojis)
export const SYMBOLES = [
  '🍎', '🍋', '🍇', '🍒', '🍓', '🥝',
  '🌻', '🌈', '⭐', '🎵', '🔥', '💎',
];

// Classes CSS
export const CSS_PLATEAU           = 'plateau-memory';
export const CSS_CARTE             = 'carte';
export const CSS_CARTE_INTERIEUR   = 'carte__interieur';
export const CSS_CARTE_FACE        = 'carte__face';
export const CSS_CARTE_DOS         = 'carte__dos';
export const CSS_CARTE_RETOURNEE   = 'carte--retournee';
export const CSS_CARTE_TROUVEE     = 'carte--trouvee';
export const CSS_CARTE_VERROUILLEE = 'carte--verrouillee';
```

> Les clés localStorage sont gérées par `DepotLocal` du shell avec le namespace `playground_global`.

### Vérification
Importer une constante dans un fichier de test, l'afficher en console. Pas d'erreur d'import.

### Texte du commit
```
feat(memory): constantes spécifiques au jeu Memory

Toutes les valeurs configurables du Memory (difficultés, timing, scoring,
symboles, classes CSS) sont centralisées dans constantesMemory.js.
```

---

## Bloc 02 — Carte (modèle de données)

### Objectif
Créer la classe `Carte` qui modélise une carte individuelle du jeu Memory. Cette classe est un modèle de données pur : elle ne touche jamais au DOM.

### Fichier : `js/jeux/memory/Carte.js`

**Représentation interne :**
- `this.id` : identifiant unique de la carte (entier, ex : 0 à 15 pour 8 paires)
- `this.idPaire` : identifiant de la paire (deux cartes partagent le même `idPaire`)
- `this.symbole` : chaîne affichée sur la face (emoji)
- `this.estRetournee` : booléen, `true` quand la carte montre sa face
- `this.estTrouvee` : booléen, `true` quand la paire a été trouvée

**Interface publique :**
```js
class Carte {
  constructor(id, idPaire, symbole)

  retourner()                // bascule estRetournee à true
  masquer()                  // bascule estRetournee à false
  marquerTrouvee()           // met estTrouvee à true et estRetournee à true (reste visible)
  correspondA(autreCarte)    // retourne true si this.idPaire === autreCarte.idPaire

  get id()
  get idPaire()
  get symbole()
  get estRetournee()
  get estTrouvee()

  reinitialiser()            // remet estRetournee et estTrouvee à false
}
```

**Règles :**
- `retourner()` ne fait rien si `estTrouvee` est `true` (une carte trouvée reste visible)
- `masquer()` ne fait rien si `estTrouvee` est `true`
- `correspondA(autreCarte)` compare uniquement `idPaire`, jamais `id` (deux cartes de la même paire ont des `id` différents mais le même `idPaire`)

**Dépendances :** aucune

### Vérification
Créer deux cartes avec le même `idPaire`, vérifier que `correspondA` retourne `true`. Tester `retourner` / `masquer` / `marquerTrouvee`. Vérifier qu'une carte trouvée ne peut pas être masquée.

### Texte du commit
```
feat(memory): implémentation de Carte — modèle de données

Classe pure représentant une carte avec id, paire, symbole et états
(retournée, trouvée). Aucun couplage au DOM.
```

---

## Bloc 03 — PlateauMemory (rendu DOM avec flip CSS 3D)

### Objectif
Créer la classe `PlateauMemory` qui génère la grille de cartes en HTML et gère le rendu visuel des retournements via des classes CSS (flip 3D). Cette classe ne connaît pas les règles du jeu : elle reçoit des ordres d'affichage.

### Fichier : `js/jeux/memory/PlateauMemory.js`

**Responsabilités :**
- Créer le conteneur `<div class="plateau-memory">` avec la grille CSS adaptée à la difficulté
- Générer les éléments DOM de chaque carte (structure 3D : conteneur, intérieur, face, dos)
- Stocker les références DOM dans une `Map<idCarte, HTMLElement>`
- Exposer un callback `surClicCarte(idCarte)` pour notifier le clic sur une carte
- Mettre à jour l'état visuel des cartes selon leur état (retournée, trouvée)

**Structure HTML d'une carte :**
```html
<div class="carte" data-id="0">
  <div class="carte__interieur">
    <div class="carte__dos">?</div>
    <div class="carte__face">🍎</div>
  </div>
</div>
```

La structure 3D fonctionne ainsi :
- `.carte` : conteneur avec `perspective` (défini en CSS)
- `.carte__interieur` : enfant avec `transform-style: preserve-3d` et `transition: transform`
- `.carte__dos` et `.carte__face` : positionnées en absolu l'une sur l'autre, avec `backface-visibility: hidden`
- `.carte__face` est pré-tournée à `rotateY(180deg)` dans son état initial
- Ajouter `.carte--retournee` applique `transform: rotateY(180deg)` sur `.carte__interieur`, ce qui montre la face et cache le dos

**Interface publique :**
```js
class PlateauMemory {
  constructor(elementParent, difficulte)

  creer(cartes)                          // génère le DOM complet à partir du tableau de Carte
  mettreAJourCarte(idCarte, carte)       // synchronise la classe CSS avec l'état de la Carte
  verrouillerTout()                      // ajoute CSS_CARTE_VERROUILLEE à toutes les cartes (bloque les clics)
  deverrouillerTout()                    // retire CSS_CARTE_VERROUILLEE
  effacer()                              // retire toutes les classes d'état
  detruire()                             // retire le conteneur du DOM, supprime les event listeners

  surClicCarte = null                    // callback : (idCarte) => {}
}
```

**Mélange Fisher-Yates :**
Le tableau de cartes est mélangé avant le rendu DOM. La méthode de mélange est une fonction utilitaire interne (pas exportée) :

```js
function melangerFisherYates(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
```

**Règles de rendu :**
- La grille utilise CSS Grid avec `grid-template-columns: repeat(colonnes, 1fr)` injecté dynamiquement via une custom property `--colonnes-memory`
- Ne jamais recréer les éléments DOM après la création initiale : seulement manipuler `classList`
- Le verrouillage empêche les clics via `pointer-events: none` en CSS (via la classe `carte--verrouillee`)
- Le callback `surClicCarte` n'est pas déclenché si la carte est déjà retournée ou trouvée

**Gestion des événements :**
- Un seul `addEventListener('click', ...)` sur le conteneur plateau (délégation d'événements)
- Le handler remonte via `event.target.closest('.carte')` pour identifier la carte cliquée
- Extraire `data-id` de l'élément pour obtenir l'identifiant

**Dépendances importées :**
- `CSS_PLATEAU`, `CSS_CARTE`, `CSS_CARTE_INTERIEUR`, `CSS_CARTE_FACE`, `CSS_CARTE_DOS`, `CSS_CARTE_RETOURNEE`, `CSS_CARTE_TROUVEE`, `CSS_CARTE_VERROUILLEE` depuis `./constantesMemory.js`

### Vérification
Instancier `PlateauMemory` avec un tableau de cartes créées manuellement. Vérifier dans le DOM que la grille apparaît, que cliquer sur une carte déclenche le callback, et que l'ajout/retrait de la classe `carte--retournee` produit l'animation de retournement 3D.

### Texte du commit
```
feat(memory): implémentation de PlateauMemory — rendu DOM et flip CSS 3D

Grille DOM responsive avec structure 3D par carte (perspective, preserve-3d,
backface-visibility). Mélange Fisher-Yates. Délégation d'événements clic.
Les états visuels sont gérés par classes CSS sans recréer les éléments.
```

---

## Bloc 04 — MoteurDeJeu (logique de comparaison des paires)

### Objectif
Créer la classe `MoteurDeJeu` qui encapsule toute la logique du Memory : sélection d'une carte, comparaison de deux cartes retournées, détection paire trouvée / erreur, et verrouillage temporaire pendant l'animation. Cette classe ne touche jamais au DOM.

### Fichier : `js/jeux/memory/MoteurDeJeu.js`

**Représentation interne :**
- `this.cartes` : tableau de `Carte` (toutes les cartes du jeu)
- `this.cartesRetournees` : tableau temporaire (max 2 cartes retournées en attente de comparaison)
- `this.pairesRestantes` : entier, compte à rebours des paires non trouvées
- `this.nombreErreurs` : entier, compteur de comparaisons échouées
- `this.estVerrouille` : booléen, `true` pendant l'animation de flip back (empêche tout clic)

**Interface publique :**
```js
class MoteurDeJeu {
  constructor(nombrePaires, symboles)

  get cartes()                           // retourne le tableau de cartes (copie)
  get pairesRestantes()
  get pairesTotales()
  get nombreErreurs()
  get estTermine()                       // pairesRestantes === 0
  get estVerrouille()

  selectionnerCarte(idCarte)             // logique principale (voir ci-dessous)
  reinitialiser()                        // recrée les cartes, remet les compteurs à zéro

  // Callbacks (assignés par l'orchestrateur)
  surCarteRetournee = null               // (carte) => {}
  surPaireTrouvee = null                 // (carte1, carte2) => {}
  surPaireIncorrecte = null              // (carte1, carte2) => {}
  surPartieTerminee = null               // () => {}
}
```

**Logique de `selectionnerCarte(idCarte)` :**

1. Si `estVerrouille` est `true` → ignorer (on attend la fin de l'animation)
2. Récupérer la carte par `idCarte` dans `this.cartes`
3. Si la carte est déjà retournée ou trouvée → ignorer
4. Retourner la carte : `carte.retourner()`
5. Appeler `surCarteRetournee(carte)` pour que le plateau mette à jour le visuel
6. Ajouter la carte à `cartesRetournees`
7. Si `cartesRetournees.length < 2` → fin (on attend la deuxième carte)
8. Si `cartesRetournees.length === 2` :
   a. Récupérer `carte1 = cartesRetournees[0]`, `carte2 = cartesRetournees[1]`
   b. Si `carte1.correspondA(carte2)` — **paire trouvée** :
      - `carte1.marquerTrouvee()` et `carte2.marquerTrouvee()`
      - Décrémenter `pairesRestantes`
      - Appeler `surPaireTrouvee(carte1, carte2)`
      - Si `estTermine` → appeler `surPartieTerminee()`
      - Vider `cartesRetournees`
   c. Sinon — **paire incorrecte** :
      - Incrémenter `nombreErreurs`
      - Mettre `estVerrouille` à `true`
      - Appeler `surPaireIncorrecte(carte1, carte2)`
      - Après `DUREE_AFFICHAGE_PAIRE_INCORRECTE` ms (via `setTimeout`) :
        - `carte1.masquer()` et `carte2.masquer()`
        - Mettre `estVerrouille` à `false`
        - Vider `cartesRetournees`
        - Rappeler les callbacks pour mettre à jour le visuel (retour des cartes)

**Création des cartes (`_creerCartes`) :**
- Pour chaque paire `i` de 0 à `nombrePaires - 1` :
  - Créer `new Carte(i * 2, i, symboles[i])` et `new Carte(i * 2 + 1, i, symboles[i])`
- Résultat : un tableau de `nombrePaires * 2` cartes

**Règle critique :** le `setTimeout` pour la paire incorrecte est le seul timer du moteur. Il doit être stocké dans `this._timerComparaison` pour pouvoir être nettoyé par `reinitialiser()` (via `clearTimeout`).

**Dépendances :**
- `Carte` depuis `./Carte.js`
- `DUREE_AFFICHAGE_PAIRE_INCORRECTE` depuis `./constantesMemory.js`

### Vérification
Créer un `MoteurDeJeu` avec 4 paires. Sélectionner deux cartes identiques : vérifier que `surPaireTrouvee` est appelé et `pairesRestantes` décrémenté. Sélectionner deux cartes différentes : vérifier que `surPaireIncorrecte` est appelé, que le verrouillage bloque les clics, et qu'après le délai les cartes sont masquées.

### Texte du commit
```
feat(memory): implémentation de MoteurDeJeu — logique de comparaison

Gestion de la sélection, comparaison de paires, verrouillage temporaire
pendant l'animation d'erreur. Classe pure sans couplage DOM.
Callbacks pour notifier le plateau et le score des événements.
```

---

## Bloc 05 — Chronometre (suivi du temps écoulé)

### Objectif
Créer la classe `Chronometre` qui mesure le temps écoulé depuis le début de la partie. Utilisé pour le calcul du bonus temps dans le scoring.

### Fichier : `js/jeux/memory/Chronometre.js`

**Représentation interne :**
- `this._tempsDepart` : timestamp (`Date.now()`) au moment du démarrage
- `this._tempsEcoule` : entier en secondes
- `this._tempsPause` : temps accumulé avant une pause
- `this._idIntervalle` : référence `setInterval` pour le tick chaque seconde
- `this._enCours` : booléen

**Interface publique :**
```js
class Chronometre {
  constructor()

  demarrer()                             // lance le compteur
  mettreEnPause()                        // stoppe le compteur sans remettre à zéro
  reprendre()                            // reprend après une pause
  arreter()                              // stoppe définitivement
  reinitialiser()                        // remet tout à zéro

  get tempsEcoule()                      // retourne le temps écoulé en secondes (entier)
  get enCours()                          // booléen
  get tempsFormate()                     // retourne "MM:SS" (ex : "02:35")

  surTick = null                         // callback : (tempsEcoule) => {} appelé chaque seconde
}
```

**Logique de `demarrer()` :**
1. Enregistrer `this._tempsDepart = Date.now()`
2. Lancer `setInterval` à `INTERVALLE_CHRONOMETRE` (1000ms)
3. À chaque tick : calculer `tempsEcoule = Math.floor((Date.now() - this._tempsDepart) / 1000) + this._tempsPause`
4. Appeler `surTick(tempsEcoule)` si défini

**Logique de pause/reprise :**
- `mettreEnPause()` : stoppe l'intervalle, enregistre `this._tempsPause = this._tempsEcoule`
- `reprendre()` : relance avec un nouveau `_tempsDepart = Date.now()` (le temps de pause n'est pas compté)

**Formatage `tempsFormate` :**
```js
get tempsFormate() {
  const minutes = Math.floor(this._tempsEcoule / 60);
  const secondes = this._tempsEcoule % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
}
```

**Dépendances :** `INTERVALLE_CHRONOMETRE` depuis `./constantesMemory.js`

### Vérification
Instancier un `Chronometre`, démarrer, attendre quelques secondes, vérifier que `tempsEcoule` progresse. Tester pause/reprise : vérifier que le temps de pause n'est pas compté. Vérifier le format `"00:05"` après 5 secondes.

### Texte du commit
```
feat(memory): implémentation de Chronometre — suivi du temps écoulé

Timer avec démarrage, pause, reprise et formatage MM:SS.
Callback surTick pour rafraîchir l'affichage chaque seconde.
Le temps de pause n'est pas comptabilisé dans le temps écoulé.
```

---

## Bloc 06 — Jeu (orchestrateur interne)

### Objectif
Créer la classe `Jeu` qui coordonne toutes les entités du jeu Memory : plateau, moteur, chronomètre. C'est le cerveau interne qui relie les callbacks entre composants et calcule le score.

### Fichier : `js/jeux/memory/Jeu.js`

**Constructeur (injection de dépendances) :**
```js
constructor(elementConteneur, { difficulte, surFinDePartie, surScoreChange } = {})
```
- Instancie en interne : `PlateauMemory`, `MoteurDeJeu`, `Chronometre`
- Enregistre les callbacks `surFinDePartie(resultat)` et `surScoreChange(score)`
- `difficulte` est une clé de `DIFFICULTES` (ex : `'NORMAL'`), par défaut `DIFFICULTE_PAR_DEFAUT`

**État interne :**
- `this.score` : entier, commence à 0
- `this.difficulte` : objet difficulté résolu depuis `DIFFICULTES`

**Interface publique :**
```js
class Jeu {
  constructor(elementConteneur, options)

  demarrer()                             // initialise les composants et lance le chrono
  mettreEnPause()                        // pause le chrono, verrouille le plateau
  reprendre()                            // reprend le chrono, déverrouille le plateau
  arreter()                              // stoppe tout
  detruire()                             // nettoyage complet
  changerDifficulte(cleDifficulte)       // change la difficulté et réinitialise

  get score()
  get tempsEcoule()
  get pairesRestantes()
  get pairesTotales()
  get difficulte()
}
```

**Câblage des callbacks (dans `demarrer()`) :**

```
MoteurDeJeu.surCarteRetournee = (carte) => {
  plateau.mettreAJourCarte(carte.id, carte);
}

MoteurDeJeu.surPaireTrouvee = (carte1, carte2) => {
  plateau.mettreAJourCarte(carte1.id, carte1);
  plateau.mettreAJourCarte(carte2.id, carte2);
  this._incrementerScore();
  surScoreChange?.(this.score);
}

MoteurDeJeu.surPaireIncorrecte = (carte1, carte2) => {
  plateau.verrouillerTout();
  // après DUREE_AFFICHAGE_PAIRE_INCORRECTE : masquage + déverrouillage
  // (géré en interne par MoteurDeJeu, qui rappelle les callbacks pour le visuel)
}

MoteurDeJeu.surPartieTerminee = () => {
  chronometre.arreter();
  this._calculerScoreFinal();
  surFinDePartie?.({ score: this.score, temps: chronometre.tempsEcoule, erreurs: moteur.nombreErreurs });
}

PlateauMemory.surClicCarte = (idCarte) => {
  moteur.selectionnerCarte(idCarte);
}

Chronometre.surTick = (tempsEcoule) => {
  surScoreChange?.(this.score);  // rafraîchit le HUD chaque seconde
}
```

**Calcul du score (`_calculerScoreFinal`) :**
```js
_calculerScoreFinal() {
  const pointsPaires = this.difficulte.paires * POINTS_PAR_PAIRE;
  const penalite = moteur.nombreErreurs * PENALITE_ERREUR;
  const tempsRestant = Math.max(0, SEUIL_TEMPS_BONUS - chronometre.tempsEcoule);
  const bonusTemps = Math.floor((tempsRestant / SEUIL_TEMPS_BONUS) * BONUS_TEMPS_BASE);
  this.score = Math.max(0, pointsPaires - penalite + bonusTemps);
}
```

Le score est donc composé de :
1. **Points de base** : nombre de paires × `POINTS_PAR_PAIRE` (100)
2. **Pénalité d'erreurs** : nombre d'erreurs × `PENALITE_ERREUR` (10)
3. **Bonus temps** : proportionnel au temps restant sous `SEUIL_TEMPS_BONUS` (120s). Si le joueur termine en 60s sur un seuil de 120s, il récupère 50% de `BONUS_TEMPS_BASE` (2500 points)

**Séquence de `demarrer()` :**
1. Récupérer la difficulté depuis `DIFFICULTES`
2. Créer les cartes via `MoteurDeJeu` avec le nombre de paires et les symboles (tranchés depuis `SYMBOLES`)
3. Appeler `plateau.creer(moteur.cartes)` pour générer le DOM
4. Câbler les callbacks
5. Démarrer le chronomètre

**Dépendances :**
- `PlateauMemory` depuis `./PlateauMemory.js`
- `MoteurDeJeu` depuis `./MoteurDeJeu.js`
- `Chronometre` depuis `./Chronometre.js`
- `DIFFICULTES`, `DIFFICULTE_PAR_DEFAUT`, `SYMBOLES`, `POINTS_PAR_PAIRE`, `BONUS_TEMPS_BASE`, `PENALITE_ERREUR`, `SEUIL_TEMPS_BONUS` depuis `./constantesMemory.js`

### Vérification
Instancier `Jeu` avec un élément DOM et des callbacks console. Vérifier que cliquer sur les cartes déclenche les retournements, que les paires sont détectées, que le score s'incrémente, et que la fin de partie est signalée quand toutes les paires sont trouvées.

### Texte du commit
```
feat(memory): implémentation de Jeu — orchestrateur principal

Coordination du plateau, moteur et chronomètre. Câblage des callbacks
entre composants. Calcul du score avec bonus temps et pénalité erreurs.
```

---

## Bloc 07 — JeuMemory (adaptateur InterfaceJeu)

### Objectif
Créer la classe `JeuMemory` qui étend `InterfaceJeu` et adapte l'orchestrateur interne `Jeu` au contrat du shell PlaygroundJS.

### Fichier : `js/jeux/memory/JeuMemory.js`

**Propriétés statiques :**
```js
static ID = 'memory';
static NOM = 'Memory';
static DESCRIPTION = 'Retournez les cartes et retrouvez toutes les paires le plus vite possible.';
static ICONE = '🧠';
static UTILISE_SCORES = true;
```

**Interface :**
```js
class JeuMemory extends InterfaceJeu {
  constructor(elementConteneur, options = {})

  initialiser()       // Crée le DOM wrapper .jeu-memory, instancie Jeu en interne
  demarrer()          // Délègue à this.jeu.demarrer()
  mettreEnPause()     // Délègue à this.jeu.mettreEnPause()
  reprendre()         // Délègue à this.jeu.reprendre()
  arreter()           // Délègue à this.jeu.arreter()
  detruire()          // Appelle arreter(), retire le DOM, null les références

  get etat()          // retourne l'état courant (machine à états InterfaceJeu)
  get scoreActuel()   // { points: this.jeu.score, niveau: 1, jeuId: 'memory' }
}
```

**Rôle :** adaptateur (pattern Adapter) entre l'orchestrateur interne `Jeu` et le contrat `InterfaceJeu`. Le shell ne connaît que `JeuMemory`, jamais `Jeu` directement.

**Gestion de la machine à états :**
- `initialiser()` → état `'pret'`
- `demarrer()` → état `'en_cours'`
- `mettreEnPause()` → état `'en_pause'`
- `reprendre()` → état `'en_cours'`
- `arreter()` → état `'termine'`
- Chaque transition appelle `surChangementEtat?.(nouvelEtat)`

**Options propagées :**
- `options.difficulte` : clé de difficulté passée à `Jeu`
- `options.depotScores` : référence au dépôt de scores partagé
- `options.gestionnaireProfils` : référence au gestionnaire de profils

**Dépendances :**
- `InterfaceJeu` depuis `../../commun/InterfaceJeu.js`
- `Jeu` depuis `./Jeu.js`

### Vérification
Enregistrer `JeuMemory` dans le routeur, naviguer vers `#memory`, vérifier que le jeu se lance et que la navigation retour fonctionne sans fuite mémoire.

### Texte du commit
```
feat(memory): implémentation de JeuMemory — adaptateur InterfaceJeu

Pont entre l'orchestrateur interne Jeu et le contrat InterfaceJeu
du shell PlaygroundJS. Gère le cycle de vie (init, start, pause, destroy).
```

---

## Bloc 08 — MemoryUI (HUD en cours de partie)

### Objectif
Créer la classe `MemoryUI` qui affiche le HUD pendant la partie (paires trouvées, temps, score, difficulté) et l'écran de fin de partie.

### Fichier : `js/jeux/memory/ui/MemoryUI.js`

**Constructeur :**
```js
constructor(elementConteneur, jeu, depotScores, profilActif, { surRetourMenu, surRejouer, surChangerDifficulte })
```

**Interface publique :**
```js
afficher()                                   // injecte le HUD et démarre la partie
masquer()                                    // nettoie et arrête la partie
mettreAJourScore(score)                      // appelé par le callback surScoreChange du Jeu
mettreAJourTemps(tempsFormate)               // appelé par le callback surTick
mettreAJourPaires(pairesRestantes, total)    // appelé après chaque paire trouvée
afficherFinDePartie(resultat)                // overlay avec score final, temps, erreurs
```

**Structure HTML du HUD :**
```html
<div class="jeu-memory">
  <header class="hud">
    <span class="hud__profil">NomDuJoueur</span>
    <span class="hud__paires">Paires : 0 / 8</span>
    <span class="hud__temps">Temps : 00:00</span>
    <span class="hud__score">Score : 0</span>
    <div class="hud__actions">
      <select class="hud__difficulte">
        <option value="FACILE">Facile (4×3)</option>
        <option value="NORMAL" selected>Normal (4×4)</option>
        <option value="DIFFICILE">Difficile (6×4)</option>
      </select>
      <button class="hud__pause">Pause</button>
    </div>
  </header>
  <div id="conteneur-plateau-memory"></div>
</div>
```

**Écran de fin de partie (superposition) :**
```html
<div class="overlay-fin">
  <h2>Bravo !</h2>
  <p>Score : X</p>
  <p>Temps : MM:SS</p>
  <p>Erreurs : Y</p>
  <p>Meilleur score : Z</p>
  <button class="btn--rejouer">Rejouer</button>
  <button class="btn--menu">Accueil</button>
</div>
```

**Comportements :**
- `afficherFinDePartie` : enregistre le score via `depotScores.ajouterScore(...)` avec `jeuId = 'memory'`, affiche l'overlay avec le meilleur score
- Bouton "Rejouer" : réinitialise le jeu sans revenir à l'accueil (appelle `surRejouer`)
- Bouton "Pause" : appelle `jeu.mettreEnPause()`, change le label en "Reprendre", verrouille le plateau
- Le sélecteur de difficulté n'est actif qu'en état `'pret'` ou `'termine'`. Pendant une partie en cours, il est désactivé (`disabled`)
- Changer de difficulté appelle `surChangerDifficulte(cleDifficulte)` qui réinitialise le jeu

**Dépendances :** `Jeu`, `DepotScores`, `Score`, `DIFFICULTES` depuis `../constantesMemory.js`

### Vérification
Lancer une partie, vérifier que le HUD se met à jour en temps réel (paires, temps, score). Terminer une partie, vérifier l'overlay et l'enregistrement du score. Tester le changement de difficulté.

### Texte du commit
```
feat(memory): implémentation de MemoryUI — HUD et écran de fin de partie

Affichage des paires trouvées, du temps et du score en temps réel.
Overlay de fin avec enregistrement du score. Sélecteur de difficulté.
```

---

## Bloc 09 — MemoryScoresUI (tableau des scores)

### Objectif
Créer la classe `MemoryScoresUI` qui affiche les scores spécifiques au Memory.

### Fichier : `js/jeux/memory/ui/MemoryScoresUI.js`

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
  <h2>Scores — Memory</h2>
  <div class="scores-filtres">
    <button class="filtre--tous actif">Classement général</button>
    <!-- un bouton par profil -->
  </div>
  <table class="scores-tableau">
    <thead>
      <tr><th>Rang</th><th>Joueur</th><th>Score</th><th>Temps</th><th>Erreurs</th><th>Date</th></tr>
    </thead>
    <tbody><!-- lignes dynamiques --></tbody>
  </table>
  <button class="btn--retour">Retour</button>
</div>
```

**Comportements :**
- Filtre par défaut sur `jeuId = 'memory'`
- Résolution `profilId → nom` via `gestionnaireProfils`
- Tri par score décroissant (meilleur score en premier)
- Si aucun score : message "Aucun score enregistré"
- Colonnes supplémentaires par rapport au Snake : "Temps" et "Erreurs" (données stockées dans le score via un champ `details`)

**Dépendances :** `DepotScores`, `GestionnaireProfils`

### Vérification
Jouer quelques parties avec différents profils, ouvrir le tableau des scores, vérifier le classement et le filtrage par profil.

### Texte du commit
```
feat(memory): implémentation de MemoryScoresUI — tableau des scores Memory

Vue de classement filtré par jeu Memory avec filtrage par profil.
Affichage du temps et des erreurs en plus du score.
```

---

## Bloc 10 — CSS Memory (`css/jeux/memory.css`)

### Objectif
Écrire les styles spécifiques au jeu Memory, scopés sous `.jeu-memory`. Implémenter le flip 3D des cartes via CSS transforms.

### Fichier : `css/jeux/memory.css`

**Organisation :**

```css
/* ========================================
   1. Conteneur principal
   ======================================== */
.jeu-memory {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

/* ========================================
   2. Grille du plateau
   ======================================== */
.jeu-memory .plateau-memory {
  display: grid;
  grid-template-columns: repeat(var(--colonnes-memory, 4), 1fr);
  gap: 0.75rem;
  max-width: 600px;
  width: 100%;
}

/* ========================================
   3. Carte — conteneur externe
   ======================================== */
.jeu-memory .carte {
  aspect-ratio: 3 / 4;
  perspective: 800px;
  cursor: pointer;
}

/* ========================================
   4. Carte — intérieur (rotation 3D)
   ======================================== */
.jeu-memory .carte__interieur {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--duree-flip, 0.6s) ease-in-out;
}

/* Retournement : rotation 180° sur l'axe Y */
.jeu-memory .carte--retournee .carte__interieur {
  transform: rotateY(180deg);
}

/* ========================================
   5. Faces de la carte
   ======================================== */
.jeu-memory .carte__face,
.jeu-memory .carte__dos {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden; /* Safari */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-size: 2rem;
  user-select: none;
}

/* Dos de la carte (visible par défaut) */
.jeu-memory .carte__dos {
  background: var(--couleur-dos-carte, #3b82f6);
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
}

/* Face de la carte (cachée par défaut, pré-tournée à 180°) */
.jeu-memory .carte__face {
  background: var(--couleur-face-carte, #ffffff);
  transform: rotateY(180deg);
  border: 2px solid var(--couleur-bordure-carte, #e5e7eb);
}

/* ========================================
   6. États des cartes
   ======================================== */

/* Carte trouvée : effet visuel de succès */
.jeu-memory .carte--trouvee .carte__face {
  background: var(--couleur-carte-trouvee, #d1fae5);
  border-color: var(--couleur-bordure-trouvee, #34d399);
}

.jeu-memory .carte--trouvee {
  cursor: default;
  animation: pulseTrouvee 0.4s ease-out;
}

/* Carte verrouillée : empêche les clics */
.jeu-memory .carte--verrouillee {
  pointer-events: none;
}

/* ========================================
   7. Animation paire trouvée
   ======================================== */
@keyframes pulseTrouvee {
  0%   { transform: scale(1);    }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1);    }
}

/* ========================================
   8. HUD
   ======================================== */
.jeu-memory .hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  max-width: 600px;
  padding: 0.5rem 1rem;
  background: var(--couleur-hud-fond, #f8fafc);
  border-radius: 0.5rem;
}

.jeu-memory .hud__actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* ========================================
   9. Overlay fin de partie
   ======================================== */
.jeu-memory .overlay-fin {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 0.5rem;
  z-index: 10;
}

/* ========================================
   10. Responsive
   ======================================== */
@media (max-width: 480px) {
  .jeu-memory .carte__face,
  .jeu-memory .carte__dos {
    font-size: 1.5rem;
  }

  .jeu-memory .plateau-memory {
    gap: 0.5rem;
  }
}
```

**Custom properties injectées depuis JS :**
- `--colonnes-memory` : nombre de colonnes (injecté par `PlateauMemory` via `style.setProperty`)
- `--duree-flip` : durée de l'animation de retournement (injectée depuis `DUREE_ANIMATION_FLIP`)

**Point technique critique — le flip 3D :**
1. `.carte` reçoit `perspective: 800px` pour créer le contexte 3D
2. `.carte__interieur` a `transform-style: preserve-3d` pour que ses enfants participent à la scène 3D
3. `.carte__dos` est orienté normalement (face à l'utilisateur)
4. `.carte__face` est pré-tournée à `rotateY(180deg)` (dos à l'utilisateur)
5. Les deux ont `backface-visibility: hidden` : seule la face visible est rendue
6. Ajouter `.carte--retournee` applique `rotateY(180deg)` sur `.carte__interieur` : le dos (0° + 180° = 180°) disparaît, la face (180° + 180° = 360° = 0°) apparaît
7. La `transition` sur `.carte__interieur` anime le passage

### Vérification
Ouvrir le jeu, cliquer sur une carte : vérifier que l'animation de retournement est fluide et que la face arrière est bien masquée pendant la rotation. Tester en mode responsive (480px).

### Texte du commit
```
feat(memory): styles CSS du jeu Memory

Flip 3D via perspective / preserve-3d / backface-visibility / rotateY.
Grille responsive pilotée par custom properties JS.
Animation de succès, overlay fin de partie, scopé sous .jeu-memory.
```

---

## Bloc 11 — Intégration finale et recette

### Objectif
Vérifier le jeu Memory bout en bout dans le contexte PlaygroundJS, corriger les bugs d'intégration.

### Checklist de recette

**Navigation :**
- [ ] Depuis l'accueil, cliquer sur la carte Memory → arrive sur le jeu
- [ ] Bouton "Accueil" / navigation retour → revient à l'accueil sans fuite mémoire
- [ ] Re-naviguer vers Memory → le jeu repart de zéro

**Cartes et plateau :**
- [ ] La grille affiche le bon nombre de cartes selon la difficulté (12, 16 ou 24)
- [ ] Les cartes sont mélangées aléatoirement à chaque partie
- [ ] Chaque symbole apparaît exactement deux fois

**Flip 3D :**
- [ ] Cliquer sur une carte → animation de retournement fluide
- [ ] Le dos de la carte est masqué pendant la rotation (pas de "transparence")
- [ ] L'animation fonctionne sur Chrome, Firefox et Safari
- [ ] Aucun clignotement ou artefact visuel

**Logique de jeu :**
- [ ] Cliquer sur une carte déjà retournée → rien ne se passe
- [ ] Cliquer sur une carte trouvée → rien ne se passe
- [ ] Retourner 2 cartes identiques → paire trouvée, cartes restent visibles (style succès)
- [ ] Retourner 2 cartes différentes → après ~1 seconde, elles se retournent face cachée
- [ ] Pendant l'animation de retournement (paire incorrecte) → aucun clic n'est possible
- [ ] Trouver toutes les paires → fin de partie déclenchée

**Chronomètre :**
- [ ] Le chronomètre démarre au premier chargement (ou au `demarrer()`)
- [ ] Le format est `MM:SS`
- [ ] Pause arrête le chronomètre, reprise le relance sans compter le temps de pause
- [ ] Le chronomètre s'arrête à la fin de la partie

**Scoring :**
- [ ] Score = (paires × 100) - (erreurs × 10) + bonus temps
- [ ] Le bonus temps diminue progressivement au-delà de 120 secondes
- [ ] Le score ne peut pas être négatif (minimum 0)
- [ ] Le score est mis à jour en temps réel dans le HUD

**Difficulté :**
- [ ] Le sélecteur de difficulté fonctionne avant le début de la partie
- [ ] Changer de difficulté réinitialise la grille avec le bon nombre de cartes
- [ ] Le sélecteur est désactivé pendant une partie en cours

**Scores :**
- [ ] Score enregistré après chaque partie avec `jeuId = 'memory'`
- [ ] Classement Memory correct, trié par score décroissant
- [ ] Filtrage par profil correct
- [ ] Meilleur score affiché dans l'overlay de fin de partie
- [ ] Les scores Memory ne polluent pas les scores Snake et vice versa

**Cycle de vie :**
- [ ] `detruire()` retire tout le DOM memory de `#app`
- [ ] Aucun `setInterval` (chronomètre) ne continue après `detruire()`
- [ ] Aucun `setTimeout` (comparaison) ne cause d'erreur après `detruire()`
- [ ] Aucun event listener ne reste après `detruire()`

**Responsive :**
- [ ] Le jeu est jouable sur un écran de 480px de large
- [ ] Les cartes réduisent proportionnellement leur taille
- [ ] Le HUD ne déborde pas

### Texte du commit
```
fix(memory): recette finale — corrections post-intégration

Résolution des bugs découverts lors de la recette bout en bout.
Vérification de la navigation, du jeu, du scoring et de la persistance.
```

---

## Résumé des dépendances entre blocs

```
Bloc 01 (constantesMemory)
  ├── Bloc 02 (Carte)
  ├── Bloc 03 (PlateauMemory)
  ├── Bloc 04 (MoteurDeJeu)
  └── Bloc 05 (Chronometre)

Bloc 02 (Carte)
  └── Bloc 04 (MoteurDeJeu)

Blocs 03+04+05
  └── Bloc 06 (Jeu orchestrateur)

Bloc 06 + Shell (InterfaceJeu)
  └── Bloc 07 (JeuMemory adaptateur)

Bloc 06 + Shell (DepotScores, Score)
  ├── Bloc 08 (MemoryUI)
  └── Bloc 09 (MemoryScoresUI)

Blocs 07+08+09
  └── Bloc 10 (CSS)

Bloc 10
  └── Bloc 11 (Intégration finale)
```

---

*Document créé le 2026-03-20. Maintenir à jour si des décisions d'architecture évoluent en cours de réalisation.*

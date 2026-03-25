# PLAN_GLOBAL.md — PlaygroundJS

Plan de route du projet PlaygroundJS : un portfolio de mini-jeux en Vanilla JavaScript.

---

## Vision

PlaygroundJS est une collection de 7 jeux classiques, développés entièrement en **Vanilla JS ES6**, sans framework ni bibliothèque externe. Le projet sert de vitrine technique pour démontrer la maîtrise de la POO, des principes SOLID et du Clean Code en JavaScript pur.

**Contraintes transversales :**
- Pas de `<canvas>` (exception unique : Tetris)
- Rendu DOM exclusivement via manipulation de `classList` sur des `<div>`
- Modules ES6 natifs (`import/export`, `type="module"`)
- `localStorage` uniquement pour la persistance (pas de cookies, pas d'IndexedDB)
- Noms de classes, méthodes et variables en français
- Un fichier = une classe
- Fonctions courtes (~20 lignes max), noms explicites, zéro magic number
- Injection de dépendances via constructeur
- **Mobile-first** — styles de base pour mobile, surcharges desktop via `@media (min-width: 640px)`
- **Touch events** — jeux à direction : D-pad on-screen (`DPad.js`) ; jeux à clic : toucher natif

---

## Phases de développement

| Phase | Jeu / Module | Technique clé | Rendu |
|-------|-------------|---------------|-------|
| **0** | **Shell / Infrastructure** | Routeur SPA, contrat InterfaceJeu, localStorage namespacé | DOM |
| **1** | **Snake** | Game loop (`setInterval`), collision detection | DOM |
| **2** | **Memory** | CSS 3D transforms (`rotateY`), timer | DOM |
| **3** | **Jeu de la Vie** (Conway, 1970) | Automate cellulaire, double buffering | DOM |
| **4** | **Sokoban** | Command pattern, undo/redo | DOM |
| **5** | **Démineur** | Flood fill, génération procédurale | DOM |
| **6** | **Puissance 4** | IA Minimax (3 niveaux), élagage alpha-beta | DOM |
| **7** | **Tetris** | Matrices de rotation, wall kicks | **Canvas** |

> Chaque jeu dispose de sa propre documentation détaillée : `docs/DOCUMENTATION_<JEU>.md`

---

## Architecture cible

```
PlaygroundJS/
├── index.html
├── css/
│   ├── commun.css                      # Reset, variables CSS, layout partagé
│   ├── accueil.css                     # Écran d'accueil (grille de cartes)
│   └── jeux/
│       ├── snake.css
│       ├── memory.css
│       ├── jeu-de-la-vie.css
│       ├── sokoban.css
│       ├── demineur.css
│       ├── puissance4.css
│       └── tetris.css
├── docs/
│   ├── PLAN_GLOBAL.md                  # Ce fichier
│   ├── DOCUMENTATION_SNAKE.md
│   ├── DOCUMENTATION_MEMORY.md
│   ├── DOCUMENTATION_JEU_DE_LA_VIE.md
│   ├── DOCUMENTATION_SOKOBAN.md
│   ├── DOCUMENTATION_DEMINEUR.md
│   ├── DOCUMENTATION_PUISSANCE4.md
│   └── DOCUMENTATION_TETRIS.md
├── js/
│   ├── main.js                         # Point d'entrée — bootstrap du shell
│   ├── commun/
│   │   ├── constantes.js               # Constantes globales (préfixe storage, états, routes)
│   │   ├── Routeur.js                  # Routeur SPA hash-based
│   │   ├── InterfaceJeu.js             # Contrat / classe de base pour chaque jeu
│   │   ├── DepotLocal.js              # Wrapper localStorage avec namespace
│   │   └── GestionnaireVues.js         # Montage/démontage des vues dans #app
│   ├── accueil/
│   │   └── AccueilUI.js               # Écran d'accueil avec grille de cartes jeux
│   ├── profil/
│   │   ├── Profil.js                   # Modèle de données profil joueur
│   │   └── GestionnaireProfils.js      # CRUD profils (partagé entre tous les jeux)
│   ├── score/
│   │   ├── Score.js                    # Modèle de données score (avec champ jeuId)
│   │   └── DepotScores.js             # Accès localStorage scores (partagé, filtrable par jeuId)
│   └── jeux/
│       ├── snake/
│       │   ├── constantesSnake.js
│       │   ├── JeuSnake.js             # extends InterfaceJeu
│       │   ├── BoucleDeJeu.js
│       │   ├── Plateau.js
│       │   ├── Serpent.js
│       │   ├── Nourriture.js
│       │   ├── DetecteurDeCollision.js
│       │   └── ui/
│       │       ├── DPad.js             # Pavé directionnel mobile (touchstart)
│       │       ├── SnakeUI.js          # HUD + overlay fin de partie
│       │       └── SnakeScoresUI.js    # Tableau des scores snake
│       ├── memory/
│       │   ├── constantesMemory.js
│       │   ├── JeuMemory.js            # extends InterfaceJeu
│       │   ├── PlateauMemory.js
│       │   ├── Carte.js
│       │   ├── Chronometre.js
│       │   ├── MoteurDeJeu.js
│       │   └── ui/
│       │       └── MemoryUI.js
│       ├── jeu-de-la-vie/
│       │   ├── constantesVie.js
│       │   ├── JeuDeLaVie.js           # extends InterfaceJeu (UTILISE_SCORES = false)
│       │   ├── Grille.js
│       │   ├── Simulateur.js
│       │   ├── BanqueDeMotifs.js
│       │   └── ui/
│       │       └── VieUI.js
│       ├── sokoban/
│       │   ├── constantesSokoban.js
│       │   ├── JeuSokoban.js           # extends InterfaceJeu
│       │   ├── Niveau.js
│       │   ├── Joueur.js
│       │   ├── GestionnaireCommandes.js
│       │   ├── Commande.js
│       │   └── ui/
│       │       └── SokobanUI.js
│       ├── demineur/
│       │   ├── constantesDemineur.js
│       │   ├── JeuDemineur.js          # extends InterfaceJeu
│       │   ├── GrilleDemineur.js
│       │   ├── Cellule.js
│       │   ├── GenerateurMines.js
│       │   └── ui/
│       │       └── DemineurUI.js
│       ├── puissance4/
│       │   ├── constantesPuissance4.js
│       │   ├── JeuPuissance4.js        # extends InterfaceJeu
│       │   ├── PlateauP4.js
│       │   ├── IAMinimax.js
│       │   ├── EvaluateurPosition.js
│       │   └── ui/
│       │       └── Puissance4UI.js
│       └── tetris/
│           ├── constantesTetris.js
│           ├── JeuTetris.js            # extends InterfaceJeu
│           ├── PlateauTetris.js        # SEUL jeu utilisant <canvas>
│           ├── Piece.js
│           ├── RotationMatrice.js
│           ├── BoucleDeJeuTetris.js
│           └── ui/
│               └── TetrisUI.js
```

---

## Phase 0 — Shell / Infrastructure

Le shell est le socle commun à tous les jeux. Il doit être implémenté **en premier** avant tout développement de jeu.

### S-01 — Constantes globales (`js/commun/constantes.js`)

Constantes partagées par l'ensemble de l'application, indépendantes de tout jeu spécifique.

```js
export const NOM_APPLICATION = 'PlaygroundJS';
export const PREFIXE_STOCKAGE = 'playground';
export const ROUTE_ACCUEIL = 'accueil';

export const ETATS_JEU = Object.freeze({
  PRET:      'pret',
  EN_COURS:  'en_cours',
  EN_PAUSE:  'en_pause',
  TERMINE:   'termine',
});

export const LONGUEUR_MAX_NOM_PROFIL = 20;
```

### S-02 — DepotLocal (`js/commun/DepotLocal.js`)

Wrapper autour de `localStorage` qui ajoute un namespace automatique à chaque clé.

**Convention de nommage des clés :**
- Données par jeu : `playground_{jeuId}_{cle}` (ex : `playground_snake_config`)
- Données globales : `playground_global_{cle}` (ex : `playground_global_profils`)

**Interface publique :**
```js
class DepotLocal {
  constructor(espaceDeNom)               // ex : 'playground_snake'
  lire(cle)                              // parse JSON, retourne null si absent
  ecrire(cle, valeur)                    // JSON.stringify
  supprimer(cle)
  listerCles()                           // clés sous ce namespace
  vider()                                // supprime tout le namespace

  static creerPourJeu(jeuId)             // factory → new DepotLocal(`playground_${jeuId}`)
  static creerGlobal()                   // factory → new DepotLocal('playground_global')
}
```

### S-03 — InterfaceJeu (`js/commun/InterfaceJeu.js`)

Classe de base abstraite que chaque jeu doit étendre. Définit le contrat du cycle de vie.

**Propriétés statiques (à surcharger) :**
```js
static ID = '';                          // ex : 'snake'
static NOM = '';                         // ex : 'Snake'
static DESCRIPTION = '';                 // texte court pour la carte d'accueil
static ICONE = '';                       // emoji (🐍, 🧠, 🦠, 📦, 💣, 🔴, 🧱)
static UTILISE_SCORES = true;            // false pour Jeu de la Vie
```

**Cycle de vie :**
```js
class InterfaceJeu {
  constructor(elementConteneur, options = {})

  // --- Méthodes du cycle de vie (à implémenter) ---
  initialiser()          // Crée le DOM interne, prépare l'état. Appelé une seule fois.
  demarrer()             // Lance la boucle / le timer. Attache les listeners.
  mettreEnPause()        // Stoppe la boucle sans détruire l'état.
  reprendre()            // Reprend depuis l'état en pause.
  arreter()              // Fin de partie. Stoppe la boucle, détache les listeners.
  detruire()             // Nettoyage complet : DOM, listeners, timers, références.

  // --- Getters ---
  get etat()             // 'pret' | 'en_cours' | 'en_pause' | 'termine'
  get scoreActuel()      // { points, niveau, jeuId } ou null

  // --- Callbacks (assignés par le shell) ---
  surFinDePartie         // (resultat) => {}
  surScoreChange         // (score, niveau) => {}
  surChangementEtat      // (nouvelEtat) => {}
}
```

**Machine à états :**
```
            ┌─────────────┐
            │    pret      │
            └──────┬───────┘
                   │ demarrer()
                   ▼
            ┌─────────────┐
     ┌──────│  en_cours    │──────┐
     │      └──────┬───────┘      │
     │ mettreEnPause()    arreter()│
     ▼             │              ▼
┌──────────┐       │       ┌──────────┐
│ en_pause │───────┘       │ termine  │
└──────────┘ reprendre()   └──────────┘
                                │
                                │ demarrer()
                                ▼
                          (retour à pret)
```

**Règle critique :** `detruire()` doit être appelé quand l'utilisateur quitte la vue du jeu (navigation). Il doit supprimer tout le DOM injecté, retirer tous les `addEventListener`, et arrêter tous les timers/intervalles. C'est la protection contre les fuites mémoire.

### S-04 — Routeur (`js/commun/Routeur.js`)

Routeur SPA basé sur le hash de l'URL (`window.location.hash`).

**Routes :**
| Hash | Vue |
|------|-----|
| `#accueil` | Écran d'accueil (défaut) |
| `#snake` | Jeu Snake |
| `#memory` | Jeu Memory |
| `#jeu-de-la-vie` | Jeu de la Vie |
| `#sokoban` | Jeu Sokoban |
| `#demineur` | Jeu Démineur |
| `#puissance4` | Jeu Puissance 4 |
| `#tetris` | Jeu Tetris |

**Interface publique :**
```js
class Routeur {
  constructor(elementConteneur)
  enregistrerRoute(chemin, callbackAfficher, callbackMasquer)
  naviguerVers(chemin)             // modifie window.location.hash
  obtenirRouteCourante()           // hash sans le '#'
  demarrer()                       // écoute hashchange, affiche la route initiale
  arreter()                        // retire l'écouteur
}
```

**Comportement :** sur `hashchange`, le routeur appelle `callbackMasquer()` sur la vue courante puis `callbackAfficher()` sur la nouvelle. Si le hash est vide ou inconnu → redirection vers `#accueil`.

### S-05 — GestionnaireVues (`js/commun/GestionnaireVues.js`)

Couche intermédiaire entre le Routeur et les instances de jeu/vues.

```js
class GestionnaireVues {
  constructor(elementConteneur)
  enregistrerVue(chemin, creerVue)   // creerVue = factory retournant { afficher(), masquer(), detruire() }
  afficherVue(chemin)                // détruit la vue courante, crée et affiche la nouvelle
  masquerVueCourante()
}
```

### S-06 — AccueilUI (`js/accueil/AccueilUI.js`)

Écran d'accueil listant tous les jeux disponibles sous forme de cartes cliquables.

**HTML généré :**
```html
<div class="accueil">
  <header class="accueil__entete">
    <h1>PlaygroundJS</h1>
    <p>Collection de jeux en Vanilla JavaScript</p>
  </header>
  <div class="accueil__grille">
    <article class="carte-jeu" data-jeu="snake">
      <span class="carte-jeu__icone">🐍</span>
      <h2 class="carte-jeu__nom">Snake</h2>
      <p class="carte-jeu__description">Le serpent classique...</p>
    </article>
    <!-- ... une carte par jeu enregistré -->
  </div>
  <footer class="accueil__pied">
    <button class="btn--profils">Gérer les profils</button>
  </footer>
</div>
```

Chaque carte navigue vers `#snake`, `#memory`, etc. via `routeur.naviguerVers()`.

### S-07 — Profils et Scores (migration)

**Profils** : partagés entre tous les jeux. `GestionnaireProfils` reçoit un `DepotLocal.creerGlobal()` par injection.

**Scores** : partagés avec un champ `jeuId` sur chaque `Score`. Les méthodes de `DepotScores` acceptent un `jeuId` optionnel pour filtrer.

**Nouvelles clés localStorage :**
| Ancienne clé | Nouvelle clé |
|---|---|
| `snake_profils` | `playground_global_profils` |
| `snake_scores` | `playground_global_scores` |

### S-08 — main.js (réécriture)

```js
import Routeur from './commun/Routeur.js';
import GestionnaireVues from './commun/GestionnaireVues.js';
import DepotLocal from './commun/DepotLocal.js';
import GestionnaireProfils from './profil/GestionnaireProfils.js';
import DepotScores from './score/DepotScores.js';
import AccueilUI from './accueil/AccueilUI.js';

// Import des jeux (ajoutés au fur et à mesure)
import JeuSnake from './jeux/snake/JeuSnake.js';

const app = document.getElementById('app');
const depotGlobal = DepotLocal.creerGlobal();
const gestionnaireProfils = new GestionnaireProfils(depotGlobal);
const depotScores = new DepotScores(depotGlobal);
const routeur = new Routeur(app);

// Enregistrement des routes
routeur.enregistrerRoute('accueil', () => new AccueilUI(app, routeur, registreJeux));
routeur.enregistrerRoute('snake', () => new JeuSnake(app, { depotScores, gestionnaireProfils }));
// ... autres jeux ajoutés ici au fil des phases

routeur.demarrer(); // navigue vers #accueil par défaut
```

### S-09 / S-10 — CSS commun et accueil

- `css/commun.css` : reset, variables CSS (`:root`), typographie, boutons, layout flexbox/grid
- `css/accueil.css` : grille de cartes, styles des cartes jeu, hover/focus

### S-11 — index.html (mise à jour)

```html
<title>PlaygroundJS</title>
<link rel="stylesheet" href="css/commun.css" />
<link rel="stylesheet" href="css/accueil.css" />
<link rel="stylesheet" href="css/jeux/snake.css" />
<!-- ... autres CSS ajoutés au fil des phases -->
```

---

## Systèmes partagés

### Profils

- Un profil est global : un joueur joue à tous les jeux avec le même profil
- `GestionnaireProfils` gère le CRUD et la sélection du profil actif
- Stocké dans `playground_global_profils`

### Scores

- Chaque `Score` possède un champ `jeuId` (ex : `'snake'`, `'memory'`)
- `DepotScores` filtre par `jeuId` et/ou `profilId`
- Stocké dans `playground_global_scores`
- Le classement général agrège les meilleurs scores par profil pour un jeu donné
- **Exception :** le Jeu de la Vie (`UTILISE_SCORES = false`) n'enregistre aucun score

### Scoping CSS

Chaque jeu encapsule ses styles sous une classe racine :
- `.jeu-snake` pour Snake
- `.jeu-memory` pour Memory
- etc.

Cela évite les conflits CSS entre jeux sans avoir besoin de Shadow DOM.

---

## Récapitulatif des documentations

| Phase | Documentation | Blocs estimés |
|-------|-------------|---------------|
| 0 | *(ce fichier)* | 11 blocs (S-01 à S-11) |
| 1 | `DOCUMENTATION_SNAKE.md` | 13 blocs |
| 2 | `DOCUMENTATION_MEMORY.md` | 12 blocs |
| 3 | `DOCUMENTATION_JEU_DE_LA_VIE.md` | 10 blocs |
| 4 | `DOCUMENTATION_SOKOBAN.md` | 14 blocs |
| 5 | `DOCUMENTATION_DEMINEUR.md` | 13 blocs |
| 6 | `DOCUMENTATION_PUISSANCE4.md` | 15 blocs |
| 7 | `DOCUMENTATION_TETRIS.md` | 16 blocs |
| | **Total** | **~109 blocs** |

---

## Commandes de développement

```bash
# Lancement local (requis pour les modules ES6)
npx serve .

# Déploiement Vercel
vercel        # première fois
vercel --prod # déploiements suivants
```

---

*Document créé le 2026-03-20. Maintenir à jour si des décisions d'architecture évoluent en cours de réalisation.*

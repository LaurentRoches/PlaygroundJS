# CLAUDE.md — PlaygroundJS

Guide de développement pour Claude. Ce fichier décrit les règles, contraintes et conventions à respecter tout au long du projet.

---

## Vue d'ensemble

**PlaygroundJS** est un portfolio de mini-jeux entièrement en Vanilla JS / HTML / CSS.
Projet d'étude orienté pédagogie : POO, principes SOLID, Clean Code.

**Jeux :** Snake, Memory, Jeu de la Vie (Conway), Sokoban, Démineur, Puissance 4, Tetris.

**Fonctionnalités transversales :**
- Naviguer entre les jeux via un écran d'accueil
- Créer et gérer plusieurs profils joueurs (partagés entre les jeux)
- Enregistrer et comparer les scores entre profils et entre jeux (stockage local)

---

## Documentation

Les plans d'implémentation détaillés sont dans le dossier `docs/`. **Avant de travailler sur un jeu, lire la documentation correspondante :**

| Fichier | Contenu |
|---|---|
| `docs/PLAN_GLOBAL.md` | Architecture du shell, contrat InterfaceJeu, phases de développement |
| `docs/DOCUMENTATION_SNAKE.md` | Plan bloc-par-bloc du jeu Snake (13 blocs) |
| `docs/DOCUMENTATION_MEMORY.md` | Plan bloc-par-bloc du jeu Memory (11 blocs) |
| `docs/DOCUMENTATION_JEU_DE_LA_VIE.md` | Plan bloc-par-bloc du Jeu de la Vie (10 blocs) |
| `docs/DOCUMENTATION_SOKOBAN.md` | Plan bloc-par-bloc du jeu Sokoban (14 blocs) |
| `docs/DOCUMENTATION_DEMINEUR.md` | Plan bloc-par-bloc du Démineur (12 blocs) |
| `docs/DOCUMENTATION_PUISSANCE4.md` | Plan bloc-par-bloc du Puissance 4 (13 blocs) |
| `docs/DOCUMENTATION_TETRIS.md` | Plan bloc-par-bloc du Tetris (16 blocs) |

---

## Contraintes techniques

- **Pas de `<canvas>`** — le rendu se fait via le DOM (grille de `<div>`). **Exception unique : Tetris** utilise `<canvas>`.
- **Vanilla JS ES6** — aucun framework, aucune bibliothèque externe
- **Modules ES6 natifs** — `import/export`, attribut `type="module"` dans le HTML
- **Stockage** : `localStorage` uniquement (pas de cookies, pas d'IndexedDB)
- **Langue du code** : français (noms de classes, méthodes, variables)
- **Mobile-first** — les styles de base ciblent les petits écrans ; les surcharges desktop utilisent `@media (min-width: 640px)`. Le dimensionnement de la grille utilise des unités relatives (`vmin`) pour s'adapter à toutes les tailles d'écran.
- **Touch events** — les jeux à direction (Snake, Sokoban) intègrent un D-pad on-screen (`DPad.js`) gérant les `touchstart`. Les jeux à clic (Démineur, Memory, Puissance 4) fonctionnent nativement au toucher sans composant supplémentaire.

---

## Structure des fichiers

```
PlaygroundJS/
├── index.html
├── css/
│   ├── commun.css                      # Reset, variables CSS, layout partagé
│   ├── accueil.css                     # Écran d'accueil
│   └── jeux/
│       ├── snake.css
│       ├── memory.css
│       ├── jeu-de-la-vie.css
│       ├── sokoban.css
│       ├── demineur.css
│       ├── puissance4.css
│       └── tetris.css
├── docs/                               # Documentations détaillées (voir tableau ci-dessus)
├── js/
│   ├── main.js                         # Point d'entrée — bootstrap du shell
│   ├── commun/
│   │   ├── constantes.js               # Constantes globales (préfixe storage, états, routes)
│   │   ├── Routeur.js                  # Routeur SPA hash-based
│   │   ├── InterfaceJeu.js             # Contrat / classe de base pour chaque jeu
│   │   ├── DepotLocal.js              # Wrapper localStorage avec namespace
│   │   └── GestionnaireVues.js         # Montage/démontage des vues dans #app
│   ├── accueil/
│   │   └── AccueilUI.js               # Écran d'accueil (grille de cartes jeux)
│   ├── profil/
│   │   ├── Profil.js                   # Modèle de données profil joueur
│   │   └── GestionnaireProfils.js      # CRUD profils (partagé entre tous les jeux)
│   ├── score/
│   │   ├── Score.js                    # Modèle de données score (avec champ jeuId)
│   │   └── DepotScores.js             # Accès localStorage scores (filtrable par jeuId)
│   └── jeux/
│       ├── snake/                      # Voir docs/DOCUMENTATION_SNAKE.md
│       ├── memory/                     # Voir docs/DOCUMENTATION_MEMORY.md
│       ├── jeu-de-la-vie/              # Voir docs/DOCUMENTATION_JEU_DE_LA_VIE.md
│       ├── sokoban/                    # Voir docs/DOCUMENTATION_SOKOBAN.md
│       ├── demineur/                   # Voir docs/DOCUMENTATION_DEMINEUR.md
│       ├── puissance4/                 # Voir docs/DOCUMENTATION_PUISSANCE4.md
│       └── tetris/                     # Voir docs/DOCUMENTATION_TETRIS.md
```

---

## Contrat InterfaceJeu

Chaque jeu étend la classe `InterfaceJeu` (voir `docs/PLAN_GLOBAL.md` pour le détail complet).

**Cycle de vie obligatoire :** `initialiser()` → `demarrer()` → `mettreEnPause()` / `reprendre()` → `arreter()` → `detruire()`

**Propriétés statiques à surcharger :** `ID`, `NOM`, `DESCRIPTION`, `ICONE`, `UTILISE_SCORES`

**Règle critique :** `detruire()` doit retirer tout le DOM, tous les `addEventListener`, et arrêter tous les timers/intervalles.

---

## Principes SOLID

| Principe | Application dans ce projet |
|---|---|
| **S** — Responsabilité unique | Chaque classe a un seul rôle. `Plateau` gère uniquement le rendu DOM, `DetecteurDeCollision` gère uniquement la logique de collision. |
| **O** — Ouvert/Fermé | Étendre les comportements par héritage ou composition sans modifier le code existant. Chaque jeu étend `InterfaceJeu`. |
| **L** — Substitution de Liskov | Tout jeu qui étend `InterfaceJeu` doit pouvoir être utilisé par le shell sans adaptation. |
| **I** — Ségrégation des interfaces | Éviter les classes "fourre-tout". Préférer plusieurs petites classes ciblées. |
| **D** — Inversion des dépendances | Passer les dépendances via le constructeur (injection), ne pas instancier avec `new` à l'intérieur des méthodes. |

---

## Conventions Clean Code

- **Noms explicites en français** : `calculerProchaineMouvement()` plutôt que `calc()` ou `move()`
- **Pas de magic numbers** : toutes les valeurs numériques dans les fichiers `constantes*.js`
- **Fonctions courtes** : maximum ~20 lignes, une seule responsabilité par fonction
- **Pas de commentaires redondants** : commenter le *pourquoi*, pas le *quoi* (le code doit être auto-documenté)
- **Un fichier = une classe** : respecter la structure de dossiers définie

---

## Gestion du localStorage

L'accès au `localStorage` est encapsulé par `DepotLocal` avec un système de namespace.

| Namespace | Clé complète | Contenu |
|---|---|---|
| `playground_global` | `playground_global_profils` | Liste des profils joueurs |
| `playground_global` | `playground_global_scores` | Liste des scores (avec champ `jeuId` pour filtrer) |
| `playground_{jeuId}` | `playground_snake_config` | Config spécifique à un jeu (si nécessaire) |

Seules les classes `DepotScores` et `GestionnaireProfils` accèdent au `localStorage` via `DepotLocal`.

---

## Rendu DOM (sans canvas)

- La grille de chaque jeu (sauf Tetris) est un tableau 2D de `<div>`
- Les états visuels sont gérés par des classes CSS scopées (ex : `.jeu-snake .cellule--serpent`)
- À chaque tick : **modifier les classes CSS**, ne pas recréer les éléments DOM
- **Tetris** est l'exception unique : il utilise un `<canvas>` pour le rendu

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

## Déploiement

- Hébergement : **Vercel** (projet statique, détection automatique de `index.html`)
- Aucune étape de build nécessaire
- URL de production : *(à compléter après le premier déploiement)*

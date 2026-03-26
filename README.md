# PlaygroundJS

Collection de mini-jeux développés en **Vanilla JS / HTML / CSS**, sans framework ni bibliothèque externe. Projet d'étude orienté pédagogie : POO, principes SOLID, Clean Code.

## Jeux disponibles

| Jeu | Phase | État |
|-----|-------|------|
| Snake | 1 | Fonctionnel |
| Memory | 2 | Fonctionnel |
| Jeu de la Vie | 3 | À venir |
| Sokoban | 4 | À venir |
| Démineur | 5 | À venir |
| Puissance 4 | 6 | En cours |
| Tetris | 7 | À venir |

## Fonctionnalités transversales

- Naviguer entre les jeux via un écran d'accueil
- Créer et gérer plusieurs profils joueurs (partagés entre tous les jeux)
- Enregistrer et comparer les scores entre profils et entre jeux (localStorage)

## Stack technique

- HTML5 / CSS3
- JavaScript ES6 (Modules natifs, POO, SOLID, Clean Code)
- Aucune dépendance externe

## Lancement local

Les modules ES6 nécessitent un serveur HTTP local :

```bash
npx serve .
```

Puis ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

## Déploiement

Hébergé sur **Vercel** : [https://playgroundjs-smoky.vercel.app/](https://playgroundjs-smoky.vercel.app/)

```bash
vercel        # première fois
vercel --prod # déploiements suivants
```

---

## Architecture

### Structure des fichiers

```
PlaygroundJS/
├── index.html
├── css/
│   ├── commun.css                      # Reset, variables CSS, layout partagé
│   ├── accueil.css                     # Écran d'accueil (grille de cartes)
│   └── jeux/
│       ├── snake.css
│       └── ...
├── js/
│   ├── main.js                         # Point d'entrée — bootstrap du shell
│   ├── commun/
│   │   ├── constantes.js               # Constantes globales (préfixe storage, états, routes)
│   │   ├── Routeur.js                  # Routeur SPA hash-based
│   │   ├── InterfaceJeu.js             # Contrat / classe de base pour chaque jeu
│   │   ├── DepotLocal.js               # Wrapper localStorage avec namespace
│   │   └── GestionnaireVues.js         # Montage/démontage des vues dans #app
│   ├── accueil/
│   │   └── AccueilUI.js                # Écran d'accueil (grille de cartes jeux)
│   ├── profil/
│   │   ├── Profil.js                   # Modèle de données profil joueur
│   │   └── GestionnaireProfils.js      # CRUD profils (partagé entre tous les jeux)
│   ├── score/
│   │   ├── Score.js                    # Modèle de données score (avec champ jeuId)
│   │   └── DepotScores.js              # Accès localStorage scores (filtrable par jeuId)
│   └── jeux/
│       └── snake/                      # Jeu Snake (Phase 1)
```

### Shell (Phase 0)

Le shell est le socle commun à tous les jeux :

- **Routeur SPA** — navigation hash-based (`#accueil`, `#snake`, etc.)
- **InterfaceJeu** — contrat de cycle de vie que chaque jeu implémente (`initialiser`, `demarrer`, `mettreEnPause`, `reprendre`, `arreter`, `detruire`)
- **DepotLocal** — wrapper `localStorage` avec namespace automatique (`playground_global_*`, `playground_{jeuId}_*`)
- **GestionnaireVues** — montage et démontage des vues sans fuite mémoire
- **AccueilUI** — grille de cartes cliquables vers chaque jeu

### Rendu DOM (sans canvas)

La grille de chaque jeu (sauf Tetris) est un tableau 2D de `<div class="cellule">`. Les états visuels sont portés par des classes CSS scopées (ex : `.jeu-snake .cellule--serpent`). À chaque tick, seules les classes sont modifiées — les éléments DOM ne sont jamais recréés.

**Exception :** Tetris utilise un `<canvas>` pour le rendu.

### Persistance

L'accès au `localStorage` est encapsulé par `DepotLocal` avec un système de namespace.

| Clé | Contenu |
|-----|---------|
| `playground_global_profils` | JSON array des profils joueurs |
| `playground_global_scores` | JSON array des scores (champ `jeuId` pour filtrer par jeu) |
| `playground_{jeuId}_config` | Config spécifique à un jeu (si nécessaire) |

---

## Principes appliqués

### SOLID

| Principe | Application |
|---|---|
| **S** — Responsabilité unique | Chaque classe a un seul rôle (`Plateau` = rendu, `DetecteurDeCollision` = collisions…) |
| **O** — Ouvert/Fermé | Chaque jeu étend `InterfaceJeu` sans modifier le shell |
| **L** — Substitution de Liskov | Tout jeu peut être utilisé par le routeur sans adaptation |
| **I** — Ségrégation des interfaces | Pas de classes "fourre-tout" — plusieurs petites classes ciblées |
| **D** — Inversion des dépendances | Les dépendances sont injectées via le constructeur |

### Clean Code

- Noms explicites en français : `calculerProchaineMouvement()` plutôt que `calc()`
- Pas de magic numbers — constantes dans les fichiers `constantes*.js`
- Fonctions courtes (< 20 lignes), une seule responsabilité par fonction
- Commenter le *pourquoi*, pas le *quoi*
- Un fichier = une classe

---

## Licence

MIT — voir [LICENSE](LICENSE)

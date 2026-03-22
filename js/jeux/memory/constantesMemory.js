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

// Symboles pour les faces des cartes (chemins vers les images)
export const SYMBOLES = [
  'images/memory/logoJS.png',
  'images/memory/logoHTML.png',
  'images/memory/logoCSS.png',
  'images/memory/logoPHP.png',
  'images/memory/logoPYTHON.png',
  'images/memory/logoJAVA.png',
  'images/memory/logoTYPESCRIPT.png',
  'images/memory/logoNODE.png',
  'images/memory/logoREACT.png',
  'images/memory/logoGIT.png',
  'images/memory/logoSQL.png',
  'images/memory/logoDOCKER.png',
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

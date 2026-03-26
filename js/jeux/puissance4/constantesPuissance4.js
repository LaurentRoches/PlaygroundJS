export const LIGNES = 6;
export const COLONNES = 7;

export const LONGUEUR_VICTOIRE = 4;

export const JETON_VIDE = 0;
export const JETON_JOUEUR = 1;
export const JETON_IA = 2;

export const DIFFICULTE = {
    'FACILE': {
        nom: 'facile',
        profondeur: 2
    },
    'MOYEN': {
        nom: 'moyenne',
        profondeur: 4
    },
    'DIFFICILE': {
        nom: 'difficile',
        profondeur: 6
    },
};
export const DELAI_COUP_IA = 750;
export const SCORE_VICTOIRE        = 1000;
export const SCORE_TROIS_ALIGNES   = 50;
export const SCORE_DEUX_ALIGNES    = 10;
export const SCORES_MENACE_ADVERSE  = {
    2: -50,
    3: -250,
    4: -5000
};
export const SCORE_COLONNE_CENTRE  = 30;

export const SCORE_INFINI_NEGATIF = -Infinity;
export const SCORE_INFINI_POSITIF = +Infinity;

export const CSS_PLATEAU = 'plateau';
export const CSS_JETON_VIDE = 'jeton--vide';
export const CSS_JETON_IA = 'jeton--ia';
export const CSS_JETON_JOUEUR = 'jeton--joueur';
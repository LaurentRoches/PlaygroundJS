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

export const CSS_PLATEAU = 'plateau';
export const CSS_JETON_VIDE = 'jeton--vide';
export const CSS_JETON_IA = 'jeton--ia';
export const CSS_JETON_JOUEUR = 'jeton--joueur';
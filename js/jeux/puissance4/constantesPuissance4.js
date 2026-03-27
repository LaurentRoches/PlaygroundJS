export const LIGNES = 6;
export const COLONNES = 7;

export const LONGUEUR_VICTOIRE = 4;

export const JETON_VIDE = 0;
export const JETON_JOUEUR = 1;
export const JETON_IA = 2;
export const MESSAGE_RESULTAT = {
    [JETON_JOUEUR]: 'Victoire !!!',
    [JETON_IA]:     'Défaite !',
    [JETON_VIDE]:   'Egalité ...'
};

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
export const CSS_NAVBAR = 'navbar';
export const CSS_NAVBAR_P = 'navbar--paragraphe';
export const CSS_NAVBAR_SELECT = 'navbar--selecteur';
export const CSS_POPUP = 'pop-up';
export const CSS_COLONNE = 'colonne';
export const CSS_CELLULE = 'cellule';
export const CSS_JETON_VIDE = 'jeton--vide';
export const CSS_JETON_IA = 'jeton--ia';
export const CSS_JETON_JOUEUR = 'jeton--joueur';
export const CSS_ANIMATION_CHUTE = 'animation--chute';
export const CSS_PAR_JETON = {
    [JETON_VIDE]: CSS_JETON_VIDE,
    [JETON_JOUEUR]: CSS_JETON_JOUEUR,
    [JETON_IA]: CSS_JETON_IA
};
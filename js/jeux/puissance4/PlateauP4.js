import {
    LIGNES,
    COLONNES,
    JETON_VIDE
} from './constantesPuissance4.js';

export default class PlateauP4 {
    constructor() {
        this.reinitialiser();
    }

    placerJeton (ligne, colonne, jeton) {
        this.grille[ligne][colonne] = jeton;
    }

    reinitialiser() {
        this.grille = [];
        for (let ligne = 0; ligne < LIGNES; ligne++) {
            this.grille[ligne] = [];
            for (let colonne = 0; colonne < COLONNES; colonne++) {
                this.grille[ligne][colonne] = JETON_VIDE;
            }
        }
    }

    colonneJouable (colonne) {
        return (this.grille[0][colonne] == JETON_VIDE);
    }

    estGrillePleine () {
        for (let colonne = 0; colonne < COLONNES; colonne++) {
            if (this.colonneJouable(colonne)) return false;
        }
        return true;
    }

    ligneJouable (colonne) {
        for (let ligne = (LIGNES - 1); ligne >= 0; ligne--) {
            if (this.grille[ligne][colonne] == JETON_VIDE) {
                return ligne;
            }
        }
        return false;
    }
}
import { JETON_VIDE, LIGNES } from "./constantesPuissance4.js";

export default class IAMinimax {
    constructor(grille, detecteurVictoire, evaluerPosition, difficulte) {
        this.grille = grille;
        this.detecteurVictoire = detecteurVictoire;
        this.evaluerPosition = evaluerPosition;
        this.profondeur = difficulte.profondeur;
    }

    choisirProchainCoup () {
        return {ligne, colonne};
    }

    colonneJouable (colonne) {
        return (this.grille[0][colonne] == JETON_VIDE);
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
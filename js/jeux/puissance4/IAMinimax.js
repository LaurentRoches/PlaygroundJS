import { 
    COLONNES,
    JETON_IA,
    JETON_JOUEUR,
    JETON_VIDE, 
    LIGNES, 
    SCORE_INFINI_NEGATIF,
    SCORE_INFINI_POSITIF
} from "./constantesPuissance4.js";

export default class IAMinimax {
    constructor(plateau, detecteurVictoire, evaluateurPosition, difficulte) {
        this.detecteurVictoire = detecteurVictoire;
        this.evaluateurPosition = evaluateurPosition;
        this.profondeur = difficulte.profondeur;
        this.plateau = plateau;
    }

    choisirProchainCoup () {
        let meilleurScore = SCORE_INFINI_NEGATIF;
        let colonneChoisi = 0;
        let ligneChoisi = 0;
        for (let colonne = 0; colonne < COLONNES; colonne++) {
            let scoreActuel = 0;
            if (this.colonneJouable(colonne)) {
                let ligneJouable = this.ligneJouable(colonne);
                if (ligneJouable != false) {
                    this.plateau.placerJeton(ligneJouable, colonne, JETON_IA);
                    let nextProfondeur = profondeur - 1;
                    scoreActuel = this.minimax(nextProfondeur, false);
                    if (scoreActuel > meilleurScore) {
                        meilleurScore = scoreActuel
                        colonneChoisi = colonne;
                        ligneChoisi = ligneJouable;
                    }
                    this.plateau.placerJeton(ligneJouable, colonne, JETON_VIDE);
                }
            }
        }

        return {ligneChoisi, colonneChoisi};
    }

    minimax (profondeur, estTourIA) {
        if (profondeur == 0) return this.evaluateurPosition.attribuerScore();
        if (estTourIA) {
            if (this.detecteurVictoire.verifierVictoire(JETON_IA)) return SCORE_INFINI_POSITIF;
        } else {
            if (this.detecteurVictoire.verifierVictoire(JETON_JOUEUR)) return SCORE_INFINI_NEGATIF;
        }
        if (this.estGrillePleine()) return 0;

        if (estTourIA) {
            let meilleurScore = SCORE_INFINI_NEGATIF;
            for (let colonne = 0; colonne < COLONNES; colonne++) {
                let scoreColonne = 0;
                let ligneJouable = this.ligneJouable(colonne);
                if (ligneJouable != false) {
                    this.plateau.placerJeton(ligneJouable, colonne, JETON_IA);
                    let nextProfondeur = profondeur - 1;
                    scoreColonne = this.minimax(nextProfondeur, false);
                    if (scoreColonne > meilleurScore) {
                        meilleurScore = scoreColonne;
                    }
                    this.plateau.placerJeton(ligneJouable, colonne, JETON_VIDE);
                }
            }
            return meilleurScore;
        } else {
            let meilleurScore = SCORE_INFINI_POSITIF;
            for (let colonne = 0; colonne < COLONNES; colonne++) {
                let scoreColonne = 0;
                let ligneJouable = this.ligneJouable(colonne);
                if (ligneJouable != false) {
                    this.plateau.placerJeton(ligneJouable, colonne, JETON_JOUEUR);
                    let nextProfondeur = profondeur - 1;
                    scoreColonne = this.minimax(nextProfondeur, true);
                    if (scoreColonne < meilleurScore) {
                        meilleurScore = scoreColonne;
                    }
                    this.plateau.placerJeton(ligneJouable, colonne, JETON_VIDE);
                }
            }
            return meilleurScore;
        }
    }

    colonneJouable (colonne) {
        return (this.plateau.grille[0][colonne] == JETON_VIDE);
    }

    estGrillePleine () {
        for (let colonne = 0; colonne < COLONNES; colonne++) {
            if (this.colonneJouable(colonne)) return false;
        }
        return true;
    }

    ligneJouable (colonne) {
        for (let ligne = (LIGNES - 1); ligne >= 0; ligne--) {
            if (this.plateau.grille[ligne][colonne] == JETON_VIDE) {
                return ligne;
            }
        }
        return false;
    }
}
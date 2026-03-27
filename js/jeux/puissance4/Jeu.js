import { 
    JETON_IA,
    JETON_JOUEUR, 
    JETON_VIDE 
} from "./constantesPuissance4.js";

export default class Jeu {
    constructor (plateau, detecteurVictoire, iaMinimax) {
        this.plateau = plateau;
        this.detecteurVictoire = detecteurVictoire;
        this.iaMinimax = iaMinimax;
        this.estTourIA = false;
    }

    demarrer () {
        this.plateau.reinitialiser();
        this.estTourIA = false;
    }

    jouerCoupJoueur (colonne) {
        if (this.estTourIA) return false;
        if (!this.plateau.colonneJouable(colonne)) return false;
        let ligne = this.plateau.ligneJouable(colonne);
        this.plateau.placerJeton(ligne, colonne, JETON_JOUEUR);
        if (this.detecteurVictoire.verifierVictoire(JETON_JOUEUR)) return this.terminerPartie(ligne, colonne, JETON_JOUEUR);
        if (this.plateau.estGrillePleine()) return this.terminerPartie(ligne, colonne, JETON_VIDE);
        return { ligne, colonne, resultat: null };
    }

    jouerCoupIA () {
        this.estTourIA = true;
        let coordonneesCoup = this.iaMinimax.choisirProchainCoup();
        let ligne = coordonneesCoup.ligneChoisi;
        let colonne = coordonneesCoup.colonneChoisi
        this.plateau.placerJeton(ligne, colonne, JETON_IA);
        if (this.detecteurVictoire.verifierVictoire(JETON_IA)) return this.terminerPartie(ligne, colonne, JETON_IA);
        if (this.plateau.estGrillePleine()) return this.terminerPartie(ligne, colonne, JETON_VIDE);
        return {ligne, colonne, resultat: null };
    }

    terminerPartie (ligne, colonne, gagnant) {
        this.estTourIA = false;
        return {ligne, colonne, resultat: gagnant};
    }
}
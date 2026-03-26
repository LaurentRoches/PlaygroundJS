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
        let ligneJouable = this.plateau.ligneJouable(colonne);
        this.plateau.placerJeton(ligneJouable, colonne, JETON_JOUEUR);
        if (this.detecteurVictoire.verifierVictoire(JETON_JOUEUR)) return this.terminerPartie(JETON_JOUEUR);
        if (this.plateau.estGrillePleine()) return this.terminerPartie(JETON_VIDE)
        this.jouerCoupIA();
    }

    jouerCoupIA () {
        this.estTourIA = true;
        let coordonneesCoup = this.iaMinimax.choisirProchainCoup();
        this.plateau.placerJeton(coordonneesCoup.ligneChoisi, coordonneesCoup.colonneChoisi, JETON_IA);
        if (this.detecteurVictoire.verifierVictoire(JETON_IA)) return this.terminerPartie(JETON_IA);
        if (this.plateau.estGrillePleine()) return this.terminerPartie(JETON_VIDE)
        this.finDeTour();
    }

    finDeTour() {
        this.estTourIA = false;
    }

    terminerPartie (gagnant) {
        this.estTourIA = false;
        return gagnant;
    }
}
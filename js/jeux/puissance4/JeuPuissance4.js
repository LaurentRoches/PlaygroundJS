import InterfaceJeu from "../../commun/InterfaceJeu.js";
import { 
    DELAI_COUP_IA,
    DIFFICULTE, 
    JETON_IA, 
    JETON_JOUEUR 
} from "./constantesPuissance4.js";
import PlateauP4 from './PlateauP4.js';
import DetecteurVictoire from './DetecteurVictoire.js';
import EvaluateurPosition from './EvaluateurPosition.js';
import IAMinimax from './IAMinimax.js';
import Jeu from './Jeu.js';
import PlateauP4UI from "./PlateauP4UI.js";
import AnimationChute from "./AnimationChute.js";
import Puissance4UI from "./Puissance4UI.js";

export default class JeuPuissance4 extends InterfaceJeu {
    static ID = 'puissance4';
    static NOM = 'Puissance 4';
    static DESCRIPTION = 'Soyez le premier à alligner 4 jetons !';
    static ICONE = '<img src="images/puissance4/puissance4Icon.png" alt="Puissance 4" class="carte-jeu__icone-img" />';
    static UTILISE_SCORES = false;

    constructor (elementConteneur, options = {}) {
        super(elementConteneur, options);
    }

    initialiser() {
        this.plateau = new PlateauP4();
        this.detecteurVictoire = new DetecteurVictoire(this.plateau.grille);
        this.evaluateurPosition = new EvaluateurPosition(this.plateau.grille);
        this.iaMinimax = new IAMinimax(
            this.plateau, 
            this.detecteurVictoire,
            this.evaluateurPosition,
            this.options.difficulte ?? DIFFICULTE.FACILE
        );
        this.jeu = new Jeu(
            this.plateau, 
            this.detecteurVictoire, 
            this.iaMinimax
        );
        this.plateauUI = new PlateauP4UI(this._elementConteneur, this.plateau);
        this.plateauUI.construireGrille();
        this.plateauUI.ecouterClics((colonne) => this.gererCoupJoueur(colonne));
        this.animationChute = new AnimationChute;
        this.puissance4UI = new Puissance4UI(this._elementConteneur);
        this.puissance4UI.construireInterface();
    }

    demarrer () {
        this.jeu.demarrer();
        this.plateauUI.reinitialiserAffichage();
        this.puissance4UI.masquerOverlay();
    }

    arreter () {
    }

    detruire () {
    }

    mettreEnPause() {
    }

    reprendre() {
    }

    async gererCoupJoueur (colonne) {
        let resultatJoueur = this.jeu.jouerCoupJoueur(colonne);
        if (!resultatJoueur) return console.log('Vous ne pouvez pas jouer ici');
        this.plateauUI.mettreAJour(resultatJoueur.ligne, resultatJoueur.colonne, JETON_JOUEUR);
        this.animationChute.jouerAnimation(resultatJoueur.ligne, colonne);
        this.puissance4UI.mettreAJourTour(true);
        if (resultatJoueur.resultat === null) {
            await new Promise(resolve => setTimeout(resolve, DELAI_COUP_IA));
            let resultatIA = this.jeu.jouerCoupIA();
            this.plateauUI.mettreAJour(resultatIA.ligne, resultatIA.colonne, JETON_IA);
            this.animationChute.jouerAnimation(resultatIA.ligne, resultatIA.colonne);
            this.puissance4UI.mettreAJourTour(false);
            if (resultatIA.resultat !== null) {
                this.puissance4UI.afficherOverlay(resultatIA.resultat);
                this.puissance4UI.ecouterBoutonsPopup(() => this.demarrer(), () => this.surFinDePartie?.());
            }
        } else {
            this.puissance4UI.afficherOverlay(resultatJoueur.resultat);
            this.puissance4UI.ecouterBoutonsPopup(() => this.demarrer(), () => this.surFinDePartie?.());
        }
    }
}
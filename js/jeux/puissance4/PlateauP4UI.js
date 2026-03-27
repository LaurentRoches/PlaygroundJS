import { 
    COLONNES, 
    CSS_CELLULE, 
    CSS_COLONNE, 
    CSS_JETON_IA, 
    CSS_JETON_JOUEUR, 
    CSS_JETON_VIDE, 
    CSS_PAR_JETON, 
    LIGNES 
} from "./constantesPuissance4.js";

export default class PlateauP4UI {
    constructor (elementConteneur, plateau) {
        this.elementConteneur = elementConteneur;
        this.plateau = plateau
    }

    construireGrille() {
        for (let colonne = 0; colonne < COLONNES; colonne++) {
            let elementColonne = document.createElement('div');
            elementColonne.className = CSS_COLONNE;
            elementColonne.dataset.colonne = colonne;
            this.elementConteneur.appendChild(elementColonne);
            for (let ligne = 0; ligne < LIGNES; ligne++) {
                let elementLigne = document.createElement('div');
                elementLigne.classList.add(CSS_CELLULE, CSS_JETON_VIDE);
                elementLigne.dataset.ligne = ligne;
                elementColonne.appendChild(elementLigne);
            }
        }
    }

    mettreAJour (ligne, colonne, jeton) {
        let cellule = document.querySelector(`[data-colonne="${colonne}"][data-ligne="${ligne}"]`);
        cellule.classList.remove(CSS_JETON_VIDE, CSS_JETON_JOUEUR, CSS_JETON_IA);
        cellule.classList.add(CSS_PAR_JETON[jeton]);
    }

    reinitialiserAffichage() {
        let cellules = this.elementConteneur.querySelectorAll('[data-ligne]');
        cellules.forEach(cellule => {
            cellule.classList.remove(CSS_JETON_IA, CSS_JETON_JOUEUR, CSS_JETON_VIDE);
            cellule.classList.add(CSS_JETON_VIDE);
        });
    }

    ecouterClics (callback) {
        let colonnes = document.querySelectorAll('[data-colonne]');
        colonnes.forEach(colonne => {
            colonne.addEventListener('click', () => {
                let valeurColonne = parseInt(colonne.dataset.colonne);
                callback(valeurColonne);
            });
        });
    }
}
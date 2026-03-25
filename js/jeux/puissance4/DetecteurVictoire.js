import { LONGUEUR_VICTOIRE } from './constantesPuissance4.js';

export default class DetecteurVictoire {
    constructor(grille) {
        this.grille = grille;
    }

    verifierVictoire (jeton) {
        if (
            this.compterJeton(0, 1, jeton) ||
            this.compterJeton(1, 0, jeton) ||
            this.compterJeton(1, 1, jeton) ||
            this.compterJeton(1, -1, jeton)
        ) {
            return true;
        }
        return false;
    }

    compterJeton (deltaLigne, deltaColonne, jeton) {
        for (let ligne = 0; ligne < this.grille.length; ligne++) {
            for (let colonne = 0; colonne < this.grille[ligne].length; colonne++) {
                let compteur = 0;
                for (let k = 0; k < LONGUEUR_VICTOIRE; k++) {
                    let lig = ligne+k*deltaLigne;
                    let col = colonne+k*deltaColonne;
                    if (
                        lig < 0 ||
                        lig > (this.grille.length - 1) ||
                        col < 0 ||
                        col > (this.grille[ligne].length - 1)
                    ) {
                        break;
                    }
                    let cellule = this.grille[lig][col];
                    if (cellule == jeton) {
                        compteur++
                    } else {
                        break;
                    }
                }
                if (compteur == LONGUEUR_VICTOIRE) return true;
            }
        }
        return false;
    }
}
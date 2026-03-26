import {
    JETON_IA,
    JETON_JOUEUR,
    LONGUEUR_VICTOIRE,
    SCORE_COLONNE_CENTRE,
    SCORE_DEUX_ALIGNES,
    SCORES_MENACE_ADVERSE,
    SCORE_TROIS_ALIGNES,
    SCORE_VICTOIRE,
    COLONNES
} from './constantesPuissance4.js';

export default class EvaluateurPosition {
    constructor(grille) {
        this.grille = grille;
    }

    attribuerScore() {
        const SCORES = {
            4: SCORE_VICTOIRE,
            3: SCORE_TROIS_ALIGNES,
            2: SCORE_DEUX_ALIGNES
        };

        let score = 0;

        for (let ligne = 0; ligne < this.grille.length; ligne++) {
            for (let colonne = 0; colonne < this.grille[ligne].length; colonne++) {

                if (colonne === Math.floor(COLONNES/2)) {
                    score += SCORE_COLONNE_CENTRE;
                }

                const directions = [
                    [0, 1],
                    [1, 1],
                    [1, 0],
                    [1, -1]
                ];

                directions.forEach(([deltaLigne, deltaColonne]) => {
                    const compteur = this.compterJetonsAlignes(ligne, colonne, deltaLigne, deltaColonne, JETON_IA);
                    if (SCORES[compteur]) {
                        score += SCORES[compteur];
                    }
                    
                    const compteurJoueur = this.compterJetonsAlignes(ligne, colonne, deltaLigne, deltaColonne, JETON_JOUEUR);
                    if (SCORES_MENACE_ADVERSE[compteurJoueur]) {
                        score += SCORES_MENACE_ADVERSE[compteurJoueur];
                    }
                });
            }
        }

        return score;
    }

    compterJetonsAlignes (ligne, colonne, deltaLigne, deltaColonne, jeton) {
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

        return compteur;
    }
}
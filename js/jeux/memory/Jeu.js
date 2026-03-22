import PlateauMemory from './PlateauMemory.js';
import MoteurDeJeu from './MoteurDeJeu.js';
import Chronometre from './Chronometre.js';
import {
  DIFFICULTES,
  DIFFICULTE_PAR_DEFAUT,
  SYMBOLES,
  POINTS_PAR_PAIRE,
  BONUS_TEMPS_BASE,
  PENALITE_ERREUR,
  SEUIL_TEMPS_BONUS,
  DUREE_AFFICHAGE_PAIRE_INCORRECTE,
} from './constantesMemory.js';

export default class Jeu {
  constructor(elementConteneur, { difficulte, surFinDePartie, surScoreChange } = {}) {
    this._elementConteneur = elementConteneur;
    this._cleDifficulte = difficulte ?? DIFFICULTE_PAR_DEFAUT;
    this._surFinDePartie = surFinDePartie ?? null;
    this._surScoreChange = surScoreChange ?? null;

    this._difficulte = DIFFICULTES[this._cleDifficulte];
    this._score = 0;
    this._moteur = null;
    this._plateau = null;
    this._chrono = null;
  }

  get score() {
    return this._score;
  }

  get tempsEcoule() {
    return this._chrono ? this._chrono.tempsEcoule : 0;
  }

  get pairesRestantes() {
    return this._moteur ? this._moteur.pairesRestantes : 0;
  }

  get pairesTotales() {
    return this._moteur ? this._moteur.pairesTotales : 0;
  }

  get difficulte() {
    return this._difficulte;
  }

  demarrer() {
    this._score = 0;
    this._difficulte = DIFFICULTES[this._cleDifficulte];

    this._moteur = new MoteurDeJeu(
      this._difficulte.paires,
      SYMBOLES.slice(0, this._difficulte.paires)
    );

    this._plateau = new PlateauMemory(this._elementConteneur, this._difficulte);
    this._chrono = new Chronometre();

    this._cablerCallbacks();
    this._plateau.creer(this._moteur.cartes);
    this._chrono.demarrer();
  }

  _cablerCallbacks() {
    this._moteur.surCarteRetournee = (carte) => {
      this._plateau.mettreAJourCarte(carte.id, carte);
    };

    this._moteur.surPaireTrouvee = (carte1, carte2) => {
      this._plateau.mettreAJourCarte(carte1.id, carte1);
      this._plateau.mettreAJourCarte(carte2.id, carte2);
      this._incrementerScore();
      this._surScoreChange?.(this._score);
    };

    this._moteur.surPaireIncorrecte = (carte1, carte2) => {
      this._plateau.verrouillerTout();
      this._plateau.signalerIncorrect(carte1.id, carte2.id);
      setTimeout(() => this._plateau.deverrouillerTout(), DUREE_AFFICHAGE_PAIRE_INCORRECTE);
    };

    this._moteur.surPartieTerminee = () => {
      this._chrono.arreter();
      this._calculerScoreFinal();
      this._surFinDePartie?.({
        score: this._score,
        temps: this._chrono.tempsEcoule,
        erreurs: this._moteur.nombreErreurs,
      });
    };

    this._plateau.surClicCarte = (idCarte) => {
      this._moteur.selectionnerCarte(idCarte);
    };

    this._chrono.surTick = () => {
      this._surScoreChange?.(this._score);
    };
  }

  _incrementerScore() {
    this._score += POINTS_PAR_PAIRE;
  }

  _calculerScoreFinal() {
    const pointsPaires = this._difficulte.paires * POINTS_PAR_PAIRE;
    const penalite = this._moteur.nombreErreurs * PENALITE_ERREUR;
    const tempsRestant = Math.max(0, SEUIL_TEMPS_BONUS - this._chrono.tempsEcoule);
    const bonusTemps = Math.floor((tempsRestant / SEUIL_TEMPS_BONUS) * BONUS_TEMPS_BASE);
    this._score = Math.max(0, pointsPaires - penalite + bonusTemps);
  }

  mettreEnPause() {
    this._chrono?.mettreEnPause();
    this._plateau?.verrouillerTout();
  }

  reprendre() {
    this._chrono?.reprendre();
    this._plateau?.deverrouillerTout();
  }

  arreter() {
    this._chrono?.arreter();
    this._plateau?.verrouillerTout();
  }

  detruire() {
    this.arreter();
    this._plateau?.detruire();
    this._plateau = null;
    this._moteur = null;
    this._chrono = null;
  }

  changerDifficulte(cleDifficulte) {
    this.detruire();
    this._cleDifficulte = cleDifficulte;
    this._score = 0;
  }
}

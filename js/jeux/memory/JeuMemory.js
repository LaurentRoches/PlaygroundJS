import InterfaceJeu from '../../commun/InterfaceJeu.js';
import { ETATS_JEU } from '../../commun/constantes.js';
import Jeu from './Jeu.js';

export default class JeuMemory extends InterfaceJeu {
  static ID = 'memory';
  static NOM = 'Memory';
  static DESCRIPTION = 'Retournez les cartes et retrouvez toutes les paires le plus vite possible.';
  static ICONE = 'images/memory/memoryIcon.png';
  static UTILISE_SCORES = true;

  constructor(elementConteneur, options = {}) {
    super(elementConteneur, options);
    this._jeu = null;
    this._wrapper = null;
  }

  initialiser() {
    this._wrapper = document.createElement('div');
    this._wrapper.className = 'jeu-memory';
    this._elementConteneur.appendChild(this._wrapper);

    this._jeu = new Jeu(this._wrapper, {
      difficulte: this._options.difficulte,
      surFinDePartie: (resultat) => this.surFinDePartie?.(resultat),
      surScoreChange: (score) => this.surScoreChange?.(score),
    });

    this._changerEtat(ETATS_JEU.PRET);
  }

  demarrer() {
    this._jeu.demarrer();
    this._changerEtat(ETATS_JEU.EN_COURS);
  }

  mettreEnPause() {
    this._jeu.mettreEnPause();
    this._changerEtat(ETATS_JEU.EN_PAUSE);
  }

  reprendre() {
    this._jeu.reprendre();
    this._changerEtat(ETATS_JEU.EN_COURS);
  }

  arreter() {
    this._jeu.arreter();
    this._changerEtat(ETATS_JEU.TERMINE);
  }

  detruire() {
    this._jeu?.detruire();
    this._wrapper?.remove();
    this._jeu = null;
    this._wrapper = null;
  }

  get scoreActuel() {
    return {
      points: this._jeu ? this._jeu.score : 0,
      niveau: 1,
      jeuId: JeuMemory.ID,
    };
  }
}

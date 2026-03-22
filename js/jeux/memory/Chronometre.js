import { INTERVALLE_CHRONOMETRE } from './constantesMemory.js';

export default class Chronometre {
  constructor() {
    this._tempsDepart = 0;
    this._tempsEcoule = 0;
    this._tempsPause = 0;
    this._idIntervalle = null;
    this._enCours = false;

    this.surTick = null;
  }

  get tempsEcoule() {
    return this._tempsEcoule;
  }

  get enCours() {
    return this._enCours;
  }

  get tempsFormate() {
    const minutes = Math.floor(this._tempsEcoule / 60);
    const secondes = this._tempsEcoule % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
  }

  demarrer() {
    this._tempsDepart = Date.now();
    this._enCours = true;
    this._idIntervalle = setInterval(() => {
      this._tempsEcoule = Math.floor((Date.now() - this._tempsDepart) / 1000) + this._tempsPause;
      this.surTick?.(this._tempsEcoule);
    }, INTERVALLE_CHRONOMETRE);
  }

  mettreEnPause() {
    if (!this._enCours) return;
    clearInterval(this._idIntervalle);
    this._idIntervalle = null;
    this._tempsPause = this._tempsEcoule;
    this._enCours = false;
  }

  reprendre() {
    if (this._enCours) return;
    this._tempsDepart = Date.now();
    this._enCours = true;
    this._idIntervalle = setInterval(() => {
      this._tempsEcoule = Math.floor((Date.now() - this._tempsDepart) / 1000) + this._tempsPause;
      this.surTick?.(this._tempsEcoule);
    }, INTERVALLE_CHRONOMETRE);
  }

  arreter() {
    clearInterval(this._idIntervalle);
    this._idIntervalle = null;
    this._enCours = false;
  }

  reinitialiser() {
    this.arreter();
    this._tempsDepart = 0;
    this._tempsEcoule = 0;
    this._tempsPause = 0;
  }
}

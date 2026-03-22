import Carte from './Carte.js';
import { DUREE_AFFICHAGE_PAIRE_INCORRECTE } from './constantesMemory.js';

export default class MoteurDeJeu {
  constructor(nombrePaires, symboles) {
    this._nombrePaires = nombrePaires;
    this._symboles = symboles;
    this._cartes = [];
    this._cartesRetournees = [];
    this._pairesRestantes = 0;
    this._nombreErreurs = 0;
    this._estVerrouille = false;
    this._timerComparaison = null;

    this.surCarteRetournee = null;
    this.surPaireTrouvee = null;
    this.surPaireIncorrecte = null;
    this.surPartieTerminee = null;

    this._cartes = this._creerCartes();
    this._pairesRestantes = nombrePaires;
  }

  get cartes() {
    return [...this._cartes];
  }

  get pairesRestantes() {
    return this._pairesRestantes;
  }

  get pairesTotales() {
    return this._nombrePaires;
  }

  get nombreErreurs() {
    return this._nombreErreurs;
  }

  get estTermine() {
    return this._pairesRestantes === 0;
  }

  get estVerrouille() {
    return this._estVerrouille;
  }

  _creerCartes() {
    const cartes = [];
    for (let i = 0; i < this._nombrePaires; i++) {
      cartes.push(new Carte(i * 2, i, this._symboles[i]));
      cartes.push(new Carte(i * 2 + 1, i, this._symboles[i]));
    }
    return cartes;
  }

  selectionnerCarte(idCarte) {
    if (this._estVerrouille) return;

    const carte = this._cartes.find(c => c.id === idCarte);
    if (!carte || carte.estRetournee || carte.estTrouvee) return;

    carte.retourner();
    this.surCarteRetournee?.(carte);
    this._cartesRetournees.push(carte);

    if (this._cartesRetournees.length < 2) return;

    const [carte1, carte2] = this._cartesRetournees;

    if (carte1.correspondA(carte2)) {
      carte1.marquerTrouvee();
      carte2.marquerTrouvee();
      this._pairesRestantes--;
      this.surPaireTrouvee?.(carte1, carte2);
      this._cartesRetournees = [];
      if (this.estTermine) {
        this.surPartieTerminee?.();
      }
    } else {
      this._nombreErreurs++;
      this._estVerrouille = true;
      this.surPaireIncorrecte?.(carte1, carte2);
      this._timerComparaison = setTimeout(() => {
        carte1.masquer();
        carte2.masquer();
        this._estVerrouille = false;
        this._cartesRetournees = [];
        this.surCarteRetournee?.(carte1);
        this.surCarteRetournee?.(carte2);
      }, DUREE_AFFICHAGE_PAIRE_INCORRECTE);
    }
  }

  reinitialiser() {
    clearTimeout(this._timerComparaison);
    this._timerComparaison = null;
    this._cartes.forEach(c => c.reinitialiser());
    this._cartesRetournees = [];
    this._pairesRestantes = this._nombrePaires;
    this._nombreErreurs = 0;
    this._estVerrouille = false;
  }
}

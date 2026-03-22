export default class Carte {
  constructor(id, idPaire, symbole) {
    this._id = id;
    this._idPaire = idPaire;
    this._symbole = symbole;
    this._estRetournee = false;
    this._estTrouvee = false;
  }

  get id() {
    return this._id;
  }

  get idPaire() {
    return this._idPaire;
  }

  get symbole() {
    return this._symbole;
  }

  get estRetournee() {
    return this._estRetournee;
  }

  get estTrouvee() {
    return this._estTrouvee;
  }

  retourner() {
    if (this._estTrouvee) return;
    this._estRetournee = true;
  }

  masquer() {
    if (this._estTrouvee) return;
    this._estRetournee = false;
  }

  marquerTrouvee() {
    this._estTrouvee = true;
    this._estRetournee = true;
  }

  correspondA(autreCarte) {
    return this._idPaire === autreCarte.idPaire;
  }

  reinitialiser() {
    this._estRetournee = false;
    this._estTrouvee = false;
  }
}

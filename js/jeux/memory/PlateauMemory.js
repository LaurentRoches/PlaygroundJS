import {
  CSS_PLATEAU,
  CSS_CARTE,
  CSS_CARTE_INTERIEUR,
  CSS_CARTE_FACE,
  CSS_CARTE_DOS,
  CSS_CARTE_RETOURNEE,
  CSS_CARTE_TROUVEE,
  CSS_CARTE_VERROUILLEE,
} from './constantesMemory.js';

function melangerFisherYates(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export default class PlateauMemory {
  constructor(elementParent, difficulte) {
    this._elementParent = elementParent;
    this._difficulte = difficulte;
    this._conteneur = null;
    this._elementsCartes = new Map();
    this._ecouteurClic = null;

    this.surClicCarte = null;
  }

  creer(cartes) {
    this._conteneur = document.createElement('div');
    this._conteneur.className = CSS_PLATEAU;
    this._conteneur.style.setProperty('--colonnes-memory', this._difficulte.colonnes);

    const cartesMelangees = melangerFisherYates(cartes);
    cartesMelangees.forEach((carte, index) => {
      const element = this._creerElementCarte(carte);
      element.style.setProperty('--carte-index', index);
      this._elementsCartes.set(carte.id, element);
      this._conteneur.appendChild(element);
    });

    this._ecouteurClic = this._gererClic.bind(this);
    this._conteneur.addEventListener('click', this._ecouteurClic);

    this._elementParent.appendChild(this._conteneur);
  }

  _creerElementCarte(carte) {
    const elementCarte = document.createElement('div');
    elementCarte.className = CSS_CARTE;
    elementCarte.dataset.id = carte.id;

    const interieur = document.createElement('div');
    interieur.className = CSS_CARTE_INTERIEUR;

    const dos = document.createElement('div');
    dos.className = CSS_CARTE_DOS;
    const imgDos = document.createElement('img');
    imgDos.src = 'images/memory/memoryCardBack.png';
    imgDos.alt = 'dos';
    dos.appendChild(imgDos);

    const face = document.createElement('div');
    face.className = CSS_CARTE_FACE;
    if (carte.symbole.startsWith('images/')) {
      const imgFace = document.createElement('img');
      imgFace.src = carte.symbole;
      imgFace.alt = 'symbole';
      face.appendChild(imgFace);
    } else {
      face.textContent = carte.symbole;
    }

    interieur.appendChild(dos);
    interieur.appendChild(face);
    elementCarte.appendChild(interieur);

    return elementCarte;
  }

  _gererClic(event) {
    const elementCarte = event.target.closest(`.${CSS_CARTE}`);
    if (!elementCarte) return;

    const idCarte = parseInt(elementCarte.dataset.id, 10);
    if (this.surClicCarte) {
      this.surClicCarte(idCarte);
    }
  }

  mettreAJourCarte(idCarte, carte) {
    const element = this._elementsCartes.get(idCarte);
    if (!element) return;

    element.classList.toggle(CSS_CARTE_RETOURNEE, carte.estRetournee);
    element.classList.toggle(CSS_CARTE_TROUVEE, carte.estTrouvee);
  }

  verrouillerTout() {
    this._elementsCartes.forEach(element => {
      element.classList.add(CSS_CARTE_VERROUILLEE);
    });
  }

  deverrouillerTout() {
    this._elementsCartes.forEach(element => {
      element.classList.remove(CSS_CARTE_VERROUILLEE);
    });
  }

  signalerIncorrect(id1, id2) {
    [id1, id2].forEach(id => {
      const el = this._elementsCartes.get(id);
      if (!el) return;
      el.classList.add('carte--incorrecte');
      setTimeout(() => el.classList.remove('carte--incorrecte'), 600);
    });
  }

  effacer() {
    this._elementsCartes.forEach(element => {
      element.classList.remove(CSS_CARTE_RETOURNEE, CSS_CARTE_TROUVEE, CSS_CARTE_VERROUILLEE);
    });
  }

  detruire() {
    if (this._conteneur) {
      this._conteneur.removeEventListener('click', this._ecouteurClic);
      this._conteneur.remove();
      this._conteneur = null;
    }
    this._elementsCartes.clear();
    this._ecouteurClic = null;
  }
}

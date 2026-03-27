import InterfaceJeu from '../../commun/InterfaceJeu.js';
import { ETATS_JEU } from '../../commun/constantes.js';
import { DIFFICULTE_PAR_DEFAUT } from './constantesMemory.js';
import SelecteurProfil from '../../commun/SelecteurProfil.js';
import Jeu from './Jeu.js';
import MemoryUI from './ui/MemoryUI.js';

export default class JeuMemory extends InterfaceJeu {
  static ID          = 'memory';
  static NOM         = 'Memory';
  static DESCRIPTION = 'Retournez les cartes et retrouvez toutes les paires le plus vite possible.';
  static ICONE       = '<img src="images/memory/memoryIcon.png" alt="Memory" class="carte-jeu__icone-img" />';
  static UTILISE_SCORES = true;

  constructor(elementConteneur, options = {}) {
    super(elementConteneur, options);
    this._jeu           = null;
    this._memoryUI      = null;
    this._wrapper       = null;
    this._selecteur     = null;
    this._cleDifficulte = options.difficulte ?? DIFFICULTE_PAR_DEFAUT;
  }

  initialiser() {
    this._wrapper = document.createElement('div');
    this._wrapper.className = 'jeu-memory';
    this._elementConteneur.appendChild(this._wrapper);

    this._jeu = new Jeu(this._wrapper, {
      difficulte: this._cleDifficulte,
      surFinDePartie: (resultat) => {
        this._memoryUI?.afficherFinDePartie(resultat);
        this.surFinDePartie?.(resultat);
        this._changerEtat(ETATS_JEU.TERMINE);
      },
      surScoreChange: (score) => {
        this._memoryUI?.mettreAJourScore(score);
        this.surScoreChange?.(score);
      },
    });

    this._memoryUI = new MemoryUI(
      this._wrapper,
      this._jeu,
      this._options.depotScores        ?? null,
      null,
      {
        surRetourMenu:       () => { window.location.hash = '#accueil'; },
        gestionnaireProfils: this._options.gestionnaireProfils ?? null,
        surRejouer: () => {
          this._jeu.changerDifficulte(this._cleDifficulte);
          this._jeu.demarrer();
          this._changerEtat(ETATS_JEU.EN_COURS);
        },
        surChangerDifficulte: (cle) => {
          this._cleDifficulte = cle;
          this._jeu.changerDifficulte(cle);
          this._jeu.demarrer();
          this._changerEtat(ETATS_JEU.EN_COURS);
        },
      }
    );

    this._changerEtat(ETATS_JEU.PRET);
  }

  demarrer() {
    this._selecteur = new SelecteurProfil(
      this._wrapper,
      this._options.gestionnaireProfils ?? null,
      {
        titreBouton: 'Jouer',
        onSelect: (profil) => {
          this._selecteur.detruire();
          this._selecteur = null;
          this._changerEtat(ETATS_JEU.EN_COURS);
          this._memoryUI.definirProfil(profil);
          this._memoryUI.afficher();
        },
        onFermer: () => {
          this._selecteur = null;
          window.location.hash = '#accueil';
        },
      }
    );
    this._selecteur.afficher();
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
    if (this._selecteur) {
      this._selecteur.detruire();
      this._selecteur = null;
    }
    this._memoryUI?.masquer();
    this._wrapper?.remove();
    this._jeu      = null;
    this._memoryUI = null;
    this._wrapper  = null;
  }

  get scoreActuel() {
    return {
      points: this._jeu ? this._jeu.score : 0,
      niveau: 1,
      jeuId:  JeuMemory.ID,
    };
  }
}

import Score from '../../../score/Score.js';
import { DIFFICULTES } from '../constantesMemory.js';
import MemoryScoresUI from './MemoryScoresUI.js';

export default class MemoryUI {
  constructor(elementConteneur, jeu, depotScores, profilActif, {
    surRetourMenu        = null,
    surRejouer           = null,
    surChangerDifficulte = null,
    gestionnaireProfils  = null,
  } = {}) {
    this._conteneur           = elementConteneur;
    this._jeu                 = jeu;
    this._depotScores         = depotScores;
    this._profilActif         = profilActif;
    this._surRetourMenu       = surRetourMenu;
    this._surRejouer          = surRejouer;
    this._surChangerDifficulte = surChangerDifficulte;
    this._gestionnaireProfils  = gestionnaireProfils;

    this._hud             = null;
    this._elPaires        = null;
    this._elTemps         = null;
    this._elScore         = null;
    this._elDifficulte    = null;
    this._elBtnPause      = null;
    this._overlay         = null;
    this._estEnPause      = false;
    this._partieTerminee  = false;
    this._scoreAffiche    = 0;
    this._animationScoreId = null;
  }

  definirProfil(profil) {
    this._profilActif = profil;
  }

  afficher() {
    this._partieTerminee = false;
    this._creerHUD();
    this._jeu.demarrer();
    // Le select est désactivé dès le démarrage (activé seulement en pause)
    if (this._elDifficulte) this._elDifficulte.disabled = true;
    this._mettreAJourPaires(this._jeu.pairesRestantes, this._jeu.pairesTotales);
  }

  masquer() {
    if (this._animationScoreId) {
      cancelAnimationFrame(this._animationScoreId);
      this._animationScoreId = null;
    }
    this._jeu.arreter();
    this._supprimerHUD();
    this._supprimerOverlay();
    this._estEnPause     = false;
    this._partieTerminee = false;
  }

  mettreAJourScore(score) {
    if (!this._elScore) return;
    this._animerScore(this._scoreAffiche, score);
    this._scoreAffiche = score;
    this._mettreAJourPaires(this._jeu.pairesRestantes, this._jeu.pairesTotales);
    this._pulserTemps();
  }

  mettreAJourTemps(tempsFormate) {
    if (this._elTemps) this._elTemps.textContent = tempsFormate;
  }

  afficherFinDePartie(resultat) {
    this._partieTerminee = true;
    this._enregistrerScore(resultat);
    const meilleur = this._lireMeilleurScore();
    this._creerOverlayFin(resultat, meilleur);
    // Réactiver le select difficulté (la partie est terminée)
    if (this._elDifficulte) this._elDifficulte.disabled = false;
  }

  /* ---- Privé : HUD ---- */

  _creerHUD() {
    const nomJoueur       = this._profilActif?.nom ?? 'Joueur';
    const cleDiffActuelle = this._cleDifficulteActuelle();

    this._hud = document.createElement('header');
    this._hud.className = 'hud';
    this._hud.innerHTML = `
      <span class="hud__profil">${nomJoueur}</span>
      <span class="hud__paires">Paires : 0 / ${this._jeu.pairesTotales}</span>
      <span class="hud__temps">00:00</span>
      <span class="hud__score">Score : 0</span>
      <div class="hud__actions">
        <select class="hud__difficulte" aria-label="Difficulté" disabled>
          ${Object.entries(DIFFICULTES).map(([cle, d]) =>
            `<option value="${cle}"${cle === cleDiffActuelle ? ' selected' : ''}>${d.nom} (${d.colonnes}×${d.lignes})</option>`
          ).join('')}
        </select>
        <button class="hud__btn hud__scores-btn" aria-label="Classement">
          <img src="images/classementIcon.png" alt="Classement" style="width:16px;height:16px;object-fit:contain;" />
        </button>
        <button class="hud__btn hud__pause">Pause</button>
      </div>
    `;

    this._elPaires     = this._hud.querySelector('.hud__paires');
    this._elTemps      = this._hud.querySelector('.hud__temps');
    this._elScore      = this._hud.querySelector('.hud__score');
    this._elDifficulte = this._hud.querySelector('.hud__difficulte');
    this._elBtnPause   = this._hud.querySelector('.hud__pause');

    this._elBtnPause.addEventListener('click', () => this._togglePause());
    this._elDifficulte.addEventListener('change', (e) => this._gererChangementDifficulte(e.target.value));
    this._hud.querySelector('.hud__scores-btn').addEventListener('click', () => this._ouvrirScores());

    this._conteneur.prepend(this._hud);
  }

  _supprimerHUD() {
    if (this._hud) {
      this._hud.remove();
      this._hud = null;
    }
    this._elPaires     = null;
    this._elTemps      = null;
    this._elScore      = null;
    this._elDifficulte = null;
    this._elBtnPause   = null;
  }

  _togglePause() {
    this._estEnPause = !this._estEnPause;
    if (this._estEnPause) {
      this._jeu.mettreEnPause();
      this._elBtnPause.textContent = 'Reprendre';
      if (this._elDifficulte) this._elDifficulte.disabled = false;
    } else {
      this._jeu.reprendre();
      this._elBtnPause.textContent = 'Pause';
      if (this._elDifficulte) this._elDifficulte.disabled = true;
    }
  }

  _gererChangementDifficulte(cle) {
    if (this._surChangerDifficulte) {
      this._supprimerOverlay();
      this._surChangerDifficulte(cle); // JeuMemory : changerDifficulte() + demarrer()
      this._reinitialiserHUD();        // pairesTotales est correct maintenant
    }
  }

  _reinitialiserHUD() {
    this._scoreAffiche   = 0;
    this._partieTerminee = false;
    this._estEnPause     = false;
    if (this._animationScoreId) {
      cancelAnimationFrame(this._animationScoreId);
      this._animationScoreId = null;
    }
    if (this._elScore)     this._elScore.textContent  = 'Score : 0';
    if (this._elTemps)     this._elTemps.textContent  = '00:00';
    if (this._elPaires)    this._elPaires.textContent = `Paires : 0 / ${this._jeu.pairesTotales}`;
    if (this._elBtnPause)  this._elBtnPause.textContent = 'Pause';
    if (this._elDifficulte) this._elDifficulte.disabled = true;
  }

  /* ---- Privé : animations HUD ---- */

  _animerScore(ancien, nouveau) {
    if (this._animationScoreId) cancelAnimationFrame(this._animationScoreId);
    if (!this._elScore) return;

    const duree = 450;
    const debut = performance.now();
    const delta = nouveau - ancien;

    const step = (maintenant) => {
      const elapsed  = maintenant - debut;
      const progress = Math.min(elapsed / duree, 1);
      const easing   = 1 - Math.pow(1 - progress, 3); // ease-out cubique
      const valeur   = Math.round(ancien + delta * easing);
      this._elScore.textContent = `Score : ${valeur}`;
      if (progress < 1) {
        this._animationScoreId = requestAnimationFrame(step);
      } else {
        this._animationScoreId = null;
        // Flash CSS sur le score une fois l'animation JS terminée
        this._elScore.classList.remove('hud__score--anime');
        void this._elScore.offsetWidth; // reflow pour réinitialiser l'animation CSS
        this._elScore.classList.add('hud__score--anime');
      }
    };

    this._animationScoreId = requestAnimationFrame(step);
  }

  _pulserTemps() {
    if (!this._elTemps) return;
    const tempsFormate = this._formaterTemps(this._jeu.tempsEcoule);
    this._elTemps.textContent = tempsFormate;
    this._elTemps.classList.remove('hud__temps--tick');
    void this._elTemps.offsetWidth; // reflow
    this._elTemps.classList.add('hud__temps--tick');
  }

  _mettreAJourPaires(restantes, total) {
    if (this._elPaires) {
      this._elPaires.textContent = `Paires : ${total - restantes} / ${total}`;
    }
  }

  _formaterTemps(secondes) {
    const mm = String(Math.floor(secondes / 60)).padStart(2, '0');
    const ss = String(secondes % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  _cleDifficulteActuelle() {
    const diff = this._jeu.difficulte;
    return Object.entries(DIFFICULTES).find(([, v]) => v === diff)?.[0] ?? 'NORMAL';
  }

  /* ---- Privé : overlay fin de partie ---- */

  _enregistrerScore(resultat) {
    if (!this._depotScores || !this._profilActif) return;
    this._depotScores.enregistrer(new Score({
      profilId: this._profilActif.id,
      jeuId:    'memory',
      points:   resultat.score,
      niveau:   1,
      details:  { temps: resultat.temps, erreurs: resultat.erreurs },
    }));
  }

  _lireMeilleurScore() {
    if (!this._depotScores || !this._profilActif) return 0;
    const scores = this._depotScores.listerParJeuEtProfil('memory', this._profilActif.id);
    return scores.reduce((max, s) => Math.max(max, s.points), 0);
  }

  _creerOverlayFin(resultat, meilleur) {
    const estRecord = resultat.score >= meilleur && meilleur > 0;

    this._overlay = document.createElement('div');
    this._overlay.className = 'overlay-fin';
    this._overlay.innerHTML = `
      <div class="overlay-fin__carte">
        <h2 class="overlay-fin__titre">Bravo !</h2>
        <div class="overlay-fin__stats">
          <div class="overlay-fin__ligne">
            <span>Score final</span>
            <span>${resultat.score}</span>
          </div>
          <div class="overlay-fin__ligne">
            <span>Temps</span>
            <span>${this._formaterTemps(resultat.temps)}</span>
          </div>
          <div class="overlay-fin__ligne">
            <span>Erreurs</span>
            <span>${resultat.erreurs}</span>
          </div>
          <div class="overlay-fin__ligne${estRecord ? ' overlay-fin__ligne--record' : ''}">
            <span>Meilleur score</span>
            <span>${meilleur}${estRecord ? ' ★' : ''}</span>
          </div>
        </div>
        <div class="overlay-fin__boutons">
          <button class="btn btn--primaire btn--rejouer">Rejouer</button>
          <button class="btn btn--secondaire btn--scores-fin">
            <img src="images/classementIcon.png" alt=""
              style="width:14px;height:14px;object-fit:contain;margin-right:6px;" />Scores
          </button>
          <button class="btn btn--secondaire btn--menu">Accueil</button>
        </div>
      </div>
    `;

    this._overlay.querySelector('.btn--rejouer').addEventListener('click', () => {
      this._supprimerOverlay();
      // On redémarre d'abord (pour que pairesTotales soit correct), puis on réinitialise le HUD
      if (this._surRejouer) this._surRejouer();
      this._reinitialiserHUD();
    });

    this._overlay.querySelector('.btn--scores-fin').addEventListener('click', () => {
      this._ouvrirScores();
    });

    this._overlay.querySelector('.btn--menu').addEventListener('click', () => {
      if (this._surRetourMenu) this._surRetourMenu();
    });

    this._conteneur.appendChild(this._overlay);
  }

  _supprimerOverlay() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  }

  /* ---- Privé : vue des scores ---- */

  _ouvrirScores() {
    if (!this._depotScores) return;

    // Ne pas tenter de mettre en pause une partie déjà terminée
    const etaitEnPause    = this._estEnPause;
    const partieTerminee  = this._partieTerminee;

    if (!etaitEnPause && !partieTerminee) {
      this._jeu.mettreEnPause();
      this._estEnPause = true;
      if (this._elBtnPause)   this._elBtnPause.textContent = 'Reprendre';
      if (this._elDifficulte) this._elDifficulte.disabled  = false;
    }

    const scoresUI = new MemoryScoresUI(
      this._conteneur,
      this._depotScores,
      this._gestionnaireProfils,
      {
        surRetour: () => {
          scoresUI.masquer();
          if (!etaitEnPause && !partieTerminee) {
            this._jeu.reprendre();
            this._estEnPause = false;
            if (this._elBtnPause)   this._elBtnPause.textContent = 'Pause';
            if (this._elDifficulte) this._elDifficulte.disabled  = true;
          }
        },
      }
    );
    scoresUI.afficher();
  }
}

import Routeur from './commun/Routeur.js';
import GestionnaireVues from './commun/GestionnaireVues.js';
import DepotLocal from './commun/DepotLocal.js';
import GestionnaireProfils from './profil/GestionnaireProfils.js';
import DepotScores from './score/DepotScores.js';
import AccueilUI from './accueil/AccueilUI.js';
import JeuSnake from './jeux/snake/JeuSnake.js';
import JeuMemory from './jeux/memory/JeuMemory.js';

const app = document.getElementById('app');
const depotGlobal = DepotLocal.creerGlobal();
const gestionnaireProfils = new GestionnaireProfils(depotGlobal);
const depotScores = new DepotScores(depotGlobal);

const registreJeux = [
  JeuSnake,
  JeuMemory,
];

const gestionnaireVues = new GestionnaireVues(app);
const routeur = new Routeur(app);

gestionnaireVues.enregistrerVue('accueil', () =>
  new AccueilUI(app, routeur, registreJeux, gestionnaireProfils)
);

routeur.enregistrerRoute(
  'accueil',
  () => gestionnaireVues.afficherVue('accueil'),
  () => gestionnaireVues.masquerVueCourante()
);

let jeuCourant = null;

routeur.enregistrerRoute(
  JeuSnake.ID,
  () => {
    jeuCourant = new JeuSnake(app, { depotScores, gestionnaireProfils });
    jeuCourant.initialiser();
    jeuCourant.demarrer();
  },
  () => {
    if (jeuCourant) {
      jeuCourant.detruire();
      jeuCourant = null;
    }
  }
);

routeur.enregistrerRoute(
  JeuMemory.ID,
  () => {
    jeuCourant = new JeuMemory(app, { depotScores, gestionnaireProfils });
    jeuCourant.initialiser();
    jeuCourant.demarrer();
  },
  () => {
    if (jeuCourant) {
      jeuCourant.detruire();
      jeuCourant = null;
    }
  }
);

routeur.demarrer();

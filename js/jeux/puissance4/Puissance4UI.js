import { 
    CSS_NAVBAR, 
    CSS_NAVBAR_P, 
    CSS_POPUP, 
    DIFFICULTE,
    MESSAGE_RESULTAT
} from "./constantesPuissance4.js";

export default class Puissance4UI {
    constructor (elementConteneur) {
        this.elementConteneur = elementConteneur;
    }

    construireInterface() {
        let navBar = document.createElement('div');
        navBar.classList.add(CSS_NAVBAR);
        
        let elementTour = document.createElement('p');
        elementTour.append(`Tour de : Joueur`);
        elementTour.classList.add(CSS_NAVBAR_P);
        this.elementTour = elementTour;
        navBar.appendChild(elementTour);

        let selecteurDifficulte = document.createElement('select');
        Object.values(DIFFICULTE).forEach(difficulte => {
            let option = document.createElement('option');
            option.value = difficulte.nom;
            option.textContent = difficulte.nom;
            option.dataset.profondeur = difficulte.profondeur;
            selecteurDifficulte.appendChild(option);
        });
        this.selecteurDifficulte = selecteurDifficulte;
        navBar.appendChild(selecteurDifficulte);

        let boutonAction = document.createElement('button');
        boutonAction.textContent = "Recommencer";
        this.boutonAction = boutonAction;
        navBar.appendChild(boutonAction);

        this.elementConteneur.appendChild(navBar);
    }

    mettreAJourTour (estTourIA) {
        this.elementTour.textContent = (estTourIA ? "Tour de : IA" : "Tour de : Joueur");
    }

    afficherOverlay (resultat) {
        let popup = document.createElement('div');
        popup.classList.add(CSS_POPUP);

        let message = document.createElement('p');
        message.textContent = MESSAGE_RESULTAT[resultat];
        popup.appendChild(message);

        let boutonRejouer = document.createElement('button');
        boutonRejouer.textContent = 'Rejouer';
        this.boutonRejouer = boutonRejouer;
        popup.appendChild(boutonRejouer);

        let boutonQuitter = document.createElement('button');
        boutonQuitter.textContent = 'Quitter';
        this.boutonQuitter = boutonQuitter;
        popup.appendChild(boutonQuitter);

        this.popup = popup;
        this.elementConteneur.appendChild(popup);
    }

    masquerOverlay () {
        if (this.popup) this.popup.remove();
    }

    ecouterBoutonsPopup (onRejouer, onQuitter) {
        this.boutonRejouer.addEventListener('click', onRejouer);
        this.boutonQuitter.addEventListener('click', onQuitter);
    }
}
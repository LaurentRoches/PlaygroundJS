import { CSS_ANIMATION_CHUTE } from "./constantesPuissance4.js";

export default class AnimationChute {

    jouerAnimation (ligne, colonne) {
        let cellule = document.querySelector(`[data-colonne="${colonne}"][data-ligne="${ligne}"]`);
        cellule.classList.add(CSS_ANIMATION_CHUTE);
        cellule.addEventListener('animationend', () => {
            cellule.classList.remove(CSS_ANIMATION_CHUTE);
        });
    }
}
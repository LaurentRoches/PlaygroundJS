export default class Score {
  constructor({
    id = null,
    profilId,
    jeuId,
    points,
    niveau = 1,
    details = null,
    date = new Date().toISOString(),
  } = {}) {
    this.id = id ?? `score_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.profilId = profilId;
    this.jeuId = jeuId;
    this.points = points;
    this.niveau = niveau;
    this.details = details;
    this.date = date;
  }
}

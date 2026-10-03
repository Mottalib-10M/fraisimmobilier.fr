/**
 * Moteur des frais de notaire (fonctions pures, aucun accès réseau).
 * Paramètres : src/data/params-2026.json et src/data/departements.json (tableau DGFiP au 1er juin 2026).
 *
 * Frais d'acquisition = droits de mutation (taxe départementale + taxe communale + frais d'assiette)
 *                     + émoluments proportionnels du notaire (barème A444-91, par tranches, TVA)
 *                     + émoluments de formalités (forfait A444-171 n° 194, TVA)
 *                     + contribution de sécurité immobilière (0,10 %, minimum 15 €)
 *                     + débours (estimation saisie par l'utilisateur).
 */
import P from '../../data/params-2026.json';
import DEPS from '../../data/departements.json';

export type Zone = 'metro' | 'gp' | 'mq' | 'gf' | 're' | 'yt';
export interface Departement { id: string; code: string; fr: string; en: string; zone: Zone; voted: number | null; base: number; shared?: string; abattement?: number; premiere?: number; lots?: number }
export const DEPARTEMENTS = DEPS as Departement[];
export const PARAMS = P;

/** ancien = logement existant (ou terrain vendu par un particulier) ; neuf = vente soumise à la TVA (logement de moins de 5 ans vendu par un professionnel, VEFA, terrain à bâtir vendu par un assujetti). */
export type TypeBien = 'ancien' | 'neuf';
/** standard ; primo = n'a pas été propriétaire de sa résidence principale depuis 2 ans et achète sa résidence principale ; premiere = première propriété (réduction votée en Savoie, art. 1594 F septies). */
export type Situation = 'standard' | 'primo' | 'premiere';

export function getDep(id: string): Departement {
  const d = DEPARTEMENTS.find((x) => x.id === id);
  if (!d) throw new Error(`Département inconnu : ${id}`);
  return d;
}
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Taux départemental appliqué (en %), avec la règle qui le fixe. */
export function tauxDepartemental(dep: Departement, situation: Situation = 'standard'): { taux: number; regle: 'hausse' | 'base' | 'primo' | 'premiere' } {
  if (situation === 'premiere' && dep.premiere != null) return { taux: dep.premiere, regle: 'premiere' };
  if (dep.voted != null) {
    if (situation === 'primo' || situation === 'premiere') return { taux: dep.base, regle: 'primo' };
    return { taux: dep.voted, regle: 'hausse' };
  }
  return { taux: dep.base, regle: 'base' };
}

/** Taux global des droits de mutation de droit commun (en %) : départemental + communal + frais d'assiette sur le départemental. */
export function tauxGlobalAncien(tauxDep: number): number {
  return tauxDep + P.dmto.taxe_communale + tauxDep * P.dmto.frais_assiette_droit_commun / 100;
}
/** Taux réduit des ventes soumises à la TVA (en %) : 0,70 % + 2,14 % de frais d'assiette. */
export function tauxGlobalNeuf(): number {
  return P.dmto.taux_reduit_neuf * (1 + P.dmto.frais_assiette_taux_reduit / 100);
}

export interface Tranche { de: number; a: number | null; taux: number; base: number; montant: number }
/** Émoluments proportionnels HT d'une vente, tranche par tranche, avant minimum, plafond et remise. */
export function emolumentsBruts(prix: number, zone: Zone = 'metro', taux: number[] = P.emoluments.zones[zone].taux): { total: number; tranches: Tranche[] } {
  const bornes = [0, ...P.emoluments.tranches];
  const tranches: Tranche[] = bornes.map((de, i) => {
    const a = i < bornes.length - 1 ? bornes[i + 1] : null;
    const base = Math.max(0, Math.min(prix, a ?? Infinity) - de);
    return { de, a, taux: taux[i], base, montant: (base * taux[i]) / 100 };
  });
  return { total: tranches.reduce((s, t) => s + t.montant, 0), tranches };
}

/** Part des émoluments calculée sur la fraction du prix au-delà du seuil de remise (100 000 €). */
export function emolumentsAuDelaSeuil(prix: number, zone: Zone = 'metro'): number {
  const seuil = P.emoluments.remise_seuil;
  if (prix <= seuil) return 0;
  return emolumentsBruts(prix, zone).total - emolumentsBruts(seuil, zone).total;
}

export interface EmolumentsResultat { brut: number; minimumApplique: boolean; plafondApplique: boolean; remise: number; ht: number; tva: number; ttc: number; tauxTva: number; tranches: Tranche[] }
export function emolumentsVente(prix: number, zone: Zone = 'metro', remisePct = 0): EmolumentsResultat {
  const { total, tranches } = emolumentsBruts(prix, zone);
  let ht = total; let minimumApplique = false; let plafondApplique = false;
  const plafond = (prix * P.emoluments.plafond_pourcentage_valeur) / 100;
  if (ht < P.emoluments.minimum_ht) { ht = P.emoluments.minimum_ht; minimumApplique = true; }
  if (ht > plafond && prix > 0) { ht = Math.max(plafond, 0); plafondApplique = true; minimumApplique = false; }
  const pct = Math.min(Math.max(remisePct, 0), P.emoluments.remise_max);
  const remise = plafondApplique ? 0 : (emolumentsAuDelaSeuil(prix, zone) * pct) / 100;
  ht -= remise;
  const tauxTva = P.emoluments.zones[zone].tva;
  const tva = (ht * tauxTva) / 100;
  return { brut: total, minimumApplique, plafondApplique, remise, ht, tva, ttc: ht + tva, tauxTva, tranches };
}

export function csi(prix: number): number {
  return Math.max((prix * P.csi.taux) / 100, P.csi.minimum);
}

export interface FraisInput { prix: number; dep: string; type?: TypeBien; situation?: Situation; mobilier?: number; remisePct?: number; debours?: number }
export interface FraisResultat {
  prix: number; assiette: number; mobilier: number; dep: Departement; type: TypeBien; situation: Situation;
  tauxDep: number; regle: 'hausse' | 'base' | 'primo' | 'premiere' | 'neuf'; tauxDroits: number;
  droits: number; droitsDepartement: number; droitsCommune: number; droitsAssiette: number;
  emoluments: EmolumentsResultat; formalitesHT: number; formalitesTTC: number; csi: number; debours: number;
  total: number; pourcentage: number; partEtat: number; partNotaire: number;
}

/** Frais de notaire d'un achat. Le prix est le prix net vendeur (hors frais d'agence à la charge de l'acquéreur). */
export function fraisNotaire(i: FraisInput): FraisResultat {
  const prix = Math.max(0, i.prix || 0);
  const dep = getDep(i.dep);
  const type = i.type ?? 'ancien';
  const situation = i.situation ?? 'standard';
  const mobilier = Math.min(Math.max(0, i.mobilier ?? 0), prix);
  const assiette = prix - mobilier;
  let tauxDep: number, regle: FraisResultat['regle'], tauxDroits: number, droitsDepartement: number, droitsCommune: number, droitsAssiette: number;
  if (type === 'neuf') {
    tauxDep = P.dmto.taux_reduit_neuf; regle = 'neuf'; tauxDroits = tauxGlobalNeuf();
    droitsDepartement = (assiette * tauxDep) / 100; droitsCommune = 0; droitsAssiette = (droitsDepartement * P.dmto.frais_assiette_taux_reduit) / 100;
  } else {
    const t = tauxDepartemental(dep, situation); tauxDep = t.taux; regle = t.regle; tauxDroits = tauxGlobalAncien(tauxDep);
    droitsDepartement = (assiette * tauxDep) / 100; droitsCommune = (assiette * P.dmto.taxe_communale) / 100; droitsAssiette = (droitsDepartement * P.dmto.frais_assiette_droit_commun) / 100;
  }
  const droits = droitsDepartement + droitsCommune + droitsAssiette;
  const emoluments = emolumentsVente(assiette, dep.zone, i.remisePct ?? 0);
  const formalitesHT = P.emoluments.formalites_forfait_ht;
  const formalitesTTC = formalitesHT * (1 + emoluments.tauxTva / 100);
  const c = assiette > 0 ? csi(assiette) : 0;
  const debours = Math.max(0, i.debours ?? P.debours_defaut);
  const total = droits + emoluments.ttc + formalitesTTC + c + debours;
  return {
    prix, assiette, mobilier, dep, type, situation, tauxDep, regle, tauxDroits,
    droits: r2(droits), droitsDepartement: r2(droitsDepartement), droitsCommune: r2(droitsCommune), droitsAssiette: r2(droitsAssiette),
    emoluments, formalitesHT, formalitesTTC: r2(formalitesTTC), csi: r2(c), debours,
    total: r2(total), pourcentage: prix > 0 ? (total / prix) * 100 : 0,
    partEtat: r2(droits + c + emoluments.tva + (formalitesTTC - formalitesHT)), partNotaire: r2(emoluments.ht + formalitesHT),
  };
}

/** Écart de frais entre deux départements pour le même achat. */
export function comparer(prix: number, a: string, b: string, situation: Situation = 'standard') {
  const fa = fraisNotaire({ prix, dep: a, situation }); const fb = fraisNotaire({ prix, dep: b, situation });
  return { a: fa, b: fb, ecart: r2(fa.total - fb.total) };
}

/** Économie d'une liste de meubles déduite de l'assiette (droits de mutation, émoluments et CSI). */
export function economieMobilier(prix: number, mobilier: number, dep = '75', situation: Situation = 'standard') {
  const sans = fraisNotaire({ prix, dep, situation }); const avec = fraisNotaire({ prix, dep, situation, mobilier });
  return { sans: sans.total, avec: avec.total, economie: r2(sans.total - avec.total), droitsEvites: r2(sans.droits - avec.droits) };
}

/* ---------------------------------------------------------------- donation */
export type Lien = 'enfant' | 'petit_enfant' | 'arriere_petit_enfant' | 'epoux' | 'frere_soeur' | 'neveu_niece' | 'parent_4e' | 'autre';
const D = P.donation;
function progressif(base: number, bareme: Array<[number | null, number]>): number {
  let prev = 0, total = 0;
  for (const [plafond, taux] of bareme) {
    const haut = plafond ?? Infinity;
    total += (Math.max(0, Math.min(base, haut) - prev) * taux) / 100;
    if (base <= haut) break;
    prev = haut;
  }
  return total;
}
export function droitsDonation(montant: number, lien: Lien, handicap = false): { abattement: number; taxable: number; droits: number } {
  const ab = (D.abattements as Record<string, number>)[lien === 'parent_4e' ? 'autre' : lien] ?? 0;
  const abattement = ab + (handicap ? D.abattements.handicap : 0);
  const taxable = Math.max(0, montant - abattement);
  let droits = 0;
  if (lien === 'enfant' || lien === 'petit_enfant' || lien === 'arriere_petit_enfant') droits = progressif(taxable, D.bareme_ligne_directe as Array<[number | null, number]>);
  else if (lien === 'epoux') droits = progressif(taxable, D.bareme_epoux as Array<[number | null, number]>);
  else if (lien === 'frere_soeur') droits = progressif(taxable, D.bareme_frere_soeur as Array<[number | null, number]>);
  else if (lien === 'neveu_niece') droits = (taxable * D.taux_neveu_niece) / 100;
  else if (lien === 'parent_4e') droits = (taxable * D.taux_parent_4e_degre) / 100;
  else droits = (taxable * D.taux_autre) / 100;
  return { abattement, taxable, droits: Math.floor(droits + 1e-9) };
}
/** Émoluments d'une donation (« autres donations », barème F1404), TTC en métropole. */
export function emolumentsDonation(valeur: number): { ht: number; ttc: number } {
  const ht = emolumentsBruts(valeur, 'metro', D.emoluments_autres_donations).total;
  return { ht: r2(ht), ttc: r2(ht * 1.2) };
}

/* ---------------------------------------------------------------- plus-value */
/** Frais d'acquisition retenus dans le prix d'achat : réels justifiés ou forfait de 7,5 % du prix (le plus favorable). */
export function fraisAcquisitionPlusValue(prixAchat: number, fraisReels: number) {
  const forfait = (prixAchat * P.plus_value.forfait_frais_acquisition) / 100;
  return { forfait: r2(forfait), reels: fraisReels, retenu: Math.max(forfait, fraisReels), meilleur: forfait >= fraisReels ? 'forfait' as const : 'reels' as const };
}

/* ---------------------------------------------------------------- apport */
/** Somme à réunir le jour de la signature quand le prêt ne couvre que le prix. */
export function apportNecessaire(prix: number, dep: string, apport: number, type: TypeBien = 'ancien', situation: Situation = 'standard') {
  const f = fraisNotaire({ prix, dep, type, situation });
  return { frais: f.total, besoin: r2(prix + f.total), emprunt: r2(Math.max(0, prix + f.total - apport)), fraisCouverts: apport >= f.total };
}

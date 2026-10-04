/**
 * Moteur des frais et taxes d'un achat immobilier, hors crédit (fonctions pures, aucun accès réseau).
 * Paramètres : src/data/params-2026.json (sections ptz, plus_value, taxe_fonciere, taxe_amenagement,
 * location, agence), relus sur les sources citées dans chaque section le jour de `retrieved_at`.
 * Les frais de notaire viennent du moteur `notaire.ts` : un seul calcul pour tout le site.
 */
import P from '../../data/params-2026.json';
import { fraisNotaire, fraisAcquisitionPlusValue, type Situation, type TypeBien } from './notaire';

const r2 = (x: number) => Math.round(x * 100) / 100;
const clamp = (x: number, a: number, b: number) => Math.min(Math.max(x, a), b);

/* ================================================================ PTZ */
export type ZoneABC = 'Abis' | 'A' | 'B1' | 'B2' | 'C';
export const ZONES_ABC: ZoneABC[] = ['Abis', 'A', 'B1', 'B2', 'C'];
/** Les tableaux du PTZ réunissent A bis et A dans une seule colonne. */
const col = (z: ZoneABC): 'A' | 'B1' | 'B2' | 'C' => (z === 'Abis' ? 'A' : z);
export type TypePTZ = 'neuf_collectif' | 'neuf_individuel' | 'ancien';

export interface PTZInput { zone: ZoneABC; personnes: number; rfr: number; cout: number; type: TypePTZ; travaux?: number }
export interface PTZResultat {
  eligible: boolean; motif: 'ok' | 'zone_ancien' | 'travaux' | 'revenus' | 'cout_nul';
  revenuRetenu: number; plancher: number; plafondRessources: number; coefficient: number; revenuParCoef: number;
  tranche: 1 | 2 | 3 | 4; coutTotal: number; coutRetenu: number; plafondOperation: number; quotite: number;
  montant: number; differe: number; remboursement: number; duree: number; mensualite: number;
  pretMinimum: number; partTravaux: number;
}

/** Montant maximum du PTZ pour une offre émise depuis le 1er avril 2025 (service-public F10871, ANIL). */
export function ptz(i: PTZInput): PTZResultat {
  const T = P.ptz; const c = col(i.zone);
  const n = clamp(Math.round(i.personnes || 1), 1, 99);
  const travaux = i.type === 'ancien' ? Math.max(0, i.travaux ?? 0) : 0;
  const coutTotal = Math.max(0, i.cout || 0) + travaux;
  const plancher = coutTotal / T.revenu_plancher_diviseur;
  const revenuRetenu = Math.max(Math.max(0, i.rfr || 0), plancher);
  const plafondRessources = T.plafond_ressources[c][Math.min(n, 8) - 1];
  const coefficient = T.coefficient_familial[Math.min(n, 5) - 1];
  const revenuParCoef = revenuRetenu / coefficient;
  const bornes = T.tranches[c];
  // Sous le plafond de ressources mais au-delà de la borne de la tranche 4 (ménages de 6 personnes
  // et plus, dont le coefficient s'arrête à 2,4) : la tranche 4 s'applique.
  const idx = bornes.findIndex((b) => revenuParCoef <= b);
  const tranche = (idx === -1 ? 4 : idx + 1) as 1 | 2 | 3 | 4;
  const plafondOperation = T.plafond_operation[c][Math.min(n, 5) - 1];
  const coutRetenu = Math.min(coutTotal, plafondOperation);
  const quotite = (i.type === 'neuf_individuel' ? T.quotite_individuel_neuf : T.quotite_collectif_ancien)[tranche - 1];
  const partTravaux = coutTotal > 0 ? (travaux / coutTotal) * 100 : 0;
  let motif: PTZResultat['motif'] = 'ok';
  if (coutTotal <= 0) motif = 'cout_nul';
  else if (i.type === 'ancien' && c !== 'B2' && c !== 'C') motif = 'zone_ancien';
  else if (i.type === 'ancien' && partTravaux < T.travaux_ancien_min_pct) motif = 'travaux';
  else if (revenuRetenu > plafondRessources) motif = 'revenus';
  const eligible = motif === 'ok';
  const montant = eligible ? r2((coutRetenu * quotite) / 100) : 0;
  const differe = T.differe_annees[tranche - 1]; const remboursement = T.remboursement_annees[tranche - 1];
  // Le PTZ ne peut dépasser les autres prêts de plus de deux ans (de 25 % en tranche 1).
  const pretMinimum = tranche === 1 ? montant / (1 + T.majoration_tranche1_autres_prets / 100) : montant;
  return {
    eligible, motif, revenuRetenu: r2(revenuRetenu), plancher: r2(plancher), plafondRessources, coefficient, revenuParCoef: r2(revenuParCoef),
    tranche, coutTotal, coutRetenu, plafondOperation, quotite, montant, differe, remboursement, duree: differe + remboursement,
    mensualite: eligible ? r2(montant / (remboursement * 12)) : 0, pretMinimum: r2(pretMinimum), partTravaux,
  };
}

/* ================================================================ plus-value */
/** Abattements pour durée de détention (en %), années pleines : CGI art. 150 VC. */
export function abattementsDetention(annees: number): { ir: number; ps: number } {
  const A = P.plus_value.abattement_ir; const B = P.plus_value.abattement_ps;
  const n = Math.max(0, Math.floor(annees || 0));
  const ir = n < A.de ? 0 : n > A.a ? 100 : (Math.min(n, A.a) - (A.de - 1)) * A.taux;
  let ps = n < B.de ? 0 : (Math.min(n, B.a) - (B.de - 1)) * B.taux;
  if (n >= B.a + 1) ps += B.annee22;
  if (n >= B.a + 2) ps += (Math.min(n, 30) - (B.a + 1)) * B.de23a30;
  return { ir: Math.min(r2(ir), 100), ps: Math.min(r2(ps), 100) };
}
/** Taxe sur les plus-values immobilières élevées (CGI art. 1609 nonies G), barème lissé du BOFiP. */
export function surtaxePlusValue(pvImposable: number): number {
  if (pvImposable <= P.plus_value.surtaxe_seuil) return 0;
  const t = P.plus_value.surtaxe_bareme.find((b) => pvImposable > b.de && (b.a == null || pvImposable <= b.a))!;
  let s = (pvImposable * t.taux) / 100;
  if (t.lissage) s -= (t.lissage[0] - pvImposable) * t.lissage[1];
  return Math.max(0, Math.round(s));
}
export interface PVInput {
  prixVente: number; fraisVente?: number; prixAchat: number; fraisAchatReels?: number; travauxReels?: number; annees: number;
  residencePrincipale?: boolean; remploi?: number; depAchat?: string; typeAchat?: TypeBien;
}
export interface PVResultat {
  exoneration: 'aucune' | 'residence_principale' | 'prix_15000' | 'duree' | 'moins_value' | 'remploi';
  fraisAcquisition: number; fraisAcquisitionMode: 'forfait' | 'reels'; travaux: number; travauxMode: 'forfait' | 'reels' | 'aucun';
  prixAchatMajore: number; prixVenteNet: number; pvBrute: number; partExoneree: number; abattIR: number; abattPS: number;
  baseIR: number; basePS: number; ir: number; ps: number; surtaxe: number; total: number; net: number;
}
export function plusValue(i: PVInput): PVResultat {
  const V = P.plus_value; const annees = Math.max(0, Math.floor(i.annees || 0));
  const prixVente = Math.max(0, i.prixVente || 0); const prixAchat = Math.max(0, i.prixAchat || 0);
  // Frais d'acquisition : réels saisis, ou recalculés par le moteur des frais de notaire, contre le forfait de 7,5 %.
  const reels = i.fraisAchatReels != null && i.fraisAchatReels > 0 ? i.fraisAchatReels : (i.depAchat ? fraisNotaire({ prix: prixAchat, dep: i.depAchat, type: i.typeAchat ?? 'ancien' }).total : 0);
  const fa = fraisAcquisitionPlusValue(prixAchat, reels);
  const forfaitTravaux = annees >= V.forfait_travaux_detention_min_ans ? (prixAchat * V.forfait_travaux) / 100 : 0;
  const tReels = Math.max(0, i.travauxReels ?? 0);
  const travaux = Math.max(forfaitTravaux, tReels);
  const travauxMode: PVResultat['travauxMode'] = travaux === 0 ? 'aucun' : forfaitTravaux >= tReels ? 'forfait' : 'reels';
  const prixAchatMajore = prixAchat + fa.retenu + travaux;
  const prixVenteNet = prixVente - Math.max(0, i.fraisVente ?? 0);
  const pvBrute = r2(prixVenteNet - prixAchatMajore);
  const ab = abattementsDetention(annees);
  const base = { fraisAcquisition: fa.retenu, fraisAcquisitionMode: fa.meilleur, travaux: r2(travaux), travauxMode, prixAchatMajore: r2(prixAchatMajore), prixVenteNet: r2(prixVenteNet), pvBrute, abattIR: ab.ir, abattPS: ab.ps };
  const zero = (exoneration: PVResultat['exoneration'], partExoneree = 1): PVResultat => ({ ...base, exoneration, partExoneree, baseIR: 0, basePS: 0, ir: 0, ps: 0, surtaxe: 0, total: 0, net: r2(prixVente - prixAchat) });
  if (i.residencePrincipale) return zero('residence_principale');
  if (prixVente <= V.exoneration_prix_max) return zero('prix_15000');
  if (pvBrute <= 0) return zero('moins_value', 0);
  // Première cession d'un logement autre que la résidence principale : exonération à proportion du prix remployé.
  const partExoneree = clamp((i.remploi ?? 0) / prixVente, 0, 1);
  if (partExoneree >= 1) return zero('remploi');
  const pv = pvBrute * (1 - partExoneree);
  const baseIR = r2(pv * (1 - ab.ir / 100)); const basePS = r2(pv * (1 - ab.ps / 100));
  const ir = Math.round((baseIR * V.taux_ir) / 100); const ps = Math.round((basePS * V.taux_ps) / 100);
  const surtaxe = surtaxePlusValue(baseIR);
  const total = ir + ps + surtaxe;
  const exoneration: PVResultat['exoneration'] = total === 0 && ab.ps >= 100 ? 'duree' : partExoneree > 0 ? 'remploi' : 'aucune';
  return { ...base, exoneration, partExoneree, baseIR, basePS, ir, ps, surtaxe, total, net: r2(prixVente - prixAchat - total) };
}

/* ================================================================ taxe foncière */
export type TrancheAge = 'moins65' | '65a75' | 'plus75';
/** Plafond de revenu fiscal de référence 2026 (revenus 2025, métropole) selon le nombre de parts. */
export function plafondRfrTF(parts: number): number {
  const T = P.taxe_fonciere.plafond_rfr_2026_metro;
  const q = Math.max(1, Math.round((parts || 1) * 4) / 4);
  if (q <= 3) return T.valeurs[Math.round((q - 1) * 4)];
  const sup = q - 3; const demi = Math.floor(sup / 0.5); const quart = sup - demi * 0.5 > 0 ? 1 : 0;
  return T.valeurs[8] + demi * T.demi_part_sup + quart * T.quart_part_sup;
}
export interface TFInput { base: number; tauxTfb: number; tauxTeom?: number; revaloriser?: boolean; neuf?: boolean; exoNeufPct?: number; age?: TrancheAge; rfr?: number; parts?: number; residencePrincipale?: boolean }
export interface TFResultat { base: number; tf: number; exoneration: number; degrevement: number; tfDue: number; teom: number; total: number; regle: 'aucune' | 'neuf' | 'plus75' | '65a75'; plafondRfr: number }
/** Base = revenu cadastral (moitié de la valeur locative) ; montant = base × taux voté (communal + intercommunal + taxes spéciales). */
export function taxeFonciere(i: TFInput): TFResultat {
  const T = P.taxe_fonciere;
  const base = Math.max(0, i.base || 0) * (i.revaloriser ? 1 + T.revalorisation_2026_pct / 100 : 1);
  const tf = (base * Math.max(0, i.tauxTfb || 0)) / 100;
  const teom = (base * Math.max(0, i.tauxTeom ?? 0)) / 100;
  const plafondRfr = plafondRfrTF(i.parts ?? 1);
  const modeste = (i.rfr ?? Infinity) <= plafondRfr && (i.residencePrincipale ?? true);
  let exoneration = 0, degrevement = 0; let regle: TFResultat['regle'] = 'aucune';
  if (i.neuf) { exoneration = (tf * clamp(i.exoNeufPct ?? 100, T.exoneration_neuf_min_pct, 100)) / 100; regle = 'neuf'; }
  else if (i.age === 'plus75' && modeste) { exoneration = tf; regle = 'plus75'; }
  else if (i.age === '65a75' && modeste) { degrevement = Math.min(T.degrevement_65_75, tf); regle = '65a75'; }
  const tfDue = Math.max(0, tf - exoneration - degrevement);
  return { base: r2(base), tf: r2(tf), exoneration: r2(exoneration), degrevement: r2(degrevement), tfDue: r2(tfDue), teom: r2(teom), total: r2(tfDue + teom), regle, plafondRfr };
}
/** Part de la taxe foncière de l'année remboursée au vendeur par l'acquéreur, au prorata des jours (convention usuelle chez le notaire). */
export function prorataTaxeFonciere(montantAnnuel: number, jourSignature: number, joursAnnee = 365): { acquereur: number; vendeur: number; joursRestants: number } {
  const j = clamp(Math.round(jourSignature), 1, joursAnnee); const joursRestants = joursAnnee - j;
  const acquereur = r2((montantAnnuel * joursRestants) / joursAnnee);
  return { acquereur, vendeur: r2(montantAnnuel - acquereur), joursRestants };
}
const MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** Jour de l'année (année de 365 jours, comme 2026). */
export const jourDeLAnnee = (jour: number, mois: number) => MOIS.slice(0, clamp(mois, 1, 12) - 1).reduce((s, x) => s + x, 0) + clamp(jour, 1, MOIS[clamp(mois, 1, 12) - 1]);

/* ================================================================ taxe d'aménagement */
export interface TAInput { surface: number; idf?: boolean; abattement?: boolean; tauxCommune: number; tauxDep: number; tauxRegion?: number; piscine?: number; stationnements?: number }
export interface TAResultat { valeurM2: number; valeurConstruction: number; valeurPiscine: number; valeurStationnement: number; valeurTaxable: number; tauxTotal: number; partCommune: number; partDep: number; partRegion: number; total: number; exonereSurface: boolean; deuxFois: boolean; m2Abattus: number }
export function taxeAmenagement(i: TAInput): TAResultat {
  const A = P.taxe_amenagement;
  const surface = Math.max(0, i.surface || 0);
  const exonereSurface = surface > 0 && surface <= A.surface_exoneree_max;
  const valeurM2 = i.idf ? A.valeur_m2_idf : A.valeur_m2;
  const m2Abattus = i.abattement && !exonereSurface ? Math.min(surface, A.abattement_m2) : 0;
  const valeurConstruction = exonereSurface ? 0 : (surface - m2Abattus) * valeurM2 + m2Abattus * valeurM2 * (1 - A.abattement_pct / 100);
  const valeurPiscine = Math.max(0, i.piscine ?? 0) * A.valeur_piscine_m2;
  const valeurStationnement = Math.max(0, Math.round(i.stationnements ?? 0)) * A.valeur_stationnement;
  const valeurTaxable = valeurConstruction + valeurPiscine + valeurStationnement;
  const tc = Math.max(0, i.tauxCommune || 0), td = Math.max(0, i.tauxDep || 0), tr = i.idf ? Math.max(0, i.tauxRegion ?? 0) : 0;
  const partCommune = (valeurTaxable * tc) / 100, partDep = (valeurTaxable * td) / 100, partRegion = (valeurTaxable * tr) / 100;
  const total = partCommune + partDep + partRegion;
  return { valeurM2, valeurConstruction: r2(valeurConstruction), valeurPiscine, valeurStationnement, valeurTaxable: r2(valeurTaxable), tauxTotal: r2(tc + td + tr), partCommune: r2(partCommune), partDep: r2(partDep), partRegion: r2(partRegion), total: r2(total), exonereSurface, deuxFois: total > A.paiement_deux_fois_au_dela, m2Abattus };
}

/* ================================================================ frais d'agence */
export type ChargeAgence = 'acquereur' | 'vendeur';
export interface AgenceInput { prixNetVendeur: number; tauxTTC: number; charge: ChargeAgence; dep: string; type?: TypeBien; situation?: Situation }
export interface AgenceResultat { honorairesTTC: number; honorairesHT: number; tva: number; prixFAI: number; tauxSurFAI: number; assiette: number; fraisNotaire: number; fraisNotaireAutreCharge: number; ecart: number; coutAcquereur: number }
/** Honoraires exprimés TTC en % du prix hors honoraires (service-public F2954) ; l'assiette des frais de notaire dépend de qui les paie. */
export function fraisAgence(i: AgenceInput): AgenceResultat {
  const net = Math.max(0, i.prixNetVendeur || 0);
  const honorairesTTC = r2((net * Math.max(0, i.tauxTTC || 0)) / 100);
  const honorairesHT = r2(honorairesTTC / (1 + P.agence.tva / 100));
  const prixFAI = net + honorairesTTC;
  const fA = fraisNotaire({ prix: net, dep: i.dep, type: i.type, situation: i.situation }).total;
  const fV = fraisNotaire({ prix: prixFAI, dep: i.dep, type: i.type, situation: i.situation }).total;
  const fraisN = i.charge === 'acquereur' ? fA : fV; const autre = i.charge === 'acquereur' ? fV : fA;
  return { honorairesTTC, honorairesHT, tva: r2(honorairesTTC - honorairesHT), prixFAI: r2(prixFAI), tauxSurFAI: prixFAI > 0 ? (honorairesTTC / prixFAI) * 100 : 0, assiette: i.charge === 'acquereur' ? net : prixFAI, fraisNotaire: fraisN, fraisNotaireAutreCharge: autre, ecart: r2(fV - fA), coutAcquereur: r2(prixFAI + fraisN) };
}

/* ================================================================ rendement locatif */
export type RegimeLocation = 'nu' | 'meuble';
export interface RendementInput { prix: number; dep: string; type?: TypeBien; fraisAcquisition?: number; travaux?: number; loyerMensuel: number; chargesAnnuelles?: number; taxeFonciere?: number; vacanceMois?: number; gestionPct?: number; regime?: RegimeLocation; tmi?: number }
export interface RendementResultat {
  coutTotal: number; fraisAcquisition: number; loyersAnnuels: number; loyersEncaisses: number; charges: number; revenuNet: number;
  brut: number; net: number; netNet: number; imposable: number; impot: number; prelevements: number; regimeFiscal: 'micro' | 'reel'; tauxPS: number; cashflowMensuel: number;
}
/** Brut = loyers ÷ prix ; net = (loyers encaissés − charges) ÷ coût total ; net-net = après impôt et prélèvements sociaux (sans crédit). */
export function rendementLocatif(i: RendementInput): RendementResultat {
  const L = P.location;
  const prix = Math.max(0, i.prix || 0);
  const fraisAcquisition = i.fraisAcquisition != null ? Math.max(0, i.fraisAcquisition) : fraisNotaire({ prix, dep: i.dep, type: i.type ?? 'ancien' }).total;
  const coutTotal = prix + fraisAcquisition + Math.max(0, i.travaux ?? 0);
  const loyersAnnuels = Math.max(0, i.loyerMensuel || 0) * 12;
  const loyersEncaisses = Math.max(0, i.loyerMensuel || 0) * (12 - clamp(i.vacanceMois ?? 0, 0, 12));
  const gestion = (loyersEncaisses * Math.max(0, i.gestionPct ?? 0)) / 100;
  const charges = Math.max(0, i.chargesAnnuelles ?? 0) + Math.max(0, i.taxeFonciere ?? 0) + gestion;
  const revenuNet = loyersEncaisses - charges;
  const meuble = i.regime === 'meuble';
  const plafond = meuble ? L.micro_bic_plafond : L.micro_foncier_plafond;
  const abatt = meuble ? L.micro_bic_abattement : L.micro_foncier_abattement;
  const regimeFiscal: 'micro' | 'reel' = loyersEncaisses <= plafond ? 'micro' : 'reel';
  const imposable = Math.max(0, regimeFiscal === 'micro' ? loyersEncaisses * (1 - abatt / 100) : revenuNet);
  const tauxPS = meuble ? L.ps_meuble : L.ps_foncier;
  const impot = (imposable * Math.max(0, i.tmi ?? 0)) / 100; const prelevements = (imposable * tauxPS) / 100;
  const pct = (x: number) => (coutTotal > 0 ? (x / coutTotal) * 100 : 0);
  return {
    coutTotal: r2(coutTotal), fraisAcquisition: r2(fraisAcquisition), loyersAnnuels, loyersEncaisses, charges: r2(charges), revenuNet: r2(revenuNet),
    brut: prix > 0 ? (loyersAnnuels / prix) * 100 : 0, net: pct(revenuNet), netNet: pct(revenuNet - impot - prelevements),
    imposable: r2(imposable), impot: r2(impot), prelevements: r2(prelevements), regimeFiscal, tauxPS, cashflowMensuel: r2((revenuNet - impot - prelevements) / 12),
  };
}

/* ================================================================ coût total */
export interface CoutTotalInput { prix: number; dep: string; type?: TypeBien; situation?: Situation; agenceTTC?: number; chargeAgence?: ChargeAgence; travaux?: number; taxeFonciereAnnuelle?: number; jourSignature?: number; mobilier?: number; taxeAmenagement?: number; diagnostics?: number }
export interface CoutTotalResultat { prix: number; agence: number; fraisNotaire: number; prorataTF: number; travaux: number; taxeAmenagement: number; autres: number; total: number; horsPrix: number; partHorsPrix: number; droits: number; notaire: ReturnType<typeof fraisNotaire> }
/** Somme décaissée par l'acquéreur, hors crédit : prix, honoraires d'agence à sa charge, frais de notaire, prorata de taxe foncière, travaux, taxe d'aménagement. */
export function coutTotalAchat(i: CoutTotalInput): CoutTotalResultat {
  const prix = Math.max(0, i.prix || 0); const agence = Math.max(0, i.agenceTTC ?? 0);
  const acq = (i.chargeAgence ?? 'acquereur') === 'acquereur';
  // Commission à la charge du vendeur : elle est dans le prix payé, donc dans l'assiette des droits.
  const n = fraisNotaire({ prix: acq ? prix : prix + agence, dep: i.dep, type: i.type, situation: i.situation, mobilier: i.mobilier });
  const pr = i.taxeFonciereAnnuelle ? prorataTaxeFonciere(i.taxeFonciereAnnuelle, i.jourSignature ?? 182).acquereur : 0;
  const travaux = Math.max(0, i.travaux ?? 0); const ta = Math.max(0, i.taxeAmenagement ?? 0); const autres = Math.max(0, i.diagnostics ?? 0);
  const prixPaye = acq ? prix : prix + agence;
  const total = prixPaye + (acq ? agence : 0) + n.total + pr + travaux + ta + autres;
  const horsPrix = total - prixPaye - travaux;
  return { prix: prixPaye, agence, fraisNotaire: n.total, prorataTF: pr, travaux, taxeAmenagement: ta, autres, total: r2(total), horsPrix: r2(horsPrix), partHorsPrix: prixPaye > 0 ? (horsPrix / prixPaye) * 100 : 0, droits: n.droits, notaire: n };
}

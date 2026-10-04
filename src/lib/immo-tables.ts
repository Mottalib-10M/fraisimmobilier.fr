/** Tableaux des pages « achat immobilier », calculés au build par le moteur : aucun chiffre écrit à la main. */
import P from '../data/params-2026.json';
import STATS from '../data/communes-stats.json';
import TADEP from '../data/ta-departements.json';
import { ptz, plusValue, abattementsDetention, taxeFonciere, taxeAmenagement, rendementLocatif, coutTotalAchat, fraisAgence, type TypePTZ, type ZoneABC } from './engine/immobilier';
import { formatMoney, formatRate, formatNumber } from './format';
import { depName } from './communes';

type L = 'fr' | 'en';
const $ = (x: number, l: L) => formatMoney(x, 0, l);
const pct = (x: number, l: L, d = 2) => formatRate(x, d, l);
const n = (x: number, l: L) => formatNumber(x, 0, l);
export { STATS, TADEP };
export const zl = (z: ZoneABC) => (z === 'Abis' ? 'A bis' : z);
export const ZONE_IDX: ZoneABC[] = ['Abis', 'A', 'B1', 'B2', 'C'];

/* ---------------- PTZ */
export function ptzPlafondsRows(l: L): string[][] {
  const R = P.ptz.plafond_ressources; const O = P.ptz.plafond_operation;
  return [0, 1, 2, 3, 4].map((i) => [i === 4 ? (l === 'fr' ? '5 et plus' : '5 or more') : String(i + 1), $(R.A[i], l), $(R.B1[i], l), $(R.B2[i], l), $(R.C[i], l), $(O.A[i], l), $(O.C[i], l)]);
}
export function ptzTranchesRows(l: L): string[][] {
  const T = P.ptz.tranches;
  return [0, 1, 2, 3].map((i) => [String(i + 1), `${l === 'fr' ? 'jusqu’à' : 'up to'} ${$(T.A[i], l)}`, $(T.B1[i], l), $(T.B2[i], l), $(T.C[i], l), `${P.ptz.quotite_collectif_ancien[i]} %`, `${P.ptz.quotite_individuel_neuf[i]} %`, l === 'fr' ? `${P.ptz.differe_annees[i]} + ${P.ptz.remboursement_annees[i]} ans` : `${P.ptz.differe_annees[i]} + ${P.ptz.remboursement_annees[i]} years`]);
}
export function ptzZonesRows(l: L): string[][] {
  return ZONE_IDX.map((z, i) => [zl(z), n(STATS.par_zone[i], l), pct((STATS.par_zone[i] / STATS.communes) * 100, l, 1), z === 'B2' || z === 'C' ? (l === 'fr' ? 'neuf et ancien avec travaux' : 'new and resale with works') : (l === 'fr' ? 'neuf seulement' : 'new only')]);
}
export function ptzCas(l: L) {
  const cas: Array<[string, string, ZoneABC, number, number, number, TypePTZ, number?]> = [
    ['Paris', 'Paris', 'Abis', 2, 52000, 320000, 'neuf_collectif'],
    ['Nantes', 'Nantes', 'A', 2, 38000, 250000, 'neuf_collectif'],
    [l === 'fr' ? 'Commune en B1' : 'B1 municipality', '', 'B1', 3, 40000, 260000, 'neuf_individuel'],
    [l === 'fr' ? 'Commune en B2' : 'B2 municipality', '', 'B2', 4, 42000, 150000, 'ancien', 60000],
    [l === 'fr' ? 'Commune en C' : 'C municipality', '', 'C', 1, 20000, 160000, 'neuf_individuel'],
  ];
  const typ = (t: TypePTZ) => ({ neuf_collectif: l === 'fr' ? 'appartement neuf' : 'new flat', neuf_individuel: l === 'fr' ? 'maison neuve' : 'new house', ancien: l === 'fr' ? 'ancien + travaux' : 'resale + works' }[t]);
  return cas.map(([lab, , z, p, rfr, cout, t, tr]) => { const r = ptz({ zone: z, personnes: p, rfr, cout, type: t, travaux: tr }); return [`${lab} (${zl(z)})`, `${p} · ${typ(t)}`, $(rfr, l), $(cout + (tr ?? 0), l), r.eligible ? String(r.tranche) : '—', $(r.montant, l)]; });
}
export const ptzCalc = ptz;

/* ---------------- plus-value */
export function abattRows(l: L): string[][] {
  return [5, 6, 10, 15, 20, 21, 22, 25, 28, 30].map((a) => { const ab = abattementsDetention(a); return [l === 'fr' ? `${a} ans` : `${a} years`, pct(ab.ir, l), pct(ab.ps, l)]; });
}
export function pvExemples(l: L): string[][] {
  return [[250000, 180000, 4], [320000, 200000, 12], [450000, 250000, 18], [600000, 300000, 8], [900000, 400000, 10]].map(([v, a, y]) => { const r = plusValue({ prixVente: v, prixAchat: a, annees: y, depAchat: '75' }); return [$(a, l), $(v, l), l === 'fr' ? `${y} ans` : `${y} years`, $(r.pvBrute, l), $(r.ir, l), $(r.ps, l), $(r.surtaxe, l), $(r.total, l)]; });
}
export const pvCalc = plusValue;

/* ---------------- taxe foncière */
export function villesTFRows(l: L, nb = 20): string[][] {
  return STATS.villes.slice(0, nb).map((v) => { const t = taxeFonciere({ base: 2000, tauxTfb: v.tfb ?? 0, tauxTeom: v.teom ?? 0, revaloriser: false }); return [v.nom, depName(v.dep, l), pct(v.tfb ?? 0, l), v.teom != null ? pct(v.teom, l) : '—', $(t.tfDue, l), $(t.total, l)]; });
}
export const tfCalc = taxeFonciere;

/* ---------------- taxe d'aménagement */
export function taDepRows(l: L): string[][] {
  const d = Object.entries(TADEP as Record<string, { taux: number; effet: string } | number>).filter(([k]) => !k.startsWith('_')) as Array<[string, { taux: number; effet: string }]>;
  return d.map(([code, v]) => [code, depName(code, l), pct(v.taux, l), v.effet.slice(0, 4)]);
}
export function taDepStats() {
  const d = Object.entries(TADEP as Record<string, { taux: number } | number>).filter(([k]) => !k.startsWith('_')).map(([, v]) => (v as { taux: number }).taux);
  const e = Object.entries(TADEP as Record<string, { taux: number; effet: string } | number>).filter(([k]) => !k.startsWith('_')) as Array<[string, { taux: number; effet: string }]>;
  return { max: d.filter((x) => x === 2.5).length, min: Math.min(...d), nb: d.length, changes2026: e.filter(([, v]) => v.effet === '2026-01-01').map(([k]) => k), minDeps: e.filter(([, v]) => v.taux === Math.min(...d)).map(([k]) => k) };
}
export function taCas(l: L): string[][] {
  const A = P.taxe_amenagement;
  const cas: Array<[string, number, boolean, boolean, number, number]> = [
    [l === 'fr' ? 'Abri de jardin de 10 m²' : '10 m² garden shed', 10, false, false, 5, 2.5],
    [l === 'fr' ? 'Garage de 20 m²' : '20 m² garage', 20, false, false, 5, 2.5],
    [l === 'fr' ? 'Extension de 30 m² (résidence principale)' : '30 m² extension (main home)', 30, true, false, 5, 2.5],
    [l === 'fr' ? 'Maison de 120 m² (résidence principale)' : '120 m² house (main home)', 120, true, false, 5, 2.5],
    [l === 'fr' ? 'Maison de 120 m² en Île-de-France' : '120 m² house in Île-de-France', 120, true, true, 5, 2.5],
  ];
  return cas.map(([lab, s, ab, idf, tc, td]) => { const r = taxeAmenagement({ surface: s, abattement: ab, idf, tauxCommune: tc, tauxDep: td, tauxRegion: idf ? 1 : 0 }); return [lab, $(r.valeurTaxable, l), pct(r.tauxTotal, l), $(r.total, l)]; }).concat([[l === 'fr' ? `Piscine de 32 m² (${$(A.valeur_piscine_m2, l)} le m²)` : `32 m² pool (${$(A.valeur_piscine_m2, l)} per m²)`, $(32 * A.valeur_piscine_m2, l), pct(7.5, l), $(32 * A.valeur_piscine_m2 * 0.075, l)]]);
}
export const taCalc = taxeAmenagement;

/* ---------------- rendement, agence, coût total */
export function rendementRows(l: L): string[][] {
  return [['59', 130000, 650], ['33', 220000, 900], ['75', 400000, 1450], ['63', 110000, 600]].map(([d, p, y]) => { const r = rendementLocatif({ prix: p as number, dep: d as string, loyerMensuel: y as number, chargesAnnuelles: 700, taxeFonciere: 900, vacanceMois: 1, tmi: 30 }); return [depName(d as string, l), $(p as number, l), $(y as number, l), pct(r.brut, l), pct(r.net, l), pct(r.netNet, l)]; });
}
export const rlCalc = rendementLocatif;
export function agenceRows(l: L): string[][] {
  return [[150000, 6], [250000, 5], [400000, 4.5], [700000, 4]].map(([p, t]) => { const a = fraisAgence({ prixNetVendeur: p, tauxTTC: t, charge: 'acquereur', dep: '33' }); return [$(p, l), pct(t, l), $(a.honorairesTTC, l), $(a.honorairesHT, l), $(a.prixFAI, l), $(a.ecart, l)]; });
}
export const agCalc = fraisAgence;
export function coutRows(l: L): string[][] {
  return [['75', 350000, 15000], ['33', 280000, 12000], ['44', 250000, 10000], ['36', 120000, 6000]].map(([d, p, ag]) => { const c = coutTotalAchat({ prix: p as number, dep: d as string, agenceTTC: ag as number, taxeFonciereAnnuelle: 1200, jourSignature: 182 }); return [depName(d as string, l), $(p as number, l), $(ag as number, l), $(c.fraisNotaire, l), $(c.prorataTF, l), $(c.total, l), pct(c.partHorsPrix, l, 1)]; });
}
export const ctCalc = coutTotalAchat;

/** Distribution des taux de foncier bâti 2025 sur toutes les communes (au build seulement). */
export function tfDistribution() {
  const all = import.meta.glob('../data/communes/*.json', { eager: true, import: 'default' }) as Record<string, Array<[string, string, number, number | null, number | null, number | null]>>;
  const rows = Object.values(all).flat();
  const v = rows.map((r) => r[3]).filter((x): x is number => x != null).sort((a, b) => a - b);
  const min = rows.find((r) => r[3] === v[0])!; const max = rows.find((r) => r[3] === v[v.length - 1])!;
  const ta = rows.map((r) => r[5]).filter((x): x is number => x != null);
  return { n: v.length, min: v[0], minNom: min[1], max: v[v.length - 1], maxNom: max[1], mediane: v[Math.floor(v.length / 2)], plus50: v.filter((x) => x > 50).length,
    taN: ta.length, ta5: ta.filter((x) => x === 5).length, taSup5: ta.filter((x) => x > 5).length, taMediane: [...ta].sort((a, b) => a - b)[Math.floor(ta.length / 2)] };
}

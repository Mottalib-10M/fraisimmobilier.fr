/** Tableaux et chiffres calculés au build par le moteur : les pages ne contiennent aucun taux écrit à la main. */
import { DEPARTEMENTS, fraisNotaire, tauxGlobalAncien, tauxGlobalNeuf, emolumentsBruts, emolumentsVente, getDep, PARAMS, type Departement, type Situation, type TypeBien, type Zone } from './engine/notaire';
import { formatMoney, formatRate, formatNumber } from './format';
export { DEPARTEMENTS, fraisNotaire, tauxGlobalAncien, tauxGlobalNeuf, emolumentsBruts, emolumentsVente, getDep, PARAMS };
export type { Departement, Situation, TypeBien, Zone };
type L = 'fr' | 'en';
export const P = PARAMS;
export const $ = (x: number, l: L = 'fr', d = 0) => formatMoney(x, d, l);
export const pct = (x: number, l: L = 'fr', d = 2) => formatRate(x, d, l);
export const n = (x: number, l: L = 'fr', d = 0) => formatNumber(x, d, l);
export const F = (prix: number, dep = '75', type: TypeBien = 'ancien', situation: Situation = 'standard', extra: { mobilier?: number; remisePct?: number; debours?: number } = {}) => fraisNotaire({ prix, dep, type, situation, ...extra });
export const nom = (d: Departement, l: L) => (l === 'fr' ? d.fr : d.en);
export const rateOf = (d: Departement) => d.voted ?? d.base;

/** Zones fiscales distinctes (la Corse et l'Alsace votent un seul taux pour deux départements). */
export function zonesFiscales() { const m = new Map<string, Departement>(); for (const d of DEPARTEMENTS) if (!m.has(d.shared ?? d.id)) m.set(d.shared ?? d.id, d); return [...m.values()]; }
export const COUNT = {
  zones5: zonesFiscales().filter((d) => d.voted === 5).length,
  a450: DEPARTEMENTS.filter((d) => d.voted == null && d.base === 4.5),
  a380: DEPARTEMENTS.filter((d) => d.base === 3.8),
  total: DEPARTEMENTS.length,
};

/** Tableau des 102 lignes (101 départements, Lyon et le Rhône séparés). */
export function depRows(l: L, prix = 250000): string[][] {
  return DEPARTEMENTS.map((d) => {
    const f = F(prix, d.id); const pr = F(prix, d.id, 'ancien', d.premiere != null ? 'premiere' : 'primo');
    return [d.code, nom(d, l), pct(rateOf(d), l), pct(tauxGlobalAncien(rateOf(d)), l, 3), $(f.total, l), $(pr.total, l)];
  });
}
/** Exemples de frais à plusieurs prix pour un département donné. */
export function exempleRows(l: L, dep = '75', prices = [100000, 150000, 200000, 250000, 300000, 400000, 500000], type: TypeBien = 'ancien', situation: Situation = 'standard'): string[][] {
  return prices.map((p) => { const f = F(p, dep, type, situation); return [$(p, l), $(f.droits, l), $(f.emoluments.ttc + f.formalitesTTC, l), $(f.csi + f.debours, l), $(f.total, l), pct(f.pourcentage, l)]; });
}
export function tranchesRows(l: L, zone: Zone = 'metro'): string[][] {
  const b = [0, ...P.emoluments.tranches]; const t = P.emoluments.zones[zone].taux;
  return b.map((de, i) => [i < b.length - 1 ? (l === 'fr' ? `de ${n(de, l)} € à ${n(b[i + 1], l)} €` : `€${n(de, l)} to €${n(b[i + 1], l)}`) : (l === 'fr' ? `au-delà de ${n(de, l)} €` : `above €${n(de, l)}`), pct(t[i], l, 3)]);
}

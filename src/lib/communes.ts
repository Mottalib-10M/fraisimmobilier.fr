/**
 * Jeu communal (scripts/build-communes.py) : un fichier par département, chargé à la demande par le
 * navigateur — aucun appel à un service tiers, aucune saisie transmise. Le premier rendu reçoit la
 * liste du département par défaut depuis le build (RECETTE §17.5).
 * Ligne : [code INSEE, nom, zone (0 A bis · 1 A · 2 B1 · 3 B2 · 4 C), taux TFPB 2025, taux TEOM 2025, taux TA communal]
 */
import { DEPARTEMENTS } from './engine/notaire';
import type { ZoneABC } from './engine/immobilier';
import TADEP from '../data/ta-departements.json';
import P from '../data/params-2026.json';
import PRINC from '../data/communes-principales.json';
/** Code INSEE de la commune la plus peuplée du département (valeur par défaut). */
export const principale = (dep: string): string | undefined => (PRINC as Record<string, string>)[dep];

export type CommuneRow = [string, string, number, number | null, number | null, number | null];
export interface Commune { code: string; nom: string; dep: string; zone: ZoneABC; tfb: number | null; teom: number | null; ta: number | null }
export const ZONE_OF: ZoneABC[] = ['Abis', 'A', 'B1', 'B2', 'C'];
export const zoneLabel = (z: ZoneABC, lang: string) => (z === 'Abis' ? (lang === 'fr' ? 'A bis' : 'A bis') : z);
export const toCommune = (r: CommuneRow, dep: string): Commune => ({ code: r[0], nom: r[1], dep, zone: ZONE_OF[r[2]] ?? 'C', tfb: r[3], teom: r[4], ta: r[5] });

const loaders = import.meta.glob('../data/communes/*.json', { import: 'default' }) as Record<string, () => Promise<CommuneRow[]>>;
const cache = new Map<string, CommuneRow[]>();
export async function loadDep(dep: string): Promise<CommuneRow[]> {
  if (cache.has(dep)) return cache.get(dep)!;
  const l = loaders[`../data/communes/${dep}.json`];
  if (!l) return [];
  const rows = await l(); cache.set(dep, rows); return rows;
}

/** Les 101 départements du jeu communal (le Rhône y est entier : métropole de Lyon comprise). */
export const DEP_CODES: string[] = Object.keys(loaders).map((k) => k.replace(/^.*\/(.+)\.json$/, '$1')).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
export function depName(code: string, lang: string): string {
  if (code === '69') return lang === 'fr' ? 'Rhône et métropole de Lyon' : 'Rhône and Lyon Metropolis';
  const d = DEPARTEMENTS.find((x) => x.code === code);
  return d ? (lang === 'fr' ? d.fr : d.en) : code;
}
/** Taux départemental de taxe d'aménagement en vigueur au 1er janvier 2026, et part régionale en Île-de-France. */
export function tauxTADep(code: string): { dep: number; region: number; idf: boolean } {
  const t = (TADEP as Record<string, { taux: number } | number | null>)[code];
  const idf = P.taxe_amenagement.departements_idf.includes(code);
  return { dep: t && typeof t === 'object' ? t.taux : 0, region: idf ? Number((TADEP as Record<string, unknown>)._region_idf) || 0 : 0, idf };
}

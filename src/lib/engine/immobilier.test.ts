import { describe, it, expect } from 'vitest';
import { ptz, abattementsDetention, surtaxePlusValue, plusValue, taxeFonciere, plafondRfrTF, prorataTaxeFonciere, jourDeLAnnee, taxeAmenagement, fraisAgence, rendementLocatif, coutTotalAchat } from './immobilier';
import { fraisNotaire } from './notaire';
import TADEP from '../../data/ta-departements.json';
import STATS from '../../data/communes-stats.json';
import C75 from '../../data/communes/75.json';
import C13 from '../../data/communes/13.json';

describe('PTZ, offres émises depuis le 1er avril 2025 (service-public F10871)', () => {
  it('exemple officiel : 2 personnes, zone C, 30 000 € de revenus → 20 000 € par part, tranche 3', () => {
    const r = ptz({ zone: 'C', personnes: 2, rfr: 30000, cout: 163000, type: 'neuf_collectif' });
    expect(r.revenuParCoef).toBe(20000);
    expect(r.tranche).toBe(3);
    expect(r.coutRetenu).toBe(150000); // 163 000 € plafonnés à 150 000 € (exemple officiel)
    expect(r.montant).toBe(60000); // 150 000 € × 40 %
  });
  it('maison neuve : quotités 30 / 20 / 20 / 10 %', () => {
    expect(ptz({ zone: 'C', personnes: 2, rfr: 30000, cout: 150000, type: 'neuf_individuel' }).montant).toBe(30000);
    expect(ptz({ zone: 'C', personnes: 1, rfr: 10000, cout: 100000, type: 'neuf_individuel' }).montant).toBe(30000);
  });
  it('tranche 1 : PTZ de 50 000 € sur 100 000 €, autre prêt d’au moins 40 000 € (exemple officiel)', () => {
    const r = ptz({ zone: 'C', personnes: 1, rfr: 10000, cout: 100000, type: 'neuf_collectif' });
    expect(r.tranche).toBe(1);
    expect(r.montant).toBe(50000);
    expect(r.pretMinimum).toBe(40000);
    expect([r.differe, r.remboursement, r.duree]).toEqual([10, 15, 25]);
  });
  it('différés et durées ANIL : 8 + 12, 2 + 13, 0 + 10', () => {
    expect(ptz({ zone: 'A', personnes: 1, rfr: 28000, cout: 150000, type: 'neuf_collectif' })).toMatchObject({ tranche: 2, differe: 8, remboursement: 12 });
    expect(ptz({ zone: 'A', personnes: 1, rfr: 35000, cout: 150000, type: 'neuf_collectif' })).toMatchObject({ tranche: 3, differe: 2, remboursement: 13 });
    expect(ptz({ zone: 'A', personnes: 1, rfr: 45000, cout: 150000, type: 'neuf_collectif' })).toMatchObject({ tranche: 4, differe: 0, remboursement: 10, montant: 30000 });
  });
  it('plafond de ressources : 49 000 € seul en zone A, 49 001 € refusé ; A bis = colonne A', () => {
    expect(ptz({ zone: 'A', personnes: 1, rfr: 49000, cout: 150000, type: 'neuf_collectif' }).eligible).toBe(true);
    expect(ptz({ zone: 'A', personnes: 1, rfr: 49001, cout: 150000, type: 'neuf_collectif' }).motif).toBe('revenus');
    expect(ptz({ zone: 'Abis', personnes: 3, rfr: 60000, cout: 400000, type: 'neuf_collectif' }).plafondOperation).toBe(270000);
  });
  it('revenu plancher : coût de l’opération divisé par 9', () => {
    const r = ptz({ zone: 'B1', personnes: 2, rfr: 0, cout: 202500, type: 'neuf_collectif' });
    expect(r.revenuRetenu).toBe(22500);
    expect(r.tranche).toBe(1); // 22 500 ÷ 1,5 = 15 000 ≤ 21 500
  });
  it('ancien : zones B2 et C seulement, travaux d’au moins 25 % du coût total', () => {
    expect(ptz({ zone: 'B1', personnes: 2, rfr: 30000, cout: 120000, travaux: 40000, type: 'ancien' }).motif).toBe('zone_ancien');
    expect(ptz({ zone: 'B2', personnes: 2, rfr: 30000, cout: 120000, travaux: 30000, type: 'ancien' }).motif).toBe('travaux'); // 20 %
    const ok = ptz({ zone: 'B2', personnes: 2, rfr: 30000, cout: 120000, travaux: 40000, type: 'ancien' });
    expect(ok.eligible).toBe(true);
    expect(ok.coutTotal).toBe(160000);
    expect(ok.coutRetenu).toBe(160000);
  });
  it('ménage de 6 : sous le plafond de 132 300 € en zone A mais au-delà de la borne de tranche 4 → tranche 4', () => {
    const r = ptz({ zone: 'A', personnes: 6, rfr: 125000, cout: 360000, type: 'neuf_collectif' });
    expect(r.eligible).toBe(true);
    expect(r.tranche).toBe(4);
    expect(r.montant).toBe(72000);
  });
});

describe('plus-value immobilière (CGI 150 VC, 200 B, 1609 nonies G)', () => {
  it('abattements de service-public : 10 ans → 30 % / 8,25 % ; 25 ans → 100 % / 55 % ; 30 ans → 100 % / 100 %', () => {
    expect(abattementsDetention(10)).toEqual({ ir: 30, ps: 8.25 });
    expect(abattementsDetention(25)).toEqual({ ir: 100, ps: 55 });
    expect(abattementsDetention(30)).toEqual({ ir: 100, ps: 100 });
    expect(abattementsDetention(5)).toEqual({ ir: 0, ps: 0 });
    expect(abattementsDetention(21)).toEqual({ ir: 96, ps: 26.4 });
    expect(abattementsDetention(22)).toEqual({ ir: 100, ps: 28 });
  });
  it('surtaxe : exemples du BOFiP (103 400 € → 2 442 € ; 52 500 € → 675 €)', () => {
    expect(surtaxePlusValue(103400)).toBe(2442);
    expect(surtaxePlusValue(52500)).toBe(675);
    expect(surtaxePlusValue(50000)).toBe(0);
    expect(surtaxePlusValue(80000)).toBe(1600);
    expect(surtaxePlusValue(300000)).toBe(18000);
  });
  it('taux de service-public : 19 % d’impôt et 17,2 % de prélèvements (20 000 € → 3 800 € et 3 440 €)', () => {
    expect(Math.round(20000 * 0.19)).toBe(3800);
    expect(Math.round(20000 * 0.172)).toBe(3440);
    // 3 ans de détention : aucun abattement, frais réels de 15 000 € contre un forfait de 15 000 €
    const r = plusValue({ prixVente: 300000, prixAchat: 200000, fraisAchatReels: 15000, annees: 3 });
    expect(r.fraisAcquisition).toBe(15000);
    expect(r.pvBrute).toBe(85000);
    expect(r.ir).toBe(Math.round(85000 * 0.19));
    expect(r.ps).toBe(Math.round(85000 * 0.172));
    expect(r.surtaxe).toBe(surtaxePlusValue(85000));
  });
  it('forfaits 7,5 % et 15 % (au-delà de 5 ans), résidence principale, vente sous 15 000 €, remploi', () => {
    const r = plusValue({ prixVente: 320000, prixAchat: 200000, annees: 20 });
    expect(r.fraisAcquisition).toBe(15000);
    expect(r.travaux).toBe(30000);
    expect(r.pvBrute).toBe(75000);
    expect(r.abattIR).toBe(90);
    expect(r.ir).toBe(Math.round(7500 * 0.19));
    expect(plusValue({ prixVente: 320000, prixAchat: 200000, annees: 4 }).travaux).toBe(0);
    expect(plusValue({ prixVente: 500000, prixAchat: 200000, annees: 3, residencePrincipale: true }).total).toBe(0);
    expect(plusValue({ prixVente: 15000, prixAchat: 5000, annees: 3 }).exoneration).toBe('prix_15000');
    const half = plusValue({ prixVente: 300000, prixAchat: 200000, fraisAchatReels: 15000, annees: 3, remploi: 150000 });
    expect(half.partExoneree).toBe(0.5);
    expect(half.ir).toBe(Math.round(42500 * 0.19));
  });
  it('frais réels recalculés par le moteur des frais de notaire quand le département est donné', () => {
    const r = plusValue({ prixVente: 300000, prixAchat: 200000, annees: 8, depAchat: '75' });
    expect(fraisNotaire({ prix: 200000, dep: '75' }).total).toBeGreaterThan(15000);
    expect(r.fraisAcquisitionMode).toBe('reels');
  });
});

describe('taxe foncière (service-public F59)', () => {
  it('base × taux ; revalorisation 2026 de 0,8 % (IPCH novembre 2025 / novembre 2024)', () => {
    expect(taxeFonciere({ base: 2000, tauxTfb: 40 }).tf).toBe(800);
    expect(taxeFonciere({ base: 2000, tauxTfb: 40, revaloriser: true }).base).toBe(2016);
    expect(124.33 / 123.36 - 1).toBeCloseTo(0.008, 3);
  });
  it('TEOM sur la même base, exonération du neuf entre 40 et 100 %', () => {
    const r = taxeFonciere({ base: 2000, tauxTfb: 40, tauxTeom: 10, neuf: true, exoNeufPct: 40 });
    expect(r.teom).toBe(200);
    expect(r.tfDue).toBe(480);
    expect(taxeFonciere({ base: 2000, tauxTfb: 40, neuf: true, exoNeufPct: 10 }).exoneration).toBe(320); // plancher légal de 40 %
  });
  it('plus de 75 ans et 65-75 ans sous le plafond de revenus 2026', () => {
    expect(plafondRfrTF(1)).toBe(12793);
    expect(plafondRfrTF(2)).toBe(19625);
    expect(plafondRfrTF(3.5)).toBe(26457 + 3416);
    expect(plafondRfrTF(3.25)).toBe(26457 + 1708);
    expect(taxeFonciere({ base: 2000, tauxTfb: 40, age: 'plus75', rfr: 12000, parts: 1 }).tfDue).toBe(0);
    expect(taxeFonciere({ base: 2000, tauxTfb: 40, age: 'plus75', rfr: 13000, parts: 1 }).tfDue).toBe(800);
    expect(taxeFonciere({ base: 2000, tauxTfb: 40, age: '65a75', rfr: 12000, parts: 1 }).tfDue).toBe(700);
  });
  it('prorata de l’exemple officiel : vente le 21 mai, 224 jours restants', () => {
    expect(jourDeLAnnee(21, 5)).toBe(141);
    const p = prorataTaxeFonciere(1500, jourDeLAnnee(21, 5));
    expect(p.joursRestants).toBe(224);
    expect(p.acquereur).toBe(920.55);
  });
});

describe('taxe d’aménagement 2026 (service-public A15416, F23263)', () => {
  it('exemples officiels : 50 m² hors Île-de-France (3 % + 2,5 %) → 2 453 € ; en Île-de-France avec 1 % régional', () => {
    const r = taxeAmenagement({ surface: 50, tauxCommune: 3, tauxDep: 2.5 });
    expect(r.valeurTaxable).toBe(44600);
    expect(Math.round(r.partCommune) + Math.round(r.partDep)).toBe(2453);
    const idf = taxeAmenagement({ surface: 50, idf: true, tauxCommune: 3, tauxDep: 2.5, tauxRegion: 1 });
    expect(idf.valeurTaxable).toBe(50550);
    expect(Math.round(idf.partRegion)).toBe(506); // 505,50 €, arrondi par service-public à 505
  });
  it('abattement de 50 % sur les 100 premiers m², piscine 251 €/m², stationnement 2 928 €, exonération jusqu’à 5 m²', () => {
    const r = taxeAmenagement({ surface: 120, abattement: true, tauxCommune: 5, tauxDep: 2.5, piscine: 32, stationnements: 2 });
    expect(r.valeurConstruction).toBe(100 * 446 + 20 * 892);
    expect(r.valeurPiscine).toBe(32 * 251);
    expect(r.valeurStationnement).toBe(2 * 2928);
    expect(taxeAmenagement({ surface: 5, tauxCommune: 5, tauxDep: 2.5 }).total).toBe(0);
    expect(taxeAmenagement({ surface: 5.5, tauxCommune: 5, tauxDep: 2.5 }).total).toBeGreaterThan(0);
  });
  it('taux départementaux DGFiP : 101 départements, région Île-de-France à 1 %', () => {
    const deps = Object.keys(TADEP).filter((k) => !k.startsWith('_'));
    expect(deps.length).toBe(101);
    expect((TADEP as Record<string, unknown>)._region_idf).toBe(1);
    for (const d of deps) { const t = (TADEP as Record<string, { taux: number }>)[d].taux; expect(t).toBeGreaterThan(0); expect(t).toBeLessThanOrEqual(2.5); }
  });
});

describe('jeu communal (zonage du 26 juin 2026, taux DGFiP 2025)', () => {
  it('34 875 communes, 134 en A bis, 870 en A, 2 383 en B1, 3 162 en B2, 28 326 en C', () => {
    expect(STATS.communes).toBe(34875);
    expect(STATS.par_zone).toEqual([134, 870, 2383, 3162, 28326]);
  });
  it('Paris : zone A bis, TFPB 21,21 %, TEOM 6,21 %, taxe d’aménagement 5 % ; Marseille : zone A, 47,87 %', () => {
    expect(C75[0]).toEqual(['75056', 'Paris', 0, 21.21, 6.21, 5]);
    const m = (C13 as Array<[string, string, number, number | null, number | null, number | null]>).find((c) => c[0] === '13055')!;
    expect(m.slice(1, 4)).toEqual(['Marseille', 1, 47.87]);
  });
});

describe('frais d’agence, rendement locatif, coût total', () => {
  it('honoraires TTC en % du prix hors honoraires ; à la charge de l’acquéreur, ils sortent de l’assiette', () => {
    const a = fraisAgence({ prixNetVendeur: 280000, tauxTTC: 5, charge: 'acquereur', dep: '69m' });
    expect(a.honorairesTTC).toBe(14000);
    expect(a.honorairesHT).toBeCloseTo(11666.67, 2);
    expect(a.prixFAI).toBe(294000);
    expect(a.fraisNotaire).toBe(fraisNotaire({ prix: 280000, dep: '69m' }).total);
    expect(a.ecart).toBeGreaterThan(900);
    const v = fraisAgence({ prixNetVendeur: 280000, tauxTTC: 5, charge: 'vendeur', dep: '69m' });
    expect(v.fraisNotaire).toBe(fraisNotaire({ prix: 294000, dep: '69m' }).total);
  });
  it('rendement : brut sur le prix, net sur le coût total avec les frais réels, micro-foncier 30 % et PS 17,2 %', () => {
    const r = rendementLocatif({ prix: 150000, dep: '59', loyerMensuel: 750, chargesAnnuelles: 600, taxeFonciere: 900, tmi: 30 });
    expect(r.brut).toBeCloseTo(6, 6);
    expect(r.fraisAcquisition).toBe(fraisNotaire({ prix: 150000, dep: '59' }).total);
    expect(r.revenuNet).toBe(9000 - 1500);
    expect(r.regimeFiscal).toBe('micro');
    expect(r.imposable).toBe(6300);
    expect(r.impot).toBe(1890);
    expect(r.prelevements).toBeCloseTo(1083.6, 2);
    const m = rendementLocatif({ prix: 150000, dep: '59', loyerMensuel: 750, regime: 'meuble', tmi: 30 });
    expect(m.imposable).toBe(4500);
    expect(m.tauxPS).toBe(18.6);
  });
  it('coût total : prix + agence + frais de notaire + prorata de taxe foncière + travaux', () => {
    const c = coutTotalAchat({ prix: 250000, dep: '33', agenceTTC: 10000, taxeFonciereAnnuelle: 1200, jourSignature: jourDeLAnnee(1, 7), travaux: 5000 });
    const n = fraisNotaire({ prix: 250000, dep: '33' }).total;
    expect(c.total).toBeCloseTo(250000 + 10000 + n + c.prorataTF + 5000, 2);
    expect(c.prorataTF).toBe(prorataTaxeFonciere(1200, 182).acquereur);
    const v = coutTotalAchat({ prix: 250000, dep: '33', agenceTTC: 10000, chargeAgence: 'vendeur' });
    expect(v.fraisNotaire).toBe(fraisNotaire({ prix: 260000, dep: '33' }).total);
  });
});

import { describe, it, expect } from 'vitest';
import { DEPARTEMENTS, emolumentsBruts, emolumentsVente, tauxGlobalAncien, tauxGlobalNeuf, tauxDepartemental, getDep, fraisNotaire, csi, droitsDonation, emolumentsDonation, fraisAcquisitionPlusValue, comparer, economieMobilier, apportNecessaire } from './notaire';

describe('tableau DGFiP au 1er juin 2026', () => {
  it('101 départements + la métropole de Lyon distinguée du Rhône', () => {
    expect(DEPARTEMENTS.length).toBe(102);
    expect(new Set(DEPARTEMENTS.map((d) => d.id)).size).toBe(102);
  });
  it('88 zones fiscales à 5 % (Corse et Alsace comptées une fois), 11 départements à 4,50 %, Indre à 3,80 %', () => {
    const zones = new Map<string, number | null>();
    for (const d of DEPARTEMENTS) zones.set(d.shared ?? d.id, d.voted);
    expect([...zones.values()].filter((v) => v === 5).length).toBe(88);
    const a450 = DEPARTEMENTS.filter((d) => d.voted == null && d.base === 4.5).map((d) => d.code).sort();
    expect(a450).toEqual(['05', '06', '07', '16', '26', '48', '60', '65', '71', '971', '976'].sort());
    expect(DEPARTEMENTS.filter((d) => d.base === 3.8).map((d) => d.code)).toEqual(['36']);
  });
  it('spécificités : Savoie 4,00 % première propriété, Calvados abattement 46 000 €, Hautes-Pyrénées 3,80 % ventes par lots', () => {
    expect(getDep('73').premiere).toBe(4);
    expect(getDep('14').abattement).toBe(46000);
    expect(getDep('65').lots).toBe(3.8);
  });
});

describe('droits de mutation (notaires.fr)', () => {
  it('5 % → 6,3185 % ; 4,50 % → 5,80665 % ; 3,80 % → 5,09006 %', () => {
    expect(tauxGlobalAncien(5)).toBeCloseTo(6.3185, 6);
    expect(tauxGlobalAncien(4.5)).toBeCloseTo(5.80665, 6);
    expect(tauxGlobalAncien(3.8)).toBeCloseTo(5.09006, 6);
  });
  it('taux réduit des ventes soumises à la TVA : 0,70 % + 2,14 % = 0,71498 %', () => {
    expect(tauxGlobalNeuf()).toBeCloseTo(0.71498, 6);
  });
  it('primo-accédant : la hausse à 5 % ne s’applique pas ; Savoie première propriété 4,00 %', () => {
    expect(tauxDepartemental(getDep('75'), 'standard').taux).toBe(5);
    expect(tauxDepartemental(getDep('75'), 'primo').taux).toBe(4.5);
    expect(tauxDepartemental(getDep('73'), 'premiere').taux).toBe(4);
    expect(tauxDepartemental(getDep('73'), 'primo').taux).toBe(4.5);
    expect(tauxDepartemental(getDep('06'), 'primo').taux).toBe(4.5);
    expect(tauxDepartemental(getDep('36'), 'standard').taux).toBe(3.8);
  });
});

describe('émoluments (exemples service-public.gouv.fr F17701)', () => {
  it('métropole, 200 000 € → 1 995,25 € HT', () => expect(emolumentsBruts(200000).total).toBeCloseTo(1995.25, 2));
  it('Guadeloupe 2 454,59 (la fiche écrit 2 426,58 : sa dernière ligne compte 1 348,2 € au lieu de 140 000 × 0,983 % = 1 376,2 €) · Martinique 2 474,29 · Guyane 2 394,64 · Réunion et Mayotte 2 714,05', () => {
    expect(emolumentsBruts(200000, 'gp').total).toBeCloseTo(309.4 + 206.115 + 562.87 + 1376.2, 1);
    expect(emolumentsBruts(200000, 'mq').total).toBeCloseTo(2474.29, 1);
    expect(emolumentsBruts(200000, 'gf').total).toBeCloseTo(2394.64, 1);
    expect(emolumentsBruts(200000, 're').total).toBeCloseTo(2714.05, 1);
    expect(emolumentsBruts(200000, 'yt').total).toBeCloseTo(2714.05, 1);
  });
  it('TTC métropole 2 394,30 € (notaires.fr)', () => expect(emolumentsVente(200000).ttc).toBeCloseTo(2394.3, 1));
  it('minimum 90 € HT et plafond de 10 % de la valeur', () => {
    expect(emolumentsVente(2000).ht).toBeCloseTo(90, 2);
    expect(emolumentsVente(500).ht).toBeCloseTo(50, 2);
    expect(emolumentsVente(500).plafondApplique).toBe(true);
  });
  it('remise de 20 % : seulement sur la part calculée au-delà de 100 000 €', () => {
    expect(emolumentsVente(90000, 'metro', 20).remise).toBe(0);
    const r = emolumentsVente(300000, 'metro', 20);
    expect(r.remise).toBeCloseTo(200000 * 0.00799 * 0.2, 2);
    expect(emolumentsVente(300000, 'metro', 50).remise).toBeCloseTo(r.remise, 6);
  });
  it('TVA : 8,5 % en Guadeloupe, nulle en Guyane', () => {
    expect(emolumentsVente(200000, 'gp').tauxTva).toBe(8.5);
    expect(emolumentsVente(200000, 'gf').tva).toBe(0);
  });
});

describe('frais complets', () => {
  it('CSI 0,10 %, minimum 15 €', () => { expect(csi(200000)).toBe(200); expect(csi(5000)).toBe(15); });
  it('Paris, ancien, 200 000 € : droits 12 637 €', () => {
    const f = fraisNotaire({ prix: 200000, dep: '75', debours: 0 });
    expect(f.droits).toBeCloseTo(12637, 0);
    expect(f.total).toBeCloseTo(12637 + 2394.3 + 339.58 * 1.2 + 200, 0);
  });
  it('neuf : droits à 0,715 %, quel que soit le département', () => {
    expect(fraisNotaire({ prix: 300000, dep: '75', type: 'neuf' }).droits).toBeCloseTo(2144.94, 1);
    expect(fraisNotaire({ prix: 300000, dep: '36', type: 'neuf' }).droits).toBeCloseTo(2144.94, 1);
  });
  it('meubles déduits de l’assiette', () => {
    const m = economieMobilier(300000, 10000, '33');
    expect(m.droitsEvites).toBeCloseTo(10000 * 0.063185, 1);
    expect(m.economie).toBeGreaterThan(m.droitsEvites);
  });
  it('Indre contre Paris, 250 000 € : environ 3 070 € d’écart', () => {
    expect(comparer(250000, '75', '36').ecart).toBeCloseTo(250000 * (0.063185 - 0.0509006), 0);
  });
  it('apport : frais à financer en plus du prix', () => {
    const a = apportNecessaire(200000, '75', 10000);
    expect(a.fraisCouverts).toBe(false);
    expect(a.besoin).toBeGreaterThan(215000);
  });
});

describe('donation (exemples service-public.gouv.fr F14203)', () => {
  it('enfant, 200 000 € → 18 194 €', () => expect(droitsDonation(200000, 'enfant').droits).toBe(18194));
  it('petit-enfant, 100 000 € → 11 821 €', () => expect(droitsDonation(100000, 'petit_enfant').droits).toBe(11821));
  it('arrière-petit-enfant, 20 000 € → 1 194 €', () => expect(droitsDonation(20000, 'arriere_petit_enfant').droits).toBe(1194));
  it('époux, 200 000 € → 21 061 €', () => expect(droitsDonation(200000, 'epoux').droits).toBe(21061));
  it('frère, 50 000 € → 12 887 €', () => expect(droitsDonation(50000, 'frere_soeur').droits).toBe(12887));
  it('neveu, 20 000 € → 6 618 €', () => expect(droitsDonation(20000, 'neveu_niece').droits).toBe(6618));
  it('cousin germain 11 000 € ; ami 12 000 € pour 20 000 €', () => {
    expect(droitsDonation(20000, 'parent_4e').droits).toBe(11000);
    expect(droitsDonation(20000, 'autre').droits).toBe(12000);
  });
  it('époux handicapé, 300 000 € → base 59 951 €', () => expect(droitsDonation(300000, 'epoux', true).taxable).toBe(59951));
  it('émoluments de donation : 4,837 % puis 1,995 %, 1,330 %, 0,998 %', () => {
    expect(emolumentsDonation(6500).ht).toBeCloseTo(314.4, 1);
    expect(emolumentsDonation(100000).ht).toBeCloseTo(6500 * 0.04837 + 10500 * 0.01995 + 43000 * 0.0133 + 40000 * 0.00998, 1);
  });
});

describe('plus-value', () => {
  it('forfait de 7,5 % retenu quand il dépasse les frais réels', () => {
    const r = fraisAcquisitionPlusValue(200000, 14000);
    expect(r.forfait).toBe(15000); expect(r.meilleur).toBe('forfait');
    expect(fraisAcquisitionPlusValue(200000, 16000).meilleur).toBe('reels');
  });
});

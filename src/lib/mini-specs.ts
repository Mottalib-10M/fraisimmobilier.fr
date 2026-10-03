/** Mini-simulateurs des guides (RECETTE §9.3), en français et en anglais, calculés par le moteur des frais de notaire. */
import { DEPARTEMENTS, fraisNotaire, emolumentsVente, emolumentsAuDelaSeuil, csi, tauxGlobalAncien, tauxGlobalNeuf, economieMobilier, fraisAcquisitionPlusValue, apportNecessaire, getDep, PARAMS, type Zone } from './engine/notaire';
import { formatMoney, formatRate } from './format';
import type { MiniSpec } from './mini-types';

type L = 'fr' | 'en';
const T = <A>(l: L, fr: A, en: A) => (l === 'fr' ? fr : en);
const IDX = DEPARTEMENTS.map((d) => d.id);
const depInput = (l: L, def = '75') => ({ id: 'd', label: T(l, 'Département', 'Département'), def: IDX.indexOf(def), options: DEPARTEMENTS.map((d, i) => ({ value: String(i), label: `${d.code} · ${l === 'fr' ? d.fr : d.en} (${formatRate(d.voted ?? d.base, 2, l)})` })) });
const dep = (i: number) => DEPARTEMENTS[i] ?? getDep('75');
const prixInput = (l: L, def = 250000) => ({ id: 'p', label: T(l, 'Prix d’achat', 'Purchase price'), def, unit: '€', max: 50_000_000 });
const ZONES: Array<[Zone, string, string]> = [['gp', 'Guadeloupe', 'Guadeloupe'], ['mq', 'Martinique', 'Martinique'], ['gf', 'Guyane', 'French Guiana'], ['re', 'La Réunion', 'Réunion'], ['yt', 'Mayotte', 'Mayotte']];
const cta = (l: L) => T(l, 'Calcul complet des frais de notaire', 'Full notary fees calculator');

const SPECS: Record<string, (l: L) => MiniSpec> = {
  ancien: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Vos frais dans l’ancien', 'Your fees on a resale property'), cta: cta(l), inputs: [prixInput(l), depInput(l)], run: ({ p, d }) => {
    const f = fraisNotaire({ prix: p, dep: dep(d).id });
    return { head: [T(l, 'Frais de notaire estimés', 'Estimated notary fees'), $(f.total)], rows: [[T(l, 'Part du prix', 'Share of the price'), formatRate(f.pourcentage, 2, l)], [T(l, 'Droits de mutation', 'Transfer tax'), $(f.droits)], [T(l, 'Émoluments et formalités (TTC)', 'Emoluments and formalities (incl. VAT)'), $(f.emoluments.ttc + f.formalitesTTC)]] };
  } }; },
  vefa: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'VEFA ou ancien au même prix', 'Off-plan or resale at the same price'), cta: cta(l), inputs: [prixInput(l, 300000), depInput(l, '33')], run: ({ p, d }) => {
    const n = fraisNotaire({ prix: p, dep: dep(d).id, type: 'neuf' }); const a = fraisNotaire({ prix: p, dep: dep(d).id });
    return { head: [T(l, 'Frais en VEFA', 'Fees on an off-plan purchase'), $(n.total)], rows: [[T(l, 'Même prix dans l’ancien', 'Same price, resale'), $(a.total)], [T(l, 'Économie', 'Saving'), $(a.total - n.total)], [T(l, 'Droits en VEFA', 'Transfer tax off-plan'), $(n.droits)]] };
  } }; },
  droits: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Vos droits de mutation', 'Your transfer tax'), cta: cta(l), inputs: [prixInput(l), depInput(l)], run: ({ p, d }) => {
    const f = fraisNotaire({ prix: p, dep: dep(d).id });
    return { head: [T(l, 'Droits de mutation', 'Transfer tax'), $(f.droits)], rows: [[T(l, 'Taxe départementale', 'Départemental tax'), $(f.droitsDepartement)], [T(l, 'Taxe communale (1,20 %)', 'Municipal tax (1.20%)'), $(f.droitsCommune)], [T(l, 'Frais d’assiette (2,37 % du départemental)', 'Collection fee (2.37% of départemental)'), $(f.droitsAssiette)]] };
  } }; },
  hausse: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Ce que coûte la hausse à 5 %', 'What the rise to 5% costs'), cta: cta(l), inputs: [prixInput(l), depInput(l, '13')], run: ({ p, d }) => {
    const x = dep(d); const voted = x.voted != null; const surcout = voted ? (p * (tauxGlobalAncien(x.voted!) - tauxGlobalAncien(x.base))) / 100 : 0;
    return { head: [T(l, 'Surcoût de la hausse', 'Extra cost of the rise'), $(surcout)], rows: [[T(l, 'Taux global appliqué', 'Overall rate applied'), formatRate(tauxGlobalAncien(x.voted ?? x.base), 3, l)], [T(l, 'Taux global avant la hausse', 'Overall rate before the rise'), formatRate(tauxGlobalAncien(x.base), 3, l)], [T(l, 'Hausse votée ?', 'Rise voted?'), voted ? T(l, 'oui', 'yes') : T(l, 'non', 'no')]] };
  } }; },
  primo: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Votre économie de primo-accédant', 'Your first-time buyer saving'), cta: cta(l), inputs: [prixInput(l, 220000), depInput(l, '31')], run: ({ p, d }) => {
    const x = dep(d); const s = fraisNotaire({ prix: p, dep: x.id }); const pr = fraisNotaire({ prix: p, dep: x.id, situation: x.premiere != null ? 'premiere' : 'primo' });
    return { head: [T(l, 'Économie sur les droits', 'Saving on transfer tax'), $(s.droits - pr.droits)], rows: [[T(l, 'Frais en cas général', 'Fees, standard case'), $(s.total)], [T(l, 'Frais en primo-accédant', 'Fees as a first-time buyer'), $(pr.total)], [T(l, 'Taux départemental retenu', 'Départemental rate used'), formatRate(pr.tauxDep, 2, l)]] };
  } }; },
  emol: (l) => { const $ = (x: number) => formatMoney(x, 2, l); return { title: T(l, 'Les émoluments tranche par tranche', 'Emoluments bracket by bracket'), cta: cta(l), inputs: [prixInput(l, 200000)], run: ({ p }) => {
    const e = emolumentsVente(p);
    return { head: [T(l, 'Émoluments proportionnels HT', 'Proportional emoluments excl. VAT'), $(e.ht)], rows: [...e.tranches.filter((t) => t.base > 0).map((t) => [`${formatRate(t.taux, 3, l)} × ${formatMoney(t.base, 0, l)}`, $(t.montant)] as [string, string]), [T(l, 'TTC (TVA 20 %)', 'Incl. VAT (20%)'), $(e.ttc)]] };
  } }; },
  remise: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Ce que vaut une remise du notaire', 'What a notary discount is worth'), cta: cta(l), inputs: [prixInput(l, 450000), { id: 'r', label: T(l, 'Taux de remise', 'Discount rate'), def: 20, unit: '%', max: PARAMS.emoluments.remise_max }], run: ({ p, r }) => {
    const base = emolumentsAuDelaSeuil(p); const e = emolumentsVente(p, 'metro', r);
    return { head: [T(l, 'Remise TTC', 'Discount incl. VAT'), $(e.remise * 1.2)], rows: [[T(l, 'Émoluments sur la part au-delà de 100 000 €', 'Emoluments on the part above €100,000'), $(base)], [T(l, 'Émoluments TTC après remise', 'Emoluments incl. VAT after discount'), $(e.ttc)]] };
  } }; },
  csi: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Votre contribution de sécurité immobilière', 'Your land registry contribution'), cta: cta(l), inputs: [prixInput(l, 250000)], run: ({ p }) => {
    const c = csi(p);
    return { head: [T(l, 'CSI', 'CSI'), $(c)], rows: [[T(l, 'Taux', 'Rate'), formatRate(PARAMS.csi.taux, 2, l)], [T(l, 'Minimum', 'Minimum'), $(PARAMS.csi.minimum)], [T(l, 'Minimum atteint ?', 'Minimum reached?'), c === PARAMS.csi.minimum ? T(l, 'oui', 'yes') : T(l, 'non', 'no')]] };
  } }; },
  debours: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Formalités et débours dans la facture', 'Formalities and disbursements on the bill'), cta: cta(l), inputs: [prixInput(l, 180000), { id: 'b', label: T(l, 'Débours annoncés', 'Disbursements quoted'), def: 500, unit: '€', max: 50_000 }], run: ({ p, b }) => {
    const f = fraisNotaire({ prix: p, dep: '75', debours: b });
    return { head: [T(l, 'Formalités + débours', 'Formalities + disbursements'), $(f.formalitesTTC + f.debours)], rows: [[T(l, 'Forfait de formalités TTC', 'Flat formalities fee incl. VAT'), $(f.formalitesTTC)], [T(l, 'Part dans les frais totaux', 'Share of total fees'), formatRate(((f.formalitesTTC + f.debours) / f.total) * 100, 1, l)]] };
  } }; },
  mobilier: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Ce que rapporte la liste de meubles', 'What a furniture list saves'), cta: cta(l), inputs: [prixInput(l, 320000), { id: 'm', label: T(l, 'Valeur des meubles', 'Value of the furniture'), def: 12000, unit: '€', max: 5_000_000 }, depInput(l, '44')], run: ({ p, m, d }) => {
    const e = economieMobilier(p, m, dep(d).id);
    return { head: [T(l, 'Économie sur les frais', 'Saving on fees'), $(e.economie)], rows: [[T(l, 'Dont droits de mutation', 'Of which transfer tax'), $(e.droitsEvites)], [T(l, 'Frais sans liste', 'Fees without a list'), $(e.sans)], [T(l, 'Frais avec liste', 'Fees with a list'), $(e.avec)]] };
  } }; },
  agence: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Commission à la charge de l’acheteur ou du vendeur', 'Commission paid by buyer or seller'), cta: cta(l), inputs: [prixInput(l, 280000), { id: 'c', label: T(l, 'Commission d’agence', 'Agency commission'), def: 14000, unit: '€', max: 2_000_000 }, depInput(l, '69m')], run: ({ p, c, d }) => {
    const acq = fraisNotaire({ prix: p, dep: dep(d).id }); const vend = fraisNotaire({ prix: p + c, dep: dep(d).id });
    return { head: [T(l, 'Frais évités si l’acquéreur paie l’agence', 'Fees saved when the buyer pays the agency'), $(vend.total - acq.total)], rows: [[T(l, 'Frais sur le prix net vendeur', 'Fees on the net seller price'), $(acq.total)], [T(l, 'Frais si la commission est dans le prix', 'Fees if the commission is in the price'), $(vend.total)]] };
  } }; },
  quipaie: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Qui touche les frais que vous payez ?', 'Who receives the fees you pay?'), cta: cta(l), inputs: [prixInput(l, 240000), depInput(l, '59')], run: ({ p, d }) => {
    const f = fraisNotaire({ prix: p, dep: dep(d).id });
    return { head: [T(l, 'À votre charge, acheteur', 'Payable by you, the buyer'), $(f.total)], rows: [[T(l, 'Reversé à l’État et aux collectivités', 'Passed to the State and local authorities'), $(f.partEtat)], [T(l, 'Gardé par le notaire (HT)', 'Kept by the notary (excl. VAT)'), $(f.partNotaire)], [T(l, 'Débours', 'Disbursements'), $(f.debours)]] };
  } }; },
  pret: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Votre apport couvre-t-il les frais ?', 'Does your deposit cover the fees?'), cta: cta(l), inputs: [prixInput(l, 260000), { id: 'a', label: T(l, 'Apport personnel', 'Personal deposit'), def: 25000, unit: '€', max: 50_000_000 }, depInput(l, '35')], run: ({ p, a, d }) => {
    const x = apportNecessaire(p, dep(d).id, a);
    return { head: [T(l, 'Montant à emprunter', 'Amount to borrow'), $(x.emprunt)], rows: [[T(l, 'Frais de notaire', 'Notary fees'), $(x.frais)], [T(l, 'Coût total de l’achat', 'Total cost of the purchase'), $(x.besoin)], [T(l, 'Frais couverts par l’apport', 'Fees covered by the deposit'), x.fraisCouverts ? T(l, 'oui', 'yes') : T(l, 'non', 'no')]] };
  } }; },
  reduire: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Trois leviers légaux cumulés', 'Three legal levers combined'), cta: cta(l), inputs: [prixInput(l, 350000), { id: 'm', label: T(l, 'Meubles listés', 'Listed furniture'), def: 10000, unit: '€', max: 5_000_000 }, depInput(l, '92')], run: ({ p, m, d }) => {
    const x = dep(d); const base = fraisNotaire({ prix: p, dep: x.id }); const opt = fraisNotaire({ prix: p, dep: x.id, mobilier: m, situation: 'primo', remisePct: PARAMS.emoluments.remise_max });
    return { head: [T(l, 'Économie possible', 'Possible saving'), $(base.total - opt.total)], rows: [[T(l, 'Frais sans levier', 'Fees with no lever'), $(base.total)], [T(l, 'Meubles + primo-accédant + remise de 20 %', 'Furniture + first-time buyer + 20% discount'), $(opt.total)]], note: T(l, 'La remise reste à la discrétion du notaire ; le taux primo-accédant suppose d’en remplir les conditions.', 'The discount is at the notary’s discretion; the first-time buyer rate requires meeting its conditions.') };
  } }; },
  plusvalue: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Frais réels ou forfait de 7,5 % ?', 'Actual fees or the 7.5% flat rate?'), cta: cta(l), inputs: [{ id: 'p', label: T(l, 'Prix d’achat d’origine', 'Original purchase price'), def: 200000, unit: '€', max: 50_000_000 }, { id: 'f', label: T(l, 'Frais d’acquisition payés', 'Acquisition costs paid'), def: 14500, unit: '€', max: 5_000_000 }], run: ({ p, f }) => {
    const x = fraisAcquisitionPlusValue(p, f);
    return { head: [T(l, 'Montant ajouté au prix d’achat', 'Amount added to the purchase price'), $(x.retenu)], rows: [[T(l, 'Forfait de 7,5 %', '7.5% flat rate'), $(x.forfait)], [T(l, 'Frais réels justifiés', 'Documented actual costs'), $(x.reels)], [T(l, 'Le plus favorable', 'Better option'), x.meilleur === 'forfait' ? T(l, 'le forfait', 'the flat rate') : T(l, 'les frais réels', 'actual costs')]] };
  } }; },
  outremer: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Émoluments outre-mer et métropole', 'Overseas and mainland emoluments'), cta: cta(l), inputs: [prixInput(l, 220000), { id: 'z', label: T(l, 'Département d’outre-mer', 'Overseas département'), def: 3, options: ZONES.map(([, f, e], i) => ({ value: String(i), label: T(l, f, e) })) }], run: ({ p, z }) => {
    const zone = ZONES[z]?.[0] ?? 're'; const o = emolumentsVente(p, zone); const m = emolumentsVente(p);
    return { head: [T(l, 'Émoluments TTC sur place', 'Emoluments incl. VAT locally'), $(o.ttc)], rows: [[T(l, 'Même vente en métropole', 'Same sale in mainland France'), $(m.ttc)], [T(l, 'TVA appliquée', 'VAT applied'), formatRate(o.tauxTva, 1, l)], [T(l, 'Émoluments HT sur place', 'Emoluments excl. VAT locally'), $(o.ht)]] };
  } }; },
  neuf: (l) => { const $ = (x: number) => formatMoney(x, 0, l); return { title: T(l, 'Taux réduit des ventes soumises à la TVA', 'Reduced rate on VAT-able sales'), cta: cta(l), inputs: [prixInput(l, 280000)], run: ({ p }) => {
    const n = fraisNotaire({ prix: p, dep: '75', type: 'neuf' });
    return { head: [T(l, 'Frais dans le neuf', 'New-build fees'), $(n.total)], rows: [[T(l, 'Taux des droits', 'Transfer tax rate'), formatRate(tauxGlobalNeuf(), 3, l)], [T(l, 'Droits', 'Transfer tax'), $(n.droits)]] };
  } }; },
};

export function getSpec(kind: string, lang = 'fr'): MiniSpec {
  const s = SPECS[kind]; if (!s) throw new Error(`Mini-simulateur inconnu : ${kind}`); return s(lang === 'en' ? 'en' : 'fr');
}

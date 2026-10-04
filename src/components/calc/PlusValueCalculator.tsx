/**
 * Calcul de l'impôt sur la plus-value immobilière : frais d'acquisition réels recalculés par le moteur
 * des frais de notaire (département d'achat) contre le forfait de 7,5 %, travaux réels ou forfait de
 * 15 %, abattements pour durée de détention, surtaxe au-delà de 50 000 €, exonérations courantes.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import StackedBar from '../ui/StackedBar';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { plusValue } from '../../lib/engine/immobilier';
import { DEPARTEMENTS, PARAMS } from '../../lib/engine/notaire';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; methodHref?: string; defaultVente?: number; defaultAchat?: number; defaultAnnees?: number; defaultDep?: string }

export default function PlusValueCalculator({ lang, methodHref, defaultVente = 320000, defaultAchat = 200000, defaultAnnees = 12, defaultDep = '33' }: Props) {
  const fr = lang === 'fr';
  const [vente, setVente] = useState(defaultVente);
  const [achat, setAchat] = useState(defaultAchat);
  const [annees, setAnnees] = useState(defaultAnnees);
  const [dep, setDep] = useState(defaultDep);
  const [rp, setRp] = useState('non');
  const [fraisReels, setFraisReels] = useState(0);
  const [travaux, setTravaux] = useState(0);
  const [fraisVente, setFraisVente] = useState(0);
  const [remploi, setRemploi] = useState(0);
  useEffect(() => {
    const u = readParams(window.location.search);
    setVente(num(u, 'vente', defaultVente)); setAchat(num(u, 'achat', defaultAchat)); setAnnees(num(u, 'ans', defaultAnnees)); setDep(str(u, 'dep', defaultDep));
    setRp(str(u, 'rp', 'non') === 'oui' ? 'oui' : 'non'); setFraisReels(num(u, 'frais', 0)); setTravaux(num(u, 'travaux', 0)); setFraisVente(num(u, 'fv', 0)); setRemploi(num(u, 'remploi', 0));
  }, []);
  const depOk = DEPARTEMENTS.some((d) => d.id === dep) ? dep : defaultDep;
  const r = useMemo(() => plusValue({ prixVente: vente, prixAchat: achat, annees, depAchat: depOk, fraisAchatReels: fraisReels || undefined, travauxReels: travaux, fraisVente, remploi, residencePrincipale: rp === 'oui' }), [vente, achat, annees, depOk, fraisReels, travaux, fraisVente, remploi, rp]);
  useEffect(() => { updateURL({ vente, achat, ans: annees, dep: depOk, rp: rp === 'oui' ? 'oui' : undefined, frais: fraisReels || undefined, travaux: travaux || undefined, fv: fraisVente || undefined, remploi: remploi || undefined }); }, [vente, achat, annees, depOk, rp, fraisReels, travaux, fraisVente, remploi]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const V = PARAMS.plus_value;
  const exo = {
    aucune: '', residence_principale: fr ? 'Résidence principale : plus-value exonérée d’impôt et de prélèvements sociaux.' : 'Main home: the gain is exempt from income tax and social charges.',
    prix_15000: fr ? `Prix de vente inférieur ou égal à ${$(V.exoneration_prix_max)} : exonération.` : `Sale price of ${$(V.exoneration_prix_max)} or less: exempt.`,
    duree: fr ? 'Détention de 30 ans et plus : exonération totale.' : '30 years of ownership or more: fully exempt.',
    moins_value: fr ? 'Pas de plus-value : le prix de vente ne dépasse pas le prix d’achat majoré.' : 'No gain: the sale price does not exceed the increased purchase price.',
    remploi: fr ? `Première cession avec remploi : ${formatRate(r.partExoneree * 100, 0, lang)} de la plus-value exonérée.` : `First sale with reinvestment: ${formatRate(r.partExoneree * 100, 0, lang)} of the gain exempt.`,
  }[r.exoneration];
  const depLabel = (d: typeof DEPARTEMENTS[number]) => `${d.code} · ${fr ? d.fr : d.en}`;
  return (
    <Frame
      form={<>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="pv-vente" label={fr ? 'Prix de vente' : 'Sale price'} value={vente} onChange={setVente} unit="€" max={50_000_000} />
          <NumberField lang={lang} id="pv-achat" label={fr ? 'Prix d’achat' : 'Purchase price'} value={achat} onChange={setAchat} unit="€" max={50_000_000} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="pv-ans" label={fr ? 'Années pleines de détention' : 'Full years of ownership'} value={annees} onChange={setAnnees} unit={fr ? 'ans' : 'yrs'} max={99} />
          <SelectField id="pv-dep" label={fr ? 'Département de l’achat' : 'Département of purchase'} value={depOk} onChange={setDep} options={DEPARTEMENTS.map((d) => ({ value: d.id, label: depLabel(d) }))} />
        </div>
        <Toggle id="pv-rp" label={fr ? 'Résidence principale au jour de la vente' : 'Main home on the day of sale'} value={rp} onChange={setRp} options={[{ value: 'non', label: fr ? 'Non' : 'No' }, { value: 'oui', label: fr ? 'Oui' : 'Yes' }]} />
        <details className="rounded-lg border border-navy-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-700">{fr ? 'Options avancées' : 'Advanced options'}</summary>
          <div className="mt-3 space-y-4">
            <NumberField lang={lang} id="pv-frais" label={fr ? 'Frais d’achat réels justifiés' : 'Documented purchase costs'} value={fraisReels} onChange={setFraisReels} unit="€" max={5_000_000} help={fr ? 'Vide : frais de notaire recalculés pour le département' : 'Empty: notary fees recalculated for the département'} />
            <NumberField lang={lang} id="pv-travaux" label={fr ? 'Travaux réels (factures)' : 'Actual works (invoices)'} value={travaux} onChange={setTravaux} unit="€" max={20_000_000} help={fr ? `Comparés au forfait de ${formatRate(V.forfait_travaux, 0, lang)} au-delà de ${V.forfait_travaux_detention_min_ans} ans` : `Compared with the ${formatRate(V.forfait_travaux, 0, lang)} flat rate after ${V.forfait_travaux_detention_min_ans} years`} />
            <NumberField lang={lang} id="pv-fv" label={fr ? 'Frais de vente (diagnostics…)' : 'Selling costs (surveys…)'} value={fraisVente} onChange={setFraisVente} unit="€" max={5_000_000} />
            <NumberField lang={lang} id="pv-remploi" label={fr ? 'Prix remployé (première cession)' : 'Price reinvested (first sale)'} value={remploi} onChange={setRemploi} unit="€" max={50_000_000} help={fr ? 'Achat de la résidence principale sous 2 ans' : 'Main home bought within 2 years'} />
          </div>
        </details>
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? 'Impôt et prélèvements sur la plus-value' : 'Tax and charges on the gain'} value={$(r.total)} sub={fr ? `Plus-value brute ${$(Math.max(0, r.pvBrute))} · abattements ${formatRate(r.abattIR, 2, lang)} (impôt) et ${formatRate(r.abattPS, 2, lang)} (prélèvements)` : `Gross gain ${$(Math.max(0, r.pvBrute))} · allowances ${formatRate(r.abattIR, 2, lang)} (tax) and ${formatRate(r.abattPS, 2, lang)} (charges)`} />
        {exo && <p className="mb-3 rounded-lg bg-accent-50 px-3 py-2 text-sm text-navy-800">{exo}</p>}
        {r.total > 0 && <StackedBar ariaPrefix={fr ? 'Répartition' : 'Breakdown'} total={r.total} segments={[{ label: fr ? `Impôt (${formatRate(V.taux_ir, 0, lang)})` : `Income tax (${formatRate(V.taux_ir, 0, lang)})`, value: r.ir, color: '#1F3A5F' }, { label: fr ? 'Prélèvements sociaux' : 'Social charges', value: r.ps, color: '#8cacd9' }, { label: fr ? 'Surtaxe' : 'Surtax', value: r.surtaxe, color: '#cbd5e1' }]} />}
        <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={fr ? `Frais d’acquisition (${r.fraisAcquisitionMode === 'forfait' ? `forfait de ${formatRate(V.forfait_frais_acquisition, 1, lang)}` : 'montant réel'})` : `Acquisition costs (${r.fraisAcquisitionMode === 'forfait' ? `${formatRate(V.forfait_frais_acquisition, 1, lang)} flat rate` : 'actual amount'})`} v={$(r.fraisAcquisition)} />
          <Row l={fr ? `Travaux (${r.travauxMode === 'forfait' ? `forfait de ${formatRate(V.forfait_travaux, 0, lang)}` : r.travauxMode === 'reels' ? 'factures' : 'aucun'})` : `Works (${r.travauxMode === 'forfait' ? `${formatRate(V.forfait_travaux, 0, lang)} flat rate` : r.travauxMode === 'reels' ? 'invoices' : 'none'})`} v={$(r.travaux)} />
          <Row l={fr ? 'Prix d’achat majoré' : 'Increased purchase price'} v={$(r.prixAchatMajore)} />
          <Row l={fr ? `Impôt sur le revenu (${formatRate(V.taux_ir, 0, lang)} de ${$(r.baseIR)})` : `Income tax (${formatRate(V.taux_ir, 0, lang)} of ${$(r.baseIR)})`} v={$(r.ir)} />
          <Row l={fr ? `Prélèvements sociaux (${formatRate(V.taux_ps, 1, lang)} de ${$(r.basePS)})` : `Social charges (${formatRate(V.taux_ps, 1, lang)} of ${$(r.basePS)})`} v={$(r.ps)} />
          <Row l={fr ? `Surtaxe sur les plus-values de plus de ${$(V.surtaxe_seuil)}` : `Surtax on gains above ${$(V.surtaxe_seuil)}`} v={$(r.surtaxe)} />
          <Row l={fr ? 'Total prélevé par le notaire' : 'Total withheld by the notary'} v={$(r.total)} bold />
          <Row l={fr ? 'Gain net après impôt (vente − achat − impôt)' : 'Net gain after tax (sale − purchase − tax)'} v={$(r.net)} />
        </tbody></table>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'Impôt sur la plus-value' : 'Capital gains tax'} : ${$(r.total)}`} />
      </>}
    />
  );
}

/**
 * Rendement locatif brut, net et net-net, hors crédit : le coût total comprend les frais de notaire
 * réels du département ; le net-net retire l'impôt (micro-foncier ou micro-BIC) et les prélèvements sociaux.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { rendementLocatif, type RegimeLocation } from '../../lib/engine/immobilier';
import { DEPARTEMENTS, PARAMS } from '../../lib/engine/notaire';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; methodHref?: string; defaultPrix?: number; defaultLoyer?: number; defaultDep?: string }

export default function RendementCalculator({ lang, methodHref, defaultPrix = 160000, defaultLoyer = 750, defaultDep = '59' }: Props) {
  const fr = lang === 'fr'; const L = PARAMS.location;
  const [prix, setPrix] = useState(defaultPrix);
  const [dep, setDep] = useState(defaultDep);
  const [loyer, setLoyer] = useState(defaultLoyer);
  const [charges, setCharges] = useState(700);
  const [tf, setTf] = useState(900);
  const [travaux, setTravaux] = useState(0);
  const [vacance, setVacance] = useState(1);
  const [gestion, setGestion] = useState(0);
  const [regime, setRegime] = useState<RegimeLocation>('nu');
  const [tmi, setTmi] = useState(30);
  useEffect(() => {
    const u = readParams(window.location.search);
    setPrix(num(u, 'prix', defaultPrix)); setDep(str(u, 'dep', defaultDep)); setLoyer(num(u, 'loyer', defaultLoyer)); setCharges(num(u, 'charges', 700)); setTf(num(u, 'tf', 900));
    setTravaux(num(u, 'travaux', 0)); setVacance(num(u, 'vacance', 1)); setGestion(num(u, 'gestion', 0)); setRegime(str(u, 'regime', 'nu') === 'meuble' ? 'meuble' : 'nu'); setTmi(num(u, 'tmi', 30));
  }, []);
  const depOk = DEPARTEMENTS.some((d) => d.id === dep) ? dep : defaultDep;
  const r = useMemo(() => rendementLocatif({ prix, dep: depOk, loyerMensuel: loyer, chargesAnnuelles: charges, taxeFonciere: tf, travaux, vacanceMois: vacance, gestionPct: gestion, regime, tmi }), [prix, depOk, loyer, charges, tf, travaux, vacance, gestion, regime, tmi]);
  useEffect(() => { updateURL({ prix, dep: depOk, loyer, charges, tf, travaux: travaux || undefined, vacance, gestion: gestion || undefined, regime: regime === 'meuble' ? 'meuble' : undefined, tmi }); }, [prix, depOk, loyer, charges, tf, travaux, vacance, gestion, regime, tmi]);
  const $ = (x: number) => formatMoney(x, 0, lang); const p = (x: number) => formatRate(x, 2, lang);
  const abatt = regime === 'meuble' ? L.micro_bic_abattement : L.micro_foncier_abattement;
  return (
    <Frame
      form={<>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="rl-prix" label={fr ? 'Prix d’achat' : 'Purchase price'} value={prix} onChange={setPrix} unit="€" max={50_000_000} />
          <NumberField lang={lang} id="rl-loyer" label={fr ? 'Loyer mensuel hors charges' : 'Monthly rent excl. charges'} value={loyer} onChange={setLoyer} unit="€" max={500_000} />
        </div>
        <SelectField id="rl-dep" label={fr ? 'Département (frais de notaire réels)' : 'Département (actual notary fees)'} value={depOk} onChange={setDep} options={DEPARTEMENTS.map((d) => ({ value: d.id, label: `${d.code} · ${fr ? d.fr : d.en}` }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="rl-charges" label={fr ? 'Charges non récupérables / an' : 'Non-recoverable charges / year'} value={charges} onChange={setCharges} unit="€" max={1_000_000} />
          <NumberField lang={lang} id="rl-tf" label={fr ? 'Taxe foncière / an' : 'Property tax / year'} value={tf} onChange={setTf} unit="€" max={1_000_000} />
        </div>
        <Toggle id="rl-regime" label={fr ? 'Location' : 'Letting'} value={regime} onChange={(v) => setRegime(v === 'meuble' ? 'meuble' : 'nu')} options={[{ value: 'nu', label: fr ? 'Nue' : 'Unfurnished' }, { value: 'meuble', label: fr ? 'Meublée' : 'Furnished' }]} />
        <SelectField id="rl-tmi" label={fr ? 'Tranche marginale d’impôt' : 'Marginal tax rate'} value={String(tmi)} onChange={(v) => setTmi(Number(v))} options={L.tmi.map((x) => ({ value: String(x), label: `${x} %` }))} />
        <details className="rounded-lg border border-navy-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-700">{fr ? 'Options avancées' : 'Advanced options'}</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <NumberField lang={lang} id="rl-travaux" label={fr ? 'Travaux à l’achat' : 'Works on purchase'} value={travaux} onChange={setTravaux} unit="€" max={10_000_000} />
            <NumberField lang={lang} id="rl-vacance" label={fr ? 'Vacance locative' : 'Vacancy'} value={vacance} onChange={setVacance} unit={fr ? 'mois' : 'months'} max={12} decimals={1} />
            <NumberField lang={lang} id="rl-gestion" label={fr ? 'Frais de gestion' : 'Management fees'} value={gestion} onChange={setGestion} unit="%" max={50} decimals={1} />
          </div>
        </details>
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? 'Rendement net de charges' : 'Net yield after charges'} value={p(r.net)} sub={fr ? `Brut ${p(r.brut)} · net-net ${p(r.netNet)} après impôt` : `Gross ${p(r.brut)} · net-net ${p(r.netNet)} after tax`} />
        <table className="w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={fr ? 'Rendement brut (loyers ÷ prix)' : 'Gross yield (rent ÷ price)'} v={p(r.brut)} />
          <Row l={fr ? `Coût total (dont frais de notaire ${$(r.fraisAcquisition)})` : `Total cost (incl. notary fees ${$(r.fraisAcquisition)})`} v={$(r.coutTotal)} />
          <Row l={fr ? 'Loyers encaissés sur l’année' : 'Rent collected over the year'} v={$(r.loyersEncaisses)} />
          <Row l={fr ? 'Charges, taxe foncière et gestion' : 'Charges, property tax and management'} v={`− ${$(r.charges)}`} />
          <Row l={fr ? 'Rendement net (revenu net ÷ coût total)' : 'Net yield (net income ÷ total cost)'} v={p(r.net)} bold />
          <Row l={fr ? (r.regimeFiscal === 'micro' ? `Revenu imposable (${regime === 'meuble' ? 'micro-BIC' : 'micro-foncier'}, abattement ${abatt} %)` : 'Revenu imposable (régime réel, sans amortissement)') : (r.regimeFiscal === 'micro' ? `Taxable income (${regime === 'meuble' ? 'micro-BIC' : 'micro-foncier'}, ${abatt}% allowance)` : 'Taxable income (actual regime, no depreciation)')} v={$(r.imposable)} />
          <Row l={fr ? `Impôt (${tmi} %) et prélèvements sociaux (${formatRate(r.tauxPS, 1, lang)})` : `Income tax (${tmi}%) and social charges (${formatRate(r.tauxPS, 1, lang)})`} v={`− ${$(r.impot + r.prelevements)}`} />
          <Row l={fr ? 'Rendement net-net' : 'Net-net yield'} v={p(r.netNet)} bold />
          <Row l={fr ? 'Revenu net après impôt, par mois' : 'Net income after tax, per month'} v={$(r.cashflowMensuel)} />
        </tbody></table>
        <p className="mt-3 text-xs text-navy-600">{fr ? 'Calcul sans crédit : les intérêts d’emprunt, l’assurance et l’amortissement en meublé au réel ne sont pas modélisés.' : 'Calculated without a loan: interest, borrower insurance and furnished depreciation under the actual regime are not modelled.'}</p>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'Rendement' : 'Yield'} : ${fr ? 'brut' : 'gross'} ${p(r.brut)}, net ${p(r.net)}, net-net ${p(r.netNet)}`} />
      </>}
    />
  );
}

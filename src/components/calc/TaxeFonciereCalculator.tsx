/**
 * Taxe foncière : base (revenu cadastral, moitié de la valeur locative) × taux votés de la commune
 * (DGFiP, exercice 2025), revalorisation 2026, exonération du neuf, seuils des 65 et 75 ans, TEOM.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import CommunePicker from './CommunePicker';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { taxeFonciere, type TrancheAge } from '../../lib/engine/immobilier';
import { PARAMS } from '../../lib/engine/notaire';
import { loadDep, toCommune, type Commune, type CommuneRow } from '../../lib/communes';
import { formatDecimal, formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; initialRows: CommuneRow[]; initialDep: string; initialCode: string; methodHref?: string; defaultBase?: number }

export default function TaxeFonciereCalculator({ lang, initialRows, initialDep, initialCode, methodHref, defaultBase = 2200 }: Props) {
  const fr = lang === 'fr'; const T = PARAMS.taxe_fonciere;
  const init = toCommune(initialRows.find((r) => r[0] === initialCode) ?? initialRows[0], initialDep);
  const [commune, setCommuneRaw] = useState<Commune>(init);
  const [tfb, setTfb] = useState(init.tfb ?? 0);
  const [teom, setTeom] = useState(init.teom ?? 0);
  const [base, setBase] = useState(defaultBase);
  const [reval, setReval] = useState('oui');
  const [neuf, setNeuf] = useState('non');
  const [exo, setExo] = useState(100);
  const [age, setAge] = useState<TrancheAge>('moins65');
  const [rfr, setRfr] = useState(15000);
  const [parts, setParts] = useState(1);
  const setCommune = (c: Commune) => { setCommuneRaw(c); setTfb(c.tfb ?? 0); setTeom(c.teom ?? 0); };
  useEffect(() => {
    const u = readParams(window.location.search);
    setBase(num(u, 'base', defaultBase)); setReval(str(u, 'reval', 'oui') === 'non' ? 'non' : 'oui'); setNeuf(str(u, 'neuf', 'non') === 'oui' ? 'oui' : 'non'); setExo(num(u, 'exo', 100));
    const a = str(u, 'age', 'moins65'); setAge(a === '65a75' || a === 'plus75' ? a : 'moins65'); setRfr(num(u, 'rfr', 15000)); setParts(num(u, 'parts', 1));
    const c = str(u, 'insee', ''); const d = str(u, 'dep', '');
    if (c && d) loadDep(d).then((rows) => { const r = rows.find((x) => x[0] === c); if (r) { setCommune(toCommune(r, d)); if (u.has('tfb')) setTfb(num(u, 'tfb', 0)); if (u.has('teom')) setTeom(num(u, 'teom', 0)); } });
  }, []);
  const r = useMemo(() => taxeFonciere({ base, tauxTfb: tfb, tauxTeom: teom, revaloriser: reval === 'oui', neuf: neuf === 'oui', exoNeufPct: exo, age, rfr, parts }), [base, tfb, teom, reval, neuf, exo, age, rfr, parts]);
  useEffect(() => { updateURL({ dep: commune.dep, insee: commune.code, base, reval: reval === 'non' ? 'non' : undefined, neuf: neuf === 'oui' ? 'oui' : undefined, exo: neuf === 'oui' ? exo : undefined, age: age !== 'moins65' ? age : undefined, rfr: age !== 'moins65' ? rfr : undefined, parts: age !== 'moins65' ? parts : undefined, tfb: tfb !== (commune.tfb ?? 0) ? tfb : undefined, teom: teom !== (commune.teom ?? 0) ? teom : undefined }); }, [commune, base, reval, neuf, exo, age, rfr, parts, tfb, teom]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const regle = { aucune: '', neuf: fr ? `Construction neuve : exonération de ${Math.max(exo, T.exoneration_neuf_min_pct)} % pendant ${T.exoneration_neuf_annees} ans (la commune choisit entre ${T.exoneration_neuf_min_pct} et 100 %).` : `New build: ${Math.max(exo, T.exoneration_neuf_min_pct)}% exemption for ${T.exoneration_neuf_annees} years (the municipality chooses between ${T.exoneration_neuf_min_pct} and 100%).`, plus75: fr ? 'Plus de 75 ans sous le plafond de revenus : résidence principale exonérée (la TEOM reste due).' : 'Over 75 under the income ceiling: main home exempt (the waste tax remains due).', '65a75': fr ? `De 65 à 75 ans sous le plafond de revenus : réduction de ${$(T.degrevement_65_75)}.` : `Aged 65 to 75 under the income ceiling: ${$(T.degrevement_65_75)} reduction.` }[r.regle];
  return (
    <Frame
      form={<>
        <CommunePicker id="tf" lang={lang} dep={commune.dep} code={commune.code} initialRows={initialRows} initialDep={initialDep} onChange={setCommune} />
        <NumberField lang={lang} id="tf-base" label={fr ? 'Base d’imposition (revenu cadastral)' : 'Tax base (cadastral income)'} value={base} onChange={setBase} unit="€" max={1_000_000} help={fr ? 'Sur l’avis, colonne « base » : la moitié de la valeur locative' : 'On the notice, “base” column: half the rental value'} />
        <Toggle id="tf-reval" label={fr ? `Base lue sur l’avis 2025 : ajouter la hausse 2026 de ${formatRate(T.revalorisation_2026_pct, 1, lang)}` : `Base from the 2025 notice: add the 2026 uprating of ${formatRate(T.revalorisation_2026_pct, 1, lang)}`} value={reval} onChange={setReval} options={[{ value: 'oui', label: fr ? 'Oui' : 'Yes' }, { value: 'non', label: fr ? 'Non' : 'No' }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="tf-taux" label={fr ? 'Taux foncier bâti' : 'Building tax rate'} value={tfb} onChange={setTfb} unit="%" max={100} decimals={2} />
          <NumberField lang={lang} id="tf-teom" label={fr ? 'Taux d’ordures ménagères' : 'Waste collection rate'} value={teom} onChange={setTeom} unit="%" max={50} decimals={2} />
        </div>
        <p className="-mt-2 text-xs text-navy-500">{fr ? `Taux votés pour ${T.taux_exercice} par la commune et l’intercommunalité (DGFiP), modifiables.` : `Rates voted for ${T.taux_exercice} by the municipality and its grouping (DGFiP), editable.`}</p>
        <details className="rounded-lg border border-navy-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-700">{fr ? 'Exonérations et réductions' : 'Exemptions and reductions'}</summary>
          <div className="mt-3 space-y-4">
            <Toggle id="tf-neuf" label={fr ? 'Construction achevée depuis moins de 2 ans' : 'Completed less than 2 years ago'} value={neuf} onChange={setNeuf} options={[{ value: 'non', label: fr ? 'Non' : 'No' }, { value: 'oui', label: fr ? 'Oui' : 'Yes' }]} />
            {neuf === 'oui' && <SelectField id="tf-exo" label={fr ? 'Exonération votée par la commune' : 'Exemption voted by the municipality'} value={String(exo)} onChange={(v) => setExo(Number(v))} options={[40, 50, 60, 70, 80, 90, 100].map((x) => ({ value: String(x), label: `${x} %` }))} />}
            <SelectField id="tf-age" label={fr ? 'Âge au 1er janvier 2026' : 'Age on 1 January 2026'} value={age} onChange={(v) => setAge(v as TrancheAge)} options={[{ value: 'moins65', label: fr ? 'Moins de 65 ans' : 'Under 65' }, { value: '65a75', label: fr ? 'De 65 à 75 ans' : '65 to 75' }, { value: 'plus75', label: fr ? 'Plus de 75 ans' : 'Over 75' }]} />
            {age !== 'moins65' && <div className="grid gap-4 sm:grid-cols-2">
              <NumberField lang={lang} id="tf-rfr" label={fr ? 'Revenu fiscal de référence 2025' : '2025 reference tax income'} value={rfr} onChange={setRfr} unit="€" max={2_000_000} />
              <SelectField id="tf-parts" label={fr ? 'Parts fiscales' : 'Tax shares'} value={String(parts)} onChange={(v) => setParts(Number(v))} options={[1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5].map((x) => ({ value: String(x), label: formatDecimal(x, 2, lang) }))} />
            </div>}
          </div>
        </details>
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? `Taxe foncière estimée · ${commune.nom}` : `Estimated property tax · ${commune.nom}`} value={$(r.total)} sub={fr ? `Foncier bâti ${$(r.tfDue)} + ordures ménagères ${$(r.teom)}` : `Building tax ${$(r.tfDue)} + waste tax ${$(r.teom)}`} />
        {commune.tfb == null && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{fr ? 'Taux non publié pour cette commune : saisissez celui de votre avis.' : 'No published rate for this municipality: enter the one on your notice.'}</p>}
        {regle && <p className="mb-3 rounded-lg bg-accent-50 px-3 py-2 text-sm text-navy-800">{regle}</p>}
        <table className="w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={fr ? 'Base retenue' : 'Base used'} v={$(r.base)} />
          <Row l={fr ? `Foncier bâti (${formatRate(tfb, 2, lang)})` : `Building tax (${formatRate(tfb, 2, lang)})`} v={$(r.tf)} />
          {r.exoneration > 0 && <Row l={fr ? 'Exonération' : 'Exemption'} v={`− ${$(r.exoneration)}`} />}
          {r.degrevement > 0 && <Row l={fr ? 'Réduction 65-75 ans' : 'Reduction, age 65-75'} v={`− ${$(r.degrevement)}`} />}
          <Row l={fr ? `Ordures ménagères (${formatRate(teom, 2, lang)})` : `Waste collection (${formatRate(teom, 2, lang)})`} v={$(r.teom)} />
          {age !== 'moins65' && <Row l={fr ? `Plafond de revenus (${formatDecimal(parts, 2, lang)} part${parts > 1 ? 's' : ''})` : `Income ceiling (${formatDecimal(parts, 2, lang)} share${parts > 1 ? 's' : ''})`} v={$(r.plafondRfr)} />}
          <Row l={fr ? 'Total à payer (hors frais de gestion)' : 'Total due (excluding management fees)'} v={$(r.total)} bold />
          <Row l={fr ? 'Soit par mois' : 'Per month'} v={$(r.total / 12)} />
        </tbody></table>
        <p className="mt-3 text-xs text-navy-600">{fr ? 'L’avis ajoute des frais de gestion de l’État, non compris ici. Le plafonnement à 50 % des revenus se demande par réclamation.' : 'The notice adds State management fees, not included here. The 50%-of-income cap is claimed separately.'}</p>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'Taxe foncière estimée' : 'Estimated property tax'} : ${$(r.total)} (${commune.nom})`} />
      </>}
    />
  );
}

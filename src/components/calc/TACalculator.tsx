/**
 * Taxe d'aménagement 2026 : surface × valeur forfaitaire (abattement de 50 % sur les 100 premiers m²
 * d'une résidence principale) × taux votés par la commune, le département et, en Île-de-France, la région.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import Toggle from '../ui/Toggle';
import CommunePicker from './CommunePicker';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { taxeAmenagement } from '../../lib/engine/immobilier';
import { PARAMS } from '../../lib/engine/notaire';
import { loadDep, tauxTADep, toCommune, type Commune, type CommuneRow } from '../../lib/communes';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; initialRows: CommuneRow[]; initialDep: string; initialCode: string; methodHref?: string; defaultSurface?: number; defaultRp?: boolean }

export default function TACalculator({ lang, initialRows, initialDep, initialCode, methodHref, defaultSurface = 30, defaultRp = true }: Props) {
  const fr = lang === 'fr'; const A = PARAMS.taxe_amenagement;
  const init = toCommune(initialRows.find((r) => r[0] === initialCode) ?? initialRows[0], initialDep);
  const [commune, setCommuneRaw] = useState<Commune>(init);
  const [tc, setTc] = useState(init.ta ?? 0);
  const [td, setTd] = useState(tauxTADep(init.dep).dep);
  const [surface, setSurface] = useState(defaultSurface);
  const [rp, setRp] = useState(defaultRp ? 'oui' : 'non');
  const [piscine, setPiscine] = useState(0);
  const [places, setPlaces] = useState(0);
  const setCommune = (c: Commune) => { setCommuneRaw(c); setTc(c.ta ?? 0); setTd(tauxTADep(c.dep).dep); };
  useEffect(() => {
    const u = readParams(window.location.search);
    setSurface(num(u, 'm2', defaultSurface)); setRp(str(u, 'rp', defaultRp ? 'oui' : 'non') === 'non' ? 'non' : 'oui'); setPiscine(num(u, 'piscine', 0)); setPlaces(num(u, 'places', 0));
    const c = str(u, 'insee', ''); const d = str(u, 'dep', '');
    if (c && d) loadDep(d).then((rows) => { const r = rows.find((x) => x[0] === c); if (r) { setCommune(toCommune(r, d)); if (u.has('tc')) setTc(num(u, 'tc', 0)); } });
  }, []);
  const dep = tauxTADep(commune.dep);
  const r = useMemo(() => taxeAmenagement({ surface, idf: dep.idf, abattement: rp === 'oui', tauxCommune: tc, tauxDep: td, tauxRegion: dep.region, piscine, stationnements: places }), [surface, dep.idf, dep.region, rp, tc, td, piscine, places]);
  useEffect(() => { updateURL({ dep: commune.dep, insee: commune.code, m2: surface, rp: rp === 'non' ? 'non' : undefined, piscine: piscine || undefined, places: places || undefined, tc: tc !== (commune.ta ?? 0) ? tc : undefined }); }, [commune, surface, rp, piscine, places, tc]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  return (
    <Frame
      form={<>
        <CommunePicker id="ta" lang={lang} dep={commune.dep} code={commune.code} initialRows={initialRows} initialDep={initialDep} onChange={setCommune} />
        <NumberField lang={lang} id="ta-m2" label={fr ? 'Surface taxable créée' : 'Taxable floor area created'} value={surface} onChange={setSurface} unit="m²" max={100_000} decimals={1} help={fr ? 'Close, couverte, hauteur sous plafond d’au moins 1,80 m' : 'Enclosed, roofed, ceiling height of 1.80 m or more'} />
        <Toggle id="ta-rp" label={fr ? `Résidence principale : abattement de ${A.abattement_pct} % sur ${A.abattement_m2} m²` : `Main home: ${A.abattement_pct}% allowance on ${A.abattement_m2} m²`} value={rp} onChange={setRp} options={[{ value: 'oui', label: fr ? 'Oui' : 'Yes' }, { value: 'non', label: fr ? 'Non' : 'No' }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="ta-tc" label={fr ? 'Taux communal' : 'Municipal rate'} value={tc} onChange={setTc} unit="%" max={A.taux_communal_majore_max} decimals={2} />
          <NumberField lang={lang} id="ta-td" label={fr ? 'Taux départemental' : 'Département rate'} value={td} onChange={setTd} unit="%" max={A.taux_departemental_max} decimals={2} />
        </div>
        <p className="-mt-2 text-xs text-navy-500">{fr ? 'Taux votés en vigueur au 1er janvier 2026 (délibérations publiées par la DGFiP). Secteur à taux majoré : corrigez le taux communal.' : 'Voted rates in force on 1 January 2026 (deliberations published by the DGFiP). Higher-rate sector: correct the municipal rate.'}</p>
        <details className="rounded-lg border border-navy-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-700">{fr ? 'Piscine et stationnement' : 'Pool and parking'}</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <NumberField lang={lang} id="ta-piscine" label={fr ? 'Bassin de piscine' : 'Pool basin'} value={piscine} onChange={setPiscine} unit="m²" max={10_000} />
            <NumberField lang={lang} id="ta-places" label={fr ? 'Places extérieures' : 'Outdoor spaces'} value={places} onChange={setPlaces} max={1_000} />
          </div>
        </details>
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? `Taxe d’aménagement · ${commune.nom}` : `Development tax · ${commune.nom}`} value={$(r.total)} sub={fr ? `Taux cumulé ${formatRate(r.tauxTotal, 2, lang)} · valeur ${$(r.valeurM2)} le m²` : `Combined rate ${formatRate(r.tauxTotal, 2, lang)} · value ${$(r.valeurM2)} per m²`} />
        {r.exonereSurface && <p className="mb-3 rounded-lg bg-accent-50 px-3 py-2 text-sm text-navy-800">{fr ? `Construction de ${A.surface_exoneree_max} m² ou moins : exonérée.` : `Building of ${A.surface_exoneree_max} m² or less: exempt.`}</p>}
        {commune.ta == null && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{fr ? 'Aucun taux communal unique publié (taux par secteur ou taxe non instituée) : saisissez le taux de la mairie.' : 'No single municipal rate published (rates by sector or no tax instituted): enter the town hall’s rate.'}</p>}
        <table className="w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={fr ? `Construction (${r.m2Abattus} m² à moitié prix)` : `Building (${r.m2Abattus} m² at half value)`} v={$(r.valeurConstruction)} />
          {r.valeurPiscine > 0 && <Row l={fr ? `Piscine (${$(A.valeur_piscine_m2)} le m²)` : `Pool (${$(A.valeur_piscine_m2)} per m²)`} v={$(r.valeurPiscine)} />}
          {r.valeurStationnement > 0 && <Row l={fr ? `Stationnement (${$(A.valeur_stationnement)} la place)` : `Parking (${$(A.valeur_stationnement)} per space)`} v={$(r.valeurStationnement)} />}
          <Row l={fr ? 'Valeur taxable' : 'Taxable value'} v={$(r.valeurTaxable)} />
          <Row l={fr ? `Part communale (${formatRate(tc, 2, lang)})` : `Municipal share (${formatRate(tc, 2, lang)})`} v={$(r.partCommune)} />
          <Row l={fr ? `Part départementale (${formatRate(td, 2, lang)})` : `Département share (${formatRate(td, 2, lang)})`} v={$(r.partDep)} />
          {dep.idf && <Row l={fr ? `Part régionale Île-de-France (${formatRate(dep.region, 0, lang)})` : `Île-de-France regional share (${formatRate(dep.region, 0, lang)})`} v={$(r.partRegion)} />}
          <Row l={fr ? 'Taxe d’aménagement' : 'Development tax'} v={$(r.total)} bold />
        </tbody></table>
        <p className="mt-3 text-xs text-navy-600">{r.deuxFois ? (fr ? `Au-delà de ${$(A.paiement_deux_fois_au_dela)}, paiement en deux fois : 90 jours puis 9 mois après l’achèvement.` : `Above ${$(A.paiement_deux_fois_au_dela)}, paid in two instalments: 90 days and 9 months after completion.`) : (fr ? 'Paiement en une seule fois. La redevance d’archéologie préventive, si elle est due, s’ajoute.' : 'Paid in a single instalment. Any preventive archaeology fee is added.')}</p>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'Taxe d’aménagement' : 'Development tax'} : ${$(r.total)} (${commune.nom})`} />
      </>}
    />
  );
}

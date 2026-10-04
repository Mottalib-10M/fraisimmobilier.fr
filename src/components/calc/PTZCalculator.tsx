/**
 * Simulateur du PTZ 2026 : la zone se lit sur la commune (zonage du 26 juin 2026), puis le moteur
 * applique plafonds, tranche, quotité, différé et durée (offres émises depuis le 1er avril 2025).
 * Premier rendu = valeurs par défaut du build ; le lien partagé n'est lu qu'après l'hydratation.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import CommunePicker from './CommunePicker';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { ptz, type TypePTZ } from '../../lib/engine/immobilier';
import { loadDep, toCommune, zoneLabel, type Commune, type CommuneRow } from '../../lib/communes';
import { formatDecimal, formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; initialRows: CommuneRow[]; initialDep: string; initialCode: string; methodHref?: string; defaultType?: TypePTZ; defaultCout?: number; defaultRfr?: number; defaultPersonnes?: number }

export default function PTZCalculator({ lang, initialRows, initialDep, initialCode, methodHref, defaultType = 'neuf_collectif', defaultCout = 250000, defaultRfr = 38000, defaultPersonnes = 2 }: Props) {
  const fr = lang === 'fr';
  const init = toCommune(initialRows.find((r) => r[0] === initialCode) ?? initialRows[0], initialDep);
  const [commune, setCommune] = useState<Commune>(init);
  const [type, setType] = useState<TypePTZ>(defaultType);
  const [personnes, setPersonnes] = useState(defaultPersonnes);
  const [rfr, setRfr] = useState(defaultRfr);
  const [cout, setCout] = useState(defaultCout);
  const [travaux, setTravaux] = useState(60000);
  useEffect(() => {
    const u = readParams(window.location.search);
    const t = str(u, 'type', defaultType); setType(t === 'neuf_individuel' || t === 'ancien' ? t : 'neuf_collectif');
    setPersonnes(Math.min(8, Math.max(1, num(u, 'n', defaultPersonnes)))); setRfr(num(u, 'rfr', defaultRfr)); setCout(num(u, 'cout', defaultCout)); setTravaux(num(u, 'travaux', 60000));
    const c = str(u, 'insee', ''); const d = str(u, 'dep', '');
    if (c && d) loadDep(d).then((rows) => { const r = rows.find((x) => x[0] === c); if (r) setCommune(toCommune(r, d)); });
  }, []);
  const r = useMemo(() => ptz({ zone: commune.zone, personnes, rfr, cout, type, travaux }), [commune, personnes, rfr, cout, type, travaux]);
  useEffect(() => { updateURL({ dep: commune.dep, insee: commune.code, type, n: personnes, rfr, cout, travaux: type === 'ancien' ? travaux : undefined }); }, [commune, type, personnes, rfr, cout, travaux]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const motif = {
    ok: '', cout_nul: fr ? 'Saisissez le coût de l’opération.' : 'Enter the cost of the purchase.',
    zone_ancien: fr ? `Dans l’ancien, le PTZ n’est ouvert qu’en zones B2 et C ; ${commune.nom} est en zone ${zoneLabel(commune.zone, lang)}.` : `For resale homes the PTZ is limited to zones B2 and C; ${commune.nom} is in zone ${zoneLabel(commune.zone, lang)}.`,
    travaux: fr ? `Les travaux doivent atteindre 25 % du coût total : ici ${formatRate(r.partTravaux, 1, lang)}.` : `Works must reach 25% of the total cost: here ${formatRate(r.partTravaux, 1, lang)}.`,
    revenus: fr ? `Revenus retenus (${$(r.revenuRetenu)}) au-dessus du plafond de ${$(r.plafondRessources)} pour ${personnes} personne${personnes > 1 ? 's' : ''} en zone ${zoneLabel(commune.zone, lang)}.` : `Income used (${$(r.revenuRetenu)}) above the ${$(r.plafondRessources)} ceiling for ${personnes} occupant${personnes > 1 ? 's' : ''} in zone ${zoneLabel(commune.zone, lang)}.`,
  }[r.motif];
  const types = [
    { value: 'neuf_collectif', label: fr ? 'Appartement neuf (immeuble collectif)' : 'New flat (apartment building)' },
    { value: 'neuf_individuel', label: fr ? 'Maison neuve' : 'New house' },
    { value: 'ancien', label: fr ? 'Ancien avec travaux (25 % au moins)' : 'Resale home with works (25% minimum)' },
  ];
  return (
    <Frame
      form={<>
        <CommunePicker id="ptz" lang={lang} dep={commune.dep} code={commune.code} initialRows={initialRows} initialDep={initialDep} onChange={setCommune} />
        <SelectField id="ptz-type" label={fr ? 'Logement acheté' : 'Home bought'} value={type} onChange={(v) => setType(v as TypePTZ)} options={types} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="ptz-n" label={fr ? 'Personnes logées' : 'Occupants'} value={String(personnes)} onChange={(v) => setPersonnes(Number(v))} options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: n === 8 ? (fr ? '8 et plus' : '8 or more') : String(n) }))} />
          <NumberField lang={lang} id="ptz-rfr" label={fr ? 'Revenu fiscal de référence' : 'Reference tax income'} value={rfr} onChange={setRfr} unit="€" max={2_000_000} />
        </div>
        <p className="-mt-2 text-xs text-navy-500">{fr ? 'Total des avis d’imposition de N-2 de tous les occupants (2024 pour une offre en 2026).' : 'Sum of the N-2 tax notices of all occupants (2024 for an offer in 2026).'}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="ptz-cout" label={type === 'ancien' ? (fr ? 'Prix d’achat et frais' : 'Price and costs') : (fr ? 'Coût de l’opération' : 'Cost of the purchase')} value={cout} onChange={setCout} unit="€" max={20_000_000} />
          {type === 'ancien' && <NumberField lang={lang} id="ptz-travaux" label={fr ? 'Travaux' : 'Works'} value={travaux} onChange={setTravaux} unit="€" max={10_000_000} />}
        </div>
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? `PTZ maximum · ${commune.nom}, zone ${zoneLabel(commune.zone, lang)}` : `Maximum PTZ · ${commune.nom}, zone ${zoneLabel(commune.zone, lang)}`} value={$(r.montant)}
          sub={r.eligible ? (fr ? `Tranche ${r.tranche} · quotité ${r.quotite} % · ${r.duree} ans dont ${r.differe} de différé` : `Bracket ${r.tranche} · ${r.quotite}% share · ${r.duree} years incl. ${r.differe} deferred`) : (fr ? 'Pas de PTZ dans cette situation' : 'No PTZ in this situation')} />
        {!r.eligible && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{motif}</p>}
        <table className="w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={fr ? `Revenus retenus (le plus élevé : RFR ou coût ÷ 9 = ${$(r.plancher)})` : `Income used (higher of tax income and cost ÷ 9 = ${$(r.plancher)})`} v={$(r.revenuRetenu)} />
          <Row l={fr ? `Revenus ÷ coefficient familial ${formatDecimal(r.coefficient, 1, lang)}` : `Income ÷ household coefficient ${formatDecimal(r.coefficient, 1, lang)}`} v={$(r.revenuParCoef)} />
          <Row l={fr ? `Plafond de ressources (${personnes} pers., zone ${zoneLabel(commune.zone, lang)})` : `Income ceiling (${personnes} occ., zone ${zoneLabel(commune.zone, lang)})`} v={$(r.plafondRessources)} />
          <Row l={fr ? `Coût retenu (plafond ${$(r.plafondOperation)})` : `Cost used (cap ${$(r.plafondOperation)})`} v={$(r.coutRetenu)} />
          {r.eligible && <Row l={fr ? `Remboursement après le différé, sur ${r.remboursement} ans` : `Repayment after the deferral, over ${r.remboursement} years`} v={`${$(r.mensualite)}${fr ? ' / mois' : ' / month'}`} />}
          {r.eligible && <Row l={fr ? (r.tranche === 1 ? 'Autres prêts de plus de 2 ans, au minimum (PTZ ≤ 125 %)' : 'Autres prêts de plus de 2 ans, au minimum (PTZ ≤ 100 %)') : (r.tranche === 1 ? 'Other loans over 2 years, at least (PTZ ≤ 125%)' : 'Other loans over 2 years, at least (PTZ ≤ 100%)')} v={$(r.pretMinimum)} />}
          <Row l={fr ? 'PTZ maximum' : 'Maximum PTZ'} v={$(r.montant)} bold />
        </tbody></table>
        <p className="mt-3 text-xs text-navy-600">{fr ? 'Conditions communes : ne pas avoir été propriétaire de sa résidence principale depuis 2 ans, l’occuper dans l’année. Le prêteur reste libre d’accorder le prêt.' : 'Common conditions: no ownership of a main home in the last 2 years, move in within a year. The lender remains free to grant the loan.'}</p>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'PTZ maximum' : 'Maximum PTZ'} : ${$(r.montant)} (${commune.nom}, zone ${zoneLabel(commune.zone, lang)})`} />
      </>}
    />
  );
}

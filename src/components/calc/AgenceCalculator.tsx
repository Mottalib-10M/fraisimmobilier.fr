/**
 * Frais d'agence immobilière : honoraires TTC en % du prix hors honoraires, part de TVA, prix FAI,
 * et effet de la charge (acquéreur ou vendeur) sur l'assiette des frais de notaire.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { fraisAgence, type ChargeAgence } from '../../lib/engine/immobilier';
import { DEPARTEMENTS, PARAMS } from '../../lib/engine/notaire';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; methodHref?: string; defaultPrix?: number; defaultTaux?: number; defaultDep?: string }

export default function AgenceCalculator({ lang, methodHref, defaultPrix = 280000, defaultTaux = 5, defaultDep = '69m' }: Props) {
  const fr = lang === 'fr';
  const [prix, setPrix] = useState(defaultPrix);
  const [taux, setTaux] = useState(defaultTaux);
  const [charge, setCharge] = useState<ChargeAgence>('acquereur');
  const [dep, setDep] = useState(defaultDep);
  useEffect(() => { const u = readParams(window.location.search); setPrix(num(u, 'prix', defaultPrix)); setTaux(num(u, 'taux', defaultTaux)); setCharge(str(u, 'charge', 'acquereur') === 'vendeur' ? 'vendeur' : 'acquereur'); setDep(str(u, 'dep', defaultDep)); }, []);
  const depOk = DEPARTEMENTS.some((d) => d.id === dep) ? dep : defaultDep;
  const r = useMemo(() => fraisAgence({ prixNetVendeur: prix, tauxTTC: taux, charge, dep: depOk }), [prix, taux, charge, depOk]);
  useEffect(() => { updateURL({ prix, taux, charge, dep: depOk }); }, [prix, taux, charge, depOk]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  return (
    <Frame
      form={<>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="ag-prix" label={fr ? 'Prix net vendeur' : 'Net seller price'} value={prix} onChange={setPrix} unit="€" max={50_000_000} />
          <NumberField lang={lang} id="ag-taux" label={fr ? 'Honoraires TTC' : 'Fees incl. VAT'} value={taux} onChange={setTaux} unit="%" max={30} decimals={2} />
        </div>
        <p className="-mt-2 text-xs text-navy-500">{fr ? 'Taux du barème affiché en agence, appliqué au prix hors honoraires' : 'Rate from the agency’s displayed scale, applied to the price excluding fees'}</p>
        <Toggle id="ag-charge" label={fr ? 'Honoraires à la charge de' : 'Fees paid by'} value={charge} onChange={(v) => setCharge(v === 'vendeur' ? 'vendeur' : 'acquereur')} options={[{ value: 'acquereur', label: fr ? 'L’acquéreur' : 'The buyer' }, { value: 'vendeur', label: fr ? 'Le vendeur' : 'The seller' }]} />
        <SelectField id="ag-dep" label={fr ? 'Département du bien' : 'Département of the property'} value={depOk} onChange={setDep} options={DEPARTEMENTS.map((d) => ({ value: d.id, label: `${d.code} · ${fr ? d.fr : d.en}` }))} />
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? 'Honoraires d’agence TTC' : 'Agency fees incl. VAT'} value={$(r.honorairesTTC)} sub={fr ? `Prix FAI ${$(r.prixFAI)} · ${formatRate(r.tauxSurFAI, 2, lang)} du prix FAI` : `Price incl. fees ${$(r.prixFAI)} · ${formatRate(r.tauxSurFAI, 2, lang)} of that price`} />
        <table className="w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={fr ? 'Honoraires hors taxes' : 'Fees excl. VAT'} v={$(r.honorairesHT)} />
          <Row l={fr ? `TVA (${PARAMS.agence.tva} %)` : `VAT (${PARAMS.agence.tva}%)`} v={$(r.tva)} />
          <Row l={fr ? 'Prix frais d’agence inclus (FAI)' : 'Price including agency fees'} v={$(r.prixFAI)} />
          <Row l={fr ? `Base des frais de notaire (${charge === 'acquereur' ? 'prix net vendeur' : 'prix FAI'})` : `Notary fee base (${charge === 'acquereur' ? 'net seller price' : 'price incl. fees'})`} v={$(r.assiette)} />
          <Row l={fr ? 'Frais de notaire' : 'Notary fees'} v={$(r.fraisNotaire)} />
          <Row l={fr ? (charge === 'acquereur' ? 'Frais de notaire si le vendeur payait l’agence' : 'Frais de notaire si l’acquéreur payait l’agence') : (charge === 'acquereur' ? 'Notary fees if the seller paid the agency' : 'Notary fees if the buyer paid the agency')} v={$(r.fraisNotaireAutreCharge)} />
          <Row l={fr ? 'Coût pour l’acquéreur (prix FAI + frais de notaire)' : 'Cost to the buyer (price incl. fees + notary fees)'} v={$(r.coutAcquereur)} bold />
        </tbody></table>
        <p className="mt-3 text-xs text-navy-600">{fr ? `Écart de frais de notaire entre les deux présentations : ${$(r.ecart)}.` : `Difference in notary fees between the two presentations: ${$(r.ecart)}.`}</p>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'Honoraires d’agence' : 'Agency fees'} : ${$(r.honorairesTTC)} · ${fr ? 'coût total' : 'total cost'} ${$(r.coutAcquereur)}`} />
      </>}
    />
  );
}

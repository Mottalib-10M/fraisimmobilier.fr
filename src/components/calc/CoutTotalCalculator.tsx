/**
 * Coût total d'un achat immobilier, hors crédit : prix, honoraires d'agence, frais de notaire du
 * département, prorata de taxe foncière remboursé au vendeur, travaux et taxe d'aménagement.
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import StackedBar from '../ui/StackedBar';
import { Actions, Frame, Head, Row, TRUST } from './parts';
import { coutTotalAchat, jourDeLAnnee, type ChargeAgence } from '../../lib/engine/immobilier';
import { DEPARTEMENTS, type Situation, type TypeBien } from '../../lib/engine/notaire';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

interface Props { lang: 'fr' | 'en'; methodHref?: string; defaultPrix?: number; defaultDep?: string }
const MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };

export default function CoutTotalCalculator({ lang, methodHref, defaultPrix = 280000, defaultDep = '44' }: Props) {
  const fr = lang === 'fr';
  const [prix, setPrix] = useState(defaultPrix);
  const [dep, setDep] = useState(defaultDep);
  const [type, setType] = useState<TypeBien>('ancien');
  const [situation, setSituation] = useState<Situation>('standard');
  const [agence, setAgence] = useState(12000);
  const [charge, setCharge] = useState<ChargeAgence>('acquereur');
  const [travaux, setTravaux] = useState(10000);
  const [tf, setTf] = useState(1300);
  const [mois, setMois] = useState(7);
  const [ta, setTa] = useState(0);
  useEffect(() => {
    const u = readParams(window.location.search);
    setPrix(num(u, 'prix', defaultPrix)); setDep(str(u, 'dep', defaultDep)); setType(str(u, 'type', 'ancien') === 'neuf' ? 'neuf' : 'ancien'); const s = str(u, 'sit', 'standard'); setSituation(s === 'primo' ? 'primo' : 'standard');
    setAgence(num(u, 'agence', 12000)); setCharge(str(u, 'charge', 'acquereur') === 'vendeur' ? 'vendeur' : 'acquereur'); setTravaux(num(u, 'travaux', 10000)); setTf(num(u, 'tf', 1300)); setMois(Math.min(12, Math.max(1, num(u, 'mois', 7)))); setTa(num(u, 'ta', 0));
  }, []);
  const depOk = DEPARTEMENTS.some((d) => d.id === dep) ? dep : defaultDep;
  const r = useMemo(() => coutTotalAchat({ prix, dep: depOk, type, situation: type === 'neuf' ? 'standard' : situation, agenceTTC: agence, chargeAgence: charge, travaux, taxeFonciereAnnuelle: tf, jourSignature: jourDeLAnnee(1, mois), taxeAmenagement: ta }), [prix, depOk, type, situation, agence, charge, travaux, tf, mois, ta]);
  useEffect(() => { updateURL({ prix, dep: depOk, type, sit: situation, agence, charge, travaux, tf, mois, ta: ta || undefined }); }, [prix, depOk, type, situation, agence, charge, travaux, tf, mois, ta]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const agenceAcq = charge === 'acquereur' ? agence : 0;
  return (
    <Frame
      form={<>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="ct-prix" label={fr ? 'Prix net vendeur' : 'Net seller price'} value={prix} onChange={setPrix} unit="€" max={50_000_000} />
          <NumberField lang={lang} id="ct-agence" label={fr ? 'Honoraires d’agence TTC' : 'Agency fees incl. VAT'} value={agence} onChange={setAgence} unit="€" max={5_000_000} />
        </div>
        <SelectField id="ct-dep" label={fr ? 'Département du bien' : 'Département of the property'} value={depOk} onChange={setDep} options={DEPARTEMENTS.map((d) => ({ value: d.id, label: `${d.code} · ${fr ? d.fr : d.en}` }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle id="ct-type" label={fr ? 'Logement' : 'Home'} value={type} onChange={(v) => setType(v === 'neuf' ? 'neuf' : 'ancien')} options={[{ value: 'ancien', label: fr ? 'Ancien' : 'Resale' }, { value: 'neuf', label: fr ? 'Neuf' : 'New' }]} />
          <Toggle id="ct-charge" label={fr ? 'Agence payée par' : 'Agency paid by'} value={charge} onChange={(v) => setCharge(v === 'vendeur' ? 'vendeur' : 'acquereur')} options={[{ value: 'acquereur', label: fr ? 'Acquéreur' : 'Buyer' }, { value: 'vendeur', label: fr ? 'Vendeur' : 'Seller' }]} />
        </div>
        {type === 'ancien' && <SelectField id="ct-sit" label={fr ? 'Votre situation' : 'Your situation'} value={situation} onChange={(v) => setSituation(v === 'primo' ? 'primo' : 'standard')} options={[{ value: 'standard', label: fr ? 'Cas général' : 'Standard case' }, { value: 'primo', label: fr ? 'Primo-accédant (résidence principale)' : 'First-time buyer (main home)' }]} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField lang={lang} id="ct-travaux" label={fr ? 'Travaux prévus' : 'Planned works'} value={travaux} onChange={setTravaux} unit="€" max={10_000_000} />
          <NumberField lang={lang} id="ct-tf" label={fr ? 'Taxe foncière annuelle' : 'Annual property tax'} value={tf} onChange={setTf} unit="€" max={500_000} />
        </div>
        <details className="rounded-lg border border-navy-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-navy-700">{fr ? 'Signature et construction' : 'Signing and building'}</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <SelectField id="ct-mois" label={fr ? 'Signature au 1er du mois de' : 'Signing on the 1st of'} value={String(mois)} onChange={(v) => setMois(Number(v))} options={MOIS[lang].map((m, i) => ({ value: String(i + 1), label: m }))} />
            <NumberField lang={lang} id="ct-ta" label={fr ? 'Taxe d’aménagement' : 'Development tax'} value={ta} onChange={setTa} unit="€" max={1_000_000} />
          </div>
        </details>
        <p className="text-xs text-navy-500">{TRUST[lang]}</p>
      </>}
      result={<>
        <Head label={fr ? 'Coût total de l’achat' : 'Total cost of the purchase'} value={$(r.total)} sub={fr ? `Dont ${$(r.horsPrix)} de frais et taxes, soit ${formatRate(r.partHorsPrix, 1, lang)} du prix` : `Including ${$(r.horsPrix)} of costs and taxes, ${formatRate(r.partHorsPrix, 1, lang)} of the price`} />
        <StackedBar ariaPrefix={fr ? 'Répartition' : 'Breakdown'} total={r.total} segments={[{ label: fr ? 'Prix' : 'Price', value: r.prix, color: '#1F3A5F' }, { label: fr ? 'Frais de notaire' : 'Notary fees', value: r.fraisNotaire, color: '#8cacd9' }, { label: fr ? 'Agence' : 'Agency', value: agenceAcq, color: '#b45309' }, { label: fr ? 'Travaux et taxes' : 'Works and taxes', value: r.travaux + r.prorataTF + r.taxeAmenagement, color: '#cbd5e1' }]} />
        <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-100">
          <Row l={charge === 'vendeur' ? (fr ? 'Prix payé (honoraires du vendeur inclus)' : 'Price paid (seller’s agency fees included)') : (fr ? 'Prix net vendeur' : 'Net seller price')} v={$(r.prix)} />
          {charge === 'acquereur' && <Row l={fr ? 'Honoraires d’agence à votre charge' : 'Agency fees paid by you'} v={$(agence)} />}
          <Row l={fr ? `Frais de notaire (dont ${$(r.droits)} de droits de mutation)` : `Notary fees (incl. ${$(r.droits)} transfer tax)`} v={$(r.fraisNotaire)} />
          <Row l={fr ? `Taxe foncière remboursée au vendeur (signature le 1er ${MOIS.fr[mois - 1]})` : `Property tax refunded to the seller (signing on 1 ${MOIS.en[mois - 1]})`} v={$(r.prorataTF)} />
          {r.travaux > 0 && <Row l={fr ? 'Travaux' : 'Works'} v={$(r.travaux)} />}
          {r.taxeAmenagement > 0 && <Row l={fr ? 'Taxe d’aménagement' : 'Development tax'} v={$(r.taxeAmenagement)} />}
          <Row l={fr ? 'Coût total, hors crédit' : 'Total cost, excluding the loan'} v={$(r.total)} bold />
        </tbody></table>
        <p className="mt-3 text-xs text-navy-600">{fr ? 'Hors frais de dossier, de garantie et d’assurance du prêt, qui dépendent de la banque.' : 'Excluding loan arrangement, guarantee and insurance costs, which depend on the bank.'}</p>
        <Actions lang={lang} methodHref={methodHref} summary={`${fr ? 'Coût total de l’achat' : 'Total cost of the purchase'} : ${$(r.total)}`} />
      </>}
    />
  );
}

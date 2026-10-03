/** Donation : droits de donation (barèmes F14203) et émoluments du notaire (barème « autres donations », F1404). */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import { droitsDonation, emolumentsDonation, type Lien } from '../../lib/engine/notaire';
import { formatMoney } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

const LIENS: Array<[Lien, string, string]> = [
  ['enfant', 'Enfant', 'Child'], ['petit_enfant', 'Petit-enfant', 'Grandchild'], ['arriere_petit_enfant', 'Arrière-petit-enfant', 'Great-grandchild'],
  ['epoux', 'Époux ou partenaire de Pacs', 'Spouse or civil partner (Pacs)'], ['frere_soeur', 'Frère ou sœur', 'Brother or sister'], ['neveu_niece', 'Neveu ou nièce', 'Nephew or niece'],
  ['parent_4e', 'Parent jusqu’au 4e degré (cousin germain…)', 'Relative up to 4th degree (first cousin…)'], ['autre', 'Autre personne', 'Anyone else'],
];

export default function DonationCalculator({ lang }: { lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const [valeur, setValeur] = useState(200000); const [lien, setLien] = useState<Lien>('enfant'); const [handicap, setHandicap] = useState(false);
  useEffect(() => { const u = readParams(window.location.search); setValeur(num(u, 'valeur', 200000)); const l = str(u, 'lien', 'enfant'); setLien((LIENS.find((x) => x[0] === l)?.[0]) ?? 'enfant'); setHandicap(str(u, 'h', '0') === '1'); }, []);
  const d = useMemo(() => droitsDonation(valeur, lien, handicap), [valeur, lien, handicap]);
  const e = useMemo(() => emolumentsDonation(valeur), [valeur]);
  useEffect(() => { updateURL({ valeur, lien, h: handicap ? 1 : undefined }); }, [valeur, lien, handicap]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  return (
    <div data-chrome className="rechner rounded-2xl border border-navy-200 bg-navy-50 p-4 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <form className="space-y-4 lg:col-span-2" onSubmit={(ev) => ev.preventDefault()}>
          <NumberField lang={lang} id="valeur" label={fr ? 'Valeur donnée (pleine propriété)' : 'Value given (full ownership)'} value={valeur} onChange={setValeur} unit="€" max={50_000_000} help={fr ? 'Abattement non encore utilisé depuis 15 ans' : 'Allowance not used in the last 15 years'} />
          <SelectField id="lien" label={fr ? 'Lien avec le donateur' : 'Relationship to the donor'} value={lien} onChange={(v) => setLien(v as Lien)} options={LIENS.map(([v, f, en]) => ({ value: v, label: fr ? f : en }))} />
          <Toggle id="handicap" label={fr ? 'Bénéficiaire handicapé ?' : 'Disabled recipient?'} options={[{ value: '0', label: fr ? 'Non' : 'No' }, { value: '1', label: fr ? 'Oui' : 'Yes' }]} value={handicap ? '1' : '0'} onChange={(v) => setHandicap(v === '1')} />
        </form>
        <div className="lg:col-span-3" aria-live="polite">
          <div className="rounded-xl border border-accent-200 bg-white p-5 shadow-sm">
            <p className="text-center text-sm font-medium text-navy-600">{fr ? 'Droits de donation et émoluments' : 'Gift tax and notary emoluments'}</p>
            <p className="tabular-nums mt-1 text-center text-4xl font-bold text-navy-900">{$(d.droits + e.ttc)}</p>
            <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-100">
              <tr><td className="py-2 text-navy-600">{fr ? 'Abattement' : 'Allowance'}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(d.abattement)}</td></tr>
              <tr><td className="py-2 text-navy-600">{fr ? 'Part taxable' : 'Taxable amount'}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(d.taxable)}</td></tr>
              <tr className="font-semibold"><td className="py-2 text-navy-600">{fr ? 'Droits de donation' : 'Gift tax'}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(d.droits)}</td></tr>
              <tr><td className="py-2 text-navy-600">{fr ? 'Émoluments du notaire (TTC, métropole)' : 'Notary emoluments (incl. VAT, mainland)'}</td><td className="tabular-nums py-2 text-right text-navy-900">{$(e.ttc)}</td></tr>
            </tbody></table>
            <p className="mt-3 text-xs text-navy-600">{fr ? 'Pour un bien immobilier, s’ajoutent la taxe de publicité foncière, la contribution de sécurité immobilière et les débours, non chiffrés ici.' : 'For real estate, land publicity tax, the land registry contribution and disbursements come on top and are not included here.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Comparateur de deux départements pour le même achat dans l'ancien. */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import { DEPARTEMENTS, comparer, type Situation } from '../../lib/engine/notaire';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

export default function CompareCalculator({ lang, defaultA = '75', defaultB = '36', defaultPrix = 300000 }: { lang: 'fr' | 'en'; defaultA?: string; defaultB?: string; defaultPrix?: number }) {
  const fr = lang === 'fr';
  const [prix, setPrix] = useState(defaultPrix); const [a, setA] = useState(defaultA); const [b, setB] = useState(defaultB); const [sit, setSit] = useState<Situation>('standard');
  useEffect(() => { const u = readParams(window.location.search); setPrix(num(u, 'prix', defaultPrix)); setA(str(u, 'a', defaultA)); setB(str(u, 'b', defaultB)); const s = str(u, 'sit', 'standard'); setSit(s === 'primo' ? 'primo' : 'standard'); }, []);
  const ok = (x: string, d: string) => (DEPARTEMENTS.some((e) => e.id === x) ? x : d);
  const r = useMemo(() => comparer(prix, ok(a, defaultA), ok(b, defaultB), sit), [prix, a, b, sit]);
  useEffect(() => { updateURL({ prix, a, b, sit }); }, [prix, a, b, sit]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const opts = DEPARTEMENTS.map((d) => ({ value: d.id, label: `${d.code} · ${fr ? d.fr : d.en} (${formatRate(d.voted ?? d.base, 2, lang)})` }));
  const nom = (x: typeof r.a) => (fr ? x.dep.fr : x.dep.en);
  const diff = Math.abs(r.ecart); const cher = r.ecart >= 0 ? r.a : r.b; const moins = r.ecart >= 0 ? r.b : r.a;
  return (
    <div data-chrome className="rechner rounded-2xl border border-navy-200 bg-navy-50 p-4 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <form className="space-y-4 lg:col-span-2" onSubmit={(e) => e.preventDefault()}>
          <NumberField lang={lang} id="cprix" label={fr ? 'Prix d’achat (ancien)' : 'Purchase price (resale)'} value={prix} onChange={setPrix} unit="€" max={50_000_000} />
          <SelectField id="ca" label={fr ? 'Premier département' : 'First département'} value={ok(a, defaultA)} onChange={setA} options={opts} />
          <SelectField id="cb" label={fr ? 'Second département' : 'Second département'} value={ok(b, defaultB)} onChange={setB} options={opts} />
          <SelectField id="csit" label={fr ? 'Votre situation' : 'Your situation'} value={sit} onChange={(v) => setSit(v === 'primo' ? 'primo' : 'standard')} options={[{ value: 'standard', label: fr ? 'Cas général' : 'Standard case' }, { value: 'primo', label: fr ? 'Primo-accédant (résidence principale)' : 'First-time buyer (main home)' }]} />
        </form>
        <div className="lg:col-span-3" aria-live="polite">
          <div className="rounded-xl border border-accent-200 bg-white p-5 shadow-sm">
            <p className="text-center text-sm font-medium text-navy-600">{fr ? 'Écart de frais pour le même bien' : 'Difference in fees for the same property'}</p>
            <p className="tabular-nums mt-1 text-center text-4xl font-bold text-navy-900">{$(diff)}</p>
            <p className="mt-1 text-center text-sm text-navy-600">{diff < 1 ? (fr ? 'Même taux dans les deux départements.' : 'Same rate in both départements.') : (fr ? `de plus en ${nom(cher)} qu’en ${nom(moins)}` : `more in ${nom(cher)} than in ${nom(moins)}`)}</p>
            <table className="mt-4 w-full text-sm"><thead><tr><th scope="col" className="py-2 text-left text-navy-600">{fr ? 'Département' : 'Département'}</th><th scope="col" className="py-2 text-right text-navy-600">{fr ? 'Taux des droits' : 'Transfer tax rate'}</th><th scope="col" className="py-2 text-right text-navy-600">{fr ? 'Frais totaux' : 'Total fees'}</th></tr></thead>
              <tbody className="divide-y divide-navy-100">
                {[r.a, r.b].map((x, i) => <tr key={i}><td className="py-2 text-navy-800">{nom(x)}</td><td className="tabular-nums py-2 text-right text-navy-900">{formatRate(x.tauxDroits, 3, lang)}</td><td className="tabular-nums py-2 text-right font-semibold text-navy-900">{$(x.total)}</td></tr>)}
              </tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}

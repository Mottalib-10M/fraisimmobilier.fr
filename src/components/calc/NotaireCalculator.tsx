/**
 * Calculateur de frais de notaire (pilier et pages outil). Premier rendu = valeurs par défaut du build ;
 * les paramètres d'un lien partagé ne sont lus qu'après l'hydratation (RECETTE §17.5).
 */
import { useEffect, useMemo, useState } from 'react';
import NumberField from '../ui/NumberField';
import SelectField from '../ui/SelectField';
import Toggle from '../ui/Toggle';
import StackedBar from '../ui/StackedBar';
import { DEPARTEMENTS, fraisNotaire, tauxGlobalAncien, type Situation, type TypeBien, PARAMS } from '../../lib/engine/notaire';
import { formatMoney, formatRate } from '../../lib/format';
import { readParams, num, str, updateURL } from '../../lib/url-state';

const T = {
  fr: {
    prix: 'Prix d’achat (net vendeur)', prixHelp: 'Hors frais d’agence à votre charge', dep: 'Département du bien', type: 'Type de bien', ancien: 'Ancien', neuf: 'Neuf / TVA',
    situation: 'Votre situation', standard: 'Cas général', primo: 'Primo-accédant (résidence principale)', premiere: 'Première propriété, engagement de 5 ans', advanced: 'Options avancées',
    mobilier: 'Meubles listés dans l’acte', mobilierHelp: 'Déduits du prix taxé (valeur réaliste)', remise: 'Remise accordée par le notaire', remiseHelp: 'Au plus 20 %, sur la part au-delà de 100 000 €', debours: 'Débours estimés', deboursHelp: 'Estimation à ajuster sur le devis du notaire',
    result: 'Frais de notaire estimés', ofPrice: 'du prix', droits: 'Droits de mutation', emol: 'Émoluments du notaire (TTC)', form: 'Formalités (TTC)', csi: 'Contribution de sécurité immobilière', deb: 'Débours',
    etat: 'Impôts et taxes', notaire: 'Rémunération du notaire', other: 'Débours', bar: 'Répartition des frais',
    hausse: 'taux voté à 5 % (hausse 2025-2028)', base: 'taux départemental de droit commun', ruleprimo: 'primo-accédant : la hausse à 5 % ne s’applique pas', rulepremiere: 'réduction « première propriété » votée par le département', ruleneuf: 'taux réduit des ventes soumises à la TVA',
    min: 'minimum de 90 € HT appliqué', cap: 'plafond de 10 % du prix appliqué', remiseL: 'dont remise', copy: 'Copier', copied: 'Copié', share: 'Partager', print: 'Imprimer', method: 'Méthode et sources',
    trust: '100 % dans votre navigateur · aucune donnée transmise · gratuit', abatt: 'Ce département a voté un abattement de 46 000 € réservé à certaines acquisitions : il n’est pas appliqué ici, demandez au notaire s’il vous concerne.',
    dom: 'Barème d’émoluments propre à ce département d’outre-mer ; forfait de formalités au tarif métropolitain.', total: 'Total', vs: 'Taux global des droits',
  },
  en: {
    prix: 'Purchase price (net to seller)', prixHelp: 'Excluding agency fees you pay yourself', dep: 'Département of the property', type: 'Property type', ancien: 'Resale', neuf: 'New / VAT',
    situation: 'Your situation', standard: 'Standard case', primo: 'First-time buyer (main home)', premiere: 'First property, 5-year commitment', advanced: 'Advanced options',
    mobilier: 'Furniture listed in the deed', mobilierHelp: 'Deducted from the taxed price (realistic value)', remise: 'Discount granted by the notary', remiseHelp: 'Up to 20%, on the part above €100,000', debours: 'Estimated disbursements', deboursHelp: 'Estimate to adjust to the notary’s quote',
    result: 'Estimated notary fees', ofPrice: 'of the price', droits: 'Transfer tax', emol: 'Notary emoluments (incl. VAT)', form: 'Formalities (incl. VAT)', csi: 'Land registry contribution (CSI)', deb: 'Disbursements',
    etat: 'Taxes', notaire: 'Notary’s pay', other: 'Disbursements', bar: 'Breakdown of the fees',
    hausse: 'rate raised to 5% (2025-2028 increase)', base: 'standard départemental rate', ruleprimo: 'first-time buyer: the 5% increase does not apply', rulepremiere: '“first property” reduction voted by the département', ruleneuf: 'reduced rate for VAT-able sales',
    min: '€90 excl. VAT minimum applied', cap: '10% of price cap applied', remiseL: 'incl. discount', copy: 'Copy', copied: 'Copied', share: 'Share', print: 'Print', method: 'Method and sources',
    trust: '100% in your browser · no data sent · free', abatt: 'This département voted a €46,000 allowance restricted to certain purchases: it is not applied here, ask the notary whether it covers you.',
    dom: 'Overseas emolument scale for this département; formalities charged at the mainland flat rate.', total: 'Total', vs: 'Overall transfer tax rate',
  },
};

export interface CalcProps { lang: 'fr' | 'en'; defaultPrix?: number; defaultDep?: string; defaultType?: TypeBien; defaultSituation?: Situation; methodHref?: string; lockType?: boolean }

export default function NotaireCalculator({ lang, defaultPrix = 250000, defaultDep = '75', defaultType = 'ancien', defaultSituation = 'standard', methodHref, lockType = false }: CalcProps) {
  const t = T[lang]; const fr = lang === 'fr';
  const [prix, setPrix] = useState(defaultPrix);
  const [dep, setDep] = useState(defaultDep);
  const [type, setType] = useState<TypeBien>(defaultType);
  const [situation, setSituation] = useState<Situation>(defaultSituation);
  const [mobilier, setMobilier] = useState(0);
  const [remise, setRemise] = useState(0);
  const [debours, setDebours] = useState(PARAMS.debours_defaut);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const u = readParams(window.location.search);
    setPrix(num(u, 'prix', defaultPrix)); setDep(str(u, 'dep', defaultDep)); if (!lockType) setType(str(u, 'type', defaultType) === 'neuf' ? 'neuf' : 'ancien');
    const s = str(u, 'sit', defaultSituation); setSituation(s === 'primo' || s === 'premiere' ? s : 'standard');
    setMobilier(num(u, 'meubles', 0)); setRemise(num(u, 'remise', 0)); setDebours(num(u, 'debours', PARAMS.debours_defaut));
  }, []);
  const depValid = DEPARTEMENTS.some((d) => d.id === dep) ? dep : '75';
  const r = useMemo(() => fraisNotaire({ prix, dep: depValid, type, situation, mobilier, remisePct: remise, debours }), [prix, depValid, type, situation, mobilier, remise, debours]);
  useEffect(() => { updateURL({ prix, dep: depValid, type, sit: situation, meubles: mobilier || undefined, remise: remise || undefined, debours: debours !== PARAMS.debours_defaut ? debours : undefined }); }, [prix, depValid, type, situation, mobilier, remise, debours]);
  const $ = (x: number) => formatMoney(x, 0, lang);
  const rule = { hausse: t.hausse, base: t.base, primo: t.ruleprimo, premiere: t.rulepremiere, neuf: t.ruleneuf }[r.regle];
  const depLabel = (d: typeof DEPARTEMENTS[number]) => {
    const rate = d.voted ?? d.base;
    return `${d.code} · ${fr ? d.fr : d.en} (${formatRate(rate, 2, lang)})`;
  };
  const copy = async () => { try { await navigator.clipboard.writeText(`${t.result} : ${$(r.total)} (${formatRate(r.pourcentage, 1, lang)} ${t.ofPrice})\n${window.location.href}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers refusé */ } };
  const share = async () => { if (navigator.share) { try { await navigator.share({ url: window.location.href }); return; } catch { /* annulé */ } } await copy(); };
  const etat = r.droits + r.csi + r.emoluments.tva + (r.formalitesTTC - r.formalitesHT);
  return (
    <div data-chrome className="rechner rounded-2xl border border-navy-200 bg-navy-50 p-4 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <form className="space-y-4 lg:col-span-2" onSubmit={(e) => e.preventDefault()}>
          <NumberField lang={lang} id="prix" label={t.prix} value={prix} onChange={setPrix} unit="€" max={50_000_000} help={t.prixHelp} />
          <SelectField id="dep" label={t.dep} value={depValid} onChange={setDep} options={DEPARTEMENTS.map((d) => ({ value: d.id, label: depLabel(d) }))} />
          {!lockType && <Toggle id="type" label={t.type} options={[{ value: 'ancien', label: t.ancien }, { value: 'neuf', label: t.neuf }]} value={type} onChange={(v) => setType(v === 'neuf' ? 'neuf' : 'ancien')} />}
          {type === 'ancien' && <SelectField id="sit" label={t.situation} value={situation} onChange={(v) => setSituation(v as Situation)} options={[{ value: 'standard', label: t.standard }, { value: 'primo', label: t.primo }, { value: 'premiere', label: t.premiere }]} />}
          <details className="rounded-lg border border-navy-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-navy-700">{t.advanced}</summary>
            <div className="mt-3 space-y-4">
              <NumberField lang={lang} id="meubles" label={t.mobilier} value={mobilier} onChange={setMobilier} unit="€" max={5_000_000} help={t.mobilierHelp} />
              <NumberField lang={lang} id="remise" label={t.remise} value={remise} onChange={setRemise} unit="%" max={PARAMS.emoluments.remise_max} help={t.remiseHelp} />
              <NumberField lang={lang} id="debours" label={t.debours} value={debours} onChange={setDebours} unit="€" max={50_000} help={t.deboursHelp} />
            </div>
          </details>
          <p className="text-xs text-navy-500">{t.trust}</p>
        </form>
        <div className="lg:col-span-3" aria-live="polite">
          <div className="rounded-xl border border-accent-200 bg-white p-5 shadow-sm">
            <div className="mb-4 text-center">
              <p className="text-sm font-medium text-navy-600">{t.result} · {fr ? r.dep.fr : r.dep.en}</p>
              <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900 sm:text-5xl">{$(r.total)}</p>
              <p className="tabular-nums mt-1 text-sm text-navy-600">{formatRate(r.pourcentage, 2, lang)} {t.ofPrice} · {t.vs} {formatRate(r.tauxDroits, 3, lang)}</p>
            </div>
            <StackedBar ariaPrefix={t.bar} total={r.total} segments={[{ label: t.etat, value: etat, color: '#1F3A5F' }, { label: t.notaire, value: r.partNotaire, color: '#8cacd9' }, { label: t.other, value: r.debours, color: '#cbd5e1' }]} />
            <table className="mt-4 w-full text-sm"><tbody className="divide-y divide-navy-100">
              <Row l={`${t.droits} · ${formatRate(r.tauxDep, 2, lang)}, ${rule}`} v={$(r.droits)} bold />
              <Row l={`${t.emol}${r.emoluments.minimumApplique ? ` · ${t.min}` : ''}${r.emoluments.plafondApplique ? ` · ${t.cap}` : ''}${r.emoluments.remise > 0 ? ` · ${t.remiseL} ${$(r.emoluments.remise)}` : ''}`} v={$(r.emoluments.ttc)} />
              <Row l={t.form} v={$(r.formalitesTTC)} />
              <Row l={`${t.csi} · ${formatRate(PARAMS.csi.taux, 2, lang)}`} v={$(r.csi)} />
              <Row l={t.deb} v={$(r.debours)} />
              <Row l={t.total} v={$(r.total)} bold />
            </tbody></table>
            {r.dep.abattement && type === 'ancien' && <p className="mt-3 text-xs text-navy-600">{t.abatt}</p>}
            {r.dep.zone !== 'metro' && <p className="mt-3 text-xs text-navy-600">{t.dom}</p>}
            {type === 'ancien' && situation === 'standard' && r.dep.voted != null && <p className="mt-3 text-xs text-navy-600">{fr ? `Primo-accédant : ${$(r.assiette * (tauxGlobalAncien(r.dep.voted) - tauxGlobalAncien(r.dep.base)) / 100)} de droits en moins.` : `First-time buyer: ${$(r.assiette * (tauxGlobalAncien(r.dep.voted) - tauxGlobalAncien(r.dep.base)) / 100)} less transfer tax.`}</p>}
            <div className="no-print mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">{copied ? t.copied : t.copy}</button>
              <button type="button" onClick={share} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">{t.share}</button>
              <button type="button" onClick={() => window.print()} className="rounded-lg border border-navy-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">{t.print}</button>
              {methodHref && <a href={methodHref} className="ml-auto self-center text-sm text-accent-700 hover:underline">{t.method} →</a>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function Row({ l, v, bold = false }: { l: string; v: string; bold?: boolean }) { return <tr className={bold ? 'font-semibold' : ''}><td className="py-2 pr-3 text-navy-600">{l}</td><td className="tabular-nums py-2 text-right text-navy-900">{v}</td></tr>; }

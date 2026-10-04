/** Éléments communs aux calculateurs : ligne de résultat, actions copier / partager / imprimer (RECETTE §17.2). */
import { useState } from 'react';

export function Row({ l, v, bold = false }: { l: string; v: string; bold?: boolean }) {
  return <tr className={bold ? 'font-semibold' : ''}><td className="py-2 pr-3 text-navy-600">{l}</td><td className="tabular-nums py-2 text-right text-navy-900">{v}</td></tr>;
}

export function Actions({ lang, summary, methodHref }: { lang: 'fr' | 'en'; summary: string; methodHref?: string }) {
  const fr = lang === 'fr';
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(`${summary}\n${window.location.href}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers refusé */ } };
  const share = async () => { if (navigator.share) { try { await navigator.share({ url: window.location.href }); return; } catch { /* annulé */ } } await copy(); };
  const btn = 'rounded-lg border border-navy-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50';
  return (
    <div className="no-print mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={copy} className={btn}>{copied ? (fr ? 'Copié' : 'Copied') : (fr ? 'Copier' : 'Copy')}</button>
      <button type="button" onClick={share} className={btn}>{fr ? 'Partager' : 'Share'}</button>
      <button type="button" onClick={() => window.print()} className={btn}>{fr ? 'Imprimer' : 'Print'}</button>
      {methodHref && <a href={methodHref} className="ml-auto self-center text-sm text-accent-700 hover:underline">{fr ? 'Méthode et sources' : 'Method and sources'} →</a>}
    </div>
  );
}

export const TRUST = { fr: '100 % dans votre navigateur · aucune donnée transmise · gratuit', en: '100% in your browser · no data sent · free' };

/** Cadre commun : formulaire à gauche, résultat à droite (même dessin que le calculateur des frais de notaire). */
export function Frame({ form, result }: { form: React.ReactNode; result: React.ReactNode }) {
  return (
    <div data-chrome className="rechner rounded-2xl border border-navy-200 bg-navy-50 p-4 shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <form className="space-y-4 lg:col-span-2" onSubmit={(e) => e.preventDefault()}>{form}</form>
        <div className="lg:col-span-3" aria-live="polite"><div className="rounded-xl border border-accent-200 bg-white p-5 shadow-sm">{result}</div></div>
      </div>
    </div>
  );
}

export function Head({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="mb-4 text-center">
      <p className="text-sm font-medium text-navy-600">{label}</p>
      <p className="tabular-nums mt-1 text-4xl font-bold text-navy-900 sm:text-5xl">{value}</p>
      {sub && <p className="tabular-nums mt-1 text-sm text-navy-600">{sub}</p>}
    </div>
  );
}

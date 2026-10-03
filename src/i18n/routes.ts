import { makeRouter, type RouteDef } from './routes-core';
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
/** Prix des pages « par montant » : chacune porte son propre seuil (RECETTE §6.2), voir lib/amount-angles.ts. */
export const AMOUNTS = [100000, 150000, 200000, 250000, 300000, 400000, 500000, 1000000] as const;
const r = (id: string, fr: string, en: string, noindex = false): RouteDef<Locale> => ({ id, paths: { fr: `/fr/${fr}${fr ? '/' : ''}`, en: `/en/${en}${en ? '/' : ''}` }, ...(noindex ? { noindex } : {}) });
export const ROUTES: RouteDef<Locale>[] = [
  r('home', '', ''),
  r('departements', 'frais-de-notaire-par-departement', 'notary-fees-by-departement'),
  r('comparer', 'comparer-frais-de-notaire-departements', 'compare-notary-fees-departements'),
  r('tableau', 'tableau-frais-de-notaire', 'notary-fees-table'),
  r('neuf', 'frais-de-notaire-neuf', 'notary-fees-new-build'),
  r('terrain', 'frais-de-notaire-terrain', 'notary-fees-land-purchase'),
  r('donation', 'frais-de-notaire-donation', 'notary-fees-gift-donation'),
  r('garage', 'frais-de-notaire-garage-parking', 'notary-fees-garage-parking'),
  r('paris', 'frais-de-notaire-paris', 'notary-fees-paris'),
  r('lyon', 'frais-de-notaire-lyon', 'notary-fees-lyon'),
  r('nice', 'frais-de-notaire-nice-alpes-maritimes', 'notary-fees-nice-alpes-maritimes'),
  r('indre', 'frais-de-notaire-indre', 'notary-fees-indre'),
  r('savoie', 'frais-de-notaire-savoie', 'notary-fees-savoie'),
  r('taux450', 'departements-droits-de-mutation-4-50', 'departements-transfer-tax-4-50'),
  r('outremer', 'frais-de-notaire-outre-mer', 'notary-fees-overseas-france'),
  r('ancien', 'frais-de-notaire-ancien', 'notary-fees-resale-property'),
  r('vefa', 'frais-de-notaire-vefa', 'notary-fees-off-plan-vefa'),
  r('dmto', 'droits-de-mutation', 'property-transfer-tax-france'),
  r('hausse', 'hausse-droits-de-mutation-5-pourcent', 'transfer-tax-rise-5-percent'),
  r('primo', 'frais-de-notaire-primo-accedant', 'notary-fees-first-time-buyer'),
  r('emoluments', 'emoluments-notaire-bareme', 'notary-emoluments-scale'),
  r('remise', 'remise-emoluments-notaire', 'notary-fee-discount'),
  r('csi', 'contribution-securite-immobiliere', 'land-registry-contribution-csi'),
  r('debours', 'debours-formalites-notaire', 'notary-disbursements-formalities'),
  r('mobilier', 'deduire-meubles-frais-de-notaire', 'deduct-furniture-notary-fees'),
  r('agence', 'frais-agence-frais-de-notaire', 'agency-fees-notary-fees'),
  r('quipaie', 'qui-paie-les-frais-de-notaire', 'who-pays-notary-fees'),
  r('pret', 'financer-frais-de-notaire-pret', 'financing-notary-fees-mortgage'),
  r('reduire', 'reduire-frais-de-notaire', 'reduce-notary-fees'),
  r('plusvalue', 'frais-de-notaire-plus-value', 'notary-fees-capital-gains-tax'),
  ...AMOUNTS.map((a) => r(`amount-${a}`, `frais-de-notaire-${a}-euros`, `notary-fees-${a}-euros`)),
  r('method', 'methodologie', 'methodology'),
  r('faq', 'faq', 'faq'),
  r('glossary', 'glossaire', 'glossary'),
  r('about', 'a-propos', 'about'),
  r('contact', 'contact', 'contact', true),
  r('editorial', 'charte-editoriale', 'editorial-policy', true),
  r('legal', 'mentions-legales', 'legal-notice', true),
  r('privacy', 'confidentialite', 'privacy', true),
  r('cookies', 'cookies', 'cookies', true),
  r('widget', 'widget', 'widget', true),
];
export const { NOINDEX_PATHS, route, altPaths } = makeRouter(LOCALES, ROUTES);

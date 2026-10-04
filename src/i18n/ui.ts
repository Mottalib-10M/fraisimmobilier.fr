import type { Locale } from './routes';
const fr = {
  updatedOn: 'Mis à jour le', editorialPolicy: 'Charte éditoriale', contactLabel: 'Contact', reviewedBy: 'Vérifié par',
  skipToContent: 'Aller au contenu', mainNav: 'Navigation principale', breadcrumbLabel: 'Fil d’Ariane', breadcrumbHome: 'Accueil', menuOpen: 'Ouvrir le menu',
  faqTitle: 'Questions fréquentes', relatedCalculators: 'Calculateurs et guides associés', sourcesTitle: 'Sources', writtenBy: 'Rédigé par',
  asOf: 'Taux', lastUpdated: 'mis à jour le', footerValidated: 'Taux DGFiP au 1er juin 2026 · tarif des notaires · zonage et taux locaux officiels', footerBrowser: '100 % dans votre navigateur · aucune donnée transmise · gratuit',
  footerDisclaimer: 'Estimation indicative : seuls le décompte du notaire et les avis de l’administration font foi.', footerPopular: 'Calculs fréquents', notFound: 'Cette page n’existe pas.',
};
const en: typeof fr = {
  updatedOn: 'Updated on', editorialPolicy: 'Editorial policy', contactLabel: 'Contact', reviewedBy: 'Checked by',
  skipToContent: 'Skip to content', mainNav: 'Main navigation', breadcrumbLabel: 'Breadcrumb', breadcrumbHome: 'Home', menuOpen: 'Open menu',
  faqTitle: 'Frequently asked questions', relatedCalculators: 'Related calculators and guides', sourcesTitle: 'Sources', writtenBy: 'Written by',
  asOf: 'Rates', lastUpdated: 'updated on', footerValidated: 'DGFiP rates as of 1 June 2026 · notary tariff · official zoning and local rates', footerBrowser: '100% in your browser · no data sent · free',
  footerDisclaimer: 'Estimate only: the notary’s statement and official tax notices are the figures that count.', footerPopular: 'Common calculations', notFound: 'This page does not exist.',
};
export function t(lang: Locale) { return lang === 'en' ? en : fr; }

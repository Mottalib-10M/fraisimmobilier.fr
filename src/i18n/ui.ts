import type { Locale } from './routes';
const fr = {
  updatedOn: 'Mis à jour le', editorialPolicy: 'Charte éditoriale', contactLabel: 'Contact', reviewedBy: 'Vérifié par',
  skipToContent: 'Aller au contenu', mainNav: 'Navigation principale', breadcrumbLabel: 'Fil d’Ariane', breadcrumbHome: 'Accueil', menuOpen: 'Ouvrir le menu',
  faqTitle: 'Questions fréquentes', relatedCalculators: 'Calculateurs et guides associés', sourcesTitle: 'Sources', writtenBy: 'Rédigé par',
  asOf: 'Taux', lastUpdated: 'mis à jour le', footerValidated: 'Taux DGFiP au 1er juin 2026 · tarif des notaires', footerBrowser: '100 % dans votre navigateur · aucune donnée transmise · gratuit',
  footerDisclaimer: 'Estimation indicative : seul le décompte de votre notaire fait foi.', footerPopular: 'Calculs fréquents', notFound: 'Cette page n’existe pas.',
};
const en: typeof fr = {
  updatedOn: 'Updated on', editorialPolicy: 'Editorial policy', contactLabel: 'Contact', reviewedBy: 'Checked by',
  skipToContent: 'Skip to content', mainNav: 'Main navigation', breadcrumbLabel: 'Breadcrumb', breadcrumbHome: 'Home', menuOpen: 'Open menu',
  faqTitle: 'Frequently asked questions', relatedCalculators: 'Related calculators and guides', sourcesTitle: 'Sources', writtenBy: 'Written by',
  asOf: 'Rates', lastUpdated: 'updated on', footerValidated: 'DGFiP rates as of 1 June 2026 · notary tariff', footerBrowser: '100% in your browser · no data sent · free',
  footerDisclaimer: 'Estimate only: your notary’s statement is the figure that counts.', footerPopular: 'Common calculations', notFound: 'This page does not exist.',
};
export function t(lang: Locale) { return lang === 'en' ? en : fr; }

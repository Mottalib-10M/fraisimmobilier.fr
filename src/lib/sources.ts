/** Sources officielles citées par les pages (vérifiées le jour de params.retrieved_at). */
import P from '../data/params-2026.json';
type L = 'fr' | 'en';
const S = P.sources;
const X: Record<string, { url: string; label: { fr: string; en: string } }> = {
  ...S,
  ...(P as unknown as { sources_autres: typeof S }).sources_autres,
  sp_donation: { url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F14203', label: { fr: 'Service-Public.fr — droits à payer sur une donation selon le lien avec le donateur', en: 'Service-Public.fr — gift tax by relationship to the donor' } },
  sp_faire_donation: { url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1404', label: { fr: 'Service-Public.fr — faire une donation (émoluments du notaire)', en: 'Service-Public.fr — making a gift (notary emoluments)' } },
  sp_simulateur: { url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R54267', label: { fr: 'Service-Public.fr — simulateur des frais de notaire (ANIL)', en: 'Service-Public.fr — notary fees simulator (ANIL)' } },
};
export type SourceKey = keyof typeof X;
export function src(lang: L, ...keys: string[]): Array<{ name: string; url: string }> {
  return keys.map((k) => { const s = X[k]; if (!s) throw new Error(`Source inconnue : ${k}`); return { name: s.label[lang], url: s.url }; });
}

/**
 * Fichier d'angles des pages « par prix » (RECETTE §6.2) : une entrée par montant, chacune avec son seuil
 * propre, son titre, ses sections et ses questions, en français et en anglais. Les chiffres viennent du moteur.
 */
import { fraisNotaire as F, emolumentsVente, fraisAcquisitionPlusValue, economieMobilier, tauxGlobalAncien, tauxGlobalNeuf, PARAMS as P } from './engine/notaire';
import { formatMoney, formatRate } from './format';
type L = 'fr' | 'en';
export interface Angle { title: string; h1: string; description: string; intro: string; resume: string; sections: Array<{ h2: string; p: string[] }>; faqs: Array<{ q: string; a: string }> }

const $ = (x: number, l: L) => formatMoney(x, 0, l);
const pc = (x: number, l: L, d = 2) => formatRate(x, d, l);
const base = (p: number) => F({ prix: p, dep: '75' });

export function angle(amount: number, l: L): Angle {
  const a = base(amount);
  const primo = F({ prix: amount, dep: '75', situation: 'primo' });
  const neuf = F({ prix: amount, dep: '75', type: 'neuf' });
  const indre = F({ prix: amount, dep: '36' });
  const nice = F({ prix: amount, dep: '06' });
  const rem = emolumentsVente(amount, 'metro', P.emoluments.remise_max);
  const fr = l === 'fr';
  const yr = P.year;
  switch (amount) {
    case 100000: {
      const fixes = a.formalitesTTC + a.debours + a.csi;
      return fr ? {
        title: `Frais de notaire 100 000 € en ${yr} : ${$(a.total, l)} dans l’ancien`,
        h1: `Frais de notaire pour un achat à 100 000 € en ${yr}`,
        description: `Frais de notaire pour 100 000 € en ${yr} : ${$(a.total, l)} dans l’ancien à 5 %, ${$(neuf.total, l)} dans le neuf. Pourquoi les petits prix paient plus en pourcentage du prix.`,
        intro: 'Le prix où les postes fixes pèsent le plus, et où la remise du notaire ne joue pas encore.',
        resume: `Pour un logement ancien de 100 000 € dans un département à 5 %, les frais de notaire atteignent ${$(a.total, l)}, soit ${pc(a.pourcentage, l)} du prix : un pourcentage plus élevé que pour un bien plus cher, parce que le forfait de formalités, la contribution de sécurité immobilière et les débours représentent ensemble ${$(fixes, l)}, quel que soit le prix. Les droits de mutation, eux, restent proportionnels : ${$(a.droits, l)}. C’est aussi le prix exact du seuil de la remise : au-delà de 100 000 €, le notaire peut accorder une remise sur ses émoluments ; à 100 000 € pile, la part concernée est nulle. Dans le neuf, les frais tombent à ${$(neuf.total, l)} ; pour un primo-accédant dans l’ancien, à ${$(primo.total, l)}.`,
        sections: [
          { h2: 'Les postes fixes, poids lourd des petits budgets', p: [`Sur 100 000 €, trois lignes ne dépendent presque pas du prix : le forfait de formalités du notaire (${$(a.formalitesTTC, l)} TTC), les débours estimés (${$(a.debours, l)}) et la contribution de sécurité immobilière (${$(a.csi, l)}). Ensemble, ils pèsent ${pc((fixes / a.total) * 100, l, 1)} de la facture, contre moins de 3 % pour un achat d’un million. C’est la raison pour laquelle un studio dans une ville moyenne coûte proportionnellement plus de frais qu’un appartement familial à Paris.`, `Les émoluments eux-mêmes, ${$(a.emoluments.ttc, l)} TTC, profitent du barème dégressif mais restent dominés par la tranche à ${pc(P.emoluments.zones.metro.taux[3], l, 3)} qui porte les 40 000 € au-delà de 60 000 €.`] },
          { h2: 'Le seuil de 100 000 € et la remise', p: ['L’article R444-10 du code de commerce permet au notaire de consentir une remise sur ses émoluments lorsque le prix dépasse 100 000 €, sur la part calculée au-delà de ce montant. À 100 000 € exactement, cette part est nulle : aucune remise n’est possible. À 110 000 €, elle porterait sur moins de 100 € d’émoluments. Pour un budget de cet ordre, les vrais leviers sont ailleurs : le statut de primo-accédant, les meubles listés, la commission d’agence à la charge de l’acquéreur.'] },
        ],
        faqs: [
          { q: 'Pourquoi les frais dépassent-ils 8 % du prix à 100 000 € ?', a: `Parce que les postes fixes, formalités, débours et contribution de sécurité immobilière, totalisent ${$(fixes, l)} et pèsent lourd sur un petit prix. Les droits de mutation restent à ${pc(tauxGlobalAncien(5), l, 2)} du prix dans un département à 5 %, mais l’ensemble atteint ${pc(a.pourcentage, l)}. À 300 000 €, la même facture ne représente plus que ${pc(base(300000).pourcentage, l)} du prix.` },
          { q: 'Un primo-accédant paie combien pour 100 000 € ?', a: `${$(primo.total, l)} dans un département à 5 %, soit ${$(a.total - primo.total, l)} de moins que dans le cas général, grâce au maintien du taux de 4,50 % pour l’achat de sa résidence principale. Dans un département resté à 4,50 % ou dans l’Indre, il n’y a pas d’écart avec un autre acheteur : tout le monde paie déjà le taux le plus bas applicable.` },
          { q: 'Vaut-il mieux acheter neuf à 100 000 € ?', a: `Les frais sont bien plus faibles, ${$(neuf.total, l)} au lieu de ${$(a.total, l)}, mais les logements neufs à ce prix sont rares hors des petites villes et des studios. L’écart de frais, ${$(a.total - neuf.total, l)}, doit se comparer à l’écart de prix au mètre carré, souvent plus élevé dans le neuf, et aux charges de copropriété.` },
        ],
      } : {
        title: `Notary fees on €100,000 in France ${yr}: the full picture`,
        h1: `Notary fees on a €100,000 purchase in France (${yr})`,
        description: `Notary fees on a €100,000 property in ${yr}: ${$(a.total, l)} on a resale at the 5% rate, ${$(neuf.total, l)} new-build. Why cheaper homes pay more in percentage terms in France.`,
        intro: 'The price where fixed items weigh most, and where the notary discount does not yet apply.',
        resume: `On a €100,000 resale property in a département charging the 5% rate, French notary fees come to ${$(a.total, l)}, or ${pc(a.pourcentage, l)} of the price. That share is higher than on dearer homes because the notary’s flat formalities fee, the land registry contribution and the disbursements add up to ${$(fixes, l)} whatever the price. Transfer tax stays proportional at ${$(a.droits, l)}. €100,000 is also exactly the discount threshold: above it, a notary may grant a discount on part of the emoluments; at €100,000 the eligible part is zero. On a new-build sale the fees drop to ${$(neuf.total, l)}, and a first-time buyer purchasing a resale main home pays ${$(primo.total, l)}. In France these costs fall on the buyer and are settled on the day the final deed is signed before the notary.`,
        sections: [
          { h2: 'Fixed items: the burden on small budgets', p: [`Three lines barely depend on the price: the flat formalities fee (${$(a.formalitesTTC, l)} incl. VAT), estimated disbursements (${$(a.debours, l)}) and the land registry contribution (${$(a.csi, l)}). Together they make up ${pc((fixes / a.total) * 100, l, 1)} of the bill, against under 3% on a €1 million purchase. That is why a studio in a mid-sized town costs proportionally more in fees than a family flat in Paris.`, `The emoluments, ${$(a.emoluments.ttc, l)} incl. VAT, benefit from the sliding scale but are dominated by the ${pc(P.emoluments.zones.metro.taux[3], l, 3)} bracket that covers the €40,000 above €60,000.`] },
          { h2: 'The €100,000 threshold and the discount', p: ['Article R444-10 of the Commercial Code lets the notary grant a discount on emoluments when the price exceeds €100,000, on the part calculated above that amount. At exactly €100,000 that part is nil, so no discount is possible; at €110,000 it would apply to less than €100 of emoluments. On a budget like this the real levers lie elsewhere: first-time buyer status, listed furniture and an agency commission paid by the buyer.'] },
        ],
        faqs: [
          { q: 'Why do fees exceed 8% of the price at €100,000?', a: `Because the fixed items, formalities, disbursements and land registry contribution, total ${$(fixes, l)} and weigh heavily on a small price. Transfer tax stays at ${pc(tauxGlobalAncien(5), l, 2)} of the price in a 5% département, but the whole bill reaches ${pc(a.pourcentage, l)}. At €300,000 the same items represent only ${pc(base(300000).pourcentage, l)} of the price.` },
          { q: 'How much does a first-time buyer pay on €100,000?', a: `${$(primo.total, l)} in a 5% département, ${$(a.total - primo.total, l)} less than the standard case, because the 4.50% rate is kept for the purchase of a main home. In a département still at 4.50%, or in Indre, there is no gap with other buyers: everyone already pays the lowest applicable rate.` },
          { q: 'Is it better to buy new at €100,000?', a: `Fees are far lower, ${$(neuf.total, l)} instead of ${$(a.total, l)}, but new homes at that price are rare outside small towns and studios. The fee gap of ${$(a.total - neuf.total, l)} has to be weighed against the usually higher price per square metre of new builds and their service charges.` },
        ],
      };
    }
    case 150000: {
      return fr ? {
        title: `Frais de notaire 150 000 € en ${yr} : primo-accédant ou non`,
        h1: `Frais de notaire pour un achat à 150 000 € en ${yr} : le budget du premier achat`,
        description: `Frais de notaire pour 150 000 € en ${yr} : ${$(a.total, l)} dans l’ancien, ${$(primo.total, l)} pour un primo-accédant. Apport à prévoir, PTZ, frais dans le neuf, cas de l’Indre.`,
        intro: 'Un prix de premier achat, où le statut de primo-accédant change la facture.',
        resume: `À 150 000 €, on est souvent sur un premier achat : un deux-pièces en ville moyenne, une petite maison en périphérie. Dans l’ancien, les frais de notaire atteignent ${$(a.total, l)} dans un département à 5 %. Mais un primo-accédant qui achète sa résidence principale reste au taux de 4,50 % : ses frais tombent à ${$(primo.total, l)}, soit ${$(a.total - primo.total, l)} d’économie, sans condition de revenus. Dans le neuf, la taxe réduite ramène les frais à ${$(neuf.total, l)}. La question pratique est celle de l’apport : la plupart des banques veulent que les frais soient couverts par l’épargne de l’acheteur, et le prêt à taux zéro, accessible sous conditions, ne les finance pas. Dans l’Indre, enfin, le même achat ne coûterait que ${$(indre.total, l)} de frais.`,
        sections: [
          { h2: 'Deux ans sans être propriétaire suffisent', p: ['La règle du primo-accédant ne regarde que votre résidence principale des deux dernières années : si vous étiez locataire, hébergé par vos parents ou logé par votre employeur, vous êtes primo-accédant pour les droits de mutation. Posséder un studio loué à un tiers ou une maison de vacances ne change rien. Il faut en revanche que le bien acheté devienne votre résidence principale, et le dire au notaire pour que la mention figure dans l’acte.', `L’écart de ${$(a.total - primo.total, l)} sur 150 000 € représente un mois ou deux d’épargne pour beaucoup de ménages. Il disparaît dans les onze départements restés à 4,50 %, où tout le monde paie déjà ce taux.`] },
          { h2: 'Réunir l’apport', p: [`Pour un achat à 150 000 €, une banque prudente demandera un apport couvrant au moins les frais : ${$(primo.total, l)} pour un primo-accédant dans l’ancien, ${$(neuf.total, l)} dans le neuf, auxquels s’ajoutent les frais de garantie et de dossier du prêt. Le prêt à taux zéro réduit le capital à emprunter au taux du marché, ce qui libère de la capacité de remboursement, mais il ne paie pas les frais de notaire eux-mêmes.`] },
        ],
        faqs: [
          { q: 'Quel apport prévoir pour un achat à 150 000 € ?', a: `Au minimum le montant des frais : ${$(a.total, l)} dans l’ancien, ${$(primo.total, l)} si vous êtes primo-accédant, ${$(neuf.total, l)} dans le neuf. Ajoutez les frais de garantie du prêt et de dossier bancaire. Beaucoup d’établissements apprécient un apport de 10 % du prix, soit 15 000 €, qui couvre les frais et entame un peu le capital.` },
          { q: 'Le PTZ réduit-il les frais de notaire à 150 000 € ?', a: 'Non. Le prêt à taux zéro finance une partie du prix d’achat de la résidence principale, sous conditions de ressources, de zone et de type de logement ; il ne finance pas les frais de notaire. En réduisant le capital emprunté au taux du marché, il allège la mensualité, mais les frais restent à couvrir par l’apport ou par la part du prêt principal que la banque accepte.' },
          { q: 'Où les frais sont-ils les plus bas pour 150 000 € ?', a: `Dans l’Indre, seul département à 3,80 % : ${$(indre.total, l)}, contre ${$(a.total, l)} dans un département à 5 % et ${$(nice.total, l)} dans un département resté à 4,50 %. Pour un primo-accédant, l’écart avec les départements à 4,50 % disparaît : seule l’Indre reste moins chère.` },
        ],
      } : {
        title: `Notary fees on €150,000 in ${yr}: first-time buyer or not`,
        h1: `Notary fees on a €150,000 purchase in France (${yr}): the first-home budget`,
        description: `Notary fees on a €150,000 property in ${yr}: ${$(a.total, l)} resale, ${$(primo.total, l)} for a first-time buyer. Deposit needed, zero-interest loan, new-build fees, Indre.`,
        intro: 'A typical first-purchase price, where first-time buyer status changes the bill.',
        resume: `€150,000 is often a first purchase: a two-room flat in a mid-sized town or a small house on the outskirts. On a resale property in a 5% département, French notary fees reach ${$(a.total, l)}. A first-time buyer purchasing a main home stays at the 4.50% rate, so the fees fall to ${$(primo.total, l)}, a saving of ${$(a.total - primo.total, l)} with no income condition. On a new-build sale the reduced tax brings the fees down to ${$(neuf.total, l)}. The practical question is the deposit: most banks expect the fees to come out of the buyer’s savings, and the zero-interest loan (PTZ), available under conditions, does not finance them. In Indre, the same purchase would cost only ${$(indre.total, l)} in fees. As everywhere in France, the buyer pays these costs on the day the final deed is signed.`,
        sections: [
          { h2: 'Two years without owning your home is enough', p: ['The first-time buyer rule only looks at your main home over the past two years: if you rented, lived with your parents or in employer housing, you count as a first-time buyer for transfer tax. Owning a studio let to a tenant or a holiday home makes no difference. The property you buy must become your main home, and you must tell the notary so the statement appears in the deed.', `The ${$(a.total - primo.total, l)} gap on €150,000 is a month or two of savings for many households. It disappears in the eleven départements still at 4.50%, where everyone already pays that rate.`] },
          { h2: 'Putting the deposit together', p: [`On a €150,000 purchase, a cautious bank will ask for a deposit covering at least the fees: ${$(primo.total, l)} for a first-time buyer on a resale, ${$(neuf.total, l)} on a new build, plus the loan guarantee and arrangement costs. The PTZ reduces the capital borrowed at market rate, freeing repayment capacity, but it does not pay the notary fees themselves.`] },
        ],
        faqs: [
          { q: 'What deposit should I plan for a €150,000 purchase?', a: `At least the fees: ${$(a.total, l)} on a resale, ${$(primo.total, l)} as a first-time buyer, ${$(neuf.total, l)} on a new build. Add the loan guarantee and the bank’s arrangement fee. Many lenders like a deposit of 10% of the price, €15,000, which covers the fees and a little of the capital.` },
          { q: 'Does the PTZ reduce notary fees at €150,000?', a: 'No. The zero-interest loan finances part of the purchase price of a main home, subject to income, area and property-type conditions; it does not finance notary fees. By reducing the capital borrowed at market rate it lowers the monthly payment, but the fees still have to come from the deposit or from whatever share of the main loan the bank accepts.' },
          { q: 'Where are fees lowest on €150,000?', a: `In Indre, the only département at 3.80%: ${$(indre.total, l)}, against ${$(a.total, l)} in a 5% département and ${$(nice.total, l)} in one still at 4.50%. For a first-time buyer the gap with the 4.50% départements vanishes, because they pay 4.50% everywhere the increase was voted, and only Indre remains cheaper.` },
        ],
      };
    }
    case 200000: {
      const e = emolumentsVente(200000);
      return fr ? {
        title: `Frais de notaire 200 000 € en ${yr} : le calcul détaillé`,
        h1: `Frais de notaire pour un achat à 200 000 € en ${yr}, ligne par ligne`,
        description: `Frais de notaire pour 200 000 € en ${yr} : ${$(a.total, l)} dans l’ancien à 5 %. Émoluments de 1 995,25 € HT, l’exemple officiel recalculé, droits, CSI, débours.`,
        intro: 'Le prix de l’exemple officiel : de quoi vérifier chaque ligne du calcul.',
        resume: `200 000 € est le prix que service-public.fr et Notaires de France prennent pour expliquer le barème des émoluments, ce qui en fait le meilleur cas pour vérifier un calcul. Les émoluments proportionnels du notaire s’élèvent à ${$(e.ht, l)} HT, au centime près l’exemple officiel, soit ${$(e.ttc, l)} TTC. Dans un département à 5 %, les droits de mutation ajoutent ${$(a.droits, l)}, la contribution de sécurité immobilière ${$(a.csi, l)}, le forfait de formalités ${$(a.formalitesTTC, l)} TTC et les débours estimés ${$(a.debours, l)}. Total : ${$(a.total, l)}, soit ${pc(a.pourcentage, l)} du prix. Dans le neuf, les frais sont de ${$(neuf.total, l)} ; pour un primo-accédant dans l’ancien, de ${$(primo.total, l)}. Les sections ci-dessous refont le calcul tranche par tranche, pour que vous puissiez le comparer au devis de votre notaire.`,
        sections: [
          { h2: 'Le barème appliqué à 200 000 €', p: [`Les quatre tranches donnent ${$(6500 * P.emoluments.zones.metro.taux[0] / 100, l)} sur les 6 500 premiers euros, ${$(10500 * P.emoluments.zones.metro.taux[1] / 100, l)} de 6 500 à 17 000 €, ${$(43000 * P.emoluments.zones.metro.taux[2] / 100, l)} de 17 000 à 60 000 € et ${$(140000 * P.emoluments.zones.metro.taux[3] / 100, l)} sur les 140 000 € restants. La somme, ${$(e.ht, l)} HT, est celle de la fiche officielle de service-public.fr ; nos tests automatiques vérifient cet exemple à chaque modification du moteur.`] },
          { h2: 'Les droits, ventilés', p: [`Sur les ${$(a.droits, l)} de droits de mutation, ${$(a.droitsDepartement, l)} vont au département, ${$(a.droitsCommune, l)} à la commune et ${$(a.droitsAssiette, l)} à l’État au titre des frais d’assiette. Ces trois montants changent selon le département : à 4,50 %, le total tombe à ${$(nice.droits, l)} ; dans l’Indre, à ${$(indre.droits, l)}. Les émoluments, eux, ne bougent pas d’un euro.`] },
        ],
        faqs: [
          { q: 'Sur un achat à 200 000 €, quelle part des frais revient au notaire ?', a: `${$(e.ht, l)} HT d’émoluments proportionnels et ${$(P.emoluments.formalites_forfait_ht, l)} HT de forfait de formalités, soit environ ${$(e.ht + P.emoluments.formalites_forfait_ht, l)} hors taxes pour l’étude, sur ${$(a.total, l)} de frais. Le reste est de l’impôt, reversé à l’État et aux collectivités, et des débours remboursés à l’euro près.` },
          { q: 'Les frais de 200 000 € sont-ils les mêmes à Bordeaux et à Nice ?', a: `Non. La Gironde applique 5 % et les Alpes-Maritimes 4,50 % : ${$(a.total, l)} contre ${$(nice.total, l)} pour un achat dans l’ancien, soit ${$(a.total - nice.total, l)} d’écart. Pour un primo-accédant, l’écart disparaît, puisqu’il paie 4,50 % dans les deux départements.` },
          { q: 'Peut-on vérifier soi-même le calcul du notaire à 200 000 € ?', a: `Oui, avec le barème : quatre tranches, quatre taux, la TVA de ${pc(P.emoluments.zones.metro.tva, l, 0)}, puis les droits au taux de votre département sur le prix. Les seules lignes que vous ne pouvez pas recalculer exactement sont les débours, propres au dossier ; demandez-en le détail au notaire avec le décompte définitif.` },
        ],
      } : {
        title: `Notary fees on €200,000 in ${yr}: line-by-line calculation`,
        h1: `Notary fees on a €200,000 purchase in France (${yr}), line by line`,
        description: `Notary fees on a €200,000 property in ${yr}: ${$(a.total, l)} resale at 5%. Emoluments of €1,995.25 excl. VAT, the official example recalculated, tax, CSI, disbursements.`,
        intro: 'The price of the official example: a way to check every line of the calculation.',
        resume: `€200,000 is the price service-public.fr and Notaires de France use to explain the emolument scale, which makes it the best case for checking a calculation. The notary’s proportional emoluments come to ${$(e.ht, l)} excluding VAT, matching the official example to the cent, or ${$(e.ttc, l)} including VAT. In a 5% département, transfer tax adds ${$(a.droits, l)}, the land registry contribution ${$(a.csi, l)}, the flat formalities fee ${$(a.formalitesTTC, l)} incl. VAT and estimated disbursements ${$(a.debours, l)}. Total: ${$(a.total, l)}, or ${pc(a.pourcentage, l)} of the price. On a new build the fees are ${$(neuf.total, l)}; for a first-time buyer on a resale, ${$(primo.total, l)}. The sections below redo the calculation bracket by bracket, so you can compare it with your notary’s estimate. If the estimate differs, the gap almost always lies in the disbursements, which depend on the documents your file needs.`,
        sections: [
          { h2: 'The scale applied to €200,000', p: [`The four brackets give ${$(6500 * P.emoluments.zones.metro.taux[0] / 100, l)} on the first €6,500, ${$(10500 * P.emoluments.zones.metro.taux[1] / 100, l)} from €6,500 to €17,000, ${$(43000 * P.emoluments.zones.metro.taux[2] / 100, l)} from €17,000 to €60,000 and ${$(140000 * P.emoluments.zones.metro.taux[3] / 100, l)} on the remaining €140,000. The sum, ${$(e.ht, l)} excl. VAT, is the figure on the official service-public.fr page; our automated tests check this example every time the engine changes.`] },
          { h2: 'The transfer tax, broken down', p: [`Of the ${$(a.droits, l)} of transfer tax, ${$(a.droitsDepartement, l)} goes to the département, ${$(a.droitsCommune, l)} to the municipality and ${$(a.droitsAssiette, l)} to the State as a collection fee. All three change with the département: at 4.50% the total falls to ${$(nice.droits, l)}, in Indre to ${$(indre.droits, l)}. The emoluments do not move by a single euro.`] },
        ],
        faqs: [
          { q: 'On a €200,000 purchase, what share of the fees goes to the notary?', a: `${$(e.ht, l)} excl. VAT in proportional emoluments and ${$(P.emoluments.formalites_forfait_ht, l)} excl. VAT of flat formalities fee, about ${$(e.ht + P.emoluments.formalites_forfait_ht, l)} before VAT for the office, out of ${$(a.total, l)} of fees. The rest is tax passed on to the State and local authorities, plus disbursements refunded to the euro.` },
          { q: 'Are fees on €200,000 the same in Bordeaux and Nice?', a: `No. Gironde charges 5% and Alpes-Maritimes 4.50%: ${$(a.total, l)} against ${$(nice.total, l)} on a resale, a gap of ${$(a.total - nice.total, l)}. The notary’s emoluments are identical in both cities; only the transfer tax differs. For a first-time buyer the gap disappears, since they pay 4.50% in both départements.` },
          { q: 'Can I check the notary’s calculation on €200,000 myself?', a: `Yes, with the scale: four brackets, four rates, ${pc(P.emoluments.zones.metro.tva, l, 0)} VAT, then the transfer tax at your département’s rate on the price. The only lines you cannot recompute exactly are the disbursements, which depend on the file; ask the notary for the detail with the final statement.` },
        ],
      };
    }
    case 250000: {
      return fr ? {
        title: `Frais de notaire 250 000 € en ${yr} : neuf ou ancien ?`,
        h1: `Frais de notaire pour un achat à 250 000 € en ${yr} : neuf ou ancien`,
        description: `Frais de notaire pour 250 000 € en ${yr} : ${$(a.total, l)} dans l’ancien, ${$(neuf.total, l)} dans le neuf. L’écart, ce qu’il compense vraiment, et le cas du primo-accédant.`,
        intro: `À ce prix, le choix entre neuf et ancien pèse ${$(a.total - neuf.total, l)} de frais.`,
        resume: `Pour 250 000 €, la différence de frais entre le neuf et l’ancien dépasse ${$(a.total - neuf.total, l)} : ${$(a.total, l)} pour un logement ancien dans un département à 5 %, ${$(neuf.total, l)} pour un logement neuf ou une VEFA, quel que soit le département. Cet écart vient entièrement de l’impôt : la vente d’ancien supporte les droits de mutation de ${pc(tauxGlobalAncien(5), l, 3)}, la vente de neuf, déjà soumise à la TVA, une taxe réduite de ${pc(tauxGlobalNeuf(), l, 3)}. Les émoluments du notaire sont identiques, ${$(a.emoluments.ttc, l)} TTC dans les deux cas. Avant de conclure que le neuf est moins cher, il faut comparer les prix au mètre carré, où la TVA et la marge du promoteur sont incluses, et les charges.`,
        sections: [
          { h2: 'Ce que l’écart de frais compense', p: [`L’économie de ${$(a.total - neuf.total, l)} sur les frais représente ${pc(((a.total - neuf.total) / 250000) * 100, l, 1)} du prix. Elle est réelle, mais elle se compare au surcoût fréquent du neuf au mètre carré, souvent bien supérieur dans les grandes villes. Elle se compare aussi à ce que le neuf épargne ensuite : peu de travaux pendant dix ans, des garanties de construction, une meilleure performance énergétique. L’ancien, lui, offre des surfaces plus grandes à prix égal et des emplacements plus centraux.`] },
          { h2: 'Et pour un primo-accédant ?', p: [`Un primo-accédant qui achète un logement ancien comme résidence principale paie ${$(primo.total, l)}, soit ${$(a.total - primo.total, l)} de moins que le cas général. L’écart avec le neuf se réduit à ${$(primo.total - neuf.total, l)}, sans disparaître. Le prêt à taux zéro, qui reprend la même définition du primo-accédant, est en revanche orienté vers le neuf dans la plupart des zones, ce qui peut faire pencher la balance.`] },
        ],
        faqs: [
          { q: 'Pourquoi les frais de 250 000 € sont-ils trois fois plus faibles dans le neuf ?', a: `Parce que la vente de neuf est soumise à la TVA immobilière, incluse dans le prix. Pour éviter une double imposition, elle ne paie qu’une taxe de publicité foncière de ${pc(tauxGlobalNeuf(), l, 3)} au lieu des droits de mutation de ${pc(tauxGlobalAncien(5), l, 3)}. Sur 250 000 €, la taxe passe de ${$(a.droits, l)} à ${$(neuf.droits, l)}.` },
          { q: 'Une maison de quatre ans achetée 250 000 € est-elle « neuve » pour les frais ?', a: `Seulement si elle est vendue par un professionnel assujetti à la TVA, dans les cinq ans de son achèvement. Revendue par le particulier qui l’a fait construire, elle n’est pas soumise à la TVA : l’acheteur paie les droits de droit commun, comme pour une maison ancienne, soit environ ${pc(a.pourcentage, l, 1)} de frais dans un département à 5 %.` },
          { q: 'Combien coûtent les frais de 250 000 € dans l’Indre ?', a: `${$(indre.total, l)} dans l’ancien, grâce au taux départemental de 3,80 %, soit ${$(a.total - indre.total, l)} de moins que dans un département à 5 %. Dans le neuf, l’Indre ne fait pas mieux que les autres : ${$(neuf.total, l)}, le taux réduit étant le même partout.` },
        ],
      } : {
        title: `Notary fees on €250,000 in ${yr}: new build or resale?`,
        h1: `Notary fees on a €250,000 purchase in France (${yr}): new build or resale`,
        description: `Notary fees on a €250,000 property in ${yr}: ${$(a.total, l)} resale, ${$(neuf.total, l)} new build. The gap, what it really offsets, and the first-time buyer case explained.`,
        intro: `At this price, the new-versus-resale choice is worth ${$(a.total - neuf.total, l)} in fees.`,
        resume: `On €250,000 the fee gap between a new build and a resale exceeds ${$(a.total - neuf.total, l)}: ${$(a.total, l)} for a resale property in a 5% département, ${$(neuf.total, l)} for a new home or an off-plan purchase, whatever the département. The gap is entirely tax: a resale bears transfer tax of ${pc(tauxGlobalAncien(5), l, 3)}, while a new-build sale, already subject to VAT, pays a reduced tax of ${pc(tauxGlobalNeuf(), l, 3)}. The notary’s emoluments are identical, ${$(a.emoluments.ttc, l)} incl. VAT in both cases. Before concluding that new is cheaper, compare prices per square metre, which include VAT and the developer’s margin, and the running costs. A first-time buyer on a resale pays ${$(primo.total, l)}. Whichever you choose, the fees are due on signing day and must come from your deposit or your loan.`,
        sections: [
          { h2: 'What the fee gap offsets', p: [`The ${$(a.total - neuf.total, l)} saving on fees is ${pc(((a.total - neuf.total) / 250000) * 100, l, 1)} of the price. It is real, but it should be set against the common premium per square metre on new builds, often much larger in big cities. It should also be set against what a new build saves afterwards: little work for ten years, construction warranties, better energy performance. Resale homes, for their part, offer more space for the money and more central locations.`] },
          { h2: 'And for a first-time buyer?', p: [`A first-time buyer purchasing a resale main home pays ${$(primo.total, l)}, ${$(a.total - primo.total, l)} less than the standard case. The gap with a new build narrows to ${$(primo.total - neuf.total, l)} without disappearing. The zero-interest loan, which uses the same first-time buyer definition, is mostly geared towards new builds, which may tip the balance.`] },
        ],
        faqs: [
          { q: 'Why are fees on €250,000 three times lower on a new build?', a: `Because a new-build sale is subject to VAT, included in the price. To avoid double taxation it only pays land publicity tax of ${pc(tauxGlobalNeuf(), l, 3)} instead of transfer tax of ${pc(tauxGlobalAncien(5), l, 3)}. On €250,000 the tax drops from ${$(a.droits, l)} to ${$(neuf.droits, l)}.` },
          { q: 'Is a four-year-old house bought for €250,000 “new” for fee purposes?', a: `Only if it is sold by a VAT-registered professional within five years of completion. Resold by the private individual who had it built, it is not subject to VAT: the buyer pays standard transfer tax, as for an old house, about ${pc(a.pourcentage, l, 1)} in fees in a 5% département.` },
          { q: 'What do fees on €250,000 cost in Indre?', a: `${$(indre.total, l)} on a resale, thanks to the 3.80% départemental rate, ${$(a.total - indre.total, l)} less than in a 5% département. On a new build Indre does no better than anywhere else: ${$(neuf.total, l)}, since the reduced rate on VAT-able sales is the same in every département.` },
        ],
      };
    }
    case 300000: {
      const m = economieMobilier(300000, 12000, '75');
      const ag = F({ prix: 315000, dep: '75' });
      return fr ? {
        title: `Frais de notaire 300 000 € en ${yr} : meubles et agence`,
        h1: `Frais de notaire pour un achat à 300 000 € en ${yr} : ce que l’assiette change`,
        description: `Frais de notaire pour 300 000 € en ${yr} : ${$(a.total, l)} dans l’ancien à 5 %. Meubles listés, commission d’agence hors assiette : deux façons légales de payer moins.`,
        intro: 'Le prix taxé n’est pas toujours le prix payé : meubles et commission peuvent en sortir.',
        resume: `Pour un logement ancien de 300 000 € dans un département à 5 %, les frais de notaire s’élèvent à ${$(a.total, l)}. Ce chiffre suppose que tout le prix est taxé. Deux éléments peuvent légalement sortir de l’assiette. Les meubles vendus avec le logement, listés et estimés dans l’acte : 12 000 € de mobilier font économiser ${$(m.economie, l)}. La commission d’agence, quand le mandat la met à la charge de l’acquéreur : si une commission de 15 000 € était au contraire incluse dans un prix de 315 000 €, les frais monteraient à ${$(ag.total, l)}, soit ${$(ag.total - a.total, l)} de plus pour le même bien. Ces deux leviers, cumulables, demandent d’être décidés avant le compromis et justifiés.`,
        sections: [
          { h2: 'Meubles : ce qui se liste', p: [`Électroménager posé, mobilier, luminaires, équipements démontables : leur valeur d’occasion, réaliste et justifiable, peut figurer dans une liste annexée à l’acte. Sur 300 000 €, 12 000 € de meubles réduisent les droits de ${$(m.droitsEvites, l)} et le total des frais de ${$(m.economie, l)}. Une cuisine aménagée sur mesure, une salle de bains ou une chaudière ne sont pas des meubles et ne se déduisent pas.`] },
          { h2: 'Commission : la ligne du mandat', p: [`Le mandat de l’agence dit qui paie la commission. À la charge de l’acquéreur, elle figure à part dans l’acte et ne supporte pas les droits ; incluse dans le prix payé au vendeur, elle les supporte. La différence, ${$(ag.total - a.total, l)} pour 15 000 € de commission, se décide avant l’offre d’achat : elle ne se rattrape pas le jour de la signature.`] },
        ],
        faqs: [
          { q: 'Combien rapporte une liste de meubles sur un achat à 300 000 € ?', a: `Pour 12 000 € de meubles dans un département à 5 %, ${$(m.economie, l)} d’économie, dont ${$(m.droitsEvites, l)} de droits de mutation, le reste sur les émoluments et la contribution de sécurité immobilière. La valeur doit être celle de l’occasion au jour de la vente : une liste gonflée expose à un redressement avec intérêts de retard.` },
          { q: 'Les frais de 300 000 € comprennent-ils la commission d’agence ?', a: 'Non, la commission n’est jamais un frais de notaire. Mais si elle est incluse dans le prix payé au vendeur, elle augmente l’assiette des droits. Saisissez dans le calculateur le prix net vendeur si la commission est à votre charge et distincte dans l’acte, le prix commission comprise sinon.' },
          { q: 'Peut-on cumuler meubles, commission et statut de primo-accédant ?', a: `Oui. Pour un primo-accédant qui achète à 300 000 € avec 12 000 € de meubles et paie lui-même la commission, les frais tombent à ${$(F({ prix: 300000, dep: '75', situation: 'primo', mobilier: 12000 }).total, l)}, contre ${$(ag.total, l)} pour un acheteur qui ne bénéficie d’aucun levier et achète commission incluse.` },
        ],
      } : {
        title: `Notary fees on €300,000 in ${yr}: furniture and agency`,
        h1: `Notary fees on a €300,000 purchase in France (${yr}): what the taxable base changes`,
        description: `Notary fees on a €300,000 property in ${yr}: ${$(a.total, l)} resale at 5%. Listed furniture and an agency fee kept out of the base: two legal ways to pay less.`,
        intro: 'The taxed price is not always the price paid: furniture and commission can come out.',
        resume: `On a €300,000 resale property in a 5% département, French notary fees amount to ${$(a.total, l)}. That figure assumes the whole price is taxed. Two items can legally come out of the taxable base. Furniture sold with the home, listed and valued in the deed: €12,000 of furniture saves ${$(m.economie, l)}. The agency commission, when the mandate makes it payable by the buyer: if a €15,000 commission were instead included in a €315,000 price, the fees would rise to ${$(ag.total, l)}, ${$(ag.total - a.total, l)} more for the same property. Both levers can be combined, but they must be settled before the preliminary contract and be justifiable. Neither has much effect on a new build, where the reduced tax rate leaves little to save. Both decisions belong to the negotiation with the seller and the agent, well before the final deed.`,
        sections: [
          { h2: 'Furniture: what can be listed', p: [`Free-standing appliances, furniture, light fittings and removable equipment: their realistic second-hand value can go in a list attached to the deed. On €300,000, €12,000 of furniture cuts the transfer tax by ${$(m.droitsEvites, l)} and total fees by ${$(m.economie, l)}. A made-to-measure fitted kitchen, a bathroom or a boiler are not furniture and cannot be deducted.`] },
          { h2: 'Commission: the line in the mandate', p: [`The agency mandate says who pays the commission. Payable by the buyer, it appears separately in the deed and bears no transfer tax; included in the price paid to the seller, it does. The difference, ${$(ag.total - a.total, l)} on a €15,000 commission, is settled before the offer: it cannot be fixed on signing day.`] },
        ],
        faqs: [
          { q: 'How much does a furniture list save on a €300,000 purchase?', a: `For €12,000 of furniture in a 5% département, ${$(m.economie, l)}, of which ${$(m.droitsEvites, l)} is transfer tax and the rest emoluments and the land registry contribution. The value must be the second-hand value on the day of the sale: an inflated list exposes you to a reassessment with late-payment interest.` },
          { q: 'Do fees on €300,000 include the agency commission?', a: 'No, the commission is never a notary fee. But if it is included in the price paid to the seller, it increases the base for transfer tax. Enter the net seller price in the calculator if the commission is payable by you and shown separately in the deed, and the commission-inclusive price otherwise.' },
          { q: 'Can furniture, commission and first-time buyer status be combined?', a: `Yes, all three are compatible, each with its own conditions. For a first-time buyer purchasing at €300,000 with €12,000 of furniture and paying the commission directly, fees drop to ${$(F({ prix: 300000, dep: '75', situation: 'primo', mobilier: 12000 }).total, l)}, against ${$(ag.total, l)} for a buyer with no lever who buys commission included.` },
        ],
      };
    }
    case 400000: {
      const v = F({ prix: 400000, dep: '83' });
      return fr ? {
        title: `Frais de notaire 400 000 € en ${yr} : l’effet du département`,
        h1: `Frais de notaire pour un achat à 400 000 € en ${yr} : quand le département coûte des milliers d’euros`,
        description: `Frais de notaire pour 400 000 € en ${yr} : ${$(a.total, l)} à 5 %, ${$(nice.total, l)} à 4,50 %, ${$(indre.total, l)} dans l’Indre. Écarts entre départements voisins chiffrés en euros.`,
        intro: 'À ce prix, choisir un côté ou l’autre d’une limite départementale peut valoir 2 000 €.',
        resume: `Pour 400 000 €, le taux du département pèse en milliers d’euros. Dans un département à 5 %, les frais d’un achat ancien atteignent ${$(a.total, l)}. Dans l’un des onze départements restés à 4,50 %, comme les Alpes-Maritimes, ils tombent à ${$(nice.total, l)}, soit ${$(a.total - nice.total, l)} de moins. Dans l’Indre, seul département à 3,80 %, ils sont de ${$(indre.total, l)}. Pour un acheteur qui cherche de part et d’autre d’une limite, entre le Var et les Alpes-Maritimes, entre le Val-d’Oise et l’Oise, entre l’Isère et la Drôme, l’écart devient un argument de négociation. Il disparaît pour un primo-accédant, qui paie 4,50 % partout où la hausse a été votée. Dans le neuf, enfin, le département ne joue aucun rôle : ${$(neuf.total, l)} partout.`,
        sections: [
          { h2: 'Le Var et les Alpes-Maritimes, exemple chiffré', p: [`Un appartement de 400 000 € à Fréjus, dans le Var, supporte ${$(v.droits, l)} de droits de mutation ; le même à Cannes, dans les Alpes-Maritimes, ${$(nice.droits, l)}. L’écart de ${$(v.total - nice.total, l)} sur les frais totaux vient uniquement de la taxe départementale et des frais d’assiette qui en dépendent. Les émoluments, la contribution de sécurité immobilière et les débours sont identiques.`] },
          { h2: 'Un écart à relativiser', p: ['Deux milliers d’euros, c’est une somme, mais à l’échelle d’un achat de 400 000 €, c’est moins que la marge de négociation habituelle sur le prix, et beaucoup moins que l’écart de prix au mètre carré entre deux communes. L’écart de frais compte surtout pour départager deux biens comparables de part et d’autre d’une limite. Il n’est pas une raison suffisante pour changer de bassin de vie.'] },
        ],
        faqs: [
          { q: 'Combien de frais de notaire pour 400 000 € dans les Alpes-Maritimes ?', a: `${$(nice.total, l)} pour un achat ancien, le département étant resté au taux de 4,50 %. C’est ${$(a.total - nice.total, l)} de moins que dans un département à 5 % comme le Var voisin. Dans le neuf, le département ne joue pas : ${$(neuf.total, l)} partout.` },
          { q: 'Un primo-accédant a-t-il intérêt à acheter dans un département à 4,50 % ?', a: `Pas pour les frais : un primo-accédant qui achète sa résidence principale paie 4,50 % même dans un département à 5 %, soit ${$(primo.total, l)} pour 400 000 €, exactement comme dans un département resté à 4,50 %. Seule l’Indre, à 3,80 %, reste moins chère pour lui.` },
          { q: 'L’écart entre départements peut-il changer d’ici ma signature ?', a: 'Oui. Un département resté à 4,50 % peut voter la hausse à 5 % jusqu’au 31 mars 2028, et un département à 5 % peut revenir en arrière. Le taux applicable est celui du jour de l’acte authentique. Ce site suit le tableau mensuel de la DGFiP ; vérifiez la date de mise à jour si votre signature est éloignée.' },
        ],
      } : {
        title: `Notary fees on €400,000 in ${yr}: the département effect`,
        h1: `Notary fees on a €400,000 purchase in France (${yr}): when the département costs thousands`,
        description: `Notary fees on a €400,000 property in ${yr}: ${$(a.total, l)} at 5%, ${$(nice.total, l)} at 4.50%, ${$(indre.total, l)} in Indre. Gaps between neighbouring départements, worked out in euros.`,
        intro: 'At this price, one side of a départemental border or the other can be worth €2,000.',
        resume: `On €400,000, the département’s rate weighs in thousands of euros. In a 5% département, fees on a resale purchase reach ${$(a.total, l)}. In one of the eleven départements still at 4.50%, such as Alpes-Maritimes, they fall to ${$(nice.total, l)}, ${$(a.total - nice.total, l)} less. In Indre, the only département at 3.80%, they are ${$(indre.total, l)}. For a buyer searching on both sides of a border, between Var and Alpes-Maritimes, Val-d’Oise and Oise, or Isère and Drôme, the gap becomes a negotiating point. It disappears for a first-time buyer, who pays 4.50% wherever the increase was voted. On a new build the département plays no part at all: ${$(neuf.total, l)} everywhere. The calculator below shows the gap for any pair of départements and any price, so you can test the places on your own shortlist.`,
        sections: [
          { h2: 'Var and Alpes-Maritimes, a worked example', p: [`A €400,000 flat in Fréjus, in Var, bears ${$(v.droits, l)} of transfer tax; the same flat in Cannes, in Alpes-Maritimes, ${$(nice.droits, l)}. The ${$(v.total - nice.total, l)} difference in total fees comes solely from the départemental tax and the collection fee that depends on it. Emoluments, the land registry contribution and disbursements are identical.`] },
          { h2: 'A gap to keep in proportion', p: ['Two thousand euros is real money, but on a €400,000 purchase it is less than the usual room for negotiation on the price, and far less than the price-per-square-metre gap between two towns. The fee gap matters mostly to choose between two comparable properties either side of a border. It is not a reason to move to a different area.'] },
        ],
        faqs: [
          { q: 'What are notary fees on €400,000 in Alpes-Maritimes?', a: `${$(nice.total, l)} on a resale, the département having kept the 4.50% rate. That is ${$(a.total - nice.total, l)} less than in a 5% département such as neighbouring Var, for exactly the same notary emoluments. On a new build the département makes no difference: ${$(neuf.total, l)} everywhere.` },
          { q: 'Should a first-time buyer look in a 4.50% département?', a: `Not for the fees: a first-time buyer purchasing a main home pays 4.50% even in a 5% département, ${$(primo.total, l)} on €400,000, exactly as in a département still at 4.50%. Only Indre, at 3.80%, remains cheaper for them, by ${$(primo.total - indre.total, l)} at this price.` },
          { q: 'Can the gap between départements change before I sign?', a: 'Yes. A département still at 4.50% may vote the 5% rate until 31 March 2028, and a 5% département may go back. The applicable rate is the one in force on the day of the final deed. This site follows the DGFiP’s monthly table; check the update date if your signing is far off.' },
        ],
      };
    }
    case 500000: {
      return fr ? {
        title: `Frais de notaire 500 000 € en ${yr} : la remise compte enfin`,
        h1: `Frais de notaire pour un achat à 500 000 € en ${yr} : quand la remise du notaire pèse`,
        description: `Frais de notaire pour 500 000 € en ${yr} : ${$(a.total, l)} dans l’ancien à 5 %. Remise de 20 % possible sur la part au-delà de 100 000 €, primo-accédant, neuf.`,
        intro: 'Le premier prix où la remise sur les émoluments se compte en centaines d’euros.',
        resume: `Pour une maison ou un grand appartement à 500 000 € dans un département à 5 %, les frais de notaire s’élèvent à ${$(a.total, l)}. Les émoluments du notaire y représentent ${$(a.emoluments.ttc, l)} TTC, assez pour que la remise prévue par le code de commerce devienne intéressante : au plus 20 % sur la part des émoluments calculée au-delà de 100 000 €, soit jusqu’à ${$(rem.remise * 1.2, l)} TTC d’économie si l’étude la pratique. Le statut de primo-accédant rapporte davantage, ${$(a.total - primo.total, l)}, et un achat dans le neuf ramènerait les frais à ${$(neuf.total, l)}. À ce niveau, les frais de garantie du prêt, hors calcul, deviennent eux aussi un poste à négocier, au même titre que le taux du crédit.`,
        sections: [
          { h2: 'Demander la remise', p: [`La remise n’est pas un rabais au cas par cas. L’étude qui la pratique fixe un taux par catégorie d’actes et par tranche, l’affiche et l’applique à tous ses clients dans la même situation. Sur 500 000 €, la part des émoluments concernée est de ${$(rem.remise / 0.2, l)} HT ; une remise de 20 % en retire ${$(rem.remise, l)} HT. Posez la question dès le premier contact : la réponse se lit dans le barème affiché de l’office.`] },
          { h2: 'Les frais du prêt, l’autre ligne à surveiller', p: ['Sur un emprunt important, la garantie pèse : une hypothèque ou un privilège de prêteur de deniers donne lieu à un acte notarié distinct, avec ses émoluments, sa taxe et sa contribution de sécurité immobilière ; une caution d’organisme spécialisé suit ses propres tarifs. Ces frais ne sont pas des frais d’acquisition, mais ils s’ajoutent à l’appel de fonds du notaire. Comparez les offres de prêt garantie comprise.'] },
        ],
        faqs: [
          { q: 'Combien rapporte la remise du notaire sur 500 000 € ?', a: `Au plus ${$(rem.remise * 1.2, l)} TTC, avec une remise de 20 % sur la part des émoluments calculée au-delà de 100 000 €. C’est ${pc(((rem.remise * 1.2) / a.total) * 100, l, 1)} des frais totaux de ${$(a.total, l)} : utile, mais moins que le statut de primo-accédant, qui fait économiser ${$(a.total - primo.total, l)} au même prix.` },
          { q: 'Quels frais de notaire pour une maison neuve à 500 000 € ?', a: `${$(neuf.total, l)}, contre ${$(a.total, l)} dans l’ancien dans un département à 5 %. La taxe réduite de ${pc(tauxGlobalNeuf(), l, 3)} remplace les droits de mutation, et les émoluments restent ceux du barème, ${$(neuf.emoluments.ttc, l)} TTC. Une maison construite sur un terrain acheté séparément ne paie les frais que sur le terrain.` },
          { q: 'Les frais de 500 000 € sont-ils déductibles de l’impôt ?', a: 'Pas pour une résidence principale. Pour un bien locatif, leur traitement dépend du régime fiscal. À la revente d’un bien autre que la résidence principale, les frais réels majorent le prix d’achat pour le calcul de la plus-value, ou un forfait de 7,5 % du prix si ce dernier est plus favorable.' },
        ],
      } : {
        title: `Notary fees on €500,000 in ${yr}: the discount finally counts`,
        h1: `Notary fees on a €500,000 purchase in France (${yr}): when the notary discount matters`,
        description: `Notary fees on a €500,000 property in ${yr}: ${$(a.total, l)} resale at 5%. A 20% discount possible on the part above €100,000, first-time buyer case, new build.`,
        intro: 'The first price at which the discount on emoluments is worth hundreds of euros.',
        resume: `On a €500,000 house or large flat in a 5% département, French notary fees come to ${$(a.total, l)}. The notary’s emoluments account for ${$(a.emoluments.ttc, l)} incl. VAT, enough for the discount allowed by the Commercial Code to become worthwhile: up to 20% on the part of the emoluments calculated above €100,000, a saving of up to ${$(rem.remise * 1.2, l)} incl. VAT if the office offers it. First-time buyer status saves more, ${$(a.total - primo.total, l)}, and a new-build purchase would bring the fees down to ${$(neuf.total, l)}. At this level the loan guarantee costs, outside this calculation, also become worth negotiating, just like the interest rate on the loan. The calculator below lets you enter the discount your notary grants and see its exact effect on the emoluments and on the total.`,
        sections: [
          { h2: 'Asking for the discount', p: [`The discount is not a case-by-case rebate. An office that offers it sets a rate by type of deed and price band, displays it and applies it to every client in the same situation. On €500,000 the eligible part of the emoluments is ${$(rem.remise / 0.2, l)} excl. VAT; a 20% discount takes off ${$(rem.remise, l)} excl. VAT. Ask at the first contact: the answer is in the office’s displayed scale.`] },
          { h2: 'Loan costs, the other line to watch', p: ['On a large loan, the guarantee weighs: a mortgage or lender’s lien means a separate notarial deed with its own emoluments, tax and land registry contribution, while a guarantee from a specialist body follows its own pricing. These are not acquisition costs, but they are added to the notary’s call for funds. Compare loan offers with the guarantee included.'] },
        ],
        faqs: [
          { q: 'How much does the notary discount save on €500,000?', a: `Up to ${$(rem.remise * 1.2, l)} incl. VAT, with a 20% discount on the part of the emoluments calculated above €100,000. That is ${pc(((rem.remise * 1.2) / a.total) * 100, l, 1)} of total fees of ${$(a.total, l)}: useful, but less than first-time buyer status, which saves ${$(a.total - primo.total, l)} at the same price.` },
          { q: 'What are notary fees on a €500,000 new house?', a: `${$(neuf.total, l)}, against ${$(a.total, l)} on a resale in a 5% département. The reduced ${pc(tauxGlobalNeuf(), l, 3)} tax replaces transfer tax, and the emoluments follow the scale, ${$(neuf.emoluments.ttc, l)} incl. VAT. A house built on land bought separately only pays fees on the land.` },
          { q: 'Are fees on €500,000 tax-deductible?', a: 'Not for a main home. For a rental property, their treatment depends on the tax regime. When you sell a property other than your main home, actual fees are added to the purchase price for the capital gains calculation, or a flat 7.5% of the price if that is more favourable.' },
        ],
      };
    }
    default: {
      const pv = fraisAcquisitionPlusValue(1000000, a.total);
      return fr ? {
        title: `Frais de notaire 1 000 000 € en ${yr} : où va l’argent`,
        h1: `Frais de notaire pour un achat à un million d’euros en ${yr}`,
        description: `Frais de notaire pour 1 million d’euros en ${yr} : ${$(a.total, l)} dans l’ancien à 5 %. Part du notaire, remise, frais réels ou forfait de 7,5 % à la revente.`,
        intro: `À ce prix, les droits de mutation représentent ${pc((a.droits / a.total) * 100, l, 0)} des frais, et la revente se prépare dès l’achat.`,
        resume: `Pour un bien ancien d’un million d’euros dans un département à 5 %, les frais de notaire atteignent ${$(a.total, l)}, soit ${pc(a.pourcentage, l)} du prix, le pourcentage le plus bas de nos exemples parce que les émoluments dégressifs et les postes fixes s’y diluent. Les droits de mutation, ${$(a.droits, l)}, en forment l’essentiel ; le notaire perçoit ${$(a.emoluments.ht + a.formalitesHT, l)} hors taxes. Une remise de 20 % sur la part de ses émoluments au-delà de 100 000 € rapporterait jusqu’à ${$(rem.remise * 1.2, l)} TTC. Pour un bien qui ne sera pas une résidence principale, la revente se prépare dès l’achat : les frais réels, ${$(a.total, l)}, dépassent le forfait de 7,5 % retenu pour la plus-value, ${$(pv.forfait, l)}, à condition de garder les justificatifs.`,
        sections: [
          { h2: 'Où va l’argent sur un million', p: [`Le département perçoit ${$(a.droitsDepartement, l)}, la commune ${$(a.droitsCommune, l)}, l’État ${$(a.droitsAssiette + a.csi + a.emoluments.tva, l)} entre frais d’assiette, contribution de sécurité immobilière et TVA. Le notaire garde ${$(a.emoluments.ht + a.formalitesHT, l)} hors taxes, soit ${pc(((a.emoluments.ht + a.formalitesHT) / a.total) * 100, l, 1)} de la facture. C’est le prix où le décalage entre l’impression « frais de notaire » et la réalité « impôts » est le plus fort.`] },
          { h2: 'Préparer la plus-value dès la signature', p: [`Pour une résidence secondaire ou un investissement, la plus-value sera calculée à la revente sur un prix d’achat majoré des frais d’acquisition. Le forfait de ${pc(P.plus_value.forfait_frais_acquisition, l, 1)} donnerait ${$(pv.forfait, l)} ; les frais réels de ${$(a.total, l)}, plus la commission d’agence si vous l’avez payée, font mieux, à condition de les justifier par le décompte définitif du notaire, à conserver avec l’acte.`] },
        ],
        faqs: [
          { q: 'Combien gagne le notaire sur une vente d’un million d’euros ?', a: `${$(a.emoluments.ht, l)} HT d’émoluments proportionnels et ${$(a.formalitesHT, l)} HT de forfait de formalités, soit environ ${$(a.emoluments.ht + a.formalitesHT, l)} hors taxes, ${pc(((a.emoluments.ht + a.formalitesHT) / a.total) * 100, l, 1)} des frais. Une remise de 20 % sur la part au-delà de 100 000 €, si l’étude la pratique, en retirerait ${$(rem.remise, l)} HT.` },
          { q: 'Les frais d’un million sont-ils plus faibles en pourcentage ?', a: `Oui : ${pc(a.pourcentage, l)} du prix, contre ${pc(base(100000).pourcentage, l)} à 100 000 €. Les émoluments sont dégressifs et les postes fixes deviennent négligeables. Mais le plancher reste le taux des droits de mutation, ${pc(tauxGlobalAncien(5), l, 2)} dans un département à 5 %, qui ne baisse jamais avec le prix.` },
          { q: 'Faut-il garder le décompte du notaire après un achat d’un million ?', a: `Oui, sans limite de temps pour un bien qui n’est pas votre résidence principale. À la revente, il justifie les frais réels, ici ${$(a.total, l)}, qui dépassent le forfait de 7,5 %, ${$(pv.forfait, l)}. Sans lui, seul le forfait peut être retenu, et la plus-value imposable augmente d’autant.` },
        ],
      } : {
        title: `Notary fees on €1,000,000 in ${yr}: ${$(a.total, l)} on a resale`,
        h1: `Notary fees on a one-million-euro purchase in France (${yr})`,
        description: `Notary fees on a €1 million property in ${yr}: ${$(a.total, l)} resale at 5%. The notary’s share, the discount, and actual costs or the 7.5% flat rate on resale.`,
        intro: `At this price, transfer tax makes up ${pc((a.droits / a.total) * 100, l, 0)} of the fees, and the resale starts at the purchase.`,
        resume: `On a one-million-euro resale property in a 5% département, French notary fees reach ${$(a.total, l)}, or ${pc(a.pourcentage, l)} of the price, the lowest percentage of our examples because the sliding emoluments and fixed items are diluted. Transfer tax, ${$(a.droits, l)}, makes up most of it; the notary receives ${$(a.emoluments.ht + a.formalitesHT, l)} before VAT. A 20% discount on the part of the emoluments above €100,000 would save up to ${$(rem.remise * 1.2, l)} incl. VAT. For a property that will not be a main home, the resale starts at the purchase: actual costs of ${$(a.total, l)} exceed the 7.5% flat rate allowed for capital gains, ${$(pv.forfait, l)}, provided you keep the paperwork. The calculator below gives the breakdown for any price, and the table further down compares four départements, including Indre and Réunion, at this price level.`,
        sections: [
          { h2: 'Where the money goes on a million', p: [`The département receives ${$(a.droitsDepartement, l)}, the municipality ${$(a.droitsCommune, l)}, the State ${$(a.droitsAssiette + a.csi + a.emoluments.tva, l)} in collection fee, land registry contribution and VAT. The notary keeps ${$(a.emoluments.ht + a.formalitesHT, l)} before VAT, ${pc(((a.emoluments.ht + a.formalitesHT) / a.total) * 100, l, 1)} of the bill. This is the price at which the gap between the label “notary fees” and the reality “taxes” is widest.`] },
          { h2: 'Preparing the capital gain at signing', p: [`For a second home or an investment, the capital gain will be calculated on resale using a purchase price increased by acquisition costs. The ${pc(P.plus_value.forfait_frais_acquisition, l, 1)} flat rate would give ${$(pv.forfait, l)}; actual costs of ${$(a.total, l)}, plus any agency commission you paid, do better, provided you can prove them with the notary’s final statement, to be kept with the deed.`] },
        ],
        faqs: [
          { q: 'How much does the notary earn on a one-million-euro sale?', a: `${$(a.emoluments.ht, l)} excl. VAT in proportional emoluments and ${$(a.formalitesHT, l)} excl. VAT of flat formalities fee, about ${$(a.emoluments.ht + a.formalitesHT, l)} before VAT, ${pc(((a.emoluments.ht + a.formalitesHT) / a.total) * 100, l, 1)} of the fees. A 20% discount on the part above €100,000, if the office offers it, would take off ${$(rem.remise, l)} excl. VAT.` },
          { q: 'Are fees on a million lower in percentage terms?', a: `Yes: ${pc(a.pourcentage, l)} of the price, against ${pc(base(100000).pourcentage, l)} at €100,000. Emoluments slide down and fixed items become negligible. But the floor remains the transfer tax rate, ${pc(tauxGlobalAncien(5), l, 2)} in a 5% département, which never falls with the price, however expensive the property.` },
          { q: 'Should I keep the notary’s statement after a one-million purchase?', a: `Yes, indefinitely for a property that is not your main home. On resale it proves the actual costs, here ${$(a.total, l)}, which exceed the 7.5% flat rate of ${$(pv.forfait, l)}. Without it only the flat rate can be used, and the taxable gain rises accordingly.` },
        ],
      };
    }
  }
}

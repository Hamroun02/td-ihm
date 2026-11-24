import { CATALOGUE, TAUX_TAXE, type NomProduit, type ProduitAffiche } from '../dsl/concepts';

/**
 * Oracles : les résultats attendus sont CALCULÉS à partir de la spécification
 * (catalogue de référence et règles métier de dsl/concepts.ts), jamais recopiés depuis l'écran.
 */

/** Décision du binôme (README, section 1.3) : la connexion doit aboutir en moins de 2 s. */
export const DELAI_MAX_CONNEXION_MS = 2_000;

/** Arrondi au centime. */
export function auCentime(montant: number): number {
  return Math.round(montant * 100) / 100;
}

/** Prix d'un produit dans le catalogue de référence. */
export function prixDeReference(produit: NomProduit): number {
  const trouve = CATALOGUE.find((p) => p.nom === produit);
  if (!trouve) throw new Error(`Produit absent du catalogue de référence : ${produit}`);
  return trouve.prix;
}

/** Les 6 produits du catalogue de référence. */
export function catalogueDeReference(): ProduitAffiche[] {
  return CATALOGUE.map(({ nom, prix }) => ({ nom, prix }));
}

/** Des produits avec leur prix de référence. */
export function produitsDeReference(produits: readonly NomProduit[]): ProduitAffiche[] {
  return produits.map((nom) => ({ nom, prix: prixDeReference(nom) }));
}

/** Noms des produits dans l'ordre alphabétique attendu. */
export function nomsTries(ordre: 'nom-croissant' | 'nom-decroissant'): string[] {
  const noms: string[] = CATALOGUE.map((p) => p.nom).sort((a, b) => a.localeCompare(b, 'en'));
  return ordre === 'nom-croissant' ? noms : noms.reverse();
}

/**
 * Suite des prix attendue après un tri par prix.
 * Deux produits ont le même prix : leur ordre entre eux n'est pas spécifié,
 * c'est pourquoi on compare la suite des prix et non celle des noms.
 */
export function prixTries(ordre: 'prix-croissant' | 'prix-decroissant'): number[] {
  const prix: number[] = CATALOGUE.map((p) => p.prix).sort((a, b) => a - b);
  return ordre === 'prix-croissant' ? prix : prix.reverse();
}

/** Montants attendus du récapitulatif : sous-total, taxe à 8 % arrondie au centime, total. */
export function montantsAttendus(produits: readonly NomProduit[]): { sousTotal: number; taxe: number; total: number } {
  const sousTotal = auCentime(produits.reduce((somme, p) => somme + prixDeReference(p), 0));
  const taxe = auCentime(sousTotal * TAUX_TAXE);
  return { sousTotal, taxe, total: auCentime(sousTotal + taxe) };
}

/**
 * Concepts du domaine SauceDemo.
 *
 * Ces types décrivent ce que l'utilisateur manipule (utilisateurs, produits, panier, commande),
 * indépendamment de l'interface graphique et de Playwright.
 * Les valeurs viennent de la prise en main (docs/prise-en-main.md).
 */

/** Mot de passe commun à tous les comptes de SauceDemo. */
export const MOT_DE_PASSE = 'secret_sauce';

/** Comptes acceptés par SauceDemo, avec un nom qui dit à quoi ils servent. */
export const UTILISATEURS = {
  standard: 'standard_user',
  verrouille: 'locked_out_user',
  probleme: 'problem_user',
  lent: 'performance_glitch_user',
  erreur: 'error_user',
  visuel: 'visual_user',
} as const;

export type Utilisateur = (typeof UTILISATEURS)[keyof typeof UTILISATEURS];

/** Catalogue de référence (spécification) : les 6 produits et leur prix en dollars. */
export const CATALOGUE = [
  { nom: 'Sauce Labs Backpack', prix: 29.99 },
  { nom: 'Sauce Labs Bike Light', prix: 9.99 },
  { nom: 'Sauce Labs Bolt T-Shirt', prix: 15.99 },
  { nom: 'Sauce Labs Fleece Jacket', prix: 49.99 },
  { nom: 'Sauce Labs Onesie', prix: 7.99 },
  { nom: 'Test.allTheThings() T-Shirt (Red)', prix: 15.99 },
] as const;

export type NomProduit = (typeof CATALOGUE)[number]['nom'];

/** Noms des 6 produits, dans l'ordre du catalogue de référence. */
export const TOUS_LES_PRODUITS: readonly NomProduit[] = CATALOGUE.map((p) => p.nom);

/**
 * Un produit tel que l'utilisateur le voit à l'écran.
 * Le nom est une simple chaîne : ce qui est affiché peut être faux (c'est ce qu'on teste).
 */
export interface ProduitAffiche {
  nom: string;
  prix: number;
}

/** Ordres de tri proposés par le catalogue. */
export type OrdreTri = 'nom-croissant' | 'nom-decroissant' | 'prix-croissant' | 'prix-decroissant';

/** Informations demandées au client pendant la commande. */
export interface InfosClient {
  prenom: string;
  nom: string;
  codePostal: string;
}

/** Récapitulatif de la commande, tel qu'affiché avant confirmation. */
export interface Recapitulatif {
  produits: ProduitAffiche[];
  sousTotal: number;
  taxe: number;
  total: number;
}

/** Règle métier observée : la taxe vaut 8 % du sous-total, arrondie au centime. */
export const TAUX_TAXE = 0.08;

/** Écrans de l'application (niveau interface abstraite). */
export type Ecran =
  | 'connexion'
  | 'catalogue'
  | 'fiche-produit'
  | 'panier'
  | 'informations-client'
  | 'recapitulatif'
  | 'confirmation';

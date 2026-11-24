import type { InfosClient, NomProduit } from '../dsl/concepts';

/** Données de test partagées par les scénarios. */

/** Un client valide pour passer commande. */
export const CLIENT: InfosClient = { prenom: 'Ada', nom: 'Lovelace', codePostal: '38000' };

/** Commande de référence à 2 produits (S24, S28, S36). */
export const DEUX_PRODUITS: readonly NomProduit[] = ['Sauce Labs Backpack', 'Sauce Labs Onesie'];

/** Trois produits pour vérifier le contenu du panier (S19). */
export const TROIS_PRODUITS: readonly NomProduit[] = [
  'Sauce Labs Bike Light',
  'Sauce Labs Fleece Jacket',
  'Test.allTheThings() T-Shirt (Red)',
];

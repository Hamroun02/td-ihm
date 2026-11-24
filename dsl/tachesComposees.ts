import type { InfosClient, NomProduit } from './concepts';
import type { SauceDemo } from './SauceDemo';

/**
 * Tâches composées : elles enchaînent des tâches élémentaires du DSL.
 * Elles sont écrites une seule fois, avec le DSL, et marchent donc avec n'importe quel interpréteur.
 */

/**
 * T3 + T4.1 Remplir le panier et aller jusqu'au récapitulatif de la commande.
 * Précondition : être connecté et sur le catalogue.
 * Postcondition : être sur le récapitulatif (si l'application fonctionne).
 */
export async function preparerCommande(
  app: SauceDemo,
  produits: readonly NomProduit[],
  infos: InfosClient,
): Promise<void> {
  for (const produit of produits) {
    await app.ajouterAuPanier(produit);
  }
  await app.ouvrirPanier();
  await app.commencerCommande();
  await app.saisirInformations(infos);
}

/** T3 + T4 Acheter des produits de bout en bout (jusqu'à la confirmation). */
export async function acheter(
  app: SauceDemo,
  produits: readonly NomProduit[],
  infos: InfosClient,
): Promise<void> {
  await preparerCommande(app, produits, infos);
  await app.confirmerCommande();
}

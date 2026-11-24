import { expect, test } from './fixtures';
import { TOUS_LES_PRODUITS, UTILISATEURS, type NomProduit } from '../dsl/concepts';
import type { SauceDemo } from '../dsl/SauceDemo';
import { acheter, preparerCommande } from '../dsl/tachesComposees';
import { CLIENT, DEUX_PRODUITS } from './donnees';
import { montantsAttendus, produitsDeReference } from './oracles';

/** Amène l'utilisateur au formulaire d'informations avec un produit dans le panier. */
async function allerAuxInformations(app: SauceDemo): Promise<void> {
  await app.ajouterAuPanier('Sauce Labs Backpack');
  await app.ouvrirPanier();
  await app.commencerCommande();
  await app.verifierEcran('informations-client');
}

/** Vérifie le récapitulatif avec les oracles calculés (S28, S29). */
async function verifierRecapitulatif(app: SauceDemo, produits: readonly NomProduit[]): Promise<void> {
  await app.verifierEcran('recapitulatif');
  const recap = await app.lireRecapitulatif();
  expect(recap.produits).toHaveLength(produits.length);
  expect(recap.produits).toEqual(expect.arrayContaining(produitsDeReference(produits)));
  expect({ sousTotal: recap.sousTotal, taxe: recap.taxe, total: recap.total }).toEqual(montantsAttendus(produits));
}

/** Scénarios S24 à S32 : tâche T4 (commander). Voir README, section 2. */
test.describe('Commande', () => {
  test.beforeEach(async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard);
    await app.verifierEcran('catalogue');
  });

  test('S24 - acheter deux produits de bout en bout', async ({ app }) => {
    await acheter(app, DEUX_PRODUITS, CLIENT);
    await app.verifierEcran('confirmation');
    await app.verifierCommandeConfirmee();
    await app.verifierPastillePanier(0);
  });

  test('S25 - informations sans prénom', async ({ app }) => {
    await allerAuxInformations(app);
    await app.saisirInformations({ nom: CLIENT.nom, codePostal: CLIENT.codePostal });
    await app.verifierEcran('informations-client');
    await app.verifierMessageErreur('First Name is required');
  });

  test('S26 - informations sans nom', async ({ app }) => {
    await allerAuxInformations(app);
    await app.saisirInformations({ prenom: CLIENT.prenom, codePostal: CLIENT.codePostal });
    await app.verifierEcran('informations-client');
    await app.verifierMessageErreur('Last Name is required');
  });

  test('S27 - informations sans code postal', async ({ app }) => {
    await allerAuxInformations(app);
    await app.saisirInformations({ prenom: CLIENT.prenom, nom: CLIENT.nom });
    await app.verifierEcran('informations-client');
    await app.verifierMessageErreur('Postal Code is required');
  });

  test('S28 - récapitulatif correct pour deux produits', async ({ app }) => {
    await preparerCommande(app, DEUX_PRODUITS, CLIENT);
    await verifierRecapitulatif(app, DEUX_PRODUITS);
  });

  test('S29 - récapitulatif correct pour les six produits', async ({ app }) => {
    await preparerCommande(app, TOUS_LES_PRODUITS, CLIENT);
    await verifierRecapitulatif(app, TOUS_LES_PRODUITS);
  });

  test('S30 - annuler pendant la saisie des informations', async ({ app }) => {
    await allerAuxInformations(app);
    await app.annulerCommande();
    await app.verifierEcran('panier');
    await app.verifierContenuPanier(['Sauce Labs Backpack']);
    await app.verifierPastillePanier(1);
  });

  test('S31 - annuler au récapitulatif', async ({ app }) => {
    await preparerCommande(app, ['Sauce Labs Backpack'], CLIENT);
    await app.verifierEcran('recapitulatif');
    await app.annulerCommande();
    await app.verifierEcran('catalogue');
    await app.verifierPastillePanier(1);
  });

  test.fail(
    'S32 - commander avec un panier vide est impossible',
    { annotation: { type: 'défaut (décision 1.3)', description: '« Checkout » ouvre le formulaire même quand le panier est vide.' } },
    async ({ app }) => {
      await app.ouvrirPanier();
      await app.verifierContenuPanier([]);
      await app.commencerCommande();
      await app.verifierEcran('panier'); // échoue : le site affiche le formulaire d'informations
    },
  );
});

import { test } from './fixtures';
import { TOUS_LES_PRODUITS, UTILISATEURS } from '../dsl/concepts';
import { TROIS_PRODUITS } from './donnees';

/** Scénarios S14 à S23 : tâches T3 (gérer le panier) et T5 (réinitialiser). Voir README, section 2. */
test.describe('Panier', () => {
  test.beforeEach(async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard);
    await app.verifierEcran('catalogue');
  });

  test('S14 - le panier est vide au départ', async ({ app }) => {
    await app.verifierPastillePanier(0);
    await app.ouvrirPanier();
    await app.verifierContenuPanier([]);
  });

  test('S15 - ajouter un produit', async ({ app }) => {
    await app.ajouterAuPanier('Sauce Labs Backpack');
    await app.verifierPastillePanier(1);
    await app.verifierBoutonProduit('Sauce Labs Backpack', 'retirer');
  });

  test('S16 - ajouter les 6 produits', async ({ app }) => {
    for (const produit of TOUS_LES_PRODUITS) {
      await app.ajouterAuPanier(produit);
    }
    await app.verifierPastillePanier(6);
  });

  test('S17 - ajouter puis retirer un produit depuis le catalogue', async ({ app }) => {
    await app.ajouterAuPanier('Sauce Labs Backpack');
    await app.verifierPastillePanier(1);
    await app.retirerDuPanier('Sauce Labs Backpack');
    await app.verifierPastillePanier(0);
    await app.verifierBoutonProduit('Sauce Labs Backpack', 'ajouter');
  });

  test('S18 - ajouter un produit depuis sa fiche', async ({ app }) => {
    await app.consulterFicheProduit('Sauce Labs Bike Light');
    await app.ajouterAuPanier('Sauce Labs Bike Light');
    await app.verifierPastillePanier(1);
    await app.verifierBoutonProduit('Sauce Labs Bike Light', 'retirer');
  });

  test('S19 - le panier contient exactement les produits ajoutés', async ({ app }) => {
    for (const produit of TROIS_PRODUITS) {
      await app.ajouterAuPanier(produit);
    }
    await app.ouvrirPanier();
    await app.verifierEcran('panier');
    await app.verifierContenuPanier(TROIS_PRODUITS);
  });

  test('S20 - retirer un produit depuis le panier', async ({ app }) => {
    await app.ajouterAuPanier('Sauce Labs Backpack');
    await app.ajouterAuPanier('Sauce Labs Onesie');
    await app.ouvrirPanier();
    await app.retirerDuPanier('Sauce Labs Backpack');
    await app.verifierContenuPanier(['Sauce Labs Onesie']);
    await app.verifierPastillePanier(1);
  });

  test('S21 - le panier est conservé après déconnexion puis reconnexion', async ({ app }) => {
    await app.ajouterAuPanier('Sauce Labs Backpack');
    await app.verifierPastillePanier(1);
    await app.seDeconnecter();
    await app.seConnecter(UTILISATEURS.standard);
    await app.verifierPastillePanier(1);
    await app.ouvrirPanier();
    await app.verifierContenuPanier(['Sauce Labs Backpack']);
  });

  test.fail(
    "S22 - le panier n'est pas partagé entre utilisateurs",
    { annotation: { type: 'défaut (décision 1.3)', description: "Le panier est lié au navigateur, pas à l'utilisateur." } },
    async ({ app }) => {
      await app.ajouterAuPanier('Sauce Labs Backpack');
      await app.verifierPastillePanier(1);
      await app.seDeconnecter();
      await app.seConnecter(UTILISATEURS.visuel);
      await app.verifierEcran('catalogue');
      await app.verifierPastillePanier(0); // échoue : visual_user voit le panier de standard_user
    },
  );

  test.fail(
    "S23 - réinitialiser l'application vide le panier et remet les boutons à « Add to cart »",
    { annotation: { type: 'défaut (décision 1.3)', description: 'Après « Reset App State », les boutons restent sur « Remove ».' } },
    async ({ app }) => {
      await app.ajouterAuPanier('Sauce Labs Backpack');
      await app.ajouterAuPanier('Sauce Labs Onesie');
      await app.verifierPastillePanier(2);
      await app.reinitialiserApplication();
      await app.verifierPastillePanier(0);
      await app.verifierBoutonProduit('Sauce Labs Backpack', 'ajouter'); // échoue : le bouton propose encore « Remove »
      await app.verifierBoutonProduit('Sauce Labs Onesie', 'ajouter');
    },
  );
});

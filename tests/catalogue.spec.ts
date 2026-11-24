import { expect, test } from './fixtures';
import { TOUS_LES_PRODUITS, UTILISATEURS } from '../dsl/concepts';
import { catalogueDeReference, nomsTries, prixDeReference, prixTries } from './oracles';

/** Scénarios S09 à S13 : tâche T2 (choisir des produits). Voir README, section 2. */
test.describe('Catalogue', () => {
  test.beforeEach(async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard);
    await app.verifierEcran('catalogue');
  });

  test('S09 - le catalogue affiche les 6 produits avec leur prix de référence', async ({ app }) => {
    const catalogue = await app.lireCatalogue();
    expect(catalogue).toHaveLength(6);
    expect(catalogue).toEqual(expect.arrayContaining(catalogueDeReference()));
  });

  test('S10 - tri par nom de A à Z puis de Z à A', async ({ app }) => {
    await app.trierCatalogue('nom-croissant');
    expect((await app.lireCatalogue()).map((p) => p.nom)).toEqual(nomsTries('nom-croissant'));

    await app.trierCatalogue('nom-decroissant');
    expect((await app.lireCatalogue()).map((p) => p.nom)).toEqual(nomsTries('nom-decroissant'));
  });

  test('S11 - tri par prix croissant (avec deux prix égaux)', async ({ app }) => {
    await app.trierCatalogue('prix-croissant');
    expect((await app.lireCatalogue()).map((p) => p.prix)).toEqual(prixTries('prix-croissant'));
  });

  test('S12 - tri par prix décroissant', async ({ app }) => {
    await app.trierCatalogue('prix-decroissant');
    expect((await app.lireCatalogue()).map((p) => p.prix)).toEqual(prixTries('prix-decroissant'));
  });

  test('S13 - la fiche de chaque produit est conforme au catalogue', async ({ app }) => {
    for (const produit of TOUS_LES_PRODUITS) {
      await test.step(produit, async () => {
        await app.consulterFicheProduit(produit);
        await app.verifierEcran('fiche-produit');
        expect(await app.lireFicheProduit()).toEqual({ nom: produit, prix: prixDeReference(produit) });
        await app.retournerAuCatalogue();
      });
    }
  });
});

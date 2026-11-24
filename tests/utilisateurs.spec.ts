import { expect, test } from './fixtures';
import { TOUS_LES_PRODUITS, UTILISATEURS, type Utilisateur } from '../dsl/concepts';
import type { SauceDemo } from '../dsl/SauceDemo';
import { preparerCommande } from '../dsl/tachesComposees';
import { CLIENT, DEUX_PRODUITS } from './donnees';
import { DELAI_MAX_CONNEXION_MS, catalogueDeReference, montantsAttendus, prixTries, produitsDeReference } from './oracles';

/**
 * Scénarios S33 à S37 : rejeu des scénarios clés avec les 5 comptes qui peuvent se connecter.
 * Les comptes à défauts jouent le rôle de « mutants » : chacun doit faire échouer au moins un test.
 * Voir README, section 2 (tableau des résultats par compte).
 */

type ScenarioRejoue = 'S33' | 'S34' | 'S35' | 'S36' | 'S37';

const COMPTES: readonly Utilisateur[] = [
  UTILISATEURS.standard,
  UTILISATEURS.probleme,
  UTILISATEURS.erreur,
  UTILISATEURS.lent,
  UTILISATEURS.visuel,
];

/** Défauts connus (prise en main) : ces tests doivent échouer pour ces comptes. */
const ECHECS_ATTENDUS: Partial<Record<Utilisateur, Partial<Record<ScenarioRejoue, string>>>> = {
  [UTILISATEURS.probleme]: {
    S34: 'le tri est sans effet',
    S35: '3 boutons « Add to cart » sur 6 ne fonctionnent pas',
    S36: 'saisir le nom écrase le prénom, la commande est bloquée',
  },
  [UTILISATEURS.erreur]: {
    S34: 'le tri est cassé (alerte « Sorting is broken! »)',
    S35: '3 boutons « Add to cart » sur 6 ne fonctionnent pas',
    S36: 'le bouton « Finish » ne fait rien',
  },
  [UTILISATEURS.lent]: {
    S37: 'la connexion prend environ 5 s',
  },
  [UTILISATEURS.visuel]: {
    S33: 'les prix du catalogue sont faux',
    S34: 'les prix affichés sont faux, donc l’ordre est incohérent',
  },
};

/**
 * Déclare le scénario rejoué pour un compte.
 * Si le compte a un défaut connu pour ce scénario, le test est déclaré « échec attendu » (test.fail),
 * avec le défaut en annotation dans le rapport.
 */
function scenarioRejoue(
  compte: Utilisateur,
  scenario: ScenarioRejoue,
  titre: string,
  corps: (args: { app: SauceDemo }) => Promise<void>,
): void {
  const nom = `${scenario} - [${compte}] ${titre}`;
  const defaut = ECHECS_ATTENDUS[compte]?.[scenario];
  if (defaut) {
    test.fail(nom, { annotation: { type: 'défaut connu', description: defaut } }, corps);
  } else {
    test(nom, corps);
  }
}

for (const compte of COMPTES) {
  test.describe(`Rejeu avec ${compte}`, () => {
    scenarioRejoue(compte, 'S33', 'prix du catalogue conformes', async ({ app }) => {
      await app.seConnecter(compte);
      await app.verifierEcran('catalogue');
      const catalogue = await app.lireCatalogue();
      expect(catalogue).toHaveLength(6);
      expect(catalogue).toEqual(expect.arrayContaining(catalogueDeReference()));
    });

    scenarioRejoue(compte, 'S34', 'tri par prix croissant', async ({ app }) => {
      await app.seConnecter(compte);
      await app.verifierEcran('catalogue');
      await app.trierCatalogue('prix-croissant');
      expect((await app.lireCatalogue()).map((p) => p.prix)).toEqual(prixTries('prix-croissant'));
    });

    scenarioRejoue(compte, 'S35', 'ajout des 6 produits au panier', async ({ app }) => {
      await app.seConnecter(compte);
      await app.verifierEcran('catalogue');
      for (const produit of TOUS_LES_PRODUITS) {
        await app.ajouterAuPanier(produit);
      }
      await app.verifierPastillePanier(6);
    });

    scenarioRejoue(compte, 'S36', 'achat de bout en bout avec récapitulatif correct', async ({ app }) => {
      await app.seConnecter(compte);
      await app.verifierEcran('catalogue');
      await preparerCommande(app, DEUX_PRODUITS, CLIENT);
      await app.verifierEcran('recapitulatif');
      const recap = await app.lireRecapitulatif();
      expect(recap.produits).toEqual(expect.arrayContaining(produitsDeReference(DEUX_PRODUITS)));
      expect({ sousTotal: recap.sousTotal, taxe: recap.taxe, total: recap.total }).toEqual(montantsAttendus(DEUX_PRODUITS));
      await app.confirmerCommande();
      await app.verifierCommandeConfirmee();
    });

    scenarioRejoue(compte, 'S37', 'connexion en moins de 2 s', async ({ app }) => {
      await app.accederDirectement('connexion');
      const debut = Date.now();
      await app.seConnecter(compte);
      await app.verifierEcran('catalogue');
      const duree = Date.now() - debut;
      expect(duree, `durée de connexion de ${compte} (ms)`).toBeLessThan(DELAI_MAX_CONNEXION_MS);
    });
  });
}

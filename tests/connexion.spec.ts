import { test } from './fixtures';
import { MOT_DE_PASSE, UTILISATEURS } from '../dsl/concepts';

/** Scénarios S01 à S08 : tâches T1 (s'authentifier) et contrôle d'accès. Voir README, section 2. */
test.describe('Connexion', () => {
  test('S01 - connexion réussie avec un compte valide', async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard);
    await app.verifierEcran('catalogue');
    await app.verifierAucuneErreur();
  });

  test('S02 - mot de passe erroné', async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard, 'mauvais_mot_de_passe');
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur('Username and password do not match any user in this service');
  });

  test('S03 - identifiant inconnu', async ({ app }) => {
    await app.seConnecter('utilisateur_inconnu', MOT_DE_PASSE);
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur('Username and password do not match any user in this service');
  });

  test('S04 - identifiant vide', async ({ app }) => {
    await app.seConnecter('', MOT_DE_PASSE);
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur('Username is required');
  });

  test('S05 - mot de passe vide', async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard, '');
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur('Password is required');
  });

  test('S06 - compte verrouillé', async ({ app }) => {
    await app.seConnecter(UTILISATEURS.verrouille);
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur('Sorry, this user has been locked out.');
  });

  test('S07 - accès direct au catalogue sans être connecté', async ({ app }) => {
    await app.accederDirectement('catalogue');
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur("You can only access '/inventory.html' when you are logged in.");
  });

  test('S08 - déconnexion puis accès direct au catalogue', async ({ app }) => {
    await app.seConnecter(UTILISATEURS.standard);
    await app.verifierEcran('catalogue');
    await app.seDeconnecter();
    await app.verifierEcran('connexion');
    await app.accederDirectement('catalogue');
    await app.verifierEcran('connexion');
    await app.verifierMessageErreur("You can only access '/inventory.html' when you are logged in.");
  });
});

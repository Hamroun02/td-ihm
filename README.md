# TD IHM – Tests end-to-end de SauceDemo avec un DSL et Playwright

Système testé : <https://www.saucedemo.com>

## Binôme
*   Étudiant·e 1 : **Adem HAMROUN**
*   Étudiant·e 2 : **Yungao BAO**

## Lancer les tests

```bash
npm ci                          # installe les dépendances
npx playwright install chromium # installe le navigateur
npm test                        # lance tous les tests
npm run test:ui                 # mode interactif (débogage)
npm run report                  # ouvre le dernier rapport HTML
```

Résultat attendu : **57 passed**, dont 12 « échecs attendus » qui révèlent des défauts du site (section 1.4).
Pour vérifier la stabilité : `npx playwright test --repeat-each=3` (171 exécutions).

## 1. Stratégie de production des cas de test

SauceDemo n'a pas de spécification écrite. Nous l'avons reconstituée en explorant le site ([`docs/prise-en-main.md`](docs/prise-en-main.md)) et en construisant le modèle des tâches et des concepts (section 3.1).
Les cas de test sont ensuite produits **systématiquement** à partir de ce modèle, avec sept techniques complémentaires.

### 1.1 Sept sources de cas de test

| # | Technique | Ce qu'elle produit | Scénarios |
|---|---|---|---|
| A | **Couverture des tâches** | Au moins un scénario nominal par tâche du modèle (T1 à T5), avec un test e2e par scénario. | S01, S08, S09, S10, S13, S15, S17–S20, S23, S24, S28, S30, S31 |
| B | **Classes d'équivalence** | Une valeur représentative par classe d'entrée : compte valide, mot de passe faux, identifiant inconnu, compte verrouillé. | S02, S03, S06 |
| C | **Valeurs limites** | Les bornes : champs vides, panier à 0, 1 et 6 produits, ajout puis retrait (retour à 0), égalité de prix dans le tri, commande avec un panier vide. | S04, S05, S11, S14–S17, S25–S27, S29, S32 |
| D | **Oracles calculés** | Le résultat attendu est **calculé** à partir de la spécification (catalogue de référence dans [`dsl/concepts.ts`](dsl/concepts.ts)), jamais recopié depuis l'écran : prix, ordre de tri, sous-total, taxe à 8 %, total. | S09–S12, S28, S29 |
| E | **Cohérence entre écrans et états** | Une même information affichée à plusieurs endroits doit concorder (catalogue ↔ fiche ↔ panier ↔ récapitulatif, pastille ↔ boutons), y compris après une annulation, une réinitialisation ou une reconnexion. | S13, S17, S19–S23, S30, S31 |
| F | **Rejeu sur les comptes à défauts** | Les scénarios clés sont rejoués avec les 4 comptes qui contiennent des défauts volontaires. Ces comptes jouent le rôle de « mutants » : un bon jeu de tests doit faire échouer au moins un test par compte. | S33–S37 |
| G | **Contrôle d'accès** | Les écrans protégés sont inaccessibles sans connexion, y compris après une déconnexion. | S07, S08 |

### 1.2 Être précis là où c'est critique

Comme vu en cours, on peut rester vague à certains endroits du système mais on doit être très pointu à d'autres :

- **Très pointu** : les montants de la commande (au centime près), le contenu exact du panier, le contrôle d'accès et le texte exact des messages d'erreur.
- **Volontairement vague** : l'aspect visuel (mise en page, images, couleurs) et les textes descriptifs des produits ne sont pas vérifiés par ces tests fonctionnels. L'aspect visuel relève d'autres outils, comme AIM vu en cours.

### 1.3 Ambiguïtés de la spécification et décisions du binôme

La prise en main a révélé des comportements que rien ne permet de juger corrects ou incorrects. Nous avons tranché, et les tests encodent ces décisions :

| Comportement observé | Notre décision | Scénario |
|---|---|---|
| On peut lancer une commande avec un panier vide. | **Défaut** : la commande doit être impossible. | S32 |
| Le panier n'est pas lié à l'utilisateur : sur le même navigateur, un autre compte retrouve le panier du précédent. | **Défaut** : chaque utilisateur a son propre panier (confidentialité). | S22 |
| Après « Reset App State », la pastille disparaît mais les boutons restent sur « Remove ». | **Défaut** : les boutons doivent revenir à « Add to cart ». | S23 |
| Le panier d'un utilisateur est conservé quand il se déconnecte puis se reconnecte. | **Comportement normal.** | S21 |
| La connexion de `performance_glitch_user` prend environ 5 s (0,3 s pour les autres). | **Défaut** : la connexion doit aboutir en moins de 2 s. | S37 |

**Pourquoi 2 s pour la connexion ?** Nous avons mesuré environ 0,3 s pour les comptes normaux et environ 5 s pour `performance_glitch_user`.
Le seuil de 2 s est très au-dessus du temps normal (le test ne doit pas échouer à cause d'un réseau ou d'une machine d'intégration continue plus lents) et très en dessous du temps anormal (le défaut est détecté sans ambiguïté).
Il reste proche des limites de temps de réponse de Nielsen : au-delà d'1 s, l'utilisateur perd le fil de sa pensée. Une connexion de 5 s est donc un vrai défaut d'utilisabilité.

### 1.4 Échecs attendus

Un test qui met en évidence un défaut connu (décisions ci-dessus ou comptes à défauts) est marqué `test.fail()`, avec la raison en commentaire.
La suite reste verte tant que le défaut est présent. Si le défaut est corrigé un jour, le test passe et Playwright le signale en rouge : on sait alors qu'il faut mettre le test à jour.

### 1.5 Isolation et stabilité

- Chaque test démarre dans un contexte de navigateur neuf (cookies et `localStorage` vides) : aucun test ne dépend d'un autre, et ils peuvent tourner en parallèle.
- Les perceptions `verifier…()` attendent la mise à jour de l'interface avant d'échouer, ce qui évite les tests instables, y compris avec le compte lent `performance_glitch_user`.

### 1.6 Démarche TDD et résultats d'exécution

Comme demandé dans le cours, la spécification a été écrite **avant** le code de l'interpréteur, puis l'interpréteur a été complété par petites itérations, en vérifiant à chaque fois les résultats.

| Étape | Résultat (exécution réelle, 21/11/2026) |
|---|---|
| 1. Spécification | Interface du DSL ([`dsl/SauceDemo.ts`](dsl/SauceDemo.ts)) et 37 scénarios (57 tests) écrits avec le DSL, interpréteur vide. |
| 2. Phase rouge | 57 tests : **45 échecs**, tous dus à « méthode non implémentée », et 12 échecs attendus. Les tests échouent bien avant l'implémentation. |
| 3. Interpréteur, 1er lancement | **50 / 57**. Deux erreurs de l'interpréteur révélées par la trace Playwright : le `data-test` du menu est posé sur une image recouverte par le vrai bouton, et `getByRole('button')` trouvait aussi les liens des produits (section 3.3). |
| 4. 2e lancement | **56 / 57**. Une course entre le changement d'adresse et l'affichage de la fiche produit (S13), corrigée par un repère d'écran unique. |
| 5. 3e lancement | **57 / 57** en environ 23 s. |
| 6. Stabilité | `--repeat-each=3` : **171 / 171**, aucun test instable. Chacun des 12 échecs attendus échoue les 3 fois sur la vérification prévue. |

**Vérifier la raison des échecs attendus.** Un test marqué `test.fail()` « réussit » dès qu'il échoue, quelle que soit la cause : un bug de l'interpréteur pourrait donc passer inaperçu.
Nous avons contrôlé dans les résultats que chaque échec attendu échoue sur l'assertion prévue. Ce contrôle a d'ailleurs détecté qu'au 1er lancement S22 et S23 échouaient pour une mauvaise raison (le blocage du menu), ce qui a été corrigé.

| Échec attendu | Raison constatée à l'exécution |
|---|---|
| S22 | La pastille du panier de `visual_user` indique 1 (panier de `standard_user`). |
| S23 | Après « Reset App State », le bouton du produit affiche encore « Remove ». |
| S32 | Avec un panier vide, « Checkout » mène à `checkout-step-one.html`. |
| S33 `visual_user` | Prix affichés faux (par exemple 59,61 $ au lieu de 29,99 $). |
| S34 `problem_user`, `error_user`, `visual_user` | La suite des prix après le tri n'est pas croissante. |
| S35 `problem_user`, `error_user` | La pastille indique 3 au lieu de 6. |
| S36 `problem_user` | La commande reste bloquée sur le formulaire (nom écrasé). |
| S36 `error_user` | Le récapitulatif est correct, mais « Finish » ne mène pas à la confirmation. |
| S37 `performance_glitch_user` | Connexion en 5 141 ms (seuil : 2 000 ms). |

## 2. Liste des scénarios

Chaque test TypeScript commence par l'identifiant de son scénario (`test('S01 - …')`), dans le fichier indiqué pour chaque groupe.
La colonne « Raison d'être » renvoie aux techniques A à G de la section 1.1.
**Échec attendu** signifie que le test révèle un défaut du site (section 1.4).

### Connexion — [`tests/connexion.spec.ts`](tests/connexion.spec.ts)

| ID | Scénario | Résultat attendu | Raison d'être |
|---|---|---|---|
| S01 | Se connecter avec `standard_user`. | Écran catalogue, aucune erreur. | A – tâche T1.1, cas nominal |
| S02 | Se connecter avec un mot de passe erroné. | Reste sur la connexion ; « Username and password do not match any user in this service ». | B – mot de passe invalide |
| S03 | Se connecter avec un identifiant inconnu. | Même message qu'en S02. | B – utilisateur inconnu |
| S04 | Valider la connexion avec l'identifiant vide. | « Username is required ». | C – champ vide |
| S05 | Valider la connexion avec le mot de passe vide. | « Password is required ». | C – champ vide |
| S06 | Se connecter avec `locked_out_user`. | « Sorry, this user has been locked out. » | B – compte verrouillé |
| S07 | Ouvrir directement le catalogue sans être connecté. | Retour à la connexion ; « You can only access '/inventory.html' when you are logged in. » | G – contrôle d'accès |
| S08 | Se déconnecter, puis rouvrir directement le catalogue. | Écran de connexion, accès refusé. | A – tâche T1.2 ; G |

### Catalogue — [`tests/catalogue.spec.ts`](tests/catalogue.spec.ts)

| ID | Scénario | Résultat attendu | Raison d'être |
|---|---|---|---|
| S09 | Consulter le catalogue. | 6 produits, noms et prix identiques au catalogue de référence. | A – tâche T2.1 ; D – oracle de référence |
| S10 | Trier par nom de A à Z, puis de Z à A. | Ordre alphabétique, puis ordre inverse (ordres calculés). | A – tâche T2.2 ; D |
| S11 | Trier par prix croissant. | Prix croissants ; les deux produits à 15,99 $ sont côte à côte. | D ; C – égalité de prix |
| S12 | Trier par prix décroissant. | Prix décroissants. | D |
| S13 | Ouvrir la fiche de chacun des 6 produits. | Nom et prix de chaque fiche identiques au catalogue de référence. | A – tâche T2.3 ; E |

### Panier — [`tests/panier.spec.ts`](tests/panier.spec.ts)

| ID | Scénario | Résultat attendu | Raison d'être |
|---|---|---|---|
| S14 | Se connecter sans rien ajouter. | Pas de pastille ; panier vide. | C – panier à 0 |
| S15 | Ajouter 1 produit. | Pastille « 1 » ; le bouton du produit propose « Remove ». | A – tâche T3.1 ; C – panier à 1 |
| S16 | Ajouter les 6 produits. | Pastille « 6 ». | C – panier maximal |
| S17 | Ajouter puis retirer un produit depuis le catalogue. | Pastille absente ; le bouton propose de nouveau « Add to cart ». | A – tâche T3.2 ; C – retour à 0 ; E |
| S18 | Ajouter un produit depuis sa fiche. | Pastille « 1 ». | A – tâche T3.1 depuis un autre écran |
| S19 | Ajouter 3 produits puis ouvrir le panier. | Le panier contient exactement ces 3 produits. | A – tâche T3.3 ; E |
| S20 | Retirer un produit depuis le panier. | Le produit disparaît du panier ; la pastille est mise à jour. | A – tâche T3.2 ; E |
| S21 | Ajouter un produit, se déconnecter, se reconnecter avec le même compte. | Le produit est toujours dans le panier. | E – persistance (décision 1.3) |
| S22 | `standard_user` ajoute un produit et se déconnecte ; `visual_user` se connecte. | Panier vide pour `visual_user`. **Échec attendu.** | E – décision 1.3 |
| S23 | Ajouter 2 produits puis réinitialiser l'application (« Reset App State »). | Pastille absente et boutons « Add to cart ». **Échec attendu.** | A – tâche T5 ; E – décision 1.3 |

### Commande — [`tests/commande.spec.ts`](tests/commande.spec.ts)

| ID | Scénario | Résultat attendu | Raison d'être |
|---|---|---|---|
| S24 | Acheter 2 produits de bout en bout. | « Thank you for your order! » ; pastille absente. | A – tâche T4, cas nominal |
| S25 | Valider les informations sans prénom. | « First Name is required ». | C – champ vide |
| S26 | Valider les informations sans nom. | « Last Name is required ». | C – champ vide |
| S27 | Valider les informations sans code postal. | « Postal Code is required ». | C – champ vide |
| S28 | Consulter le récapitulatif d'une commande de 2 produits. | Produits listés ; sous-total = somme des prix de référence ; taxe = 8 % arrondie au centime ; total = sous-total + taxe. | A – tâche T4.2 ; D – oracle calculé (critique) |
| S29 | Consulter le récapitulatif d'une commande des 6 produits. | Mêmes règles qu'en S28. | D ; C – panier maximal |
| S30 | Annuler pendant la saisie des informations. | Retour au panier ; panier inchangé. | A – tâche T4.4 ; E |
| S31 | Annuler au récapitulatif. | Retour au catalogue ; panier inchangé. | A – tâche T4.4 ; E |
| S32 | Commencer une commande avec un panier vide. | La commande est refusée (on reste sur le panier). **Échec attendu.** | C – panier vide ; décision 1.3 |

### Rejeu sur les comptes — [`tests/utilisateurs.spec.ts`](tests/utilisateurs.spec.ts)

Chaque scénario est exécuté avec les 5 comptes qui peuvent se connecter ; `standard_user` sert de référence.
Le titre du test contient le compte, par exemple `S34 - [problem_user] tri par prix croissant`.

| ID | Scénario | Résultat attendu | Raison d'être |
|---|---|---|---|
| S33 | Consulter le catalogue. | Prix identiques au catalogue de référence. | F – rejeu de S09 |
| S34 | Trier par prix croissant. | Prix croissants. | F – rejeu de S11 |
| S35 | Ajouter les 6 produits. | Pastille « 6 ». | F – rejeu de S16 |
| S36 | Acheter 2 produits de bout en bout. | Récapitulatif correct, puis confirmation. | F – rejeu de S24 et S28 |
| S37 | Se connecter. | Catalogue affiché en moins de 2 s. | F – décision 1.3 (temps de réponse) |

Résultats prévus d'après la prise en main, puis **confirmés par l'exécution** (section 1.6) — ✓ = le test passe, ✗ = échec attendu, défaut détecté :

| Scénario | `standard_user` | `problem_user` | `error_user` | `performance_glitch_user` | `visual_user` |
|---|---|---|---|---|---|
| S33 Prix du catalogue | ✓ | ✓ | ✓ | ✓ | ✗ prix faux |
| S34 Tri par prix | ✓ | ✗ tri sans effet | ✗ tri cassé | ✓ | ✗ prix faux |
| S35 Ajout des 6 produits | ✓ | ✗ 3 ajouts sur 6 | ✗ 3 ajouts sur 6 | ✓ | ✓ |
| S36 Achat de bout en bout | ✓ | ✗ nom non saisi | ✗ « Finish » sans effet | ✓ | ✓ |
| S37 Connexion en moins de 2 s | ✓ | ✓ | ✓ | ✗ environ 5 s | ✓ |

Chaque compte à défaut fait échouer au moins un test : le jeu de tests détecte les 4 comptes défectueux.

**Total : 57 tests** (32 scénarios S01–S32, plus 5 scénarios × 5 comptes).

## 3. Le DSL de test

### 3.1 Concepts et tâches de SauceDemo

Le DSL est écrit au niveau des concepts et des tâches de l'application, pas au niveau des widgets.
Les observations détaillées (comptes, messages, prix, sélecteurs) sont dans [`docs/prise-en-main.md`](docs/prise-en-main.md).

**Concepts**

| Concept | Attributs |
|---|---|
| Utilisateur | identifiant, mot de passe (6 comptes, mot de passe commun `secret_sauce`) |
| Produit | nom, description, prix, image (6 produits) |
| Catalogue | liste des produits, ordre de tri (nom A→Z, nom Z→A, prix croissant, prix décroissant) |
| Panier | ensemble de produits (quantité 1 chacun), pastille indiquant le nombre de produits |
| Informations client | prénom, nom, code postal |
| Commande | produits, sous-total, taxe (8 %), total, confirmation |

**Tâches**

| Tâche | Sous-tâches | Écrans concernés |
|---|---|---|
| T1 S'authentifier | T1.1 Se connecter · T1.2 Se déconnecter | Connexion, menu |
| T2 Choisir des produits | T2.1 Consulter le catalogue · T2.2 Trier le catalogue · T2.3 Consulter la fiche d'un produit | Catalogue, fiche produit |
| T3 Gérer le panier | T3.1 Ajouter un produit · T3.2 Retirer un produit · T3.3 Consulter le panier | Catalogue, fiche produit, panier |
| T4 Commander | T4.1 Saisir ses informations · T4.2 Vérifier le récapitulatif · T4.3 Confirmer · T4.4 Annuler | Informations client, récapitulatif, confirmation |
| T5 Réinitialiser l'application | — | Menu |

### 3.2 Interface du DSL

Le DSL est une **interface TypeScript** : [`dsl/SauceDemo.ts`](dsl/SauceDemo.ts).
Les types des concepts sont dans [`dsl/concepts.ts`](dsl/concepts.ts) et les tâches composées dans [`dsl/tachesComposees.ts`](dsl/tachesComposees.ts).

**Principes**

- **Indépendant de Playwright** : l'interface n'importe rien de Playwright. Les tests ne contiennent ni sélecteur ni `page.` ; seul l'interpréteur connaît l'interface concrète. On pourrait écrire un autre interpréteur (Cypress…) sans modifier les tests.
- **Vocabulaire métier** : chaque méthode correspond à une tâche ou à une perception de l'utilisateur (« ajouter au panier », « la pastille indique 2 »), jamais à un widget (« cliquer sur le bouton »).
- **Typé par les concepts** : un nom de produit est de type `NomProduit` ; un produit inconnu est refusé dès la compilation.
- **Les actions ne vérifient rien** : une connexion refusée ne lève pas d'erreur, ce qui permet d'écrire les tests négatifs. Ce sont les perceptions qui vérifient.
- **Deux sortes de perceptions** :
  - `verifier…()` échoue si l'écran ne correspond pas à l'attendu, en attendant la mise à jour de l'interface (tests stables) ;
  - `lire…()` renvoie ce qui est affiché, pour le comparer à un résultat calculé par le test (oracle : ordre de tri, totaux).
- **Tâches composées** : `preparerCommande` et `acheter` enchaînent des tâches élémentaires, écrites une seule fois avec le DSL.

**Correspondance avec les tâches et les concepts**

| Tâche / perception | Méthode du DSL | Concepts manipulés |
|---|---|---|
| T1.1 Se connecter | `seConnecter(identifiant, motDePasse?)` | Utilisateur |
| T1.2 Se déconnecter | `seDeconnecter()` | Utilisateur |
| Ouvrir un écran par son adresse | `accederDirectement(ecran)` | Écran |
| T2.1 Consulter le catalogue | `retournerAuCatalogue()`, `lireCatalogue()` | Catalogue, Produit |
| T2.2 Trier le catalogue | `trierCatalogue(ordre)` | Catalogue, OrdreTri |
| T2.3 Consulter une fiche produit | `consulterFicheProduit(produit)`, `lireFicheProduit()` | Produit |
| T3.1 Ajouter un produit | `ajouterAuPanier(produit)` | Panier, Produit |
| T3.2 Retirer un produit | `retirerDuPanier(produit)` | Panier, Produit |
| T3.3 Consulter le panier | `ouvrirPanier()`, `verifierContenuPanier(produits)` | Panier |
| T4 Commander | `commencerCommande()` | Commande |
| T4.1 Saisir ses informations | `saisirInformations(infos)` | Informations client |
| T4.2 Vérifier le récapitulatif | `lireRecapitulatif()` | Commande (sous-total, taxe, total) |
| T4.3 Confirmer | `confirmerCommande()`, `verifierCommandeConfirmee()` | Commande |
| T4.4 Annuler | `annulerCommande()` | Commande |
| T5 Réinitialiser l'application | `reinitialiserApplication()` | Panier |
| T3 + T4 Acheter (tâche composée) | `acheter(app, produits, infos)`, `preparerCommande(app, produits, infos)` | Panier, Commande |
| Pastille du panier | `verifierPastillePanier(n)` | Panier |
| État du bouton d'un produit | `verifierBoutonProduit(produit, 'ajouter' \| 'retirer')` | Panier, Produit |
| Écran courant | `verifierEcran(ecran)` | Écran |
| Messages d'erreur | `verifierMessageErreur(message)`, `verifierAucuneErreur()` | — |

**Exemple de test écrit avec le DSL**

```ts
test('ajouter deux produits met à jour la pastille', async ({ app }) => {
  await app.seConnecter(UTILISATEURS.standard);
  await app.ajouterAuPanier('Sauce Labs Backpack');
  await app.ajouterAuPanier('Sauce Labs Onesie');
  await app.verifierPastillePanier(2);
});
```

### 3.3 Stratégie d'implémentation (interpréteur Playwright)

L'interpréteur est la classe `SauceDemoPlaywright` ([`dsl/SauceDemoPlaywright.ts`](dsl/SauceDemoPlaywright.ts)), qui implémente l'interface du DSL.
C'est **le seul fichier** qui connaît Playwright et les sélecteurs. Les tests reçoivent le DSL par une fixture Playwright ([`tests/fixtures.ts`](tests/fixtures.ts)) : `test('…', async ({ app }) => { … })`.

| Choix | Pourquoi |
|---|---|
| **Table des écrans** (`ECRANS`) : adresse et élément caractéristique de chaque écran | C'est le niveau « interface abstraite » : `verifierEcran('panier')` vérifie l'adresse **et** la présence de l'écran. Si l'interface change, on ne modifie que cette table. |
| **Repère unique par écran** (ex. « Back to products » pour la fiche produit) | SauceDemo change l'adresse un instant avant d'afficher le nouvel écran. Un repère présent aussi sur l'écran précédent (`inventory-item`, 6 fois sur le catalogue) faisait échouer S13 par intermittence. |
| **Sélecteurs `data-test`** via `page.getByTestId` (attribut configuré dans `playwright.config.ts`) | Ils sont faits pour les tests : stables, indépendants du style et de la mise en page. |
| **Exception : le bouton du menu** est retrouvé par son rôle et son nom accessible (`getByRole('button', { name: 'Open Menu' })`) | Sur SauceDemo, `data-test="open-menu"` est posé sur l'image du bouton, recouverte par le vrai bouton : Playwright refusait de cliquer (« intercepts pointer events »). Trouvé grâce à la trace Playwright du premier lancement. |
| **Bouton d'un produit retrouvé par son `data-test`** (`add-to-cart…` / `remove…`) et non par son rôle | L'image et le nom d'un produit sont des liens qui ont aussi le rôle « button » : `getByRole('button')` en trouvait 3. |
| **Un produit est retrouvé par son nom affiché** (le bloc `inventory-item` qui contient ce nom) | Le test parle de produits, pas de positions ni d'identifiants techniques. La même méthode `ajouterAuPanier` marche sur le catalogue et sur la fiche, et `retirerDuPanier` aussi dans le panier. |
| **Actions sans vérification** | Elles agissent puis rendent la main. Les actions Playwright attendent d'elles-mêmes que l'élément soit visible et cliquable. |
| **Perceptions `verifier…` = assertions Playwright qui réessaient** (`toHaveURL`, `toHaveText`, `toHaveCount`, `expect.poll`) | L'interface a le temps de se mettre à jour. Le délai est de 10 s (`expect.timeout`) pour supporter le compte lent. |
| **Perceptions `lire…`** : attendre l'écran, puis lire les textes affichés et convertir les montants (« $29.99 » → 29.99) | Le test compare ensuite ces valeurs à ses oracles calculés. |
| **Pastille absente = 0**, en vérifiant d'abord que l'en-tête est affiché | Sinon, « pas de pastille » serait vrai sur n'importe quelle page en cours de chargement. |
| **Menu latéral refermé avec Échap** après chaque choix | « Reset App State » laisse le menu ouvert par-dessus l'écran ; Échap le referme comme le ferait un utilisateur. |
| **`seConnecter` n'ouvre la page de connexion que si elle n'est pas déjà affichée** | S37 mesure ainsi le temps de la connexion seule. |
| **Alertes JavaScript** (tri de `error_user`) fermées automatiquement par Playwright | Le test continue et constate que le tri n'a pas eu lieu. |

## 4. Outillage et usage de l'IA

Notre outillage a trois parties : **les cours** (cours VA et stratégie de test), qui nous ont servi à comprendre le problème et la méthode ; **les outils de test** ; et **un agent IA** pour l'implémentation, que nous avons dirigé.

### 4.1 Le cours VA et la stratégie de test : comprendre le problème et la méthode


| Notion du cours | Application dans notre rendu |
|---|---|
| **Test en boîte noire** : les spécifications donnent des données de test, un oracle compare le résultat prévu au résultat réel. | Spécification reconstituée lors de la prise en main ([`docs/prise-en-main.md`](docs/prise-en-main.md)), scénarios = données de test, oracles calculés ([`tests/oracles.ts`](tests/oracles.ts)). |
| **Validation ou vérification ?** | Nos tests font de la **vérification** : le site fonctionne-t-il conformément à ce qu'on attend ? La validation (le site répond-il aux besoins des utilisateurs ?) sort du périmètre. |
| **Un test end-to-end par scénario**, chaque action de l'utilisateur étant une action sur l'interface. | 37 scénarios, un test chacun ; les actions du DSL sont les tâches de l'utilisateur (section 2). |
| **Les tests aux valeurs limites détectent beaucoup d'erreurs.** | Technique C : champs vides, panier à 0, 1 et 6 produits, égalité de prix, panier vide (section 1.1). |
| **Définir les données de test et le résultat attendu fait apparaître les ambiguïtés de la spécification**, à traiter le plus tôt possible. | Les ambiguïtés trouvées ont été tranchées avant d'écrire les tests (section 1.3). |
| **Écrire les cas de test à haut niveau d'abstraction avec un DSL**, exécuté par un ou plusieurs interpréteurs (Playwright, Cypress…). | Interface du DSL indépendante de Playwright et interpréteur séparé (sections 3.2 et 3.3). |
| **DSL au niveau des concepts et des tâches, plus l'interface abstraite (AUI).** | Concepts et tâches (section 3.1) ; table des écrans de l'interpréteur (section 3.3). |
| **TDD** : écrire la spécification avant le code, vérifier que le test échoue, progresser par petits incréments. | Phase rouge puis phase verte, itération par itération (section 1.6). |
| **Être vague à certains endroits du système, très pointu à d'autres.** | Section 1.2 : pointu sur les montants, le panier, l'accès et les messages ; vague sur l'aspect visuel. |
| **Vérification de la présentation graphique et de l'accessibilité** (outil AIM). | Hors du périmètre de ces tests fonctionnels, ce que nous assumons (section 1.2). |
| **Limite de l'approche : les tests e2e sont longs à exécuter.** | Un seul navigateur et exécution en parallèle : environ 23 s pour les 57 tests. |
| **Dangers de l'IA générative** : prompt vague, IA qui spécifie à votre place, très bien pour explorer mais dangereux en production. | Garde-fous de la section 4.4. |

Le **cours de stratégie de test** nous a servi à choisir et à combiner les techniques de production des cas de test (section 1.1), plutôt que d'écrire des tests au hasard.

### 4.2 Les outils de test

| Outil | Usage |
|---|---|
| **Playwright Test** (TypeScript) | Exécution des tests, fixtures (le DSL est donné à chaque test), assertions qui réessaient. |
| **Playwright codegen** (`npm run codegen`) | Prise en main : enregistrer un parcours sur SauceDemo et voir les sélecteurs proposés. |
| **Trace viewer et captures d'écran Playwright** | Comprendre les échecs : c'est la trace qui a montré que le clic sur le menu était intercepté (section 3.3). |
| **Rapport HTML** (`npm run report`) et **rapport JSON** | Lire les résultats, et contrôler la raison de chaque échec attendu. |
| **GitHub Actions** ([`.github/workflows/playwright.yml`](.github/workflows/playwright.yml)) | Exécution automatique des tests à chaque push. |

### 4.3 L'agent IA : comment nous avons travaillé

Pour l'implémentation, nous avons travaillé avec un **agent IA** : un assistant conversationnel capable de lire et de modifier les fichiers du dépôt et de consulter le site dans un navigateur.
Nos principaux prompts sont donnés dans la section 5.

Nous avons dirigé l'agent **étape par étape**, en validant chaque étape avant de passer à la suivante (petits incréments, comme recommandé dans le cours).

| Le binôme | L'agent |
|---|---|
| Fournit le contexte : le cours et l'énoncé du rendu. | Propose un plan de travail en 10 étapes. |
| S'appuie sur le cours VA et la stratégie de test (section 4.1) pour comprendre le problème et juger les propositions de l'agent. | — |
| Parcourt SauceDemo à la main pour comprendre le site. | Explore le site de façon systématique (6 comptes, messages, prix, sélecteurs) et consigne ses observations dans [`docs/prise-en-main.md`](docs/prise-en-main.md). |
| **Prend toutes les décisions de spécification** (section 1.3) : panier vide, panier partagé, réinitialisation, conservation du panier, seuil de 2 s après en avoir demandé la justification. | Rédige le DSL, les scénarios, les tests et l'interpréteur à partir de ces décisions. |
| Exécute tous les tests sur sa machine (phase rouge, puis chaque correction, puis 3 répétitions) et transmet les résultats. | Analyse les résultats et les traces Playwright, corrige l'interpréteur, vérifie la raison de chaque échec attendu. |


  

## 5. Nos prompts (extraits)

Voici nos principaux prompts, dans l'ordre où nous les avons envoyés à l'agent (orthographe corrigée, sens inchangé).

> Nous avons un travail à rendre pour le module d'IHM. Je vous donne tout ce que nous avons étudié ; la dernière partie est le rendu que nous devons faire. Vous êtes dans le dépôt que nous devons rendre. Je ne sais pas quel est le plan pour arrivé a la solution . Ce que je sais en général, c'est que nous devons faire des tests sur l'interface, en utilisant Playwright. Donne-moi le plan de A à Z de ce que je dois faire.

> On commence étape par étape de ce TD , faire rien n est pas demandé , on debut par etape 1.

> Passe à l'étape suivante et ecrire les test a partir de note de problem que jai donnéé mais a chaque teste donne moi je verifier et chaque fois que tu  besoin d'une information demande a moi ,a chaque teste demande information pour je te donne l accord a faire .

> Commande avec un panier vide : c'est un défaut. Panier partagé entre deux utilisateurs sur le même navigateur : c'est un défaut, chaque utilisateur doit avoir son propre panier. Boutons restés sur « Remove » après « Reset App State » : c'est un défaut.

> 1 : je suis d'accord (le panier est conservé quand le même utilisateur se reconnecte). Pour le 2 : pourquoi 2 secondes ?

> J'ai 50 tests passés et 7 en échec verifie problem et corrige le 

> 171 passés.

> on a terminé ? on a manqué quelque choose demandé par td ? 

> bien maintenant a readmi existant just ajoute en fin parti prompt 8  ecrire quelqeu prompt principale  que j ai fait avec vous pour arrivé a ce solution 

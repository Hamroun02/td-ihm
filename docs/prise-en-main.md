# Prise en main de SauceDemo

Observations faites le 21/11/2026 sur <https://www.saucedemo.com>.
Ce document sert de référence pour le DSL, les scénarios et l'interpréteur Playwright.

## Comptes

Mot de passe commun à tous les comptes : `secret_sauce`.

| Compte | Comportement observé |
|---|---|
| `standard_user` | Référence : tout fonctionne. |
| `locked_out_user` | Connexion refusée : « Epic sadface: Sorry, this user has been locked out. » |
| `problem_user` | Une seule image pour les 6 produits ; le tri n'a aucun effet ; seuls 3 boutons « Add to cart » sur 6 fonctionnent ; saisir le nom écrase le prénom, donc la commande est bloquée (« Error: Last Name is required »). |
| `error_user` | Le tri déclenche une alerte « Sorting is broken! » ; 3 ajouts au panier sur 6 fonctionnent ; le champ nom reste vide mais on passe quand même au récapitulatif ; le bouton « Finish » ne fait rien. |
| `performance_glitch_user` | Connexion d'environ 5 s (contre 0,3 s), le reste fonctionne. |
| `visual_user` | Prix du catalogue faux (et différents à chaque affichage), donc tri incohérent ; le récapitulatif de commande utilise pourtant les vrais prix. Probables défauts d'affichage, à vérifier à l'œil. |

## Écrans

| Écran | URL | Titre (`data-test="title"`) |
|---|---|---|
| Connexion | `/` | aucun (logo « Swag Labs ») |
| Catalogue | `/inventory.html` | Products |
| Fiche produit | `/inventory-item.html?id=N` | aucun (bouton « Back to products ») |
| Panier | `/cart.html` | Your Cart |
| Informations client | `/checkout-step-one.html` | Checkout: Your Information |
| Récapitulatif | `/checkout-step-two.html` | Checkout: Overview |
| Confirmation | `/checkout-complete.html` | Checkout: Complete! |

Menu latéral (bouton `open-menu`), présent sur tous les écrans après connexion :
All Items, Dynamic Catalog (sous-menu Lazy load / Spinner / Slider), About, Logout, Reset App State.

Accès direct à une page sans être connecté : retour sur `/` avec
« Epic sadface: You can only access '/inventory.html' when you are logged in. »

## Produits

| Produit | Prix |
|---|---|
| Sauce Labs Backpack | $29.99 |
| Sauce Labs Bike Light | $9.99 |
| Sauce Labs Bolt T-Shirt | $15.99 |
| Sauce Labs Fleece Jacket | $49.99 |
| Sauce Labs Onesie | $7.99 |
| Test.allTheThings() T-Shirt (Red) | $15.99 |

Deux produits ont le même prix ($15.99) : c'est un cas d'égalité à prévoir pour le tri par prix.

## Tri du catalogue

Liste déroulante `product-sort-container` ; le libellé choisi s'affiche dans `active-option`.

| Valeur | Libellé | Ordre attendu |
|---|---|---|
| `az` | Name (A to Z) | ordre par défaut |
| `za` | Name (Z to A) | |
| `lohi` | Price (low to high) | 7.99, 9.99, 15.99, 15.99, 29.99, 49.99 |
| `hilo` | Price (high to low) | 49.99, 29.99, 15.99, 15.99, 9.99, 7.99 |

## Messages d'erreur

Les erreurs s'affichent dans l'élément `data-test="error"` (rôle `alert`).

| Situation | Message |
|---|---|
| Identifiant vide | Epic sadface: Username is required |
| Mot de passe vide | Epic sadface: Password is required |
| Identifiants incorrects | Epic sadface: Username and password do not match any user in this service |
| Compte verrouillé | Epic sadface: Sorry, this user has been locked out. |
| Prénom vide | Error: First Name is required |
| Nom vide | Error: Last Name is required |
| Code postal vide | Error: Postal Code is required |

Le formulaire signale le premier champ vide, dans l'ordre prénom → nom → code postal.

## Calcul de la commande (oracle)

- Taxe = 8 % du sous-total, arrondie au centime ; total = sous-total + taxe.
- Exemple Backpack + Onesie : `Item total: $37.98`, `Tax: $3.04`, `Total: $41.02`.
- Exemple avec les 6 produits : `Item total: $129.94`, `Tax: $10.40`, `Total: $140.34`.
- Paiement affiché : « SauceCard #31337 » ; livraison : « Free Pony Express Delivery! ».
- Après « Finish » : « Thank you for your order! » et le panier est vidé (plus de pastille).

## Comportements utiles pour les tests

- La pastille du panier (`shopping-cart-badge`) **n'existe pas** quand le panier est vide (elle n'affiche pas « 0 »).
- Après un ajout, le bouton du produit passe de « Add to cart » à « Remove ».
- Chaque produit est au plus une fois dans le panier (quantité toujours 1).
- Le panier est stocké dans le `localStorage` (`cart-contents`). Playwright crée un contexte de navigateur neuf pour chaque test, donc les tests sont isolés.
- « Continue Shopping » (panier) ramène au catalogue.
- « Cancel » pendant la saisie des informations ramène au **panier** ; « Cancel » au récapitulatif ramène au **catalogue**. Dans les deux cas le panier est conservé.
- Le panier d'un utilisateur est conservé quand il se déconnecte puis se reconnecte.
- **Le panier n'est pas lié à l'utilisateur** : si `standard_user` ajoute un produit puis se déconnecte, `visual_user` retrouve ce produit dans son panier.
- **On peut lancer une commande avec un panier vide** : « Checkout » ouvre quand même le formulaire.
- **Après « Reset App State »**, la pastille disparaît mais les boutons des produits restent sur « Remove ».
- Fonctions annexes non explorées : Dynamic Catalog (chargements différés), génération d'un PDF de commande.

## Sélecteurs `data-test` (à utiliser avec `page.getByTestId(...)`)

| Écran | Éléments |
|---|---|
| Connexion | `username`, `password`, `login-button`, `error` |
| En-tête (partout) | `open-menu`, `shopping-cart-link`, `shopping-cart-badge`, `title` |
| Menu | `inventory-sidebar-link`, `logout-sidebar-link`, `reset-sidebar-link`, `close-menu` |
| Catalogue | `product-sort-container`, `active-option`, `inventory-item` (un par produit) contenant `inventory-item-name`, `inventory-item-desc`, `inventory-item-price`, `add-to-cart-<produit>` / `remove-<produit>` |
| Fiche produit | `inventory-item-name`, `inventory-item-price`, `add-to-cart` / `remove`, `back-to-products` |
| Panier | `inventory-item` contenant `item-quantity`, `inventory-item-name`, `inventory-item-price`, `remove-<produit>` ; `continue-shopping`, `checkout` |
| Informations client | `firstName`, `lastName`, `postalCode`, `continue`, `cancel`, `error` |
| Récapitulatif | `inventory-item`, `subtotal-label`, `tax-label`, `total-label`, `finish`, `cancel` |
| Confirmation | `complete-header`, `complete-text`, `back-to-products` |

`<produit>` est le nom en minuscules avec des tirets (ex. `add-to-cart-sauce-labs-backpack`).
Dans l'interpréteur, il est plus robuste de retrouver le produit par son nom
(`inventory-item` filtré sur le texte) puis de cliquer sur son bouton.

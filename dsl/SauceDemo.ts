import type { Ecran, InfosClient, NomProduit, OrdreTri, ProduitAffiche, Recapitulatif } from './concepts';

/**
 * DSL de test de SauceDemo.
 *
 * Les cas de test ne parlent qu'à cette interface : elle exprime ce que fait l'utilisateur
 * (actions = tâches) et ce qu'il constate (perceptions), sans aucun sélecteur ni appel Playwright.
 * Un interpréteur (dsl/SauceDemoPlaywright.ts) traduit chaque méthode en interactions réelles ;
 * on pourrait en écrire un autre (Cypress, etc.) sans toucher aux tests.
 *
 * Conventions :
 *  - Les actions ne vérifient pas leur résultat : après une connexion refusée, `seConnecter`
 *    ne lève pas d'erreur, c'est le test qui vérifie le message avec une perception.
 *  - `verifier...()` : perception qui échoue si ce que voit l'utilisateur ne correspond pas.
 *    Elle attend que l'interface se mette à jour avant d'échouer (pas de test instable).
 *  - `lire...()` : perception qui renvoie ce qui est affiché, pour que le test le compare
 *    à un résultat calculé (oracle : ordre de tri, totaux…).
 *
 * Les références T1.1, T2.2… renvoient au tableau des tâches du README (section 3.1).
 */
export interface SauceDemo {
  // ───────────── Actions ─────────────

  /** T1.1 Se connecter avec un identifiant et un mot de passe (par défaut `secret_sauce`). */
  seConnecter(identifiant: string, motDePasse?: string): Promise<void>;

  /** T1.2 Se déconnecter depuis le menu. */
  seDeconnecter(): Promise<void>;

  /** Ouvrir directement un écran par son adresse, comme si l'utilisateur tapait l'URL. */
  accederDirectement(ecran: Ecran): Promise<void>;

  /** T2.1 Revenir au catalogue depuis n'importe quel écran (menu « All Items »). */
  retournerAuCatalogue(): Promise<void>;

  /** T2.2 Trier le catalogue. */
  trierCatalogue(ordre: OrdreTri): Promise<void>;

  /** T2.3 Ouvrir la fiche d'un produit depuis le catalogue. */
  consulterFicheProduit(produit: NomProduit): Promise<void>;

  /** T3.1 Ajouter un produit au panier, depuis le catalogue ou sa fiche (écran courant). */
  ajouterAuPanier(produit: NomProduit): Promise<void>;

  /** T3.2 Retirer un produit du panier, depuis le catalogue, sa fiche ou le panier (écran courant). */
  retirerDuPanier(produit: NomProduit): Promise<void>;

  /** T3.3 Ouvrir le panier. */
  ouvrirPanier(): Promise<void>;

  /** T4 Démarrer la commande depuis le panier (« Checkout »). */
  commencerCommande(): Promise<void>;

  /** T4.1 Saisir ses informations puis valider. Les champs absents restent vides. */
  saisirInformations(infos: Partial<InfosClient>): Promise<void>;

  /** T4.3 Confirmer la commande depuis le récapitulatif (« Finish »). */
  confirmerCommande(): Promise<void>;

  /** T4.4 Annuler la commande en cours (« Cancel »). */
  annulerCommande(): Promise<void>;

  /** T5 Réinitialiser l'état de l'application depuis le menu (vide le panier). */
  reinitialiserApplication(): Promise<void>;

  // ───────────── Perceptions ─────────────

  /** L'utilisateur se trouve sur cet écran. */
  verifierEcran(ecran: Ecran): Promise<void>;

  /** Un message d'erreur est affiché et contient ce texte. */
  verifierMessageErreur(message: string | RegExp): Promise<void>;

  /** Aucun message d'erreur n'est affiché. */
  verifierAucuneErreur(): Promise<void>;

  /** La pastille du panier indique `n` produits (0 = pastille absente). */
  verifierPastillePanier(n: number): Promise<void>;

  /** Le panier contient exactement ces produits, sans tenir compte de l'ordre. */
  verifierContenuPanier(produits: readonly NomProduit[]): Promise<void>;

  /** Le bouton du produit propose de l'ajouter (« Add to cart ») ou de le retirer (« Remove »). */
  verifierBoutonProduit(produit: NomProduit, propose: 'ajouter' | 'retirer'): Promise<void>;

  /** T4.3 La commande est confirmée (« Thank you for your order! »). */
  verifierCommandeConfirmee(): Promise<void>;

  /** T2.1 Les produits du catalogue, dans l'ordre d'affichage. */
  lireCatalogue(): Promise<ProduitAffiche[]>;

  /** T2.3 Le produit affiché sur la fiche produit. */
  lireFicheProduit(): Promise<ProduitAffiche>;

  /** T4.2 Le récapitulatif de la commande (produits, sous-total, taxe, total). */
  lireRecapitulatif(): Promise<Recapitulatif>;
}

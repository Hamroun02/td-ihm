import { expect, type Locator, type Page } from '@playwright/test';
import { MOT_DE_PASSE, type Ecran, type InfosClient, type NomProduit, type OrdreTri, type ProduitAffiche, type Recapitulatif } from './concepts';
import type { SauceDemo } from './SauceDemo';

/**
 * Interpréteur du DSL avec Playwright.
 *
 * C'est le seul fichier du projet qui connaît les sélecteurs et l'API Playwright.
 *
 * Règles d'implémentation :
 *  - Les écrans (niveau interface abstraite) sont décrits une seule fois dans la table ECRANS :
 *    leur adresse et un élément qui les caractérise.
 *  - Les éléments sont retrouvés par leur attribut data-test (page.getByTestId), stable et indépendant du style.
 *  - Un produit est retrouvé par son NOM affiché, jamais par sa position ni par un identifiant technique.
 *  - Actions : on agit puis on rend la main, sans vérifier le résultat (c'est le rôle des perceptions).
 *    Les actions Playwright attendent d'elles-mêmes que l'élément soit visible, stable et cliquable.
 *  - Perceptions verifier… : assertions Playwright qui réessaient jusqu'au délai `expect.timeout` (10 s).
 *  - Perceptions lire… : attendent que l'écran concerné soit affiché, puis lisent ce qu'il montre.
 */

/**
 * Écrans de SauceDemo : adresse et élément caractéristique (repère, attribut data-test).
 * Le repère doit être UNIQUE et n'exister que sur cet écran : SauceDemo change l'adresse
 * un instant avant d'afficher le nouvel écran, et le repère confirme que l'écran est bien affiché.
 */
const ECRANS: Record<Ecran, { chemin: string; repere: string }> = {
  connexion: { chemin: '/', repere: 'login-button' },
  catalogue: { chemin: '/inventory.html', repere: 'inventory-list' },
  'fiche-produit': { chemin: '/inventory-item.html', repere: 'back-to-products' },
  panier: { chemin: '/cart.html', repere: 'cart-contents-container' },
  'informations-client': { chemin: '/checkout-step-one.html', repere: 'checkout-info-container' },
  recapitulatif: { chemin: '/checkout-step-two.html', repere: 'checkout-summary-container' },
  confirmation: { chemin: '/checkout-complete.html', repere: 'checkout-complete-container' },
};

/** Valeurs de la liste déroulante de tri pour chaque ordre du DSL. */
const VALEURS_TRI: Record<OrdreTri, string> = {
  'nom-croissant': 'az',
  'nom-decroissant': 'za',
  'prix-croissant': 'lohi',
  'prix-decroissant': 'hilo',
};

/** Libellés des boutons d'un produit. */
const LIBELLES_BOUTON = { ajouter: 'Add to cart', retirer: 'Remove' } as const;

export class SauceDemoPlaywright implements SauceDemo {
  constructor(private readonly page: Page) {}

  // ───────────── Actions ─────────────

  async seConnecter(identifiant: string, motDePasse: string = MOT_DE_PASSE): Promise<void> {
    // On n'ouvre la page de connexion que si elle n'est pas déjà affichée :
    // le temps mesuré par S37 ne comprend ainsi que la connexion elle-même.
    if (!(await this.page.getByTestId('login-button').isVisible())) {
      await this.page.goto(ECRANS.connexion.chemin);
    }
    await this.page.getByTestId('username').fill(identifiant);
    await this.page.getByTestId('password').fill(motDePasse);
    await this.page.getByTestId('login-button').click();
  }

  async seDeconnecter(): Promise<void> {
    await this.choisirDansMenu('logout-sidebar-link');
  }

  async accederDirectement(ecran: Ecran): Promise<void> {
    await this.page.goto(ECRANS[ecran].chemin);
  }

  async retournerAuCatalogue(): Promise<void> {
    await this.choisirDansMenu('inventory-sidebar-link');
  }

  async trierCatalogue(ordre: OrdreTri): Promise<void> {
    // Une éventuelle alerte (error_user) est fermée automatiquement par Playwright.
    await this.page.getByTestId('product-sort-container').selectOption(VALEURS_TRI[ordre]);
  }

  async consulterFicheProduit(produit: NomProduit): Promise<void> {
    await this.produit(produit).getByTestId('inventory-item-name').click();
  }

  async ajouterAuPanier(produit: NomProduit): Promise<void> {
    // Fonctionne sur le catalogue comme sur la fiche du produit.
    await this.produit(produit).getByTestId(/^add-to-cart/).click();
  }

  async retirerDuPanier(produit: NomProduit): Promise<void> {
    // Fonctionne sur le catalogue, sur la fiche du produit et dans le panier.
    await this.produit(produit).getByTestId(/^remove/).click();
  }

  async ouvrirPanier(): Promise<void> {
    await this.page.getByTestId('shopping-cart-link').click();
  }

  async commencerCommande(): Promise<void> {
    await this.page.getByTestId('checkout').click();
  }

  async saisirInformations(infos: Partial<InfosClient>): Promise<void> {
    if (infos.prenom !== undefined) await this.page.getByTestId('firstName').fill(infos.prenom);
    if (infos.nom !== undefined) await this.page.getByTestId('lastName').fill(infos.nom);
    if (infos.codePostal !== undefined) await this.page.getByTestId('postalCode').fill(infos.codePostal);
    await this.page.getByTestId('continue').click();
  }

  async confirmerCommande(): Promise<void> {
    await this.page.getByTestId('finish').click();
  }

  async annulerCommande(): Promise<void> {
    await this.page.getByTestId('cancel').click();
  }

  async reinitialiserApplication(): Promise<void> {
    await this.choisirDansMenu('reset-sidebar-link');
  }

  // ───────────── Perceptions ─────────────

  async verifierEcran(ecran: Ecran): Promise<void> {
    const { chemin, repere } = ECRANS[ecran];
    await expect(this.page, `l'écran affiché devrait être « ${ecran} »`).toHaveURL(adresse(chemin));
    await expect(this.page.getByTestId(repere)).toBeVisible();
  }

  async verifierMessageErreur(message: string | RegExp): Promise<void> {
    await expect(this.page.getByTestId('error')).toContainText(message);
  }

  async verifierAucuneErreur(): Promise<void> {
    await expect(this.page.getByTestId('error')).toHaveCount(0);
  }

  async verifierPastillePanier(n: number): Promise<void> {
    // On s'assure d'abord que l'en-tête est affiché, sinon « pas de pastille » ne voudrait rien dire.
    await expect(this.page.getByTestId('shopping-cart-link')).toBeVisible();
    const pastille = this.page.getByTestId('shopping-cart-badge');
    if (n === 0) {
      await expect(pastille, 'la pastille du panier devrait être absente').toHaveCount(0);
    } else {
      await expect(pastille).toHaveText(String(n));
    }
  }

  async verifierContenuPanier(produits: readonly NomProduit[]): Promise<void> {
    await expect(this.page.getByTestId(ECRANS.panier.repere)).toBeVisible();
    const noms = this.page.getByTestId('cart-list').getByTestId('inventory-item-name');
    await expect
      .poll(async () => (await noms.allTextContents()).map((t) => t.trim()).sort(), { message: 'contenu du panier' })
      .toEqual([...produits].sort());
  }

  async verifierBoutonProduit(produit: NomProduit, propose: 'ajouter' | 'retirer'): Promise<void> {
    // Pas getByRole('button') : l'image et le nom du produit sont des liens qui ont eux aussi le rôle « button ».
    const bouton = this.produit(produit).getByTestId(/^(add-to-cart|remove)/);
    await expect(bouton).toHaveText(LIBELLES_BOUTON[propose]);
  }

  async verifierCommandeConfirmee(): Promise<void> {
    await expect(this.page.getByTestId('complete-header')).toHaveText('Thank you for your order!');
  }

  async lireCatalogue(): Promise<ProduitAffiche[]> {
    const liste = this.page.getByTestId(ECRANS.catalogue.repere);
    await expect(liste).toBeVisible();
    return this.lireProduits(liste);
  }

  async lireFicheProduit(): Promise<ProduitAffiche> {
    await this.verifierEcran('fiche-produit');
    // Sur la fiche, il n'y a qu'un seul bloc produit.
    const [produit] = await this.lireProduits(this.page.getByTestId('inventory-item'));
    return produit;
  }

  async lireRecapitulatif(): Promise<Recapitulatif> {
    await expect(this.page.getByTestId(ECRANS.recapitulatif.repere)).toBeVisible();
    return {
      produits: await this.lireProduits(this.page.getByTestId('cart-list')),
      sousTotal: montant(await this.page.getByTestId('subtotal-label').textContent()),
      taxe: montant(await this.page.getByTestId('tax-label').textContent()),
      total: montant(await this.page.getByTestId('total-label').textContent()),
    };
  }

  // ───────────── Outils internes ─────────────

  /** Le bloc d'un produit (catalogue, fiche ou panier), retrouvé par son nom affiché. */
  private produit(nom: string): Locator {
    return this.page.getByTestId('inventory-item').filter({
      has: this.page.getByTestId('inventory-item-name').filter({ hasText: texteExact(nom) }),
    });
  }

  /** Lit les produits (nom et prix) affichés dans une zone de l'écran, dans l'ordre d'affichage. */
  private async lireProduits(zone: Locator): Promise<ProduitAffiche[]> {
    const noms = await zone.getByTestId('inventory-item-name').allTextContents();
    const prix = await zone.getByTestId('inventory-item-price').allTextContents();
    return noms.map((nom, i) => ({ nom: nom.trim(), prix: montant(prix[i] ?? null) }));
  }

  /** Ouvre le menu latéral, choisit une entrée, puis referme le menu s'il est resté ouvert. */
  private async choisirDansMenu(entree: string): Promise<void> {
    // L'attribut data-test="open-menu" est posé sur l'IMAGE du bouton, recouverte par le vrai bouton :
    // on clique donc le bouton par son rôle et son nom accessible, comme l'utilisateur.
    await this.page.getByRole('button', { name: 'Open Menu' }).click();
    await this.page.getByTestId(entree).click();
    // « Reset App State » laisse le menu ouvert par-dessus l'écran. Échap le referme,
    // comme le ferait un utilisateur au clavier ; c'est sans effet si le menu est déjà fermé.
    await this.page.keyboard.press('Escape');
  }
}

/** Expression régulière d'une adresse de SauceDemo (paramètres et ancre éventuels acceptés). */
function adresse(chemin: string): RegExp {
  return new RegExp(`^https?://[^/]+${echapper(chemin)}(?:[?#].*)?$`);
}

/** Expression régulière qui reconnaît exactement ce texte (espaces autour acceptés). */
function texteExact(texte: string): RegExp {
  return new RegExp(`^\\s*${echapper(texte)}\\s*$`);
}

function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convertit un texte affiché (« $29.99 », « Item total: $37.98 ») en nombre. */
function montant(texte: string | null): number {
  const trouve = /\$\s*(\d+(?:\.\d+)?)/.exec(texte ?? '');
  if (!trouve) throw new Error(`Montant illisible à l'écran : « ${texte} »`);
  return Number(trouve[1]);
}

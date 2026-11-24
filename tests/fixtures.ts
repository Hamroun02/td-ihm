import { test as base } from '@playwright/test';
import type { SauceDemo } from '../dsl/SauceDemo';
import { SauceDemoPlaywright } from '../dsl/SauceDemoPlaywright';

/**
 * Chaque test reçoit `app` : le DSL branché sur l'interpréteur Playwright.
 * Les tests n'utilisent jamais `page` directement.
 */
export const test = base.extend<{ app: SauceDemo }>({
  app: async ({ page }, use) => {
    await use(new SauceDemoPlaywright(page));
  },
});

export { expect } from '@playwright/test';

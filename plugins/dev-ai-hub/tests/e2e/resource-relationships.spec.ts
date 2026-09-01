/**
 * Relationship visualization (#90): a marketplace lists its plugins, a plugin
 * lists its members and its marketplaces, and every row navigates. The seed
 * catalog already wires this — `nos-plugin-marketplace` → `secure-dev-bundle`
 * → four members — so the flows run against real containment.
 *
 * Two things are worth guarding beyond "it renders":
 *   - navigation swaps the drawer to the clicked resource (the detail panel is
 *     the whole traversal surface, ADR-0015), and
 *   - the count chips are a claim about *visible* membership, so they are
 *     asserted by their exact text, not merely present.
 */
import { test, expect } from './fixtures/base';
import { MARKETPLACE, exampleByName } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';
const PLUGIN = exampleByName('secure-dev-bundle');
const SKILL = exampleByName('approved-github-workflows');

test.describe('Resource relationships — cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(MARKETPLACE.title!)).toBeVisible();
  });

  test('a marketplace card shows its plugin count', async ({ page }) => {
    await expect(page.getByText('1 plugin', { exact: true })).toBeVisible();
  });

  test('a plugin card shows its member count', async ({ page }) => {
    await expect(page.getByText('4 items', { exact: true })).toBeVisible();
  });
});

test.describe('Resource relationships — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(MARKETPLACE.title!)).toBeVisible();
  });

  test('a marketplace lists its plugins and navigates to one', async ({
    page,
  }, testInfo) => {
    await page
      .getByRole('button', { name: `View ${MARKETPLACE.title}` })
      .click();
    const panel = page.getByRole('dialog', { name: MARKETPLACE.title });
    await expect(panel.getByText('Plugins in this marketplace')).toBeVisible();

    const row = panel.getByRole('button', { name: new RegExp(PLUGIN.title!) });
    await expect(row).toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '06-relationships');

    await row.click();
    // The drawer swaps to the plugin — URL and header both follow.
    await expect(page).toHaveURL(/resource=.*secure-dev-bundle/);
    await expect(
      page.getByRole('dialog', { name: PLUGIN.title }),
    ).toBeVisible();
  });

  test('a plugin shows both its marketplaces ("Part of") and members ("Includes")', async ({
    page,
  }) => {
    await page.getByRole('button', { name: `View ${PLUGIN.title}` }).click();
    const panel = page.getByRole('dialog', { name: PLUGIN.title });

    await expect(panel.getByText('Part of')).toBeVisible();
    await expect(panel.getByText('Includes')).toBeVisible();
    await expect(
      panel.getByRole('button', { name: new RegExp(MARKETPLACE.title!) }),
    ).toBeVisible();
    await expect(
      panel.getByRole('button', { name: new RegExp(SKILL.title!) }),
    ).toBeVisible();
  });

  test('a member links back to its plugin under "Part of"', async ({
    page,
  }) => {
    await page.getByRole('button', { name: `View ${SKILL.title}` }).click();
    const panel = page.getByRole('dialog', { name: SKILL.title });

    await expect(panel.getByText('Part of')).toBeVisible();
    const back = panel.getByRole('button', { name: new RegExp(PLUGIN.title!) });
    await expect(back).toBeVisible();

    await back.click();
    await expect(page).toHaveURL(/resource=.*secure-dev-bundle/);
    await expect(
      page.getByRole('dialog', { name: PLUGIN.title }),
    ).toBeVisible();
  });

  test('a resource with no relationships shows no relationship sections', async ({
    page,
  }) => {
    const loner = exampleByName('azure-devops-cli');
    await page.getByRole('button', { name: `View ${loner.title}` }).click();
    const panel = page.getByRole('dialog', { name: loner.title });

    await expect(panel.getByText('Part of')).toBeHidden();
    await expect(panel.getByText('Includes')).toBeHidden();
    await expect(panel.getByText('Plugins in this marketplace')).toBeHidden();
  });
});

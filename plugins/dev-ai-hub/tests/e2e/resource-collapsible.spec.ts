/**
 * The collapsible "Content" toggle (#90) behaves differently by surface: the
 * detail ("more information") panel shows the manifest expanded, while the
 * install dialog keeps it collapsed so the install commands lead. Both use the
 * same button-styled disclosure, so this pins the per-surface default and that
 * the toggle actually flips.
 */
import { test, expect } from './fixtures/base';
import { MARKETPLACE, exampleByName } from './fixtures/mock-api';

const PAGE_URL = '/dev-ai-hub';
// Uniquely selects the Content disclosure (the install dialog also carries a
// separate "For teams…" <details>).
const CONTENT = 'details:has(summary:has-text("Content"))';
const PLUGIN = exampleByName('secure-dev-bundle');

test.describe('Collapsible content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(MARKETPLACE.title!)).toBeVisible();
  });

  test('the detail panel shows the manifest expanded by default and can collapse it', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: `View ${MARKETPLACE.title}` })
      .click();
    const panel = page.getByRole('dialog', { name: MARKETPLACE.title });
    const content = panel.locator(CONTENT);

    await expect(content).toHaveJSProperty('open', true);
    await expect(panel.getByText('Hide')).toBeVisible();
    // Not just the `open` property: the manifest body must be actually
    // visible on screen, not merely present with `open` true.
    await expect(content.getByText('"$schema"')).toBeVisible();

    await content.locator('summary').click();
    await expect(content).toHaveJSProperty('open', false);
    await expect(panel.getByText('Show')).toBeVisible();
    // A closed <details> keeps its content in the DOM — "collapsed" is a
    // visibility claim, not an existence one (regression: an author-level
    // `display: flex` on the body can silently override the UA stylesheet's
    // `display: none` for a closed disclosure).
    await expect(content.getByText('"$schema"')).toBeHidden();
  });

  test('the install dialog keeps the manifest collapsed by default and can expand it', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: `View ${MARKETPLACE.title}` })
      .click();
    await page
      .getByRole('dialog', { name: MARKETPLACE.title, exact: true })
      .getByRole('button', { name: 'Install' })
      .click();
    const dialog = page.getByRole('dialog', {
      name: `Install ${MARKETPLACE.title}`,
    });
    const content = dialog.locator(CONTENT);

    await expect(content).toHaveJSProperty('open', false);
    await expect(dialog.getByText('Show')).toBeVisible();
    await expect(content.getByText('"$schema"')).toBeHidden();

    await content.locator('summary').click();
    await expect(content).toHaveJSProperty('open', true);
    await expect(dialog.getByText('Hide')).toBeVisible();
    await expect(content.getByText('"$schema"')).toBeVisible();
  });

  test('collapsing one resource does not carry over to the next after navigating via a relationship', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: `View ${MARKETPLACE.title}` })
      .click();
    const panel = page.getByRole('dialog', { name: MARKETPLACE.title });

    // Collapse the marketplace's manifest…
    await panel.locator(CONTENT).locator('summary').click();
    await expect(panel.locator(CONTENT)).toHaveJSProperty('open', false);

    // …then navigate to its plugin via the relationship row.
    await panel
      .getByRole('button', { name: new RegExp(PLUGIN.title!) })
      .click();
    const pluginPanel = page.getByRole('dialog', { name: PLUGIN.title });

    // The new resource must start expanded (the detail-panel default),
    // not inherit the previous resource's collapsed choice.
    await expect(pluginPanel.locator(CONTENT)).toHaveJSProperty('open', true);
    await expect(pluginPanel.getByText('Hide')).toBeVisible();
  });
});

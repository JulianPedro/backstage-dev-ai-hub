/**
 * The two empty states, which are different screens saying different things:
 *
 *   - nothing registered at all  → "Register AiResource entities…" (a setup
 *     instruction; the user has nothing to do here yet)
 *   - everything filtered out    → "No resources match…" (a nudge to widen
 *     the filters; the catalog is fine)
 *
 * The filtered-out case is covered in `resource-browse.spec.ts`; this file
 * covers the empty catalog, and pins that the two do not collapse into one
 * message — telling someone to go register entities when they have simply
 * mistyped a search would be actively misleading.
 */
import { test, expect } from './fixtures/base';
import { PRIMARY } from './fixtures/mock-api';

const PAGE_URL = '/dev-ai-hub';

const TILES = [
  'Skills',
  'Agents',
  'Hooks',
  'MCP Configs',
  'Plugins',
  'Marketplaces',
];

test.describe('Empty catalog — no resources registered', () => {
  test.use({ resources: { items: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText('No AI resources found')).toBeVisible();
  });

  test('points the user at registering entities, not at their filters', async ({
    page,
  }) => {
    await expect(
      page.getByText(
        'Register AiResource entities in the catalog to see them here.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText('No resources match the current filters.'),
    ).toHaveCount(0);
  });

  test('is an empty state, not an error state', async ({ page }) => {
    await expect(page.getByText('Could not load resources')).toHaveCount(0);
  });

  test('every stat tile reads zero and none is hidden', async ({ page }) => {
    for (const label of TILES) {
      const tile = page.getByRole('button', { name: `Filter by ${label}` });
      await expect(tile).toBeVisible();
      await expect(tile).toHaveText(/0/);
    }
  });

  test('no result count and no pagination are rendered', async ({ page }) => {
    // Anchored: an unanchored /resources? found/ also matches the empty
    // state's own "No AI resources found" heading.
    await expect(page.getByText(/^\d+ resources? found$/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /next/i })).toHaveCount(0);
  });
});

test.describe('Filtered-to-nothing — the catalog is populated', () => {
  test('offers the filter wording, not the registration instruction', async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(PRIMARY.title!)).toBeVisible();

    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('zzznoresultszzz');

    await expect(page.getByText('No AI resources found')).toBeVisible();
    await expect(
      page.getByText('No resources match the current filters.'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Register AiResource entities in the catalog to see them here.',
      ),
    ).toHaveCount(0);
  });
});

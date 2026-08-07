import { test, expect } from './fixtures/base';
import { EXAMPLE_RESOURCES, PRIMARY } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// Every seed resource declares claude-code and github-copilot, so those two
// can never produce a negative case. Cursor and Gemini are declared by all
// but the marketplace and the plugin — the framework filter is only worth
// asserting against a tool that actually excludes something.
const BUNDLE = 'Secure Development Plugin Bundle';

test.describe('AI Resources — filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(PRIMARY.title!)).toBeVisible();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  test('SearchField has the correct placeholder text', async ({ page }) => {
    await expect(
      page.getByRole('searchbox', { name: 'Search resources' }),
    ).toHaveAttribute('placeholder', 'Search by name, description or tags…');
  });

  test('searching by partial name filters the grid', async ({
    page,
  }, testInfo) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('bundle');
    await expect(page.getByText(BUNDLE)).toBeVisible();
    await expect(page.getByText('Grafana MCP Config')).not.toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '02-search-filter');
  });

  test('search is case-insensitive', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('BUNDLE');
    await expect(page.getByText(BUNDLE)).toBeVisible();
  });

  test('search by description matches partial words', async ({ page }) => {
    // "STRIDE-based" appears only in the threat modeller's description.
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('stri');
    await expect(
      page.getByText('Security Threat Modeller Agent'),
    ).toBeVisible();
    await expect(page.getByText(BUNDLE)).not.toBeVisible();
  });

  test('empty search restores all results', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search resources' });
    await search.fill('bundle');
    await expect(page.getByText(BUNDLE)).toBeVisible();

    await search.clear();
    for (const resource of EXAMPLE_RESOURCES) {
      await expect(
        page.getByRole('button', { name: `View ${resource.title}` }),
      ).toBeVisible();
    }
  });

  test('no-match search shows empty state', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('xyznotfound');
    await expect(page.getByText('No AI resources found')).toBeVisible();
  });

  test('stat tile filter composes with search', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by Agents' }).click();
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('stri');
    await expect(
      page.getByText('Security Threat Modeller Agent'),
    ).toBeVisible();

    // "bundle" matches a plugin, not an agent — the two filters intersect.
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('bundle');
    await expect(page.getByText('No AI resources found')).toBeVisible();
  });

  // ── AI Tool filter ────────────────────────────────────────────────────────

  test('AI tool filter dropdown is rendered with default "All Tools"', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: 'Filter by AI tool' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('All Tools');
  });

  test('"Cursor" option hides resources without that framework', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Cursor' }).click();

    await expect(page.getByText(PRIMARY.title!)).toBeVisible();
    await expect(page.getByText('Grafana MCP Config')).toBeVisible();
    // The plugin and the marketplace declare claude-code + copilot only.
    await expect(page.getByText(BUNDLE)).not.toBeVisible();
    await expect(page.getByText('NOS Plugin Marketplace')).not.toBeVisible();
  });

  test('"Claude Code" option keeps every seed resource', async ({ page }) => {
    // Not a no-op assertion by accident — every seed declares claude-code, so
    // this pins that a filter matching everything hides nothing.
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Claude Code' }).click();

    await expect(
      page.getByText(`${EXAMPLE_RESOURCES.length} resources found`),
    ).toBeVisible();
  });

  test('"All Tools" option clears the AI tool filter', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Cursor' }).click();
    await expect(page.getByText(BUNDLE)).not.toBeVisible();

    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'All Tools' }).click();
    await expect(page.getByText(BUNDLE)).toBeVisible();
  });

  // ── Tags ──────────────────────────────────────────────────────────────────

  test('tags filter dropdown trigger is rendered', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Filter by tags' }),
    ).toBeVisible();
  });

  test('opening tags dropdown shows available tags as checkboxes', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await expect(page.getByRole('checkbox', { name: 'linting' })).toBeVisible();
  });

  test('checking a tag filters by that tag', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'linting' }).check();
    await page.keyboard.press('Escape');

    await expect(page.getByText('Post-Edit Lint Hook')).toBeVisible();
    await expect(page.getByText(PRIMARY.title!)).not.toBeVisible();
  });

  test('unchecking a tag deselects it', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'linting' }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByText(PRIMARY.title!)).not.toBeVisible();

    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'linting' }).uncheck();
    await page.keyboard.press('Escape');
    await expect(page.getByText(PRIMARY.title!)).toBeVisible();
  });

  test('trigger label shows selected tag when active', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'linting' }).check();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Filter by tags' }),
    ).toContainText('#linting');
  });

  test('tags are ANDed, not ORed', async ({ page }) => {
    // "security" is on three seeds, "ci-cd" on two, and only
    // approved-github-workflows carries both.
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'security' }).check();
    await page.getByRole('checkbox', { name: 'ci-cd' }).check();
    await page.keyboard.press('Escape');

    await expect(page.getByText('1 resource found')).toBeVisible();
    await expect(
      page.getByText('Approved GitHub Workflows Skill'),
    ).toBeVisible();
  });

  test('tags search input filters the checkbox list', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByPlaceholder('Search tags…').fill('lint');
    await expect(page.getByRole('checkbox', { name: 'linting' })).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'grafana' }),
    ).not.toBeVisible();
  });
});

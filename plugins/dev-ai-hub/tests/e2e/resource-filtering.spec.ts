import { test, expect } from './fixtures/base';
import { MOCK_RESOURCES } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

test.describe('AI Resources — filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(MOCK_RESOURCES[0].title!)).toBeVisible();
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
      .fill('toolkit');
    await expect(page.getByText('Security Toolkit Plugin')).toBeVisible();
    await expect(page.getByText('Code Review Agent')).not.toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '02-search-filter');
  });

  test('search is case-insensitive', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('TOOLKIT');
    await expect(page.getByText('Security Toolkit Plugin')).toBeVisible();
  });

  test('search by description matches partial words', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('constructive');
    await expect(page.getByText('Code Review Agent')).toBeVisible();
  });

  test('empty search restores all results', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search resources' });
    await search.fill('toolkit');
    await expect(page.getByText('Security Toolkit Plugin')).toBeVisible();

    await search.clear();
    for (const resource of MOCK_RESOURCES) {
      await expect(page.getByText(resource.title!)).toBeVisible();
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
      .fill('constructive');
    await expect(page.getByText('Code Review Agent')).toBeVisible();

    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('toolkit');
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

  test('"Claude Code" option hides resources without that framework', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Claude Code' }).click();
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
    await expect(page.getByText('Code Review Agent')).toBeVisible();
    // Security Toolkit Plugin only supports GitHub Copilot
    await expect(page.getByText('Security Toolkit Plugin')).not.toBeVisible();
  });

  test('"Cursor" option shows only cursor-compatible resources', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Cursor' }).click();
    await expect(page.getByText('GitHub MCP Server')).toBeVisible();
    await expect(
      page.getByText('Git Commit', { exact: true }),
    ).not.toBeVisible();
  });

  test('"All Tools" option clears the AI tool filter', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Cursor' }).click();
    await expect(page.getByText('Security Toolkit Plugin')).not.toBeVisible();

    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'All Tools' }).click();
    await expect(page.getByText('Security Toolkit Plugin')).toBeVisible();
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
    await expect(page.getByRole('checkbox', { name: 'lint' })).toBeVisible();
  });

  test('checking a tag filters by that tag', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'lint' }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Pre-commit Lint Hook')).toBeVisible();
    await expect(
      page.getByText('Git Commit', { exact: true }),
    ).not.toBeVisible();
  });

  test('unchecking a tag deselects it', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'lint' }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Code Review Agent')).not.toBeVisible();

    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'lint' }).uncheck();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Code Review Agent')).toBeVisible();
  });

  test('trigger label shows selected tag when active', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'lint' }).check();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Filter by tags' }),
    ).toContainText('#lint');
  });

  test('tags search input filters the checkbox list', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByPlaceholder('Search tags…').fill('lint');
    await expect(page.getByRole('checkbox', { name: 'lint' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'git' })).not.toBeVisible();
  });
});

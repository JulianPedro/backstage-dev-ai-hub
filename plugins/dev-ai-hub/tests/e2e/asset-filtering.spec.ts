import { test, expect } from './fixtures/base';
import { DEV_ASSETS } from './fixtures/mock-api';

const PAGE_URL = '/dev-ai-hub';

test.describe('Asset Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(DEV_ASSETS[0].name)).toBeVisible();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  test('SearchField has the correct placeholder text', async ({ page }) => {
    await expect(
      page.getByRole('searchbox', { name: 'Search assets' }),
    ).toHaveAttribute('placeholder', 'Search assets by name, description or content…');
  });

  test('searching by partial name filters the grid', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search assets' }).fill('typescript');
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();
    await expect(page.getByText('Code Review Agent')).not.toBeVisible();
  });

  test('search is case-insensitive', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search assets' }).fill('GIT COMMIT');
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
  });

  test('search by description matches partial words', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search assets' }).fill('conventional git commit');
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
  });

  test('empty search restores all results', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search assets' });
    await search.fill('typescript');
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();

    await search.clear();
    for (const asset of DEV_ASSETS) {
      await expect(page.getByText(asset.name, { exact: true })).toBeVisible();
    }
  });

  test('no-match search shows empty state', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search assets' }).fill('xyznotfound');
    await expect(page.getByText('No assets found')).toBeVisible();
  });

  // ── Type filter ───────────────────────────────────────────────────────────

  test('type filter dropdown is rendered with default "All Types"', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Filter by type' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('All Types');
  });

  test('"Instructions" option filters to instruction assets only', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Instructions' }).click();
    // 2 instruction assets in the mock
    await expect(page.getByText('2 assets found')).toBeVisible();
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();
    await expect(page.getByText('Security Guidelines')).toBeVisible();
    await expect(page.getByText('Code Review Agent')).not.toBeVisible();
  });

  test('"Skills" option filters to skill assets only', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Skills' }).click();
    await expect(page.getByText('1 asset found')).toBeVisible();
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
  });

  test('"Workflows" option filters to workflow assets only', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Workflows' }).click();
    await expect(page.getByText('1 asset found')).toBeVisible();
    await expect(page.getByText('Feature Development Workflow')).toBeVisible();
  });

  test('"All Types" option clears the type filter', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'Skills' }).click();
    await expect(page.getByText('1 asset found')).toBeVisible();

    await page.getByRole('button', { name: 'Filter by type' }).click();
    await page.getByRole('option', { name: 'All Types' }).click();
    await expect(page.getByText(`${DEV_ASSETS.length} assets found`)).toBeVisible();
  });

  // ── AI Tool filter ────────────────────────────────────────────────────────

  test('AI tool filter dropdown is rendered with default "All Tools"', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Filter by AI tool' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('All Tools');
  });

  test('"Claude Code" option shows only claude-code-compatible assets', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Claude Code' }).click();
    // claude-code: mock-1, mock-2, mock-3 (all), mock-5
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();
    await expect(page.getByText('Code Review Agent')).toBeVisible();
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible(); // tools: ['all']
    await expect(page.getByText('Security Guidelines')).toBeVisible();
    await expect(page.getByText('Product Manager')).not.toBeVisible(); // github-copilot only
  });

  test('"Cursor" option shows only cursor-compatible assets', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by AI tool' }).click();
    await page.getByRole('option', { name: 'Cursor' }).click();
    // cursor: mock-4 (github-copilot, cursor), mock-3 (all)
    await expect(page.getByText('Feature Development Workflow')).toBeVisible();
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible(); // tools: ['all']
  });

  // ── Tags ──────────────────────────────────────────────────────────────────

  test('tags filter dropdown trigger is rendered', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Filter by tags' })).toBeVisible();
  });

  test('opening tags dropdown shows available tags as checkboxes', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    // 'typescript' tag is present in mock-1
    await expect(page.getByRole('checkbox', { name: 'typescript' })).toBeVisible();
  });

  test('checking a tag filters by that tag', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'git' }).check();
    await page.keyboard.press('Escape');
    // mock-3 has ['git', 'commits', 'conventional-commits']
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
    await expect(page.getByText('TypeScript Best Practices')).not.toBeVisible();
  });

  test('checking a second tag adds an AND condition', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'typescript' }).check();
    await page.getByRole('checkbox', { name: 'best-practices' }).check();
    await page.keyboard.press('Escape');
    // Only mock-1 has both 'typescript' AND 'best-practices'
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();
    await expect(page.getByText('Security Guidelines')).not.toBeVisible();
  });

  test('unchecking a tag deselects it', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'typescript' }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();
    await expect(page.getByText('Code Review Agent')).not.toBeVisible();

    // Re-open and uncheck
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'typescript' }).uncheck();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Code Review Agent')).toBeVisible();
  });

  test('trigger label shows selected count when tags are active', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('checkbox', { name: 'typescript' }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Filter by tags' })).toContainText('Tags (1 selected)');
  });

  test('tags search input filters the checkbox list', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByPlaceholder('Search tags…').fill('git');
    await expect(page.getByRole('checkbox', { name: 'git' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'typescript' })).not.toBeVisible();
  });
});

import { test, expect } from './fixtures/base';
import { DEV_ASSETS, DEV_STATS } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

test.describe('Dev AI Hub — main page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    // Wait for the asset grid to finish loading
    await expect(page.getByText(DEV_ASSETS[0].name)).toBeVisible();
  });

  test('renders the four stats cards', async ({ page }, testInfo) => {
    for (const label of ['Instructions', 'Agents', 'Skills', 'Workflows']) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
    await captureGalleryScreenshot(page, testInfo, '01-hub-overview');
  });

  test('stats cards display correct counts from mock data', async ({
    page,
  }) => {
    // The mock has 2 instructions, 2 agents, 1 skill, 1 workflow
    const byType = DEV_STATS.byType;
    await expect(
      page.getByText(String(byType.instruction)).first(),
    ).toBeVisible();
    await expect(page.getByText(String(byType.agent)).first()).toBeVisible();
    await expect(page.getByText(String(byType.skill)).first()).toBeVisible();
    await expect(page.getByText(String(byType.workflow)).first()).toBeVisible();
  });

  test('clicking a stats card filters assets by type', async ({ page }) => {
    // Stats cards are plain div[role="button"] (not ToggleButton); they come first in DOM order
    await page
      .getByRole('button', { name: /Skills/i })
      .first()
      .click();
    await expect(page.getByText('1 asset found')).toBeVisible();
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
  });

  test('clicking an active stats card removes the type filter', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /Skills/i })
      .first()
      .click();
    await expect(page.getByText('1 asset found')).toBeVisible();

    // Click it again to deselect
    await page
      .getByRole('button', { name: /Skills/i })
      .first()
      .click();
    await expect(
      page.getByText(`${DEV_STATS.total} assets found`),
    ).toBeVisible();
  });

  test('renders all mock assets', async ({ page }) => {
    for (const asset of DEV_ASSETS) {
      await expect(page.getByText(asset.name, { exact: true })).toBeVisible();
    }
  });

  test('cards display type labels', async ({ page }) => {
    await expect(page.getByText('Instruction').first()).toBeVisible();
    await expect(page.getByText('Agent').first()).toBeVisible();
    await expect(page.getByText('Skill').first()).toBeVisible();
    await expect(page.getByText('Workflow').first()).toBeVisible();
  });

  test('popular assets (≥5 installs) show 🔥 icon', async ({ page }) => {
    // TypeScript Best Practices (14), Code Review Agent (8), Git Commit (22), Feature Development Workflow (5) are popular
    const fireEmojis = page.getByText('🔥');
    await expect(fireEmojis.first()).toBeVisible();
  });

  test('assets with 0 installs do not show an install count', async ({
    page,
  }) => {
    // Product Manager has installCount: 0 — the count row is entirely omitted
    const card = page.locator('text=Product Manager').locator('..');
    await expect(card).not.toContainText('0');
  });

  test('"View details" button updates the URL with assetId', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'View details' }).first().click();
    await expect(page).toHaveURL(/assetId=/);
  });

  test('"Install in editor" button updates the URL with installId', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: 'Install in editor' })
      .first()
      .click();
    await expect(page).toHaveURL(/installId=/);
  });

  test('shows empty state when no assets match the search', async ({
    page,
  }) => {
    await page
      .getByRole('searchbox', { name: 'Search assets' })
      .fill('zzznoresultszzz');
    await expect(page.getByText('No assets found')).toBeVisible();
    await expect(
      page.getByText('Try adjusting your filters or search terms.'),
    ).toBeVisible();
  });

  test('pagination is hidden when all assets fit one page (PAGE_SIZE=24)', async ({
    page,
  }) => {
    // 6 mock assets vs PAGE_SIZE=24 — TablePagination is not rendered
    await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible();
  });
});

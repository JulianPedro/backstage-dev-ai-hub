import { test, expect } from './fixtures/base';
import { MOCK_RESOURCES } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

test.describe('AI Resources — browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(MOCK_RESOURCES[0].title!)).toBeVisible();
  });

  test('renders the six stat tiles', async ({ page }, testInfo) => {
    for (const label of [
      'Skills',
      'Agents',
      'Hooks',
      'MCP Configs',
      'Plugins',
      'Marketplaces',
    ]) {
      await expect(
        page.getByRole('button', { name: `Filter by ${label}` }),
      ).toBeVisible();
    }
    await captureGalleryScreenshot(page, testInfo, '01-hub-overview');
  });

  test('stat tiles display correct counts from mock data', async ({ page }) => {
    // One resource per type in the mock
    for (const label of [
      'Skills',
      'Agents',
      'Hooks',
      'MCP Configs',
      'Plugins',
      'Marketplaces',
    ]) {
      await expect(
        page.getByRole('button', { name: `Filter by ${label}` }),
      ).toHaveText(/1/);
    }
  });

  test('clicking a stat tile filters resources by type', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by Skills' }).click();
    await expect(page.getByText('1 resource found')).toBeVisible();
    await expect(page.getByText('Git Commit', { exact: true })).toBeVisible();
    await expect(page.getByText('Code Review Agent')).not.toBeVisible();
  });

  test('clicking an active stat tile removes the type filter', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by Skills' }).click();
    await expect(page.getByText('1 resource found')).toBeVisible();

    await page.getByRole('button', { name: 'Filter by Skills' }).click();
    await expect(
      page.getByText(`${MOCK_RESOURCES.length} resources found`),
    ).toBeVisible();
  });

  test('renders all mock resources', async ({ page }) => {
    for (const resource of MOCK_RESOURCES) {
      await expect(page.getByText(resource.title!)).toBeVisible();
    }
  });

  test('cards display type labels', async ({ page }) => {
    for (const label of [
      'Skill',
      'Agent',
      'Hook',
      'MCP Config',
      'Plugin',
      'Marketplace',
    ]) {
      await expect(
        page.getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }
  });

  test('popular resources (≥5 installs) show 🔥 icon', async ({ page }) => {
    // Git Commit (22 installs) and Code Review Agent (8 installs) are popular
    const fireEmojis = page.getByText('🔥');
    await expect(fireEmojis.first()).toBeVisible();
  });

  test('resources with 0 installs do not show an install count', async ({
    page,
  }) => {
    // Pre-commit Lint Hook has install: 0 — the install count is omitted
    const card = page.getByRole('button', {
      name: 'View Pre-commit Lint Hook',
    });
    await expect(card).not.toContainText('🔥');
    await expect(card).not.toContainText('↓');
  });

  test('clicking a card opens the detail drawer and updates the URL', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'View Git Commit' }).click();
    await expect(page).toHaveURL(/resource=/);
    await expect(
      page.getByRole('dialog', { name: 'Git Commit' }),
    ).toBeVisible();
  });

  test('shows empty state when no resources match the search', async ({
    page,
  }) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('zzznoresultszzz');
    await expect(page.getByText('No AI resources found')).toBeVisible();
    await expect(
      page.getByText('No resources match the current filters.'),
    ).toBeVisible();
  });

  test('pagination is hidden when all resources fit one page (PAGE_SIZE=24)', async ({
    page,
  }) => {
    // 6 mock resources vs PAGE_SIZE=24 — TablePagination is not rendered
    await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible();
  });
});

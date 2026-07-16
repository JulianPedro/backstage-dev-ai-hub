import { test, expect } from './fixtures/base';
import { DEV_ASSETS } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// First mock asset: TypeScript Best Practices (instruction, claude-code + github-copilot)
const ASSET = DEV_ASSETS[0];

test.describe('Asset Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(ASSET.name)).toBeVisible();
    await page.getByRole('button', { name: 'View details' }).first().click();
  });

  test('sets assetId query param in the URL', async ({ page }) => {
    await expect(page).toHaveURL(/assetId=/);
  });

  test('panel header shows the asset name', async ({ page }) => {
    // Scope to the drawer; use first() because the name also appears in the Preview tab <h1>
    const panel = page.locator('[role="presentation"] + div');
    await expect(panel.getByText(ASSET.name).first()).toBeVisible();
  });

  test('panel header shows the asset type tag', async ({ page }) => {
    const panel = page.locator('[role="presentation"] + div');
    await expect(panel.getByText(ASSET.type)).toBeVisible();
  });

  test('panel shows description', async ({ page }) => {
    const panel = page.locator('[role="presentation"] + div');
    await expect(
      panel.getByText(
        'Coding standards and best practices for TypeScript projects.',
      ),
    ).toBeVisible();
  });

  test('renders Preview, Metadata, and Raw YAML tabs', async ({ page }) => {
    for (const name of ['Preview', 'Metadata', 'Raw YAML']) {
      await expect(page.getByRole('tab', { name })).toBeVisible();
    }
  });

  test('Preview tab renders the markdown as HTML', async ({
    page,
  }, testInfo) => {
    // dev mock content starts with "# TypeScript Best Practices"
    await expect(
      page.getByRole('heading', { name: 'TypeScript Best Practices' }),
    ).toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '03-asset-detail');
  });

  test('Metadata tab shows author, version, branch', async ({ page }) => {
    const panel = page.locator('[role="presentation"] + div');
    await page.getByRole('tab', { name: 'Metadata' }).click();
    await expect(panel.getByText('Author:')).toBeVisible();
    await expect(panel.getByText('Platform Team')).toBeVisible();
    await expect(panel.getByText('Version:')).toBeVisible();
    await expect(panel.getByText('1.0.0')).toBeVisible();
    await expect(panel.getByText('Branch:')).toBeVisible();
    await expect(panel.getByText('main')).toBeVisible();
  });

  test('Metadata tab shows compatible tools as tags', async ({ page }) => {
    await page.getByRole('tab', { name: 'Metadata' }).click();
    await expect(page.getByText('Compatible tools')).toBeVisible();
    await expect(page.getByText('claude-code')).toBeVisible();
    await expect(page.getByText('github-copilot')).toBeVisible();
  });

  test('Raw YAML tab shows YAML source', async ({ page }) => {
    await page.getByRole('tab', { name: 'Raw YAML' }).click();
    await expect(
      page.getByText(/name: TypeScript Best Practices/),
    ).toBeVisible();
  });

  test('"Copy Markdown" button is visible in the actions footer', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'Copy Markdown' }),
    ).toBeVisible();
  });

  test('"Open in Repo" button is visible in the actions footer', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'Open in Repo' }),
    ).toBeVisible();
  });

  test('Close button (×) removes assetId from the URL', async ({ page }) => {
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page).not.toHaveURL(/assetId=/);
  });

  test('clicking the overlay removes assetId from the URL', async ({
    page,
  }) => {
    // Overlay has role="presentation"; click dispatches onClose
    await page
      .locator('[role="presentation"]')
      .click({ position: { x: 5, y: 5 } });
    await expect(page).not.toHaveURL(/assetId=/);
  });
});

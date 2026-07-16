import { test, expect } from './fixtures/base';
import { DEV_ASSETS } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// First mock asset: TypeScript Best Practices (claude-code + github-copilot)
const ASSET = DEV_ASSETS[0];

test.describe('Asset Install Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(ASSET.name)).toBeVisible();
    await page
      .getByRole('button', { name: 'Install in editor' })
      .first()
      .click();
  });

  test('sets installId query param in the URL', async ({ page }) => {
    await expect(page).toHaveURL(/installId=/);
  });

  test('dialog header shows "Install: <asset-name>"', async ({ page }) => {
    // AssetInstallDialog renders "Install: {asset.name}" in DialogHeader
    await expect(page.getByText(`Install: ${ASSET.name}`)).toBeVisible();
  });

  test('subtitle explains the workflow', async ({ page }) => {
    await expect(
      page.getByText(
        'Copy the content and place the file at the path shown for your tool.',
      ),
    ).toBeVisible();
  });

  test('shows a section for each compatible tool', async ({
    page,
  }, testInfo) => {
    // ASSET.tools = ['claude-code', 'github-copilot'] — scope to dialog to avoid filter button ambiguity
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('Claude Code', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('GitHub Copilot', { exact: true }),
    ).toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '04-install-dialog');
  });

  test('each tool section shows an "Install path" label', async ({ page }) => {
    const labels = page.getByText('Install path');
    await expect(labels.first()).toBeVisible();
  });

  test('"Copy Content" button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Copy Content' }).first(),
    ).toBeVisible();
  });

  test('"Download" button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Download' }).first(),
    ).toBeVisible();
  });

  test('"Copy Content" button label changes to "Copied!" after click', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Copy Content' }).first().click();
    await expect(
      page.getByRole('button', { name: 'Copied!' }).first(),
    ).toBeVisible();
  });

  test('"Close" button dismisses the dialog and clears installId', async ({
    page,
  }) => {
    // Dialog has an X icon button (aria-label="Close") and a footer "Close" text button — use last()
    await page.getByRole('button', { name: 'Close' }).last().click();
    await expect(page).not.toHaveURL(/installId=/);
  });

  // ── Skill asset (tools: all) — verify universal install paths appear ──────

  test('skill asset (tools: all) shows install path for Claude Code', async ({
    page,
  }) => {
    // Close this dialog and open Git Commit (skill, tools: ['all'])
    await page.getByRole('button', { name: 'Close' }).last().click();

    // Git Commit is the 3rd card (index 2) in the mock data order
    await page
      .getByRole('button', { name: 'Install in editor' })
      .nth(2)
      .click();

    await expect(page.getByText('Install: Git Commit')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText('Claude Code', { exact: true }),
    ).toBeVisible();
  });
});

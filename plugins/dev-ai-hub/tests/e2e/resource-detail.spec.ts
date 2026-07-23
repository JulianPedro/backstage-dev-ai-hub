import { test, expect } from './fixtures/base';
import { MOCK_RESOURCES } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// Git Commit: skill, claude-code + github-copilot, has a source location,
// tags, version, owner and non-zero telemetry — exercises every section.
const RESOURCE = MOCK_RESOURCES[0];

test.describe('Resource detail panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(RESOURCE.title!)).toBeVisible();
    await page.getByRole('button', { name: `View ${RESOURCE.title}` }).click();
  });

  test('sets the resource query param in the URL', async ({ page }) => {
    await expect(page).toHaveURL(/resource=/);
  });

  test('panel header shows the resource title and type', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(
      panel.getByRole('heading', { name: RESOURCE.title, exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText('Skill', { exact: true }).first(),
    ).toBeVisible();
  });

  test('panel shows the description', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByText(RESOURCE.description!)).toBeVisible();
  });

  test('panel shows view and install counts', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByText('40 views')).toBeVisible();
    await expect(panel.getByText('22 installs')).toBeVisible();
  });

  test('Copy, Download and Install actions are visible', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Download' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Install' })).toBeVisible();
  });

  test('"Copy" button label flips to "Copied!" after click', async ({
    page,
  }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await panel.getByRole('button', { name: 'Copy' }).click();
    await expect(panel.getByRole('button', { name: 'Copied!' })).toBeVisible();
  });

  test('Content section renders the markdown body', async ({
    page,
  }, testInfo) => {
    await expect(
      page.getByRole('heading', { name: 'Git Commit Skill' }),
    ).toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '03-resource-detail');
  });

  test('Works with section shows framework badges', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByText('Works with')).toBeVisible();
    await expect(panel.getByText('Claude Code')).toBeVisible();
    await expect(panel.getByText('GitHub Copilot')).toBeVisible();
  });

  test('Tags section shows the resource tags', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByText('#git')).toBeVisible();
    await expect(panel.getByText('#commits')).toBeVisible();
  });

  test('Metadata section shows type, owner, version and entity ref', async ({
    page,
  }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByText('Owner')).toBeVisible();
    await expect(panel.getByText('group:platform-team')).toBeVisible();
    await expect(panel.getByText('Version')).toBeVisible();
    await expect(panel.getByText('1.0.0')).toBeVisible();
    await expect(panel.getByText('Entity ref')).toBeVisible();
    await expect(panel.getByText(RESOURCE.entityRef)).toBeVisible();
  });

  test('"View source" link is visible', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await expect(panel.getByText('View source')).toBeVisible();
  });

  test('Close button removes the resource query param', async ({ page }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(page).not.toHaveURL(/resource=/);
  });

  test('clicking the overlay removes the resource query param', async ({
    page,
  }) => {
    await page
      .locator('[role="presentation"]')
      .click({ position: { x: 5, y: 5 } });
    await expect(page).not.toHaveURL(/resource=/);
  });
});

test.describe('Resource detail panel — non-actionable resource', () => {
  test('a resource with no source location shows no actions or content', async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText('Pre-commit Lint Hook')).toBeVisible();
    await page
      .getByRole('button', { name: 'View Pre-commit Lint Hook' })
      .click();

    const panel = page.getByRole('dialog', { name: 'Pre-commit Lint Hook' });
    await expect(
      panel.getByText('No content location published for this resource.'),
    ).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Install' })).toHaveCount(0);
    await expect(panel.getByText('View source')).toHaveCount(0);
  });
});

import { test, expect } from './fixtures/base';
import { MOCK_RESOURCES } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// Git Commit: skill, claude-code + github-copilot, has telemetry counts.
const RESOURCE = MOCK_RESOURCES[0];

function waitForTelemetry(
  page: import('@playwright/test').Page,
  action: string,
) {
  return page.waitForRequest(
    req =>
      req.method() === 'POST' &&
      req.url().includes('/api/dev-ai-hub/telemetry') &&
      req.postDataJSON()?.action === action,
  );
}

test.describe('Resource install dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(RESOURCE.title!)).toBeVisible();
    await page.getByRole('button', { name: `View ${RESOURCE.title}` }).click();
    await page
      .getByRole('dialog', { name: RESOURCE.title, exact: true })
      .getByRole('button', { name: 'Install' })
      .click();
  });

  test('opening the install dialog records an install telemetry event', async ({
    page,
  }) => {
    // beforeEach already clicked Install — assert the event fired as part of it
    // by re-opening from the detail drawer and waiting on the request.
    await page
      .getByRole('dialog', { name: `Install ${RESOURCE.title}` })
      .getByRole('button', { name: 'Close' })
      .click();
    const [request] = await Promise.all([
      waitForTelemetry(page, 'install'),
      page
        .getByRole('dialog', { name: RESOURCE.title, exact: true })
        .getByRole('button', { name: 'Install' })
        .click(),
    ]);
    expect(request.postDataJSON().ref).toBe(RESOURCE.entityRef);
  });

  test('dialog header shows "Install <resource title>"', async ({ page }) => {
    await expect(
      page.getByRole('dialog', { name: `Install ${RESOURCE.title}` }),
    ).toBeVisible();
  });

  test('shows the type-specific install hint', async ({ page }, testInfo) => {
    await expect(
      page.getByText(
        'Download the skill (multi-file skills arrive as one zip) and extract it into the path for your framework.',
      ),
    ).toBeVisible();
    await captureGalleryScreenshot(page, testInfo, '04-install-dialog');
  });

  test('shows an install path for each compatible framework', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${RESOURCE.title}`,
    });
    await expect(
      dialog.getByText('Claude Code', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('GitHub Copilot', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('.claude/skills/git-commit/').first(),
    ).toBeVisible();
  });

  test('"Copy content" button is present and flips to "Copied!"', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${RESOURCE.title}`,
    });
    const copyButton = dialog.getByRole('button', { name: 'Copy content' });
    await expect(copyButton).toBeVisible();

    const [request] = await Promise.all([
      waitForTelemetry(page, 'copy'),
      copyButton.click(),
    ]);
    expect(request.postDataJSON().ref).toBe(RESOURCE.entityRef);
    await expect(dialog.getByRole('button', { name: 'Copied!' })).toBeVisible();
  });

  test('"Download" button is present and records a download event', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${RESOURCE.title}`,
    });
    const downloadButton = dialog.getByRole('button', { name: 'Download' });
    await expect(downloadButton).toBeVisible();

    const [request] = await Promise.all([
      waitForTelemetry(page, 'download'),
      downloadButton.click(),
    ]);
    expect(request.postDataJSON().ref).toBe(RESOURCE.entityRef);
  });

  test('Close button dismisses the install dialog', async ({ page }) => {
    await page
      .getByRole('dialog', { name: `Install ${RESOURCE.title}` })
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(
      page.getByRole('dialog', { name: `Install ${RESOURCE.title}` }),
    ).not.toBeVisible();
    // The detail drawer stays open behind it
    await expect(
      page.getByRole('dialog', { name: RESOURCE.title, exact: true }),
    ).toBeVisible();
  });
});

test.describe('Resource install dialog — every card fires a view event', () => {
  test('a view telemetry event is recorded when the page loads', async ({
    page,
  }) => {
    const viewEvent = waitForTelemetry(page, 'view');
    await page.goto(PAGE_URL);
    const request = await viewEvent;
    expect(MOCK_RESOURCES.map(r => r.entityRef)).toContain(
      request.postDataJSON().ref,
    );
  });
});

import { mkdir } from 'node:fs/promises';
import { Page, TestInfo } from '@playwright/test';

// Relative to the Playwright cwd (the repo root, where `yarn test:e2e` runs).
const SCREENSHOT_DIR = 'e2e-screenshots';

/**
 * Capture a full-page gallery screenshot and attach it to the test report.
 *
 * No-ops when the SCREENSHOT_GALLERY env var is set to "false" (CI opt-out).
 * Screenshots are written to e2e-screenshots/<name>.png and uploaded by the
 * gallery job in .github/workflows/e2e.yml, which publishes them to a
 * per-PR branch and embeds them in the single sticky PR comment.
 *
 * Prefix names with an ordering key (e.g. `01-hub-overview`) so the gallery
 * lists them in a stable, meaningful order.
 */
export async function captureGalleryScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  if (process.env.SCREENSHOT_GALLERY === 'false') return;
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const file = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

import { test, expect } from './fixtures/base';
import {
  EXAMPLE_RESOURCES,
  NO_SOURCE_LOCATION_RESOURCE,
  PRIMARY,
  UNRESOLVABLE_BODY_RESOURCE,
} from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// azure-devops-cli: skill with a source location, owner, version, tags and
// four frameworks — every drawer section populated.
const RESOURCE = PRIMARY;

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
    // Level-pinned: the resolved body opens with its own <h1> carrying the
    // same title, so an unlevelled match races the body fetch.
    await expect(
      panel.getByRole('heading', {
        name: RESOURCE.title,
        exact: true,
        level: 2,
      }),
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
      page.getByRole('heading', { name: 'Azure DevOps CLI', level: 1 }),
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
    await expect(panel.getByText('#azure-devops')).toBeVisible();
    await expect(panel.getByText('#automation')).toBeVisible();
  });

  test('Metadata section shows type, owner, version and entity ref', async ({
    page,
  }) => {
    const panel = page.getByRole('dialog', { name: RESOURCE.title });
    // Exact matches: the rendered body is real documentation and mentions
    // "CLI Version:" in its own prose, which a substring match would collide
    // with. The metadata rows are <dt> labels, so exact is also the truer
    // assertion.
    await expect(panel.getByText('Owner', { exact: true })).toBeVisible();
    await expect(panel.getByText('group:ai-platform-team')).toBeVisible();
    await expect(panel.getByText('Version', { exact: true })).toBeVisible();
    await expect(panel.getByText(RESOURCE.version!)).toBeVisible();
    await expect(panel.getByText('Entity ref', { exact: true })).toBeVisible();
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

/**
 * Browsable but not actionable. Every seed entity in `examples/catalog`
 * publishes a source-location — as a valid example should — so this case is
 * opted in rather than drawn from the catalog.
 */
test.describe('Resource detail panel — non-actionable resource', () => {
  test.use({
    resources: { items: [...EXAMPLE_RESOURCES, NO_SOURCE_LOCATION_RESOURCE] },
  });

  test('a resource with no source location shows no actions or content', async ({
    page,
  }) => {
    const title = NO_SOURCE_LOCATION_RESOURCE.title!;
    await page.goto(PAGE_URL);
    await expect(page.getByText(title)).toBeVisible();
    await page.getByRole('button', { name: `View ${title}` }).click();

    const panel = page.getByRole('dialog', { name: title, exact: true });
    await expect(
      panel.getByText('No content location published for this resource.'),
    ).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Install' })).toHaveCount(0);
    await expect(panel.getByText('View source')).toHaveCount(0);
  });
});

/**
 * A resource that promises a body and cannot deliver one. Distinct from the
 * non-actionable case above: this resource *has* a source location, so the
 * drawer commits to fetching before it can know the fetch will fail. The
 * requirement is that it degrades — the rest of the drawer keeps working and
 * the user is told what happened, rather than the page falling over.
 */
test.describe('Resource detail panel — body resolution fails', () => {
  test.use({
    resources: { items: [...EXAMPLE_RESOURCES, UNRESOLVABLE_BODY_RESOURCE] },
  });

  const openBroken = async (page: import('@playwright/test').Page) => {
    await page.goto(PAGE_URL);
    await expect(
      page.getByText(UNRESOLVABLE_BODY_RESOURCE.title!),
    ).toBeVisible();
    await page
      .getByRole('button', { name: `View ${UNRESOLVABLE_BODY_RESOURCE.title}` })
      .click();
    return page.getByRole('dialog', {
      name: UNRESOLVABLE_BODY_RESOURCE.title,
      exact: true,
    });
  };

  test('a 404 from the resolver degrades to an explanatory message', async ({
    page,
  }) => {
    const panel = await openBroken(page);

    await expect(
      panel.getByText(
        'Content not available — it may have been removed, or you may not have access to it.',
      ),
    ).toBeVisible();
    // The wording for a resource that never published a location would be
    // wrong here — this one published one.
    await expect(
      panel.getByText('No content location published for this resource.'),
    ).toHaveCount(0);
  });

  test('a 404 leaves the rest of the drawer intact', async ({ page }) => {
    const panel = await openBroken(page);

    await expect(
      panel.getByText(UNRESOLVABLE_BODY_RESOURCE.entityRef),
    ).toBeVisible();
    await expect(panel.getByText('View source')).toBeVisible();
    await expect(page.getByText('Could not load resources')).toHaveCount(0);
  });

  test('an upstream failure offers a retry, and the retry re-requests', async ({
    page,
  }) => {
    // Registered inside the test so it takes precedence over the base
    // fixture's handler, which would otherwise 404 this ref.
    let attempts = 0;
    await page.route('**/api/dev-ai-hub/entity/**/raw*', async route => {
      attempts += 1;
      await route.fulfill({ status: 502, json: { error: 'upstream boom' } });
    });

    const panel = await openBroken(page);

    await expect(
      panel.getByText('Couldn’t fetch the content from its source.'),
    ).toBeVisible();

    const retry = panel.getByRole('button', { name: 'Retry' });
    await expect(retry).toBeVisible();

    const before = attempts;
    await retry.click();
    await expect.poll(() => attempts).toBeGreaterThan(before);
  });
});

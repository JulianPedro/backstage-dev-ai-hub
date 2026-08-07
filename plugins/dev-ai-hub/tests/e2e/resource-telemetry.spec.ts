/**
 * Telemetry as a user sees it (ADR-0007): not "a POST was sent", but "the
 * number on the card went up".
 *
 * `resource-installation.spec.ts` already asserts the *requests* — that the
 * right action fires on the right gesture, and that browsing fires none.
 * This file asserts the consequence, which needs `telemetry: 'stateful'`:
 * the mock tallies what it receives instead of serving frozen numbers.
 *
 * The counts a card shows are fetched once per mount (`useTelemetryCounts`
 * is keyed on entityRef), so the round trip has to go through a reload —
 * which is also how a real user would come back and see the number move.
 *
 * Out of scope on purpose: #53's rule that installs count distinct actors.
 * That is backend behaviour, and a mock taught to dedupe would only be
 * asserting its own arithmetic. It stays with #53's backend tests.
 */
import { test, expect, type Page } from './fixtures/base';
import { PRIMARY } from './fixtures/mock-api';

const PAGE_URL = '/dev-ai-hub';

// azure-devops-cli — seeded at 40 views / 22 installs, both unique across the
// catalog so a count is addressable by its rendered title alone.
const RESOURCE = PRIMARY;

/**
 * Resolve once the telemetry POST has been *answered*, not merely sent —
 * the route handler increments the tally before fulfilling, so waiting on
 * the response is what guarantees the reload below sees the new number.
 */
function telemetryRecorded(page: Page, action: string) {
  return page.waitForResponse(
    res =>
      res.request().method() === 'POST' &&
      res.url().includes('/api/dev-ai-hub/telemetry') &&
      res.request().postDataJSON()?.action === action,
  );
}

test.use({ telemetry: 'stateful' });

test.describe('Telemetry counts move as the user acts', () => {
  test('opening a resource increments the view count on its card', async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByTitle('40 views')).toBeVisible();

    const recorded = telemetryRecorded(page, 'view');
    await page.getByRole('button', { name: `View ${RESOURCE.title}` }).click();
    await expect(
      page.getByRole('dialog', { name: RESOURCE.title, exact: true }),
    ).toBeVisible();
    await recorded;

    // Close before reloading: `?resource=` still in the URL would reopen the
    // drawer and count a second view, racing the card's own fetch.
    await page
      .getByRole('dialog', { name: RESOURCE.title, exact: true })
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(page).not.toHaveURL(/resource=/);

    await page.reload();
    await expect(page.getByTitle('41 views')).toBeVisible();
    await expect(page.getByTitle('40 views')).toHaveCount(0);
  });

  test('using the launcher increments the install count on its card', async ({
    page,
  }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByTitle('22 installs')).toBeVisible();

    await page.getByRole('button', { name: `View ${RESOURCE.title}` }).click();
    const drawer = page.getByRole('dialog', {
      name: RESOURCE.title,
      exact: true,
    });

    const recorded = telemetryRecorded(page, 'install');
    await drawer.getByRole('button', { name: 'Install' }).click();
    await recorded;

    await page
      .getByRole('dialog', { name: `Install ${RESOURCE.title}` })
      .getByRole('button', { name: 'Close' })
      .click();
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(page).not.toHaveURL(/resource=/);

    await page.reload();
    await expect(page.getByTitle('23 installs')).toBeVisible();
    await expect(page.getByTitle('22 installs')).toHaveCount(0);
  });
});

/*
 * Deliberately not tested here: the count shown *inside* the drawer on a
 * second visit to the same resource.
 *
 * Reopening a resource re-runs two effects in the same render — one POSTs the
 * view, the other GETs the counts — and nothing orders them, so the drawer
 * legitimately shows either the pre- or post-increment number depending on
 * which request the network settles first. A test asserting one of them
 * would be a coin flip dressed up as coverage. The card assertions above go
 * through a reload, where the ordering is not in question.
 */

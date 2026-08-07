/**
 * The `?resource=` deep link — a documented entry path (ADR-0007's amendment
 * names it as a view trigger) that a user reaches from a pasted link rather
 * than by clicking a card, and which nothing exercised before.
 */
import { test, expect } from './fixtures/base';
import { PRIMARY } from './fixtures/mock-api';

// The browse route is where `?resource=` actually lives. `/dev-ai-hub`
// redirects here, and the redirect drops the query string — see the last
// test in this file, which pins that.
const BROWSE_URL = '/dev-ai-hub/browse';

const RESOURCE = PRIMARY;

const deepLink = (ref: string) =>
  `${BROWSE_URL}?resource=${encodeURIComponent(ref)}`;

test.describe('?resource= deep link', () => {
  test('a valid ref opens the drawer straight from the URL', async ({
    page,
  }) => {
    await page.goto(deepLink(RESOURCE.entityRef));

    const drawer = page.getByRole('dialog', {
      name: RESOURCE.title,
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(RESOURCE.entityRef)).toBeVisible();
  });

  test('arriving by deep link counts a view, exactly as clicking a card does', async ({
    page,
  }) => {
    const viewEvent = page.waitForRequest(
      req =>
        req.method() === 'POST' &&
        req.url().includes('/api/dev-ai-hub/telemetry') &&
        req.postDataJSON()?.action === 'view',
    );
    await page.goto(deepLink(RESOURCE.entityRef));
    const request = await viewEvent;

    expect(request.postDataJSON().ref).toBe(RESOURCE.entityRef);
  });

  test('closing a deep-linked drawer leaves the user on the grid', async ({
    page,
  }) => {
    await page.goto(deepLink(RESOURCE.entityRef));
    await page
      .getByRole('dialog', { name: RESOURCE.title, exact: true })
      .getByRole('button', { name: 'Close' })
      .click();

    await expect(page).not.toHaveURL(/resource=/);
    // The card, specifically: the drawer keeps its content mounted through
    // the exit animation, so a bare text match would also hit the closing
    // drawer's heading and its rendered body.
    await expect(
      page.getByRole('button', { name: `View ${RESOURCE.title}` }),
    ).toBeVisible();
  });

  /**
   * A ref the caller cannot get a resource for.
   *
   * The issue asks for "non-existent" and "not-visible-to-caller" as two
   * cases. In this suite they are one: `AiResourcesPage` resolves the drawer
   * by scanning the same `items` array the grid renders, so both arrive as
   * "ref absent from the list" and take an identical path. The distinction
   * is real only at the backend, which this frontend-only suite does not run
   * — writing it twice would be the same assertion under two names.
   *
   * What the app does today is *nothing*: no drawer, no message, no toast,
   * and the bogus param stays in the URL, so a stale link from Slack looks
   * like an ordinary page load. This test pins that silence rather than
   * endorsing it — the missing not-found affordance is its own slice, and
   * the same root cause blocks #68's "hidden but still deep-linkable".
   * When that lands, this expectation is the one to change.
   */
  test('an unresolvable ref renders no drawer and does not break the grid', async ({
    page,
  }) => {
    await page.goto(deepLink('airesource:default/does-not-exist'));

    await expect(page.getByText(RESOURCE.title!)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/resource=/);
    await expect(page.getByText('Could not load resources')).toHaveCount(0);
  });

  test('a malformed ref is inert rather than fatal', async ({ page }) => {
    await page.goto(`${BROWSE_URL}?resource=not-an-entity-ref`);

    await expect(page.getByText(RESOURCE.title!)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  /**
   * The plugin-root form of the link silently loses its parameter.
   *
   * `/dev-ai-hub` redirects to `/dev-ai-hub/browse` and the redirect does not
   * carry the query string, so `/dev-ai-hub?resource=…` lands on the grid
   * with no drawer and no indication anything was dropped — the same silent
   * nothing as an unresolvable ref, from a link that is perfectly valid.
   *
   * Only `/dev-ai-hub/browse?resource=…` works, which is what the app itself
   * produces when a card is clicked, so links copied from the address bar are
   * fine. The hazard is a hand-written or docs-authored link to the plugin
   * root. Pinned here so that if the redirect learns to preserve the query,
   * this test fails and gets promoted into a real assertion.
   */
  test('the plugin-root form drops the parameter on redirect', async ({
    page,
  }) => {
    await page.goto(
      `/dev-ai-hub?resource=${encodeURIComponent(RESOURCE.entityRef)}`,
    );

    await expect(page).toHaveURL(/\/dev-ai-hub\/browse$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

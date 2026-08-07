/**
 * Pre-seed Backstage's guest-auth localStorage keys so every page load
 * auto-signs in as Guest (legacy token path) without a running auth backend.
 *
 * Keys come from @backstage/core-components SignInPage/providers internals:
 *   PROVIDER_STORAGE_KEY  → '@backstage/core:SignInPage:provider'
 *   enableLegacyGuestToken (guestProvider.tsx)
 *
 * playwright.config.ts only starts the frontend dev server for e2e (no
 * backend), so guest sign-in can never mint a real token — page.goto()
 * below drives the interactive Guest sign-in picker directly and accepts
 * the "fall back to legacy guest token?" confirm(). This is independent of
 * the v2 routes' own auth requirement (ADR-0005): every API call is
 * intercepted via page.route() below before it would ever reach a real,
 * auth-checking backend.
 *
 * API calls to the backend are intercepted via page.route() and served with
 * the canonical mock data from mock-api.ts, keeping tests predictable and
 * independent of a running backend.
 */
import { test as base, expect, type Page } from '@playwright/test';
import type {
  ResourceSummary,
  TelemetryCounts,
} from '@nospt/plugin-dev-ai-hub-common';
import { EXAMPLE_RESOURCES, mockBodyFor, mockCountsFor } from './mock-api';

export interface HubFixtures {
  /**
   * What `GET /resources` serves. Defaults to the real seed entities from
   * `examples/catalog`, mapped by the real `toResourceSummary`. Override per
   * describe block for data the seeds cannot express:
   *
   *   test.use({ resources: { items: [] } });                 // empty catalog
   *   test.use({ resources: { items: manyResources(30) } });  // past PAGE_SIZE
   *
   * Wrapped in `{ items }` — mirroring the endpoint's own payload — rather
   * than being a bare array, and not by taste. Playwright rejects both of the
   * more obvious shapes:
   *
   *   - a bare array is checked against its `[value, options]` tuple
   *     heuristic, which asks whether element 1 carries a known option key.
   *     One of those keys is `title`, and every `ResourceSummary` has a
   *     `title` — so any list of two or more resources is silently unpacked
   *     as a tuple and the fixture collapses to its first element. The
   *     symptom is a page-level `(items ?? []).forEach is not a function`.
   *   - a factory function is treated as a fixture *implementation* and fails
   *     with `use() was not called in fixture "resources"`.
   *
   * A plain object is neither, so it survives both checks.
   */
  resources: { items: ResourceSummary[] };
  /**
   * `'static'` (default) serves frozen counts from `mock-api`, so a count
   * never moves however much the user clicks. `'stateful'` seeds a per-test
   * tally from the same numbers and lets `POST /telemetry` increment it, so
   * a count can be observed changing across a reload.
   *
   * Deliberately *not* modelled: #53's distinct-per-actor collapsing. That
   * lives in the backend, and a mock that simulated it would only be testing
   * itself. This seam proves the frontend fires the right action on the right
   * gesture and re-reads afterwards; the counting rule stays with #53's own
   * backend tests.
   */
  telemetry: 'static' | 'stateful';
}

export const test = base.extend<HubFixtures>({
  resources: [{ items: EXAMPLE_RESOURCES }, { option: true }],
  telemetry: ['static', { option: true }],

  page: async ({ page, resources, telemetry }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('@backstage/core:SignInPage:provider', 'guest');
      localStorage.setItem('enableLegacyGuestToken', 'true');
      // Mock clipboard so Copy buttons work without browser permissions
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async () => {} },
        configurable: true,
      });
    });

    // Accept the guest provider's "fall back to legacy guest token?"
    // confirm() dialog whenever the auth backend is unreachable.
    page.on('dialog', dialog => dialog.accept());

    const originalGoto = page.goto.bind(page);
    page.goto = (async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await originalGoto(url, options);
      const enterGuest = page.getByRole('button', { name: 'Enter' });
      await enterGuest
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => null);
      if (await enterGuest.isVisible()) {
        await enterGuest.click();
      }
      return response;
    }) as Page['goto'];

    // Per-test tally for `telemetry: 'stateful'`, seeded lazily from the same
    // frozen numbers the static mode serves, so a spec can assert both the
    // starting count and the incremented one.
    const tally = new Map<string, TelemetryCounts>();
    const countsFor = (ref: string): TelemetryCounts => {
      if (telemetry !== 'stateful') return mockCountsFor(ref);
      if (!tally.has(ref)) tally.set(ref, { ...mockCountsFor(ref) });
      return tally.get(ref)!;
    };

    await page.route('**/api/dev-ai-hub/**', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api\/dev-ai-hub/, '');
      const method = route.request().method();

      const rawMatch = /^\/entity\/([^/]+)\/raw$/.exec(path);

      if (method === 'GET' && path === '/resources') {
        await route.fulfill({ json: { items: resources.items } });
      } else if (method === 'GET' && rawMatch) {
        const ref = decodeURIComponent(rawMatch[1]);
        const body = mockBodyFor(ref);
        if (!body) {
          await route.fulfill({
            status: 404,
            json: { error: 'Resource content not found' },
          });
          return;
        }
        const headers: Record<string, string> = {};
        if (url.searchParams.get('download') === 'true') {
          const filename = `${ref.split('/').pop()}.md`;
          headers['content-disposition'] = `attachment; filename="${filename}"`;
        }
        await route.fulfill({
          body: body.content,
          contentType: body.contentType,
          headers,
        });
      } else if (method === 'POST' && path === '/telemetry') {
        if (telemetry === 'stateful') {
          const { ref, action } = route.request().postDataJSON() ?? {};
          const counts = countsFor(ref);
          if (action in counts) {
            counts[action as keyof TelemetryCounts] += 1;
          }
        }
        await route.fulfill({ status: 204, body: '' });
      } else if (method === 'GET' && path.startsWith('/telemetry/')) {
        const ref = decodeURIComponent(path.replace('/telemetry/', ''));
        await route.fulfill({ json: countsFor(ref) });
      } else {
        await route.continue();
      }
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };

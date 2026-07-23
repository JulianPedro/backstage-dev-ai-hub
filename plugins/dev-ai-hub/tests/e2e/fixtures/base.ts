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
import { MOCK_RESOURCES, mockBodyFor, mockCountsFor } from './mock-api';

export const test = base.extend<object>({
  page: async ({ page }, use) => {
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

    await page.route('**/api/dev-ai-hub/**', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api\/dev-ai-hub/, '');
      const method = route.request().method();

      const rawMatch = /^\/entity\/([^/]+)\/raw$/.exec(path);

      if (method === 'GET' && path === '/resources') {
        await route.fulfill({ json: { items: MOCK_RESOURCES } });
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
        await route.fulfill({ status: 204, body: '' });
      } else if (method === 'GET' && path.startsWith('/telemetry/')) {
        const ref = decodeURIComponent(path.replace('/telemetry/', ''));
        await route.fulfill({ json: mockCountsFor(ref) });
      } else {
        await route.continue();
      }
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };

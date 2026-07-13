/**
 * Pre-seed Backstage's guest-auth localStorage keys so every page load
 * auto-signs in as Guest (legacy token path) without a running auth backend.
 *
 * Keys come from @backstage/core-components SignInPage/providers internals:
 *   PROVIDER_STORAGE_KEY  → '@backstage/core:SignInPage:provider'
 *   enableLegacyGuestToken (guestProvider.tsx)
 *
 * The app's own dev bootstrap (dev/index.tsx) clears enableLegacyGuestToken
 * on every load (the v2 routes need a real minted token, ADR-0005), which
 * races with the localStorage seed above and can leave the guest loader
 * unable to auto-resolve when no backend is running (e2e's case). As a
 * fallback, page.goto() below drives the interactive Guest sign-in picker
 * directly and accepts the "fall back to legacy guest token?" confirm().
 *
 * API calls to the backend are intercepted via page.route() and served with
 * the canonical mock data from mock-api.ts, keeping tests predictable and
 * independent of a running backend.
 */
import { test as base, expect, type Page } from '@playwright/test';
import {
  MOCK_ASSETS_FULL,
  MOCK_PROVIDER,
  MOCK_STATS,
  buildListResponse,
} from './mock-api';

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
      await enterGuest.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
      if (await enterGuest.isVisible()) {
        await enterGuest.click();
      }
      return response;
    }) as Page['goto'];

    await page.route('**/api/dev-ai-hub/**', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api\/dev-ai-hub/, '');
      const method = route.request().method();

      if (method === 'GET' && path === '/assets') {
        await route.fulfill({ json: buildListResponse(url.searchParams) });
      } else if (method === 'GET' && /^\/assets\/[^/]+$/.test(path)) {
        const id = decodeURIComponent(path.split('/')[2]);
        const asset = MOCK_ASSETS_FULL.find(a => a.id === id);
        if (asset) await route.fulfill({ json: asset });
        else await route.fulfill({ status: 404, json: { error: 'Not found' } });
      } else if (method === 'GET' && path === '/stats') {
        await route.fulfill({ json: MOCK_STATS });
      } else if (method === 'GET' && path === '/providers') {
        await route.fulfill({ json: [MOCK_PROVIDER] });
      } else if (method === 'POST' && path.endsWith('/track-install')) {
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.continue();
      }
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };

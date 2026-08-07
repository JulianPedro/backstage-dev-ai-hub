/**
 * The PAGE_SIZE=24 boundary (`AiResourcesPage.tsx`). The canonical six-item
 * mock can never reach it, so this spec swaps in a bulk fixture.
 *
 * The interesting case is not "page 2 exists" but the interaction between
 * filtering and the current page: narrowing the result set while on page 2
 * must not leave the user staring at an empty grid.
 */
import { test, expect } from './fixtures/base';
import { manyResources } from './fixtures/mock-api';

const PAGE_URL = '/dev-ai-hub';
const PAGE_SIZE = 24;
const TOTAL = 30;

const cards = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^View Bulk Resource / });

test.use({ resources: { items: manyResources(TOTAL) } });

test.describe('Pagination at the page boundary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(`${TOTAL} resources found`)).toBeVisible();
  });

  test('the first page holds exactly PAGE_SIZE cards', async ({ page }) => {
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 24' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 25' }),
    ).toHaveCount(0);
  });

  test('the next page holds the remainder', async ({ page }) => {
    await page.getByRole('button', { name: /next/i }).click();

    await expect(cards(page)).toHaveCount(TOTAL - PAGE_SIZE);
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 25' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 01' }),
    ).toHaveCount(0);
  });

  test('the total stays whole across pages', async ({ page }) => {
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(`${TOTAL} resources found`)).toBeVisible();
  });

  test('going back returns the first page', async ({ page }) => {
    await page.getByRole('button', { name: /next/i }).click();
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 25' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /previous/i }).click();
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 01' }),
    ).toBeVisible();
  });

  test('filtering from page 2 returns to page 1 rather than an empty grid', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /next/i }).click();
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 25' }),
    ).toBeVisible();

    // "Bulk Resource 0" matches 01–09 — nine results, well inside one page.
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('Bulk Resource 0');

    await expect(page.getByText('9 resources found')).toBeVisible();
    await expect(cards(page)).toHaveCount(9);
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 01' }),
    ).toBeVisible();
  });

  test('pagination disappears once the filtered set fits one page', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();

    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('Bulk Resource 0');

    await expect(page.getByText('9 resources found')).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toHaveCount(0);
  });

  test('clearing the filter restores pagination from page 1', async ({
    page,
  }) => {
    const search = page.getByRole('searchbox', { name: 'Search resources' });
    await search.fill('Bulk Resource 0');
    await expect(page.getByText('9 resources found')).toBeVisible();

    await search.fill('');
    await expect(page.getByText(`${TOTAL} resources found`)).toBeVisible();
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
    await expect(
      page.getByRole('button', { name: 'View Bulk Resource 01' }),
    ).toBeVisible();
  });
});

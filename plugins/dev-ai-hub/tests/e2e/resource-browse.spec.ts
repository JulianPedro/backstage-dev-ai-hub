import { test, expect } from './fixtures/base';
import {
  EXAMPLE_RESOURCES,
  PRIMARY,
  UNINSTALLED,
  exampleCountByType,
} from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

/** Tile label → the `spec.type` it counts. */
const TILES: [string, string][] = [
  ['Skills', 'skill'],
  ['Agents', 'agent'],
  ['Hooks', 'hook'],
  ['MCP Configs', 'mcp-config'],
  ['Plugins', 'plugin'],
  ['Marketplaces', 'marketplace'],
];

test.describe('AI Resources — browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(PRIMARY.title!)).toBeVisible();
  });

  test('renders the six stat tiles', async ({ page }, testInfo) => {
    for (const [label] of TILES) {
      await expect(
        page.getByRole('button', { name: `Filter by ${label}` }),
      ).toBeVisible();
    }
    await captureGalleryScreenshot(page, testInfo, '01-hub-overview');
  });

  test('stat tiles display the seed catalog counts', async ({ page }) => {
    // Derived from the seeds rather than hardcoded: the catalog holds two
    // skills and two agents, so a tile stuck on "1" would be caught here.
    for (const [label, type] of TILES) {
      await expect(
        page.getByRole('button', { name: `Filter by ${label}` }),
      ).toContainText(String(exampleCountByType(type)));
    }
  });

  test('clicking a stat tile filters resources by type', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter by Plugins' }).click();

    await expect(page.getByText('1 resource found')).toBeVisible();
    await expect(
      page.getByText('Secure Development Plugin Bundle'),
    ).toBeVisible();
    await expect(page.getByText(PRIMARY.title!)).not.toBeVisible();
  });

  test('a type with more than one resource shows them all', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by Skills' }).click();

    await expect(page.getByText('2 resources found')).toBeVisible();
    await expect(page.getByText(PRIMARY.title!)).toBeVisible();
    await expect(
      page.getByText('Approved GitHub Workflows Skill'),
    ).toBeVisible();
  });

  test('clicking an active stat tile removes the type filter', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Filter by Plugins' }).click();
    await expect(page.getByText('1 resource found')).toBeVisible();

    await page.getByRole('button', { name: 'Filter by Plugins' }).click();
    await expect(
      page.getByText(`${EXAMPLE_RESOURCES.length} resources found`),
    ).toBeVisible();
  });

  test('renders every seed resource', async ({ page }) => {
    for (const resource of EXAMPLE_RESOURCES) {
      await expect(
        page.getByRole('button', { name: `View ${resource.title}` }),
      ).toBeVisible();
    }
  });

  test('cards display type labels', async ({ page }) => {
    for (const label of [
      'Skill',
      'Agent',
      'Hook',
      'MCP Config',
      'Plugin',
      'Marketplace',
    ]) {
      await expect(
        page.getByText(label, { exact: true }).first(),
      ).toBeVisible();
    }
  });

  test('popular resources (≥5 installs) show 🔥 icon', async ({ page }) => {
    // azure-devops-cli (22 installs) and api-architect (8) are over the line.
    await expect(page.getByText('🔥').first()).toBeVisible();
  });

  test('resources with 0 installs do not show an install count', async ({
    page,
  }) => {
    const card = page.getByRole('button', {
      name: `View ${UNINSTALLED.title}`,
    });
    await expect(card).not.toContainText('🔥');
    await expect(card).not.toContainText('↓');
  });

  test('clicking a card opens the detail drawer and updates the URL', async ({
    page,
  }) => {
    await page.getByRole('button', { name: `View ${PRIMARY.title}` }).click();
    await expect(page).toHaveURL(/resource=/);
    await expect(
      page.getByRole('dialog', { name: PRIMARY.title, exact: true }),
    ).toBeVisible();
  });

  test('shows empty state when no resources match the search', async ({
    page,
  }) => {
    await page
      .getByRole('searchbox', { name: 'Search resources' })
      .fill('zzznoresultszzz');
    await expect(page.getByText('No AI resources found')).toBeVisible();
    await expect(
      page.getByText('No resources match the current filters.'),
    ).toBeVisible();
  });

  test('pagination is hidden when all resources fit one page (PAGE_SIZE=24)', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible();
  });
});

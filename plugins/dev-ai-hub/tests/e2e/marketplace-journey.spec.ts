/**
 * The two-step marketplace journey (ADR-0010): register the catalog with the
 * AI tool, then install plugins from it. It ships today in
 * `ResourceInstallDialog` and had no e2e coverage at all.
 *
 * Two things here are worth guarding beyond "it renders":
 *
 *   - the deep links are a *claim about compatibility*. A launcher offered
 *     for a host the resource never declared tells the user something untrue,
 *     so the per-framework rows are asserted by name, not by count.
 *   - the journey replaces the body doc when the repo slug can be derived
 *     (the body repeats the same two steps almost verbatim). Rendering both
 *     is the regression this pins.
 */
import { test, expect } from './fixtures/base';
import { MARKETPLACE } from './fixtures/mock-api';
import { captureGalleryScreenshot } from './helpers';

const PAGE_URL = '/dev-ai-hub';

// The seed marketplace declares claude-code + github-copilot, and its
// source-location is a github.com URL, so the slug derives and the journey
// renders rather than falling back to the body doc.
const REPO_SLUG = 'nosportugal/backstage-plugin-dev-ai-hub';

test.describe('Marketplace install journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await expect(page.getByText(MARKETPLACE.title!)).toBeVisible();
    await page
      .getByRole('button', { name: `View ${MARKETPLACE.title}` })
      .click();
    await page
      .getByRole('dialog', { name: MARKETPLACE.title, exact: true })
      .getByRole('button', { name: 'Install' })
      .click();
    await expect(
      page.getByRole('dialog', { name: `Install ${MARKETPLACE.title}` }),
    ).toBeVisible();
  });

  test('renders both numbered steps in order', async ({ page }, testInfo) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${MARKETPLACE.title}`,
    });

    await expect(
      dialog.getByText('1. Add the marketplace to your AI tool'),
    ).toBeVisible();
    await expect(dialog.getByText('2. Install plugins from it')).toBeVisible();

    await captureGalleryScreenshot(page, testInfo, '05-marketplace-journey');
  });

  test('step one carries the add command for each declared framework', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${MARKETPLACE.title}`,
    });

    await expect(
      dialog.getByText(`/plugin marketplace add ${REPO_SLUG}`),
    ).toBeVisible();
    await expect(
      dialog.getByText(`copilot plugin marketplace add ${REPO_SLUG}`),
    ).toBeVisible();
  });

  test('step two templates the install command from the marketplace name', async ({
    page,
  }) => {
    await expect(
      page
        .getByRole('dialog', { name: `Install ${MARKETPLACE.title}` })
        .getByText(`/plugin install <plugin>@${MARKETPLACE.name}`),
    ).toBeVisible();
  });

  test('offers one launcher per host that can actually take the command', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${MARKETPLACE.title}`,
    });

    await expect(
      dialog.getByRole('link', { name: 'Add in Claude' }),
    ).toHaveAttribute(
      'href',
      `claude-cli://open?q=${encodeURIComponent(
        `/plugin marketplace add ${REPO_SLUG}`,
      )}`,
    );
    await expect(
      dialog.getByRole('link', { name: 'Add in VS Code', exact: true }),
    ).toHaveAttribute(
      'href',
      `vscode://chat-plugin/add-marketplace?ref=${encodeURIComponent(
        REPO_SLUG,
      )}`,
    );
    await expect(
      dialog.getByRole('link', { name: 'Add in VS Code Insiders' }),
    ).toHaveAttribute(
      'href',
      `vscode-insiders://chat-plugin/add-marketplace?ref=${encodeURIComponent(
        REPO_SLUG,
      )}`,
    );
  });

  test('the team-distribution snippet is collapsed until asked for', async ({
    page,
  }) => {
    const dialog = page.getByRole('dialog', {
      name: `Install ${MARKETPLACE.title}`,
    });
    const summary = dialog.getByText(
      'For teams: auto-install via project settings',
    );

    await expect(summary).toBeVisible();
    // A closed <details> keeps its content in the DOM — "collapsed" is a
    // visibility claim, not an existence one.
    await expect(dialog.getByText('extraKnownMarketplaces')).toBeHidden();

    await summary.click();
    await expect(dialog.getByText('extraKnownMarketplaces')).toBeVisible();
    // Scope to the team snippet: the repo slug also appears in the (collapsed)
    // manifest Content, so a bare `.first()` would resolve to a hidden token.
    const teamSnippet = dialog.locator(
      'details:has(summary:has-text("For teams"))',
    );
    await expect(teamSnippet.getByText(REPO_SLUG).first()).toBeVisible();
  });

  test('the derived journey replaces the body doc rather than doubling it', async ({
    page,
  }) => {
    // The marketplace body says the same two things; showing both makes the
    // dialog twice as tall to say one thing twice. Scoped to the dialog on
    // purpose — the detail drawer behind it still renders the body, and that
    // is correct: the deduplication is the install dialog's job alone.
    await expect(
      page
        .getByRole('dialog', { name: `Install ${MARKETPLACE.title}` })
        .getByText('Register this marketplace with your AI tool.'),
    ).toHaveCount(0);
  });
});

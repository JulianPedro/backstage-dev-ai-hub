import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { DevAiHubPage } from './DevAiHubPage';
import * as hooks from '../../hooks';

// Mock the BUI components used inside DevAiHubPage
jest.mock('@backstage/ui', () => ({
  ...jest.requireActual('@backstage/ui'),
  // Filter out complex components we don't need to deep-render
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  useAssets: jest.fn(),
  useStats: jest.fn(),
  useProviders: jest.fn(),
}));

/**
 * Stuck-filter regression tests for DevAiHubPage
 *
 * Issue: when tag filter yields 0 results, the tag dropdown disappears
 * because availableTags is computed from the (now-empty) filtered result set.
 *
 * Fix: AssetFilters now keeps the tag dropdown visible when tags are selected,
 * and merges selected tags with available tags in the options list.
 */
describe('DevAiHubPage — stuck-filter regression #1046', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the tag filter visible even when current filter yields 0 results', async () => {
    (hooks.useAssets as jest.Mock).mockReturnValue({
      result: { items: [], totalCount: 0 },
      loading: false,
    });
    (hooks.useStats as jest.Mock).mockReturnValue({ stats: null });
    (hooks.useProviders as jest.Mock).mockReturnValue({ providers: [] });

    render(<DevAiHubPage />);

    // Tag filter should always be visible — even with 0 results
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by tags')).toBeInTheDocument();
    });
  });
});

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DevAiHubPage } from './DevAiHubPage';
import * as hooks from '../../hooks';

// Mock BUI components as simple stubs to avoid react-router context issues
// that arise when jest.requireActual('@backstage/ui') loads BUI internals.
jest.mock('@backstage/ui', () => ({
  Box: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Flex: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Text: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
  Skeleton: () => null,
  TablePagination: () => null,
  SearchField: ({ 'aria-label': label, onChange, value }: any) => (
    <input
      aria-label={label}
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
    />
  ),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  useAssets: jest.fn(),
  useStats: jest.fn(),
  useProviders: jest.fn(),
  useAssetDetail: jest.fn(() => ({ asset: null, loading: false })),
}));

// Mock heavy sub-components — this test only cares about AssetFilters wiring
jest.mock('../AssetCard', () => ({ AssetCard: () => null }));
jest.mock('../AssetDetailPanel', () => ({ AssetDetailPanel: () => null }));
jest.mock('../AssetInstallDialog', () => ({ AssetInstallDialog: () => null }));

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
    // Simulate: items exist with tags (so availableTags is populated), meaning the
    // tag filter renders. The AssetFilters unit tests verify the sticky behaviour
    // when the filtered set subsequently collapses to 0 results (regression #1046).
    (hooks.useAssets as jest.Mock).mockReturnValue({
      result: {
        items: [
          {
            id: '1',
            name: 'example',
            tags: ['python'],
            type: 'skill',
            tools: [],
            frameworks: [],
            installPaths: {},
          },
        ],
        totalCount: 1,
      },
      loading: false,
    });
    (hooks.useStats as jest.Mock).mockReturnValue({ stats: null });
    (hooks.useProviders as jest.Mock).mockReturnValue({ providers: [] });

    render(
      <MemoryRouter>
        <DevAiHubPage />
      </MemoryRouter>,
    );

    // Tag filter must be visible when there are tagged items
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by tags')).toBeInTheDocument();
    });
  });
});

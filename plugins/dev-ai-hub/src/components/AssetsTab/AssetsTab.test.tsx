import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AssetsTab } from './AssetsTab';
import { AiAssetSummary, AiHubStats } from '@julianpedro/plugin-dev-ai-hub-common';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@backstage/frontend-plugin-api', () => ({
  createTranslationRef: (opts: { id: string }) => ({ id: opts.id }),
  createTranslationResource: () => ({}),
  useTranslationRef: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'devAiHubPage.noAssetsTitle':    'No assets found',
        'devAiHubPage.noAssetsSubtitle': 'Try adjusting your filters',
        'devAiHubPage.assetCountOne':    '1 asset',
        'devAiHubPage.assetCountOther':  `${params?.count ?? ''} assets`,
        'devAiHubPage.providerCountOne':   '1 provider',
        'devAiHubPage.providerCountOther': `${params?.count ?? ''} providers`,
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@backstage/core-components', () => ({
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../AssetCard', () => ({
  AssetCard: ({ asset, onView }: { asset: AiAssetSummary; onView: (id: string) => void }) => (
    <button type="button" data-testid={`asset-card-${asset.id}`} onClick={() => onView(asset.id)}>
      {asset.name}
    </button>
  ),
}));

jest.mock('../AssetFilters', () => ({
  AssetFilters: ({ onChange }: { onChange: (v: unknown) => void }) => (
    <button onClick={() => onChange({ types: ['agent'], tools: [], search: '', tags: [], providerId: undefined })}>
      filter-agents
    </button>
  ),
}));

jest.mock('../AssetDetailPanel',  () => ({ AssetDetailPanel:  () => null }));
jest.mock('../AssetInstallDialog',() => ({ AssetInstallDialog: () => null }));
jest.mock('../AssetHelpDialog',   () => ({ AssetHelpDialog:    () => null }));

const mockUseAssets    = jest.fn();
const mockUseStats     = jest.fn();
const mockUseProviders = jest.fn();
const mockUseMcpCatalog = jest.fn();

jest.mock('../../hooks', () => ({
  useAssets:     (...args: unknown[]) => mockUseAssets(...args),
  useStats:      () => mockUseStats(),
  useProviders:  () => mockUseProviders(),
  useMcpCatalog: () => mockUseMcpCatalog(),
  useTypeConfig: () => ({
    typeColors: {
      instruction: '#2563EB', agent: '#7C3AED', skill: '#059669',
      workflow: '#D97706',    prompt: '#EC4899', bundle: '#8B5CF6',
    },
    statsCards: ['instruction', 'agent', 'skill', 'workflow'],
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeAsset(overrides?: Partial<AiAssetSummary>): AiAssetSummary {
  return {
    id: 'asset-1',
    providerId: 'prov-1',
    name: 'My Instruction',
    description: 'desc',
    type: 'instruction',
    tools: ['claude-code'],
    tags: ['python'],
    author: 'Author',
    version: '1.0.0',
    installCount: 0,
    syncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const STATS: AiHubStats = {
  totalAssets: 5,
  byType: { instruction: 2, agent: 1, skill: 1, workflow: 1, prompt: 0, bundle: 0 },
  byTool: {},
  byProvider: { 'prov-1': 5 },
  lastSync: new Date().toISOString(),
};

function renderTab(path = '/dev-ai-hub/assets') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AssetsTab />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseStats.mockReturnValue({ stats: STATS });
  mockUseProviders.mockReturnValue({ providers: [] });
  mockUseMcpCatalog.mockReturnValue({ catalog: [] });
  mockUseAssets.mockReturnValue({
    result: { items: [makeAsset()], totalCount: 1 },
    loading: false,
  });
  mockNavigate.mockReset();
});

describe('AssetsTab', () => {
  it('renders stats cards with counts from useStats', () => {
    renderTab();
    expect(screen.getByText('2')).toBeInTheDocument(); // instructions
    expect(screen.getByText('Instructions')).toBeInTheDocument();
  });

  it('shows asset cards when data loads', () => {
    renderTab();
    expect(screen.getByTestId('asset-card-asset-1')).toBeInTheDocument();
    expect(screen.getByText('My Instruction')).toBeInTheDocument();
  });

  it('shows empty state when no assets match', () => {
    mockUseAssets.mockReturnValue({ result: { items: [], totalCount: 0 }, loading: false });
    renderTab();
    expect(screen.getByText('No assets found')).toBeInTheDocument();
  });

  it('shows skeleton placeholders while loading', () => {
    mockUseAssets.mockReturnValue({ result: null, loading: true });
    renderTab();
    // Skeleton renders via MUI — confirm no asset cards during loading
    expect(screen.queryByTestId('asset-card-asset-1')).not.toBeInTheDocument();
  });

  it('clicking a stats card filters by that type', async () => {
    renderTab();
    // click the Agents card
    fireEvent.click(screen.getByText('Agents'));
    await waitFor(() => {
      const [[calledFilter]] = mockUseAssets.mock.calls.slice(-1);
      expect(calledFilter?.type).toBe('agent');
    });
  });

  it('clicking a stats card again deselects the filter', async () => {
    renderTab();
    fireEvent.click(screen.getByText('Agents'));
    fireEvent.click(screen.getByText('Agents'));
    await waitFor(() => {
      const [[calledFilter]] = mockUseAssets.mock.calls.slice(-1);
      expect(calledFilter?.type).toBeUndefined();
    });
  });

  it('shows providers CloudSync icon when providers exist', () => {
    mockUseProviders.mockReturnValue({
      providers: [{ id: 'prov-1', target: 'github.com/org/repo', status: 'idle' }],
    });
    renderTab();
    // The icon button should be present
    const btn = screen.getByRole('button', { name: /1 provider/i });
    expect(btn).toBeInTheDocument();
  });

  it('clicking providers icon navigates to admin tab', () => {
    mockUseProviders.mockReturnValue({
      providers: [{ id: 'prov-1', target: 'github.com/org/repo', status: 'idle' }],
    });
    renderTab('/dev-ai-hub/assets');
    fireEvent.click(screen.getByRole('button', { name: /1 provider/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dev-ai-hub/admin');
  });

  it('derives plugin base path correctly from NFS route', () => {
    mockUseProviders.mockReturnValue({
      providers: [{ id: 'prov-1', target: 'github.com/org/repo', status: 'idle' }],
    });
    renderTab('/my-hub/assets');
    fireEvent.click(screen.getByRole('button', { name: /1 provider/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/my-hub/admin');
  });

  it('shows pagination when totalCount exceeds page size', () => {
    mockUseAssets.mockReturnValue({
      result: { items: Array.from({ length: 24 }, (_, i) => makeAsset({ id: `a${i}`, name: `Asset ${i}` })), totalCount: 50 },
      loading: false,
    });
    renderTab();
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('does not show pagination when all assets fit on one page', () => {
    renderTab(); // 1 asset, totalCount: 1
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });
});
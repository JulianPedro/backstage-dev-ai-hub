import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPage } from './AdminPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@backstage/frontend-plugin-api', () => ({
  createTranslationRef: (opts: { id: string }) => ({ id: opts.id }),
  createTranslationResource: () => ({}),
  useTranslationRef: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'devAiHubPage.providersSectionTitle':  'Providers',
        'devAiHubPage.providerCountOne':       '1 provider',
        'devAiHubPage.providerCountOther':     `${params?.n ?? ''} providers`,
        'devAiHubPage.syncAllButton':          'Sync All',
        'devAiHubPage.syncButton':             'Sync',
        'devAiHubPage.syncTriggered':          'Sync triggered',
        'devAiHubPage.noProvidersConfigured':  'No providers configured',
        'devAiHubPage.providerStatusError':    'Error',
        'devAiHubPage.timeJustNow':            'just now',
        'devAiHubPage.timeMinutesAgo':         `${params?.count ?? ''} min ago`,
        'devAiHubPage.timeHoursAgo':           `${params?.count ?? ''} hr ago`,
        'devAiHubPage.timeDaysAgo':            `${params?.count ?? ''} days ago`,
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@backstage/core-components', () => ({
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

const mockUseProviders   = jest.fn();
const mockTriggerSync    = jest.fn();
const mockTriggerSyncAll = jest.fn();

jest.mock('../../hooks', () => ({
  useProviders:    () => mockUseProviders(),
  useSyncProvider: () => ({
    syncing:        {},
    triggerSync:    mockTriggerSync,
    triggerSyncAll: mockTriggerSyncAll,
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const { usePermission } = jest.requireMock('@backstage/plugin-permission-react') as {
  usePermission: jest.Mock;
};

function provider(overrides?: object) {
  return {
    id: 'prov-1',
    target: 'github.com/org/repo',
    status: 'idle' as const,
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseProviders.mockReturnValue({ providers: [provider()] });
  usePermission.mockReturnValue({ allowed: false });
  mockTriggerSync.mockResolvedValue(undefined);
  mockTriggerSyncAll.mockResolvedValue(undefined);
});

describe('AdminPage', () => {
  describe('empty state', () => {
    it('shows empty state message when no providers are configured', () => {
      mockUseProviders.mockReturnValue({ providers: [] });
      render(<AdminPage />);
      expect(screen.getByText('No providers configured')).toBeInTheDocument();
    });
  });

  describe('provider list', () => {
    it('renders provider target URL', () => {
      render(<AdminPage />);
      expect(screen.getByText('github.com/org/repo')).toBeInTheDocument();
    });

    it('shows no error text for idle provider', () => {
      render(<AdminPage />);
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('shows error message for provider with error status', () => {
      mockUseProviders.mockReturnValue({
        providers: [provider({ status: 'error', error: 'Clone failed' })],
      });
      render(<AdminPage />);
      expect(screen.getByText('Clone failed')).toBeInTheDocument();
    });

    it('shows last sync time', () => {
      render(<AdminPage />);
      expect(screen.getByText('5 min ago')).toBeInTheDocument();
    });

    it('shows provider count in subtitle', () => {
      render(<AdminPage />);
      expect(screen.getByText('1 provider')).toBeInTheDocument();
    });

    it('shows correct count for multiple providers', () => {
      mockUseProviders.mockReturnValue({
        providers: [provider(), provider({ id: 'prov-2', target: 'github.com/org/repo-b' })],
      });
      render(<AdminPage />);
      expect(screen.getByText('2 providers')).toBeInTheDocument();
    });
  });

  describe('sync buttons — permission gating', () => {
    it('does not render sync button when user lacks permission', () => {
      usePermission.mockReturnValue({ allowed: false });
      render(<AdminPage />);
      // No buttons when permission is denied (no Sync All either since only 1 provider)
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders individual sync button when user has permission', () => {
      usePermission.mockReturnValue({ allowed: true });
      render(<AdminPage />);
      // aria-label="Sync" is set directly on IconButton
      expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument();
    });

    it('does not render Sync All button with a single provider even when allowed', () => {
      usePermission.mockReturnValue({ allowed: true });
      render(<AdminPage />);
      expect(screen.queryByText('Sync All')).not.toBeInTheDocument();
    });

    it('renders Sync All button with multiple providers when allowed', () => {
      usePermission.mockReturnValue({ allowed: true });
      mockUseProviders.mockReturnValue({
        providers: [provider(), provider({ id: 'prov-2', target: 'github.com/org/repo-b' })],
      });
      render(<AdminPage />);
      expect(screen.getByText('Sync All')).toBeInTheDocument();
    });
  });

  describe('sync actions', () => {
    beforeEach(() => {
      usePermission.mockReturnValue({ allowed: true });
    });

    it('calls triggerSync with provider id when sync button clicked', async () => {
      render(<AdminPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Sync' }));
      await waitFor(() => {
        expect(mockTriggerSync).toHaveBeenCalledWith('prov-1');
      });
    });

    it('shows snackbar after sync triggered', async () => {
      render(<AdminPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Sync' }));
      await waitFor(() => {
        expect(screen.getByText('Sync triggered')).toBeInTheDocument();
      });
    });

    it('calls triggerSyncAll with all provider ids when Sync All clicked', async () => {
      mockUseProviders.mockReturnValue({
        providers: [provider(), provider({ id: 'prov-2', target: 'github.com/org/repo-b' })],
      });
      render(<AdminPage />);
      fireEvent.click(screen.getByText('Sync All'));
      await waitFor(() => {
        expect(mockTriggerSyncAll).toHaveBeenCalledWith(['prov-1', 'prov-2']);
      });
    });
  });
});

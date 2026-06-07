import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpPage } from './McpPage';
import type { McpCatalogEntry } from '@julianpedro/plugin-dev-ai-hub-common';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetBaseUrl = jest.fn().mockResolvedValue('http://localhost:7007/api/dev-ai-hub');

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: (_ref: unknown) => ({ getBaseUrl: mockGetBaseUrl }),
  discoveryApiRef: {},
}));

jest.mock('@backstage/frontend-plugin-api', () => ({
  ...jest.requireActual('@backstage/frontend-plugin-api'),
  useTranslationRef: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'mcpConfigDialog.catalogTab':         'MCP Catalog',
        'mcpConfigDialog.catalogDescription': 'Available MCP servers',
        'mcpConfigDialog.catalogEmpty':       'No MCP servers',
        'mcpConfigDialog.catalogAddHint':     'Add servers via config',
        'mcpConfigDialog.toolConfigSection':  'Tool Configuration',
        'mcpConfigDialog.mcpEndpoint':        'MCP Endpoint',
        'mcpConfigDialog.installInVscode':    'Install in VS Code',
        'mcpConfigDialog.installInCursor':    'Install in Cursor',
        'mcpConfigDialog.copyUrl':            'Copy URL',
        'mcpConfigDialog.proactiveSuggestions': 'Proactive suggestions',
        'mcpConfigDialog.proactiveDescription': 'Suggest assets proactively',
        'mcpConfigDialog.allProviders':       'All providers',
        'mcpConfigDialog.scopeToProvider':    'Scope to provider',
        'mcpConfigDialog.manualConfig':       `Manual (${params?.file ?? ''})`,
        'mcpConfigDialog.omitToolHint':       'Omit tool= to receive all',
        'mcpConfigDialog.claudeConfigDesc':   'Claude Code config',
        'mcpConfigDialog.copilotConfigDesc':  'Copilot config',
        'mcpConfigDialog.geminiConfigDesc':   'Gemini config',
        'mcpConfigDialog.cursorConfigDesc':   'Cursor config',
        'assetInstallDialog.copied':          'Copied!',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@backstage/core-components', () => ({
  Content: ({ children }: { children: React.ReactNode }) => <div data-testid="content-wrapper">{children}</div>,
}));

jest.mock('../ToolIcon', () => ({
  ToolIcon: ({ tool }: { tool: string }) => <span data-testid={`tool-icon-${tool}`} />,
}));

const mockUseProviders  = jest.fn();
const mockUseMcpCatalog = jest.fn();
const mockUseCopy       = jest.fn();

jest.mock('../../hooks', () => ({
  useProviders:       () => mockUseProviders(),
  useMcpCatalog:      () => mockUseMcpCatalog(),
  useCopyToClipboard: () => mockUseCopy(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeCatalogEntry(overrides?: Partial<McpCatalogEntry>): McpCatalogEntry {
  return {
    id: 'mcp-1',
    providerId: 'prov-1',
    name: 'My MCP Server',
    description: 'A test MCP server',
    type: 'http',
    url: 'http://example.com/mcp',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUseProviders.mockReturnValue({ providers: [] });
  mockUseMcpCatalog.mockReturnValue({ catalog: [] });
  mockUseCopy.mockReturnValue({ copy: jest.fn(), copied: false });
  mockGetBaseUrl.mockResolvedValue('http://localhost:7007/api/dev-ai-hub');
});

describe('McpPage', () => {
  describe('embedded prop', () => {
    it('wraps content in <Content> when not embedded', () => {
      render(<McpPage />);
      expect(screen.getByTestId('content-wrapper')).toBeInTheDocument();
    });

    it('does not render <Content> wrapper when embedded=true', () => {
      render(<McpPage embedded />);
      expect(screen.queryByTestId('content-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('MCP Catalog section', () => {
    it('shows empty state when catalog is empty', () => {
      render(<McpPage embedded />);
      expect(screen.getByText('No MCP servers')).toBeInTheDocument();
    });

    it('renders catalog entries when present', () => {
      mockUseMcpCatalog.mockReturnValue({ catalog: [makeCatalogEntry()] });
      render(<McpPage embedded />);
      expect(screen.getByText('My MCP Server')).toBeInTheDocument();
    });

    it('shows catalog entry count badge', () => {
      mockUseMcpCatalog.mockReturnValue({
        catalog: [makeCatalogEntry(), makeCatalogEntry({ id: 'mcp-2', name: 'Second' })],
      });
      render(<McpPage embedded />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders http type chip on catalog card', () => {
      mockUseMcpCatalog.mockReturnValue({ catalog: [makeCatalogEntry({ type: 'http' })] });
      render(<McpPage embedded />);
      expect(screen.getByText('http')).toBeInTheDocument();
    });

    it('renders stdio type chip on catalog card', () => {
      mockUseMcpCatalog.mockReturnValue({
        catalog: [makeCatalogEntry({ type: 'stdio', url: undefined, command: 'npx', args: ['-y', 'my-mcp'] })],
      });
      render(<McpPage embedded />);
      expect(screen.getByText('stdio')).toBeInTheDocument();
    });
  });

  describe('Tool Config collapsible section', () => {
    it('tool config section is collapsed by default', () => {
      render(<McpPage embedded />);
      expect(screen.queryByText('MCP Endpoint')).not.toBeInTheDocument();
    });

    it('expands tool config section on click', () => {
      render(<McpPage embedded />);
      fireEvent.click(screen.getByText('Tool Configuration'));
      expect(screen.getByText('MCP Endpoint')).toBeInTheDocument();
    });

    it('collapses tool config section on second click', () => {
      render(<McpPage embedded />);
      fireEvent.click(screen.getByText('Tool Configuration'));
      fireEvent.click(screen.getByText('Tool Configuration'));
      expect(screen.queryByText('MCP Endpoint')).not.toBeInTheDocument();
    });

    it('shows VS Code install button only on Copilot tab', () => {
      render(<McpPage embedded />);
      fireEvent.click(screen.getByText('Tool Configuration'));
      // Default tab is Claude Code — no VS Code button
      expect(screen.queryByText('Install in VS Code')).not.toBeInTheDocument();
      // Switch to GitHub Copilot tab
      fireEvent.click(screen.getByText('GitHub Copilot'));
      expect(screen.getByText('Install in VS Code')).toBeInTheDocument();
    });

    it('shows Cursor install button only on Cursor tab', () => {
      render(<McpPage embedded />);
      fireEvent.click(screen.getByText('Tool Configuration'));
      expect(screen.queryByText('Install in Cursor')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Cursor'));
      expect(screen.getByText('Install in Cursor')).toBeInTheDocument();
    });

    it('does not show provider filter when only one provider', () => {
      mockUseProviders.mockReturnValue({
        providers: [{ id: 'p1', target: 'github.com/org/repo', status: 'idle' }],
      });
      render(<McpPage embedded />);
      fireEvent.click(screen.getByText('Tool Configuration'));
      expect(screen.queryByText('Scope to provider')).not.toBeInTheDocument();
    });

    it('shows provider filter chips when multiple providers exist', () => {
      mockUseProviders.mockReturnValue({
        providers: [
          { id: 'p1', target: 'github.com/org/repo-a', status: 'idle' },
          { id: 'p2', target: 'github.com/org/repo-b', status: 'idle' },
        ],
      });
      render(<McpPage embedded />);
      fireEvent.click(screen.getByText('Tool Configuration'));
      expect(screen.getByText('Scope to provider')).toBeInTheDocument();
      expect(screen.getByText('repo-a')).toBeInTheDocument();
      expect(screen.getByText('repo-b')).toBeInTheDocument();
    });
  });
});

import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { McpPage } from './McpPage';
import type { McpCatalogEntry } from '@julianpedro/plugin-dev-ai-hub-common';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetBaseUrl = jest.fn().mockResolvedValue('http://localhost:7007/api/dev-ai-hub');

jest.mock('@backstage/core-plugin-api', () => ({
  createApiRef: ({ id }: { id: string }) => ({ id }),
  createPlugin: ({ id }: { id: string }) => ({ id }),
  useApi: (_ref: unknown) => ({ getBaseUrl: mockGetBaseUrl }),
  discoveryApiRef: { id: 'core.discovery' },
  configApiRef:    { id: 'core.config' },
  fetchApiRef:     { id: 'core.fetch' },
}));

jest.mock('@backstage/frontend-plugin-api', () => ({
  createTranslationRef: (opts: { id: string }) => ({ id: opts.id }),
  createTranslationResource: () => ({}),
  useTranslationRef: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'mcpConfigDialog.catalogTab':           'MCP Catalog',
        'mcpConfigDialog.catalogDescription':   'Available MCP servers',
        'mcpConfigDialog.catalogEmpty':         'No MCP servers',
        'mcpConfigDialog.catalogAddHint':       'Add servers via config',
        'mcpConfigDialog.toolConfigSection':    'Tool Configuration',
        'mcpConfigDialog.mcpEndpoint':          'MCP Endpoint',
        'mcpConfigDialog.installInVscode':      'Install in VS Code',
        'mcpConfigDialog.installInCursor':      'Install in Cursor',
        'mcpConfigDialog.copyUrl':              'Copy URL',
        'mcpConfigDialog.proactiveSuggestions': 'Proactive suggestions',
        'mcpConfigDialog.proactiveDescription': 'Suggest assets proactively',
        'mcpConfigDialog.allProviders':         'All providers',
        'mcpConfigDialog.scopeToProvider':      'Scope to provider',
        'mcpConfigDialog.manualConfig':         `Manual (${params?.file ?? ''})`,
        'mcpConfigDialog.omitToolHint':         'Omit tool= to receive all',
        'mcpConfigDialog.claudeConfigDesc':     'Claude Code config',
        'mcpConfigDialog.copilotConfigDesc':    'Copilot config',
        'mcpConfigDialog.geminiConfigDesc':     'Gemini config',
        'mcpConfigDialog.cursorConfigDesc':     'Cursor config',
        'assetInstallDialog.copied':            'Copied!',
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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Wrapping in act(async) flushes the discoveryApi.getBaseUrl Promise before assertions.
async function renderPage(props: { embedded?: boolean } = {}) {
  await act(async () => {
    render(<McpPage embedded={props.embedded ?? false} />);
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCatalogEntry(overrides?: Partial<McpCatalogEntry>): McpCatalogEntry {
  return {
    id: 'mcp-1',
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
    it('wraps content in <Content> when not embedded', async () => {
      await renderPage({ embedded: false });
      expect(screen.getByTestId('content-wrapper')).toBeInTheDocument();
    });

    it('does not render <Content> wrapper when embedded=true', async () => {
      await renderPage({ embedded: true });
      expect(screen.queryByTestId('content-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('MCP Catalog section', () => {
    it('shows empty state when catalog is empty', async () => {
      await renderPage({ embedded: true });
      expect(screen.getByText('No MCP servers')).toBeInTheDocument();
    });

    it('renders catalog entries when present', async () => {
      mockUseMcpCatalog.mockReturnValue({ catalog: [makeCatalogEntry()] });
      await renderPage({ embedded: true });
      expect(screen.getByText('My MCP Server')).toBeInTheDocument();
    });

    it('shows catalog entry count badge', async () => {
      mockUseMcpCatalog.mockReturnValue({
        catalog: [makeCatalogEntry(), makeCatalogEntry({ id: 'mcp-2', name: 'Second' })],
      });
      await renderPage({ embedded: true });
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders http type chip on catalog card', async () => {
      mockUseMcpCatalog.mockReturnValue({ catalog: [makeCatalogEntry({ type: 'http' })] });
      await renderPage({ embedded: true });
      expect(screen.getByText('http')).toBeInTheDocument();
    });

    it('renders stdio type chip on catalog card', async () => {
      mockUseMcpCatalog.mockReturnValue({
        catalog: [makeCatalogEntry({ type: 'stdio', url: undefined, command: 'npx', args: ['-y', 'my-mcp'] })],
      });
      await renderPage({ embedded: true });
      expect(screen.getByText('stdio')).toBeInTheDocument();
    });
  });

  describe('Tool Config collapsible section', () => {
    it('tool config content is not in DOM when collapsed (mountOnEnter)', async () => {
      // Collapse uses mountOnEnter — content not mounted until first open.
      await renderPage({ embedded: true });
      expect(screen.queryByText('MCP Endpoint')).not.toBeInTheDocument();
    });

    it('expands tool config section on click', async () => {
      await renderPage({ embedded: true });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      expect(screen.getByText('MCP Endpoint')).toBeInTheDocument();
    });

    it('re-opens tool config section after closing', async () => {
      // Tests the toggle cycle: closed → open → closed → open.
      // unmountOnExit depends on CSS transitionend which jsdom does not fire,
      // so we only assert that the section can be opened multiple times.
      await renderPage({ embedded: true });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      expect(screen.getByText('MCP Endpoint')).toBeInTheDocument();
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      expect(screen.getByText('MCP Endpoint')).toBeInTheDocument();
    });

    it('shows VS Code install button only on Copilot tab', async () => {
      await renderPage({ embedded: true });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      // Default tab is Claude Code — no VS Code button
      expect(screen.queryByText('Install in VS Code')).not.toBeInTheDocument();
      await act(async () => { fireEvent.click(screen.getByText('GitHub Copilot')); });
      expect(screen.getByText('Install in VS Code')).toBeInTheDocument();
    });

    it('shows Cursor install button only on Cursor tab', async () => {
      await renderPage({ embedded: true });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      expect(screen.queryByText('Install in Cursor')).not.toBeInTheDocument();
      await act(async () => { fireEvent.click(screen.getByText('Cursor')); });
      expect(screen.getByText('Install in Cursor')).toBeInTheDocument();
    });

    it('does not show provider filter when only one provider', async () => {
      mockUseProviders.mockReturnValue({
        providers: [{ id: 'p1', target: 'github.com/org/repo', status: 'idle' }],
      });
      await renderPage({ embedded: true });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      expect(screen.queryByText('Scope to provider')).not.toBeInTheDocument();
    });

    it('shows provider filter chips when multiple providers exist', async () => {
      mockUseProviders.mockReturnValue({
        providers: [
          { id: 'p1', target: 'github.com/org/repo-a', status: 'idle' },
          { id: 'p2', target: 'github.com/org/repo-b', status: 'idle' },
        ],
      });
      await renderPage({ embedded: true });
      await act(async () => { fireEvent.click(screen.getByText('Tool Configuration')); });
      expect(screen.getByText('Scope to provider')).toBeInTheDocument();
      expect(screen.getByText('repo-a')).toBeInTheDocument();
      expect(screen.getByText('repo-b')).toBeInTheDocument();
    });
  });
});
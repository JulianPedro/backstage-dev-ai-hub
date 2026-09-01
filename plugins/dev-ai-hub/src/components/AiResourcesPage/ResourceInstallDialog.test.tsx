/**
 * Tests for `ResourceInstallDialog`: per-type frames (skill/agent/hook/
 * mcp-config/plugin/marketplace), launcher gating by declared framework, the
 * "merge into" badge on merge targets, the copy-prompt fallback for hosts
 * with no prompt route, and every `api.track` call site.
 */
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useApi } from '@backstage/core-plugin-api';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import { ResourceInstallDialog } from './ResourceInstallDialog';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}));

jest.mock('react-syntax-highlighter', () => {
  const PrismLight = ({ children }: any) => (
    <pre data-testid="json-body">{children}</pre>
  );
  PrismLight.registerLanguage = jest.fn();
  return { PrismLight };
});

jest.mock('@backstage/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onPress, isDisabled }: any) => (
    <button disabled={isDisabled} onClick={onPress}>
      {children}
    </button>
  ),
  ButtonIcon: ({ onPress, 'aria-label': label }: any) => (
    <button aria-label={label} onClick={onPress} />
  ),
  ButtonLink: ({ children, href, onPress }: any) => (
    <a href={href} onClick={onPress}>
      {children}
    </a>
  ),
  Dialog: ({ children, isOpen }: any) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogBody: ({ children }: any) => <div>{children}</div>,
}));

const api = { track: jest.fn() };

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(() => api),
}));

const mockUseApi = useApi as jest.Mock;

const writeText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText } });

function summary(overrides: Partial<ResourceSummary> = {}): ResourceSummary {
  return {
    entityRef: 'airesource:default/x',
    name: 'x',
    tags: [],
    type: 'skill',
    lifecycle: 'production',
    frameworks: [],
    kind: 'AiResource',
    annotations: {},
    children: [],
    parents: [],
    ...overrides,
  };
}

const SOURCE_LOCATION =
  'url:https://github.com/org/repo/tree/main/skills/my-skill/';

function renderDialog(overrides: Partial<ResourceSummary> = {}, body?: any) {
  return render(
    <ResourceInstallDialog
      resource={summary(overrides)}
      body={body}
      isOpen
      onOpenChange={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseApi.mockReturnValue(api);
});

describe('ResourceInstallDialog — skill frame', () => {
  it('renders a launcher for Claude Code and a copy-prompt fallback for GitHub Copilot (no prompt route)', () => {
    renderDialog({
      type: 'skill',
      name: 'my-skill',
      title: 'My Skill',
      entityRef: 'airesource:default/my-skill',
      sourceLocation: SOURCE_LOCATION,
      frameworks: ['claude-code', 'github-copilot'],
    });

    expect(screen.getByText('Install My Skill')).toBeInTheDocument();

    const claudeLauncher = screen.getByText('Install in Claude').closest('a');
    expect(claudeLauncher).toHaveAttribute(
      'href',
      expect.stringContaining('claude-cli://open?q='),
    );

    // Copilot has no generic prompt URI — the row falls back to a copyable
    // prompt carrying the identical install instruction.
    expect(
      screen.getByText('Copy prompt for GitHub Copilot'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Install in GitHub Copilot'),
    ).not.toBeInTheDocument();
  });

  it('shows the copy-content and download actions for a skill with a body', () => {
    renderDialog(
      {
        type: 'skill',
        sourceLocation: SOURCE_LOCATION,
      },
      { content: '# Skill body', contentType: 'text/markdown' },
    );

    expect(screen.getByText('Copy content')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });
});

describe('ResourceInstallDialog — hook frame and the merge badge', () => {
  it('marks a merge target (Claude Code settings.json) with the "merge into" badge', () => {
    renderDialog({
      type: 'hook',
      sourceLocation: SOURCE_LOCATION,
      frameworks: ['claude-code'],
    });

    expect(screen.getByText('.claude/settings.json')).toBeInTheDocument();
    expect(screen.getByText('merge into')).toBeInTheDocument();
  });

  it('does not badge a drop-in target (GitHub Copilot hook file)', () => {
    renderDialog({
      type: 'hook',
      sourceLocation: SOURCE_LOCATION,
      frameworks: ['github-copilot'],
    });

    expect(screen.queryByText('merge into')).not.toBeInTheDocument();
  });
});

describe('ResourceInstallDialog — mcp-config frame (path-list fallback)', () => {
  it('renders the merge-note when any listed path is a merge target', () => {
    renderDialog({
      type: 'mcp-config',
      frameworks: ['claude-code', 'cursor'],
    });

    expect(screen.getByText('.mcp.json')).toBeInTheDocument();
    expect(screen.getByText('.cursor/mcp.json')).toBeInTheDocument();
    expect(screen.getAllByText('merge into').length).toBe(3);
    expect(screen.getByText(/shared configuration files/)).toBeInTheDocument();
  });

  it('renders one-click install links derived from the mcp-config body, gated to declared frameworks', () => {
    renderDialog(
      { type: 'mcp-config', frameworks: ['cursor'], name: 'grafana-mcp' },
      {
        content: JSON.stringify({
          mcpServers: { grafana: { command: 'npx', args: ['grafana-mcp'] } },
        }),
        contentType: 'application/json',
      },
    );

    expect(screen.getByText('Install in Cursor')).toBeInTheDocument();
    // Only cursor was declared — Claude Code's launcher must not appear.
    expect(screen.queryByText('Install in Claude')).not.toBeInTheDocument();
  });
});

describe('ResourceInstallDialog — agent frame (launcher gating)', () => {
  it('offers only the launchers for the declared frameworks', () => {
    renderDialog({
      type: 'agent',
      name: 'api-architect',
      sourceLocation:
        'url:https://github.com/org/repo/blob/main/agents/api-architect.md',
      frameworks: ['claude-code'],
    });

    expect(screen.getByText('Install in Claude')).toBeInTheDocument();
    expect(screen.queryByText('Install in VS Code')).not.toBeInTheDocument();
  });

  it('offers the VS Code launchers when github-copilot is declared', () => {
    renderDialog({
      type: 'agent',
      name: 'api-architect',
      sourceLocation:
        'url:https://github.com/org/repo/blob/main/agents/api-architect.md',
      frameworks: ['github-copilot'],
    });

    expect(screen.getByText('Install in VS Code')).toBeInTheDocument();
    expect(screen.getByText('Install in VS Code Insiders')).toBeInTheDocument();
    expect(screen.queryByText('Install in Claude')).not.toBeInTheDocument();
  });
});

describe('ResourceInstallDialog — plugin frame', () => {
  it('renders the body as a pretty-printed JSON manifest, not markdown (ADR-0014)', () => {
    renderDialog(
      { type: 'plugin' },
      {
        content: '{"name":"my-plugin","version":"1.0.0"}',
        contentType: 'application/json',
      },
    );

    expect(screen.getByTestId('json-body')).toHaveTextContent(
      '"name": "my-plugin"',
    );
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
  });

  it('keeps the JSON manifest collapsed by default in the install dialog', () => {
    const { container } = renderDialog(
      { type: 'plugin' },
      {
        content: '{"name":"my-plugin","version":"1.0.0"}',
        contentType: 'application/json',
      },
    );

    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();
    expect(details).not.toHaveAttribute('open');
    expect(details?.querySelector('summary')).toHaveTextContent('Content');
  });
});

describe('ResourceInstallDialog — marketplace frame', () => {
  it('renders the two-step journey when a repo slug can be derived', () => {
    renderDialog({
      type: 'marketplace',
      name: 'my-marketplace',
      sourceLocation:
        'url:https://github.com/org/repo/blob/main/marketplace.json',
      frameworks: ['claude-code'],
    });

    expect(
      screen.getByText('1. Add the marketplace to your AI tool'),
    ).toBeInTheDocument();
    expect(screen.getByText('2. Install plugins from it')).toBeInTheDocument();
  });

  it('falls back to the JSON manifest body when no repo slug can be derived (ADR-0014)', () => {
    renderDialog(
      {
        type: 'marketplace',
        name: 'my-marketplace',
        sourceLocation: undefined,
      },
      {
        content: '{"name":"my-marketplace","plugins":[]}',
        contentType: 'application/json',
      },
    );

    expect(
      screen.queryByText('1. Add the marketplace to your AI tool'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('json-body')).toHaveTextContent(
      '"name": "my-marketplace"',
    );
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
  });
});

describe('ResourceInstallDialog — telemetry call sites', () => {
  it('tracks "copy" when the copy-content button is used', async () => {
    renderDialog(
      { type: 'skill', entityRef: 'airesource:default/my-skill' },
      { content: 'body text', contentType: 'text/markdown' },
    );

    fireEvent.click(screen.getByText('Copy content'));

    await screen.findByText('Copied!');
    expect(writeText).toHaveBeenCalledWith('body text');
    expect(api.track).toHaveBeenCalledWith(
      'airesource:default/my-skill',
      'copy',
    );
  });

  it('tracks "download" on a successful download', async () => {
    const api2 = {
      ...api,
      downloadEntityBody: jest.fn().mockResolvedValue(undefined),
    };
    mockUseApi.mockReturnValue(api2);
    renderDialog({
      type: 'skill',
      entityRef: 'airesource:default/my-skill',
    });

    fireEvent.click(screen.getByText('Download'));
    await screen.findByText('Download');

    expect(api2.downloadEntityBody).toHaveBeenCalledWith(
      'airesource:default/my-skill',
    );
    expect(api2.track).toHaveBeenCalledWith(
      'airesource:default/my-skill',
      'download',
    );
  });

  it('shows a download error and does not track on failure', async () => {
    const api2 = {
      ...api,
      downloadEntityBody: jest.fn().mockRejectedValue(new Error('gone')),
    };
    mockUseApi.mockReturnValue(api2);
    renderDialog({
      type: 'skill',
      entityRef: 'airesource:default/my-skill',
    });

    fireEvent.click(screen.getByText('Download'));

    await screen.findByText(/Download failed/);
    expect(api.track).not.toHaveBeenCalledWith(
      'airesource:default/my-skill',
      'download',
    );
  });

  it('tracks "install" with the framework when a per-step launcher is used', () => {
    renderDialog({
      type: 'skill',
      entityRef: 'airesource:default/my-skill',
      sourceLocation: SOURCE_LOCATION,
      frameworks: ['claude-code'],
    });

    fireEvent.click(screen.getByText('Install in Claude'));

    expect(api.track).toHaveBeenCalledWith(
      'airesource:default/my-skill',
      'install',
      'claude-code',
    );
  });

  it('does not track anything on render', () => {
    renderDialog({ type: 'skill' });

    expect(api.track).not.toHaveBeenCalled();
  });

  it('flashes "Copied" on the marketplace add-command copy button', async () => {
    renderDialog({
      type: 'marketplace',
      name: 'my-marketplace',
      sourceLocation:
        'url:https://github.com/org/repo/blob/main/marketplace.json',
      frameworks: ['claude-code'],
    });

    fireEvent.click(screen.getAllByLabelText('Copy command')[0]);

    expect(await screen.findAllByLabelText('Copied')).not.toHaveLength(0);
    expect(writeText).toHaveBeenCalled();
  });

  it('flashes "Copied!" on the copy-prompt fallback button', async () => {
    renderDialog({
      type: 'skill',
      sourceLocation: SOURCE_LOCATION,
      frameworks: ['github-copilot'],
    });

    fireEvent.click(screen.getByText('Copy prompt for GitHub Copilot'));

    expect(await screen.findByText('Copied!')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalled();
  });
});

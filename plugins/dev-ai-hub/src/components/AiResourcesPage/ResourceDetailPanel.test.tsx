import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResourceDetailPanel } from './ResourceDetailPanel';
import { ResourceBodyError } from '../../api/DevAiHubResourceClient';
import { clearResourceBodyCache } from '../../hooks/useResourceBody';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';

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

jest.mock('@backstage/plugin-catalog-react', () => ({
  // The real component calls useRouteRef, which needs a <Router> ancestor
  // this test tree doesn't have. A plain anchor is enough to assert on.
  EntityRefLink: ({ entityRef, children }: any) => (
    <a href={`/catalog/${entityRef}`}>{children}</a>
  ),
}));

jest.mock('@backstage/ui', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  Text: ({ children }: any) => <span>{children}</span>,
  Skeleton: () => <div data-testid="skeleton" />,
  ButtonIcon: ({ onClick, 'aria-label': label }: any) => (
    <button aria-label={label} onClick={onClick} />
  ),
  Button: ({ children, onPress, isDisabled }: any) => (
    <button disabled={isDisabled} onClick={onPress}>
      {children}
    </button>
  ),
  ButtonLink: ({ children, href }: any) => <a href={href}>{children}</a>,
  Dialog: ({ children, isOpen }: any) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogBody: ({ children }: any) => <div>{children}</div>,
}));

const api = {
  getEntityBody: jest.fn(),
  downloadEntityBody: jest.fn(),
  track: jest.fn(),
  getInstallCount: jest
    .fn()
    .mockResolvedValue({ install: 0, copy: 0, download: 0, view: 0 }),
};

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: () => api,
}));

const writeText = jest.fn().mockResolvedValue(undefined);
Object.assign(navigator, { clipboard: { writeText } });

function summary(overrides: Partial<ResourceSummary>): ResourceSummary {
  return {
    entityRef: 'airesource:default/x',
    name: 'x',
    tags: [],
    type: 'skill',
    lifecycle: 'production',
    frameworks: ['claude-code'],
    kind: 'AiResource',
    annotations: {},
    children: [],
    parents: [],
    ...overrides,
  };
}

const ACTIONABLE = summary({
  name: 'my-skill',
  title: 'My Skill',
  entityRef: 'airesource:default/my-skill',
  sourceLocation:
    'url:https://github.com/org/repo/tree/main-nos/examples/skills/my-skill/',
});

describe('ResourceDetailPanel — body', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResourceBodyCache();
  });

  it('fetches the body lazily on open and renders markdown', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '# Skill body',
      contentType: 'text/markdown',
    });
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);

    expect(api.getEntityBody).toHaveBeenCalledWith(
      'airesource:default/my-skill',
    );
    await waitFor(() =>
      expect(screen.getByTestId('markdown')).toHaveTextContent('# Skill body'),
    );
  });

  it('renders an mcp-config body as a pretty-printed code block, not markdown', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '{"mcpServers":{}}',
      contentType: 'application/json',
    });
    render(
      <ResourceDetailPanel
        resource={summary({ ...ACTIONABLE, type: 'mcp-config' })}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('json-body')).toHaveTextContent(
        '"mcpServers": {}',
      ),
    );
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
  });

  it('renders a plugin body as a pretty-printed code block, not markdown (ADR-0014)', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '{"name":"my-plugin","version":"1.0.0"}',
      contentType: 'application/json',
    });
    render(
      <ResourceDetailPanel
        resource={summary({ ...ACTIONABLE, type: 'plugin' })}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('json-body')).toHaveTextContent(
        '"name": "my-plugin"',
      ),
    );
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
  });

  it('hides actions and shows the empty state for non-actionable resources', () => {
    render(
      <ResourceDetailPanel
        resource={summary({ sourceLocation: undefined })}
        onClose={jest.fn()}
      />,
    );

    expect(api.getEntityBody).not.toHaveBeenCalled();
    expect(screen.queryByText('Install')).not.toBeInTheDocument();
    expect(
      screen.getByText('No content location published for this resource.'),
    ).toBeInTheDocument();
  });

  it('shows the not-available message on 404', async () => {
    api.getEntityBody.mockRejectedValue(new ResourceBodyError('gone', 404));
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByText(/Content not available/)).toBeInTheDocument(),
    );
  });

  it('offers a retry on upstream failure', async () => {
    api.getEntityBody
      .mockRejectedValueOnce(new ResourceBodyError('bad gateway', 502))
      .mockResolvedValueOnce({
        content: '# Recovered',
        contentType: 'text/markdown',
      });
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByText(/Couldn’t fetch the content/),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() =>
      expect(screen.getByTestId('markdown')).toHaveTextContent('# Recovered'),
    );
  });

  it('opens the install dialog with per-framework paths', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '# Skill body',
      contentType: 'text/markdown',
    });
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('markdown'));

    fireEvent.click(screen.getByText('Install'));
    expect(screen.getByText('Install My Skill')).toBeInTheDocument();
    expect(screen.getByText('.claude/skills/my-skill/')).toBeInTheDocument();

    // A skill must offer a one-click launcher, not just a path to copy.
    const launcher = screen.getByText('Install in Claude').closest('a');
    expect(launcher).toHaveAttribute(
      'href',
      expect.stringContaining('claude-cli://open?q='),
    );
    expect(decodeURIComponent(launcher!.getAttribute('href')!)).toContain(
      '.claude/skills/my-skill/',
    );
  });

  it('downloads via the client on Download', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '# Skill body',
      contentType: 'text/markdown',
    });
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('markdown'));

    fireEvent.click(screen.getByText('Download'));
    expect(api.downloadEntityBody).toHaveBeenCalledWith(
      'airesource:default/my-skill',
    );
  });

  it('copies the body to the clipboard and tracks "copy" on Copy', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '# Skill body',
      contentType: 'text/markdown',
    });
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('markdown'));

    fireEvent.click(screen.getByText('Copy'));

    await screen.findByText('Copied!');
    expect(writeText).toHaveBeenCalledWith('# Skill body');
    expect(api.track).toHaveBeenCalledWith(
      'airesource:default/my-skill',
      'copy',
    );
  });

  it('strips frontmatter from the rendered preview but copies the body verbatim', async () => {
    const raw =
      '---\nname: my-skill\ndescription: "does things"\n---\n\n# My Skill';
    api.getEntityBody.mockResolvedValue({
      content: raw,
      contentType: 'text/markdown',
    });
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('markdown')).toHaveTextContent('# My Skill'),
    );
    expect(screen.getByTestId('markdown')).not.toHaveTextContent('name:');

    fireEvent.click(screen.getByText('Copy'));
    await screen.findByText('Copied!');
    expect(writeText).toHaveBeenCalledWith(raw);
  });
});

describe('ResourceDetailPanel — view telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResourceBodyCache();
  });

  const viewCalls = () =>
    api.track.mock.calls.filter(([, action]) => action === 'view');

  it('records a view when the drawer opens for a resource', () => {
    render(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);

    expect(api.track).toHaveBeenCalledWith(
      'airesource:default/my-skill',
      'view',
    );
  });

  it('records nothing while the drawer is closed', () => {
    render(<ResourceDetailPanel resource={undefined} onClose={jest.fn()} />);

    expect(api.track).not.toHaveBeenCalled();
  });

  it('does not record a second view when the drawer closes', () => {
    const { rerender } = render(
      <ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />,
    );
    // Closing clears the prop but leaves the drawer rendered for its exit
    // animation — that must not read as another view.
    rerender(<ResourceDetailPanel resource={undefined} onClose={jest.fn()} />);

    expect(viewCalls()).toHaveLength(1);
  });

  it('records one view per resource opened, not per re-render', () => {
    const other = summary({
      name: 'other',
      entityRef: 'airesource:default/other',
      sourceLocation: 'url:https://github.com/org/repo/tree/main-nos/other/',
    });
    const { rerender } = render(
      <ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />,
    );
    rerender(<ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />);
    rerender(<ResourceDetailPanel resource={other} onClose={jest.fn()} />);

    expect(viewCalls()).toEqual([
      ['airesource:default/my-skill', 'view'],
      ['airesource:default/other', 'view'],
    ]);
  });
});

describe('ResourceDetailPanel — metadata links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResourceBodyCache();
  });

  it('links Owner and Entity ref to their catalog pages', () => {
    render(
      <ResourceDetailPanel
        resource={summary({
          ...ACTIONABLE,
          owner: 'group:default/platforms-developer-experience',
        })}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByText('group:default/platforms-developer-experience'),
    ).toHaveAttribute(
      'href',
      '/catalog/group:default/platforms-developer-experience',
    );
    expect(screen.getByText('airesource:default/my-skill')).toHaveAttribute(
      'href',
      '/catalog/airesource:default/my-skill',
    );
  });

  it('falls back to plain text for an unparseable owner rather than crashing', () => {
    render(
      <ResourceDetailPanel
        resource={summary({ ...ACTIONABLE, owner: 'group:' })}
        onClose={jest.fn()}
      />,
    );

    const ownerValue = screen.getByText('group:');
    expect(ownerValue.tagName).not.toBe('A');
  });
});

describe('ResourceDetailPanel — collapsible content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResourceBodyCache();
  });

  it('shows a plugin/marketplace JSON body under a collapsible "Content" toggle, expanded by default', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '{"name":"p"}',
      contentType: 'application/json',
    });
    const { container } = render(
      <ResourceDetailPanel
        resource={summary({ ...ACTIONABLE, type: 'plugin' })}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('json-body')).toBeInTheDocument(),
    );
    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();
    // Expanded by default in the detail ("more information") panel.
    expect(details).toHaveAttribute('open');
    expect(details?.querySelector('summary')).toHaveTextContent('Content');
  });

  it('does not collapse a markdown body', async () => {
    api.getEntityBody.mockResolvedValue({
      content: '# hi',
      contentType: 'text/markdown',
    });
    const { container } = render(
      <ResourceDetailPanel resource={ACTIONABLE} onClose={jest.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByTestId('markdown')).toBeInTheDocument(),
    );
    expect(container.querySelector('details')).not.toBeInTheDocument();
  });
});

describe('ResourceDetailPanel — relationships', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResourceBodyCache();
  });

  it('renders relationship sections when items and onOpen are supplied', () => {
    const parent = summary({
      entityRef: 'airesource:default/bundle',
      name: 'bundle',
      title: 'The Bundle',
      type: 'plugin',
    });
    const child = summary({
      entityRef: 'airesource:default/skill-a',
      name: 'skill-a',
      type: 'skill',
      parents: ['airesource:default/bundle'],
    });

    render(
      <ResourceDetailPanel
        resource={child}
        items={[parent, child]}
        onOpen={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Part of')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /The Bundle/ }),
    ).toBeInTheDocument();
  });

  it('omits relationship sections when onOpen is not supplied', () => {
    const child = summary({
      entityRef: 'airesource:default/skill-a',
      name: 'skill-a',
      type: 'skill',
      parents: ['airesource:default/bundle'],
    });

    render(<ResourceDetailPanel resource={child} onClose={jest.fn()} />);

    expect(screen.queryByText('Part of')).not.toBeInTheDocument();
  });
});

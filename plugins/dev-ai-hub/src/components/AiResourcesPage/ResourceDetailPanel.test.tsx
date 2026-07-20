import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResourceDetailPanel } from './ResourceDetailPanel';
import { ResourceBodyError } from '../../api/DevAiHubResourceClient';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
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
  Dialog: ({ children, isOpen }: any) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogBody: ({ children }: any) => <div>{children}</div>,
}));

const api = {
  getEntityBody: jest.fn(),
  downloadEntityBody: jest.fn(),
};

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: () => api,
}));

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
  beforeEach(() => jest.clearAllMocks());

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

  it('renders an mcp-config body as a code block, not markdown', async () => {
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
      expect(screen.getAllByText('{"mcpServers":{}}').length).toBeGreaterThan(
        0,
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
});

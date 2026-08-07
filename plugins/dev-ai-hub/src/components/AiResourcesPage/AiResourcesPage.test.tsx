import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiResourcesPage } from './AiResourcesPage';
import { useResources } from '../../hooks/useResources';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';

// Mock BUI components as simple stubs (same approach as DevAiHubPage.test.tsx)
jest.mock('@backstage/ui', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Flex: ({ children }: any) => <div>{children}</div>,
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  ButtonIcon: ({ onClick, 'aria-label': label }: any) => (
    <button aria-label={label} onClick={onClick} />
  ),
  Skeleton: () => <div data-testid="skeleton" />,
  TablePagination: ({
    hasNextPage,
    hasPreviousPage,
    onNextPage,
    onPreviousPage,
  }: any) => (
    <div data-testid="pagination">
      <button disabled={!hasPreviousPage} onClick={onPreviousPage}>
        Previous
      </button>
      <button disabled={!hasNextPage} onClick={onNextPage}>
        Next
      </button>
    </div>
  ),
  SearchField: ({ 'aria-label': label, onChange, value, placeholder }: any) => (
    <input
      aria-label={label}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
    />
  ),
  Text: ({ children }: any) => <span>{children}</span>,
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

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: () => ({
    getEntityBody: jest.fn(),
    downloadEntityBody: jest.fn(),
    track: jest.fn().mockResolvedValue(undefined),
    getInstallCount: jest
      .fn()
      .mockResolvedValue({ install: 0, copy: 0, download: 0, view: 0 }),
  }),
}));

jest.mock('../../hooks/useResources', () => ({ useResources: jest.fn() }));
jest.mock('../../hooks/useResourceBody', () => ({
  useResourceBody: () => ({ loading: false, retry: jest.fn() }),
}));

const mockUseResources = useResources as jest.Mock;

function summary(overrides: Partial<ResourceSummary>): ResourceSummary {
  return {
    entityRef: 'airesource:default/x',
    name: 'x',
    tags: [],
    type: 'skill',
    lifecycle: 'production',
    frameworks: [],
    kind: 'AiResource',
    annotations: {},
    ...overrides,
  };
}

const ITEMS: ResourceSummary[] = [
  summary({
    entityRef: 'airesource:default/my-skill',
    name: 'my-skill',
    title: 'My Skill',
    type: 'skill',
    frameworks: ['claude-code'],
    tags: ['security'],
    sourceLocation: 'url:https://github.com/org/repo/blob/main/skill.yaml',
    version: '1.0.0',
    owner: 'group:team-a',
  }),
  summary({
    entityRef: 'airesource:default/my-agent',
    name: 'my-agent',
    title: 'My Agent',
    type: 'agent',
    description: 'Reviews threat models',
  }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AiResourcesPage />
    </MemoryRouter>,
  );
}

describe('AiResourcesPage', () => {
  it('renders a card per resource with framework badges', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();
    expect(screen.getByText('My Skill')).toBeInTheDocument();
    expect(screen.getByText('My Agent')).toBeInTheDocument();
    // Badges are icon-only on a card; the tool name is the accessible name.
    expect(
      screen.getAllByRole('img', { name: 'Claude Code' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows per-type counts on the stat tiles', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();
    const skillTile = screen.getByRole('button', { name: 'Filter by Skills' });
    const hookTile = screen.getByRole('button', { name: 'Filter by Hooks' });
    expect(skillTile).toHaveTextContent('1');
    expect(hookTile).toHaveTextContent('0');
  });

  it('filters by type via the stat tiles and toggles back', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Agents' }));
    expect(screen.queryByText('My Skill')).not.toBeInTheDocument();
    expect(screen.getByText('My Agent')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Agents' }));
    expect(screen.getByText('My Skill')).toBeInTheDocument();
  });

  it('composes search with the type filter', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    fireEvent.change(screen.getByLabelText('Search resources'), {
      target: { value: 'threat' },
    });
    expect(screen.queryByText('My Skill')).not.toBeInTheDocument();
    expect(screen.getByText('My Agent')).toBeInTheDocument();
  });

  it('filters via the legacy-style tags dropdown with checkboxes', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filter by tags' }));
    const checkbox = screen.getByRole('checkbox', { name: 'security' });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(screen.getByRole('checkbox', { name: 'security' })).toBeChecked();
    // Trigger shows the selected tags
    expect(
      screen.getByRole('button', { name: 'Filter by tags' }),
    ).toHaveTextContent('#security');
    expect(screen.getByText('My Skill')).toBeInTheDocument();
    expect(screen.queryByText('My Agent')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'security' }));
    expect(screen.getByText('My Agent')).toBeInTheDocument();
  });

  it('filters via the AI Tool select', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Filter by AI tool' }));
    fireEvent.click(screen.getByRole('option', { name: /Claude Code/ }));
    expect(screen.getByText('My Skill')).toBeInTheDocument();
    expect(screen.queryByText('My Agent')).not.toBeInTheDocument();
  });

  it('keeps "View source" off the cards — it lives in the drawer', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    // A second click target inside a clickable card, for an action that only
    // matters once you are deciding on a resource.
    expect(screen.queryByLabelText('View source')).not.toBeInTheDocument();
  });

  it('opens the detail drawer on card click', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'View My Agent' }));
    const drawer = screen.getByRole('dialog', { name: 'My Agent' });
    expect(drawer).toHaveTextContent('Reviews threat models');
    expect(drawer).toHaveTextContent('Entity ref');
  });

  it('shows the empty state when the catalog has no resources', () => {
    mockUseResources.mockReturnValue({ items: [], loading: false });
    renderPage();
    expect(screen.getByText('No AI resources found')).toBeInTheDocument();
  });

  it('distinguishes filtered-empty from catalog-empty', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();
    fireEvent.change(screen.getByLabelText('Search resources'), {
      target: { value: 'zzz-no-match' },
    });
    expect(
      screen.getByText('No resources match the current filters.'),
    ).toBeInTheDocument();
  });

  it('shows an error state instead of crashing', () => {
    mockUseResources.mockReturnValue({
      items: undefined,
      loading: false,
      error: new Error('boom'),
    });
    renderPage();
    expect(screen.getByText('Could not load resources')).toBeInTheDocument();
  });

  it('shows skeletons while loading', () => {
    mockUseResources.mockReturnValue({ items: undefined, loading: true });
    renderPage();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('paginates when there are more resources than one page, and closes the drawer', () => {
    const manyItems = Array.from({ length: 25 }, (_, i) =>
      summary({
        entityRef: `airesource:default/item-${i}`,
        name: `item-${i}`,
        title: `Item ${i}`,
      }),
    );
    mockUseResources.mockReturnValue({ items: manyItems, loading: false });
    renderPage();

    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.queryByText('Item 24')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Item 24')).toBeInTheDocument();
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('Item 0')).toBeInTheDocument();
  });

  it('closes the detail drawer', () => {
    mockUseResources.mockReturnValue({ items: ITEMS, loading: false });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'View My Agent' }));
    expect(
      screen.getByRole('dialog', { name: 'My Agent' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(
      screen.queryByRole('dialog', { name: 'My Agent' }),
    ).not.toBeInTheDocument();
  });
});

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResourceCard } from './ResourceCard';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';

jest.mock('@backstage/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

const api = { track: jest.fn(), getInstallCount: jest.fn() };

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: () => api,
}));

jest.mock('../../hooks/useTelemetryCounts', () => ({
  useTelemetryCounts: () => undefined,
}));

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
    children: [],
    parents: [],
    ...overrides,
  };
}

describe('ResourceCard — framework badges', () => {
  it('shows the icon alone, with the tool name on hover rather than inline', () => {
    render(
      <ResourceCard
        resource={summary({ frameworks: ['claude-code'] })}
        onView={jest.fn()}
      />,
    );
    // The label must not take up card width...
    expect(screen.queryByText('Claude Code')).not.toBeInTheDocument();
    // ...but must still be reachable, by pointer and by assistive tech.
    const icon = screen.getByRole('img', { name: 'Claude Code' });
    expect(icon.closest('span')).toHaveAttribute('title', 'Claude Code');
  });

  it('renders an icon for every framework — none are collapsed behind a +N pill', () => {
    render(
      <ResourceCard
        resource={summary({
          frameworks: ['claude-code', 'cursor', 'github-copilot', 'all'],
        })}
        onView={jest.fn()}
      />,
    );
    for (const name of ['Claude Code', 'Cursor', 'GitHub Copilot', 'Universal'])
      expect(screen.getByRole('img', { name })).toBeVisible();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('renders no badge row for a resource with no frameworks', () => {
    render(
      <ResourceCard
        resource={summary({ frameworks: [] })}
        onView={jest.fn()}
      />,
    );

    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});

describe('ResourceCard — telemetry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records nothing on render — browsing the grid is not a view', () => {
    render(<ResourceCard resource={summary({})} onView={jest.fn()} />);

    expect(api.track).not.toHaveBeenCalled();
  });

  it('opens the resource on click, leaving the view to the detail panel', () => {
    const onView = jest.fn();
    render(<ResourceCard resource={summary({})} onView={onView} />);

    fireEvent.click(screen.getByRole('button', { name: /^View / }));

    expect(onView).toHaveBeenCalledWith('airesource:default/x');
    expect(api.track).not.toHaveBeenCalled();
  });

  it('opens the resource on Enter, but not on other keys', () => {
    const onView = jest.fn();
    render(<ResourceCard resource={summary({})} onView={onView} />);
    const card = screen.getByRole('button', { name: /^View / });

    fireEvent.keyDown(card, { key: 'Tab' });
    expect(onView).not.toHaveBeenCalled();

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onView).toHaveBeenCalledWith('airesource:default/x');
  });
});

describe('ResourceCard — relationship chips', () => {
  it('shows a pluralised plugin count on a marketplace', () => {
    render(
      <ResourceCard
        resource={summary({ type: 'marketplace', childCount: 2 })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('2 plugins')).toBeInTheDocument();
  });

  it('shows a singular item count on a plugin', () => {
    render(
      <ResourceCard
        resource={summary({ type: 'plugin', childCount: 1 })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('shows a "part of" chip when the resource has parents', () => {
    render(
      <ResourceCard
        resource={summary({ parents: ['airesource:default/a'] })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('part of 1')).toBeInTheDocument();
  });

  it('uses the singular noun for a single member', () => {
    render(
      <ResourceCard
        resource={summary({ type: 'marketplace', childCount: 1 })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('1 plugin')).toBeInTheDocument();
  });

  it('pluralises the plugin member noun', () => {
    render(
      <ResourceCard
        resource={summary({ type: 'plugin', childCount: 2 })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('shows no member chip when the container is empty', () => {
    render(
      <ResourceCard
        resource={summary({ type: 'marketplace', childCount: 0 })}
        onView={jest.fn()}
      />,
    );
    expect(screen.queryByText(/plugins?$/)).not.toBeInTheDocument();
  });

  it('shows no relationship chip for a childless, parentless resource', () => {
    render(<ResourceCard resource={summary({})} onView={jest.fn()} />);
    expect(screen.queryByText(/part of/)).not.toBeInTheDocument();
    expect(screen.queryByText(/plugins?$/)).not.toBeInTheDocument();
  });
});

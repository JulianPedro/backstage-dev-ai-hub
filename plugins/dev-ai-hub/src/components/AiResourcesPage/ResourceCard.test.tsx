import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ResourceCard } from './ResourceCard';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';

jest.mock('@backstage/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: () => ({ track: jest.fn(), getInstallCount: jest.fn() }),
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
    ...overrides,
  };
}

describe('ResourceCard — framework badge overflow', () => {
  it('renders every badge when there are 2 or fewer frameworks', () => {
    render(
      <ResourceCard
        resource={summary({ frameworks: ['claude-code', 'cursor'] })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('caps at 2 badges and collapses the rest into a +N pill', () => {
    render(
      <ResourceCard
        resource={summary({
          frameworks: ['claude-code', 'cursor', 'github-copilot', 'all'],
        })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.queryByText('GitHub Copilot')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('the overflow pill title lists the hidden framework labels', () => {
    render(
      <ResourceCard
        resource={summary({
          frameworks: ['claude-code', 'cursor', 'github-copilot', 'all'],
        })}
        onView={jest.fn()}
      />,
    );
    expect(screen.getByText('+2')).toHaveAttribute(
      'title',
      'GitHub Copilot, All tools',
    );
  });
});

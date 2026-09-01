import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResourceRelationships } from './ResourceRelationships';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';

jest.mock('@backstage/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
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

const MARKET = summary({
  entityRef: 'airesource:default/market',
  name: 'market',
  title: 'The Market',
  type: 'marketplace',
  children: ['airesource:default/bundle'],
});
const PLUGIN = summary({
  entityRef: 'airesource:default/bundle',
  name: 'bundle',
  title: 'The Bundle',
  type: 'plugin',
  parents: ['airesource:default/market'],
  children: ['airesource:default/skill-a'],
});
const SKILL = summary({
  entityRef: 'airesource:default/skill-a',
  name: 'skill-a',
  title: 'Skill A',
  type: 'skill',
  parents: ['airesource:default/bundle'],
});

const ITEMS = [MARKET, PLUGIN, SKILL];

describe('ResourceRelationships', () => {
  it('lists a marketplace’s plugins under a marketplace-specific label', () => {
    render(
      <ResourceRelationships
        resource={MARKET}
        items={ITEMS}
        onOpen={jest.fn()}
      />,
    );

    expect(screen.getByText('Plugins in this marketplace')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /The Bundle/ }),
    ).toBeInTheDocument();
  });

  it('shows a plugin’s parents ("Part of") and children ("Includes")', () => {
    render(
      <ResourceRelationships
        resource={PLUGIN}
        items={ITEMS}
        onOpen={jest.fn()}
      />,
    );

    expect(screen.getByText('Part of')).toBeInTheDocument();
    expect(screen.getByText('Includes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /The Market/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Skill A/ })).toBeVisible();
  });

  it('navigates via onOpen when a relationship row is clicked', () => {
    const onOpen = jest.fn();
    render(
      <ResourceRelationships resource={SKILL} items={ITEMS} onOpen={onOpen} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /The Bundle/ }));
    expect(onOpen).toHaveBeenCalledWith('airesource:default/bundle');
  });

  it('silently drops a ref absent from the visible set', () => {
    const orphan = summary({
      entityRef: 'airesource:default/orphan',
      name: 'orphan',
      type: 'plugin',
      children: ['airesource:default/missing'],
    });
    render(
      <ResourceRelationships
        resource={orphan}
        items={[orphan]}
        onOpen={jest.fn()}
      />,
    );

    expect(screen.queryByText('Includes')).not.toBeInTheDocument();
  });

  it('silently drops a child of a type the container does not render', () => {
    // A marketplace declaring a skill directly — wrong type by convention.
    const market = summary({
      entityRef: 'airesource:default/m2',
      name: 'm2',
      type: 'marketplace',
      children: ['airesource:default/skill-a'],
    });
    render(
      <ResourceRelationships
        resource={market}
        items={[market, SKILL]}
        onOpen={jest.fn()}
      />,
    );

    expect(
      screen.queryByText('Plugins in this marketplace'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when there are no visible relations', () => {
    const { container } = render(
      <ResourceRelationships
        resource={summary({})}
        items={[]}
        onOpen={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists every marketplace a plugin belongs to under "Part of"', () => {
    const marketA = summary({
      entityRef: 'airesource:default/market-a',
      name: 'market-a',
      title: 'Market A',
      type: 'marketplace',
      children: ['airesource:default/bundle'],
    });
    const marketB = summary({
      entityRef: 'airesource:default/market-b',
      name: 'market-b',
      title: 'Market B',
      type: 'marketplace',
      children: ['airesource:default/bundle'],
    });
    const plugin = summary({
      entityRef: 'airesource:default/bundle',
      name: 'bundle',
      title: 'The Bundle',
      type: 'plugin',
      parents: ['airesource:default/market-a', 'airesource:default/market-b'],
    });

    render(
      <ResourceRelationships
        resource={plugin}
        items={[marketA, marketB, plugin]}
        onOpen={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Market A/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Market B/ })).toBeVisible();
  });
});

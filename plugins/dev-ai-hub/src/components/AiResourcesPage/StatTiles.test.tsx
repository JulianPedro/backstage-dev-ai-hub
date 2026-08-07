import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ResourceType } from '@nospt/plugin-dev-ai-hub-common';
import { StatTiles } from './StatTiles';

jest.mock('@backstage/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

const ZERO_COUNTS: Record<ResourceType, number> = {
  skill: 0,
  agent: 0,
  hook: 0,
  'mcp-config': 0,
  plugin: 0,
  marketplace: 0,
};

describe('StatTiles', () => {
  it('renders one tile per resource type with its count', () => {
    render(
      <StatTiles
        counts={{ ...ZERO_COUNTS, skill: 3, agent: 1 }}
        onToggle={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Filter by Skills' }),
    ).toHaveTextContent('3');
    expect(
      screen.getByRole('button', { name: 'Filter by Agents' }),
    ).toHaveTextContent('1');
  });

  it('marks the active type tile as pressed', () => {
    render(
      <StatTiles
        counts={{ ...ZERO_COUNTS, skill: 2 }}
        activeType="skill"
        onToggle={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Filter by Skills' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Filter by Agents' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle with the type when a tile is clicked', () => {
    const onToggle = jest.fn();
    render(<StatTiles counts={ZERO_COUNTS} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Skills' }));

    expect(onToggle).toHaveBeenCalledWith('skill');
  });

  it('calls onToggle on Enter and Space, but not on other keys', () => {
    const onToggle = jest.fn();
    render(<StatTiles counts={ZERO_COUNTS} onToggle={onToggle} />);
    const tile = screen.getByRole('button', { name: 'Filter by Skills' });

    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: ' ' });
    fireEvent.keyDown(tile, { key: 'Tab' });

    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenNthCalledWith(1, 'skill');
    expect(onToggle).toHaveBeenNthCalledWith(2, 'skill');
  });

  it('titles each tile with its share of the catalog', () => {
    render(
      <StatTiles
        counts={{ ...ZERO_COUNTS, skill: 1, agent: 1 }}
        onToggle={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Filter by Skills' }),
    ).toHaveAttribute('title', '1 of 2 resources (50%)');
  });

  it('avoids dividing by zero when the catalog is empty', () => {
    render(<StatTiles counts={ZERO_COUNTS} onToggle={jest.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Filter by Skills' }),
    ).toHaveAttribute('title', '0 of 0 resources (0%)');
  });
});

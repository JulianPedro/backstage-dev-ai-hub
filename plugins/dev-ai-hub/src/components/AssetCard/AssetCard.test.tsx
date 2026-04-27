import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetCard } from './AssetCard';
import type { AiAssetSummary } from '@julianpedro/plugin-dev-ai-hub-common';

jest.mock('../ToolIcon', () => ({
  ToolIcon: ({ tool }: { tool: string }) => <span data-testid={`tool-icon-${tool}`} />,
}));

const NOW = new Date('2026-03-14T12:00:00Z').getTime();

function makeAsset(overrides?: Partial<AiAssetSummary>): AiAssetSummary {
  return {
    id: 'asset-1',
    providerId: 'provider-1',
    name: 'My Instruction',
    description: 'A helpful coding instruction',
    type: 'instruction',
    tools: ['claude-code'],
    tags: ['python', 'linting'],
    author: 'Test Author',
    version: '1.0.0',
    installCount: 0,
    syncedAt: '2026-03-14T12:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-13T00:00:00Z', // 1 day ago — "New"
    ...overrides,
  };
}

describe('AssetCard', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders asset name and description', () => {
    render(<AssetCard asset={makeAsset()} onView={jest.fn()} onInstall={jest.fn()} />);
    expect(screen.getByText('My Instruction')).toBeInTheDocument();
    expect(screen.getByText('A helpful coding instruction')).toBeInTheDocument();
  });

  it('renders the type label', () => {
    render(<AssetCard asset={makeAsset({ type: 'instruction' })} onView={jest.fn()} onInstall={jest.fn()} />);
    expect(screen.getByText('Instruction')).toBeInTheDocument();
  });

  it('renders the correct type label for each type', () => {
    const types = ['agent', 'skill', 'workflow'] as const;
    const labels = ['Agent', 'Skill', 'Workflow'];

    types.forEach((type, i) => {
      const { unmount } = render(
        <AssetCard asset={makeAsset({ type })} onView={jest.fn()} onInstall={jest.fn()} />,
      );
      expect(screen.getByText(labels[i])).toBeInTheDocument();
      unmount();
    });
  });

  it('renders author and version in the footer', () => {
    render(<AssetCard asset={makeAsset()} onView={jest.fn()} onInstall={jest.fn()} />);
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/Test Author/)).toBeInTheDocument();
  });

  describe('"New" badge', () => {
    it('shows "New" badge when updatedAt is within 14 days', () => {
      const recentDate = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
      render(
        <AssetCard asset={makeAsset({ updatedAt: recentDate })} onView={jest.fn()} onInstall={jest.fn()} />,
      );
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('does not show "New" badge when updatedAt is older than 14 days', () => {
      const oldDate = new Date(NOW - 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days ago
      render(
        <AssetCard asset={makeAsset({ updatedAt: oldDate })} onView={jest.fn()} onInstall={jest.fn()} />,
      );
      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });
  });

  describe('install count display', () => {
    it('does not show install count when installCount is 0', () => {
      render(<AssetCard asset={makeAsset({ installCount: 0 })} onView={jest.fn()} onInstall={jest.fn()} />);
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
      expect(screen.queryByText('🔥')).not.toBeInTheDocument();
    });

    it('shows "↓" arrow with count when installCount > 0 and < 5', () => {
      render(<AssetCard asset={makeAsset({ installCount: 3 })} onView={jest.fn()} onInstall={jest.fn()} />);
      expect(screen.getByText('↓')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows 🔥 emoji when installCount >= 5 (popular threshold)', () => {
      render(<AssetCard asset={makeAsset({ installCount: 5 })} onView={jest.fn()} onInstall={jest.fn()} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 🔥 emoji for installCount > 5', () => {
      render(<AssetCard asset={makeAsset({ installCount: 42 })} onView={jest.fn()} onInstall={jest.fn()} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onView with the asset id when "View details" button is clicked', () => {
      const onView = jest.fn();
      render(<AssetCard asset={makeAsset()} onView={onView} onInstall={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'View details' }));
      expect(onView).toHaveBeenCalledTimes(1);
      expect(onView).toHaveBeenCalledWith('asset-1');
    });

    it('calls onInstall with the asset id when "Install in editor" button is clicked', () => {
      const onInstall = jest.fn();
      render(<AssetCard asset={makeAsset()} onView={jest.fn()} onInstall={onInstall} />);
      fireEvent.click(screen.getByRole('button', { name: 'Install in editor' }));
      expect(onInstall).toHaveBeenCalledTimes(1);
      expect(onInstall).toHaveBeenCalledWith('asset-1');
    });
  });

  describe('tags', () => {
    it('renders tags as chips prefixed with #', () => {
      render(
        <AssetCard asset={makeAsset({ tags: ['python', 'linting'] })} onView={jest.fn()} onInstall={jest.fn()} />,
      );
      expect(screen.getByText('#python')).toBeInTheDocument();
      expect(screen.getByText('#linting')).toBeInTheDocument();
    });

    it('renders at most 3 tags and shows "+N" for the rest', () => {
      render(
        <AssetCard
          asset={makeAsset({ tags: ['a', 'b', 'c', 'd', 'e'] })}
          onView={jest.fn()}
          onInstall={jest.fn()}
        />,
      );
      expect(screen.getByText('#a')).toBeInTheDocument();
      expect(screen.getByText('#b')).toBeInTheDocument();
      expect(screen.getByText('#c')).toBeInTheDocument();
      expect(screen.queryByText('#d')).not.toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('renders no tags section when tags is empty', () => {
      render(<AssetCard asset={makeAsset({ tags: [] })} onView={jest.fn()} onInstall={jest.fn()} />);
      expect(screen.queryByText(/#/)).not.toBeInTheDocument();
    });
  });

  describe('tools', () => {
    it('renders a tool icon for each tool', () => {
      render(
        <AssetCard
          asset={makeAsset({ tools: ['claude-code', 'github-copilot'] })}
          onView={jest.fn()}
          onInstall={jest.fn()}
        />,
      );
      expect(screen.getByTestId('tool-icon-claude-code')).toBeInTheDocument();
      expect(screen.getByTestId('tool-icon-github-copilot')).toBeInTheDocument();
    });

    it('shows "Universal" label for the "all" tool', () => {
      render(
        <AssetCard asset={makeAsset({ tools: ['all'] })} onView={jest.fn()} onInstall={jest.fn()} />,
      );
      expect(screen.getByText('Universal')).toBeInTheDocument();
    });
  });
});

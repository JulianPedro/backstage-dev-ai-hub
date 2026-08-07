import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ToolIcon } from './ToolIcon';

describe('ToolIcon', () => {
  it('renders the universal glyph for "all", labelled and exposed as an image', () => {
    render(<ToolIcon tool="all" />);

    const icon = screen.getByRole('img', { name: 'Universal' });
    expect(icon).toBeInTheDocument();
  });

  it('renders the Cursor mark with its brand colour by default', () => {
    render(<ToolIcon tool="cursor" />);

    const icon = screen.getByRole('img', { name: 'Cursor' });
    expect(icon).toHaveStyle({ color: 'var(--bui-fg-primary)' });
  });

  it('renders the Cursor mark unbranded (inherit) when branded=false', () => {
    render(<ToolIcon tool="cursor" branded={false} />);

    const icon = screen.getByRole('img', { name: 'Cursor' });
    expect(icon).toHaveStyle({ color: 'inherit' });
  });

  it('renders a monochrome brand (Claude Code) using the theme-aware foreground colour', () => {
    render(<ToolIcon tool="claude-code" />);

    const icon = screen.getByRole('img', { name: 'Claude Code' });
    expect(icon).toHaveStyle({ color: 'var(--bui-fg-primary)' });
  });

  it('renders a non-monochrome brand (Google Gemini) using its literal hex, not the theme token', () => {
    render(<ToolIcon tool="google-gemini" />);

    const icon = screen.getByRole('img', { name: 'Google Gemini' });
    expect(icon).not.toHaveStyle({ color: 'var(--bui-fg-primary)' });
    expect(icon.getAttribute('style')).toContain('rgb(142, 117, 178)');
  });

  it('renders unbranded (inherit) for a monochrome brand when branded=false', () => {
    render(<ToolIcon tool="github-copilot" branded={false} />);

    const icon = screen.getByRole('img', { name: 'GitHub Copilot' });
    expect(icon).toHaveStyle({ color: 'inherit' });
  });

  it('applies the requested size to width and height', () => {
    render(<ToolIcon tool="claude-code" size={32} />);

    const icon = screen.getByRole('img', { name: 'Claude Code' });
    expect(icon).toHaveAttribute('width', '32');
    expect(icon).toHaveAttribute('height', '32');
  });

  it('renders nothing for an unrecognised token', () => {
    const { container } = render(<ToolIcon tool={'unknown-tool' as any} />);

    expect(container).toBeEmptyDOMElement();
  });
});

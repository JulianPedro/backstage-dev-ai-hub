import { getTypeMeta, frameworkLabel } from './typeMeta';

describe('getTypeMeta', () => {
  it('resolves the icon component and CSS custom-property tokens for a type', () => {
    const meta = getTypeMeta('skill');

    expect(meta.label).toBe('Skill');
    expect(meta.pluralLabel).toBe('Skills');
    expect(meta.Icon).toBeDefined();
    expect(meta.color).toBe('var(--devaihub-type-skill)');
    expect(meta.colorBg).toBe('var(--devaihub-type-skill-bg)');
    expect(meta.tileFill).toBe('var(--devaihub-tile-skill)');
  });

  it('resolves distinct tokens for every resource type', () => {
    const types = [
      'skill',
      'agent',
      'hook',
      'mcp-config',
      'plugin',
      'marketplace',
    ] as const;

    for (const type of types) {
      const meta = getTypeMeta(type);
      expect(meta.color).toBe(`var(--devaihub-type-${type})`);
      expect(meta.Icon).toBeDefined();
    }
  });
});

describe('frameworkLabel', () => {
  it.each([
    ['claude-code', 'Claude Code'],
    ['github-copilot', 'GitHub Copilot'],
    ['google-gemini', 'Google Gemini'],
    ['cursor', 'Cursor'],
    ['opencode', 'OpenCode'],
    ['all', 'All tools'],
  ])('maps the known token %s to %s', (token, label) => {
    expect(frameworkLabel(token)).toBe(label);
  });

  it('passes an unknown token through unchanged', () => {
    expect(frameworkLabel('zed')).toBe('zed');
  });
});

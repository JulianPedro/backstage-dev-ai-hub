import { getInstallPath, getInstallPathsForAsset } from './installPaths';

describe('getInstallPath', () => {
  describe('claude-code conventions', () => {
    it('instruction → .claude/rules/', () => {
      expect(getInstallPath('instruction', 'claude-code', 'My Rule')).toBe('.claude/rules/my-rule.md');
    });
    it('agent → .claude/agents/', () => {
      expect(getInstallPath('agent', 'claude-code', 'My Agent')).toBe('.claude/agents/my-agent.md');
    });
    it('skill → .claude/skills/<name>/SKILL.md', () => {
      expect(getInstallPath('skill', 'claude-code', 'My Skill')).toBe('.claude/skills/my-skill/SKILL.md');
    });
    it('workflow → .claude/workflows/', () => {
      expect(getInstallPath('workflow', 'claude-code', 'My Workflow')).toBe('.claude/workflows/my-workflow.md');
    });
  });

  describe('github-copilot conventions', () => {
    it('instruction → .github/instructions/*.instructions.md', () => {
      expect(getInstallPath('instruction', 'github-copilot', 'My Rule')).toBe(
        '.github/instructions/my-rule.instructions.md',
      );
    });
    it('agent → .github/agents/*.agent.md', () => {
      expect(getInstallPath('agent', 'github-copilot', 'My Agent')).toBe('.github/agents/my-agent.agent.md');
    });
    it('workflow → .github/workflows/*.workflow.md', () => {
      expect(getInstallPath('workflow', 'github-copilot', 'My Workflow')).toBe(
        '.github/workflows/my-workflow.workflow.md',
      );
    });
  });

  describe('google-gemini conventions', () => {
    it('instruction → GEMINI.md (ignores name)', () => {
      expect(getInstallPath('instruction', 'google-gemini', 'Anything')).toBe('GEMINI.md');
    });
    it('agent → GEMINI.md (ignores name)', () => {
      expect(getInstallPath('agent', 'google-gemini', 'My Agent')).toBe('GEMINI.md');
    });
    it('workflow → .gemini/workflows/', () => {
      expect(getInstallPath('workflow', 'google-gemini', 'My Workflow')).toBe('.gemini/workflows/my-workflow.md');
    });
  });

  describe('cursor conventions', () => {
    it('instruction → .cursor/rules/*.mdc', () => {
      expect(getInstallPath('instruction', 'cursor', 'My Rule')).toBe('.cursor/rules/my-rule.mdc');
    });
    it('skill → .cursor/skills/<name>/SKILL.md', () => {
      expect(getInstallPath('skill', 'cursor', 'My Skill')).toBe('.cursor/skills/my-skill/SKILL.md');
    });
  });

  describe('slug normalization', () => {
    it('lowercases the name', () => {
      expect(getInstallPath('instruction', 'claude-code', 'UPPERCASE')).toBe('.claude/rules/uppercase.md');
    });
    it('replaces spaces with hyphens', () => {
      expect(getInstallPath('instruction', 'claude-code', 'My Fancy Rule')).toBe('.claude/rules/my-fancy-rule.md');
    });
    it('removes special characters', () => {
      expect(getInstallPath('instruction', 'claude-code', 'Rule (v2)!')).toBe('.claude/rules/rule-v2.md');
    });
    it('preserves underscores', () => {
      expect(getInstallPath('instruction', 'claude-code', 'my_rule')).toBe('.claude/rules/my_rule.md');
    });
    it('preserves hyphens', () => {
      expect(getInstallPath('instruction', 'claude-code', 'my-rule')).toBe('.claude/rules/my-rule.md');
    });
  });

  describe('overrides', () => {
    it('installPaths[tool] has highest priority', () => {
      expect(
        getInstallPath('instruction', 'claude-code', 'My Rule', {
          installPaths: { 'claude-code': 'custom/path.md' },
          installPath: 'fallback.md',
        }),
      ).toBe('custom/path.md');
    });

    it('installPath overrides convention when no tool-specific override', () => {
      expect(
        getInstallPath('instruction', 'claude-code', 'My Rule', {
          installPath: 'fallback.md',
        }),
      ).toBe('fallback.md');
    });

    it('uses convention when override exists for a different tool', () => {
      expect(
        getInstallPath('instruction', 'github-copilot', 'My Rule', {
          installPaths: { 'claude-code': 'custom/path.md' },
        }),
      ).toBe('.github/instructions/my-rule.instructions.md');
    });

    it('installPath covers when installPaths misses the tool', () => {
      expect(
        getInstallPath('instruction', 'github-copilot', 'My Rule', {
          installPaths: { 'claude-code': 'custom/path.md' },
          installPath: 'fallback.md',
        }),
      ).toBe('fallback.md');
    });

    it('falls back to convention when no overrides are provided', () => {
      expect(getInstallPath('instruction', 'claude-code', 'My Rule', {})).toBe('.claude/rules/my-rule.md');
    });
  });

  describe('unknown tool', () => {
    it('uses default convention for unrecognised tool identifier', () => {
      expect(getInstallPath('instruction', 'unknown-tool', 'My Rule')).toBe('.ai/instructions/my-rule.md');
    });
  });
});

describe('getInstallPathsForAsset', () => {
  it('returns paths only for the listed tools', () => {
    const paths = getInstallPathsForAsset('instruction', ['claude-code', 'github-copilot'], 'My Rule');
    expect(paths).toEqual({
      'claude-code': '.claude/rules/my-rule.md',
      'github-copilot': '.github/instructions/my-rule.instructions.md',
    });
  });

  it('expands "all" to every known tool', () => {
    const paths = getInstallPathsForAsset('instruction', ['all'], 'My Rule');
    expect(Object.keys(paths).sort()).toEqual(['claude-code', 'cursor', 'github-copilot', 'google-gemini']);
  });

  it('applies per-tool overrides', () => {
    const paths = getInstallPathsForAsset('agent', ['claude-code'], 'My Agent', {
      installPaths: { 'claude-code': 'custom/agent.md' },
    });
    expect(paths['claude-code']).toBe('custom/agent.md');
  });

  it('applies installPath override for every tool', () => {
    const paths = getInstallPathsForAsset('workflow', ['claude-code', 'github-copilot'], 'My Workflow', {
      installPath: 'shared/workflow.md',
    });
    expect(paths['claude-code']).toBe('shared/workflow.md');
    expect(paths['github-copilot']).toBe('shared/workflow.md');
  });

  it('returns an empty object for an empty tools array', () => {
    const paths = getInstallPathsForAsset('instruction', [], 'My Rule');
    expect(paths).toEqual({});
  });
});

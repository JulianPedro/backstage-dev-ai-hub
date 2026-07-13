import {
  ANNOTATION_COMPATIBLE_FRAMEWORKS,
  getBodyShape,
  getFrameworks,
  getResourceInstallPath,
  isResourceType,
  normalizeFramework,
  RESOURCE_TYPE_REGISTRY,
  RESOURCE_TYPES,
} from './resources';

function entity({
  type,
  agents,
  annotation,
}: {
  type?: string;
  agents?: unknown;
  annotation?: string;
}) {
  return {
    metadata: {
      annotations:
        annotation !== undefined
          ? { [ANNOTATION_COMPATIBLE_FRAMEWORKS]: annotation }
          : undefined,
    },
    spec: { type, agents },
  };
}

describe('getFrameworks', () => {
  it('reads native spec.agents for a skill', () => {
    expect(
      getFrameworks(entity({ type: 'skill', agents: ['github-copilot', 'claude-code'] })),
    ).toEqual(['github-copilot', 'claude-code']);
  });

  it('prefers spec.agents over the annotation for a skill', () => {
    expect(
      getFrameworks(
        entity({ type: 'skill', agents: ['cursor'], annotation: 'claude-code' }),
      ),
    ).toEqual(['cursor']);
  });

  it('falls back to the annotation for a skill with empty spec.agents', () => {
    expect(
      getFrameworks(entity({ type: 'skill', agents: [], annotation: 'claude-code' })),
    ).toEqual(['claude-code']);
  });

  it('reads the annotation for non-skill types', () => {
    expect(
      getFrameworks(entity({ type: 'agent', annotation: 'claude-code, cursor' })),
    ).toEqual(['claude-code', 'cursor']);
  });

  it('returns [] when both sources are absent', () => {
    expect(getFrameworks(entity({ type: 'hook' }))).toEqual([]);
  });

  it('passes unknown tokens through', () => {
    expect(
      getFrameworks(entity({ type: 'mcp', annotation: 'claude-code,futuretool' })),
    ).toEqual(['claude-code', 'futuretool']);
  });

  it('normalises aliases and dedupes', () => {
    expect(
      getFrameworks(entity({ type: 'agent', annotation: 'claude, Claude-Code, copilot' })),
    ).toEqual(['claude-code', 'github-copilot']);
  });

  it('ignores non-string entries in spec.agents', () => {
    expect(
      getFrameworks(entity({ type: 'skill', agents: ['claude-code', 42, null] })),
    ).toEqual(['claude-code']);
  });
});

describe('normalizeFramework', () => {
  it.each([
    ['copilot', 'github-copilot'],
    ['claude', 'claude-code'],
    ['gemini', 'google-gemini'],
    [' Cursor ', 'cursor'],
    ['all', 'all'],
    ['somethingelse', 'somethingelse'],
  ])('normalises %s → %s', (input, expected) => {
    expect(normalizeFramework(input)).toBe(expected);
  });
});

describe('RESOURCE_TYPE_REGISTRY', () => {
  it('covers every ResourceType with a consistent entry', () => {
    for (const type of RESOURCE_TYPES) {
      const entry = RESOURCE_TYPE_REGISTRY[type];
      expect(entry).toBeDefined();
      expect(entry.type).toBe(type);
      expect(entry.colorRole).toBe(type);
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.pluralLabel.length).toBeGreaterThan(0);
      expect(entry.icon.length).toBeGreaterThan(0);
    }
  });

  it('assigns each type a distinct icon', () => {
    const icons = RESOURCE_TYPES.map(t => RESOURCE_TYPE_REGISTRY[t].icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('isResourceType', () => {
  it.each(['skill', 'agent', 'hook', 'mcp', 'plugin'])('accepts %s', t => {
    expect(isResourceType(t)).toBe(true);
  });

  it.each(['rule', 'instruction', '', undefined, 42])('rejects %s', t => {
    expect(isResourceType(t)).toBe(false);
  });
});

describe('getBodyShape', () => {
  it('is json only for mcp', () => {
    expect(getBodyShape('mcp')).toBe('json');
    for (const t of ['skill', 'agent', 'hook', 'plugin'] as const) {
      expect(getBodyShape(t)).toBe('markdown');
    }
  });
});

describe('getResourceInstallPath', () => {
  it('resolves per-framework skill directories', () => {
    expect(getResourceInstallPath('skill', 'claude-code', 'approved-github-workflows')).toBe(
      '.claude/skills/approved-github-workflows/',
    );
    expect(getResourceInstallPath('skill', 'cursor', 'x')).toBe('.cursor/skills/x/');
  });

  it('normalises framework aliases', () => {
    expect(getResourceInstallPath('agent', 'claude', 'threat-modeller')).toBe(
      '.claude/agents/threat-modeller.md',
    );
  });

  it('falls back to the default convention for unknown frameworks', () => {
    expect(getResourceInstallPath('agent', 'zed', 'threat-modeller')).toBe(
      '.ai/agents/threat-modeller.md',
    );
  });

  it('points hook and mcp at their settings files', () => {
    expect(getResourceInstallPath('hook', 'claude-code', 'post-edit-lint')).toBe(
      '.claude/settings.json',
    );
    expect(getResourceInstallPath('mcp', 'claude-code', 'grafana-mcp')).toBe('.mcp.json');
  });

  it('is undefined where no convention exists', () => {
    expect(getResourceInstallPath('plugin', 'claude-code', 'bundle')).toBeUndefined();
    expect(getResourceInstallPath('hook', 'github-copilot', 'x')).toBeUndefined();
  });
});

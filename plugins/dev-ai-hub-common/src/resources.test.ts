import {
  ANNOTATION_COMPATIBLE_FRAMEWORKS,
  getBodyShape,
  getFrameworks,
  getMarketplaceAddCommands,
  getMarketplaceInstallTemplate,
  getMarketplaceRepoSlug,
  getMarketplaceTeamSnippet,
  getResourceInstallPath,
  getAgentInstallLinks,
  getMcpInstallLinks,
  hasCopyableBody,
  hasDownloadableArtifact,
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
  it.each(['skill', 'agent', 'hook', 'mcp', 'plugin', 'marketplace'])('accepts %s', t => {
    expect(isResourceType(t)).toBe(true);
  });

  it.each(['rule', 'instruction', '', undefined, 42])('rejects %s', t => {
    expect(isResourceType(t)).toBe(false);
  });
});

describe('getBodyShape', () => {
  it('is json only for mcp', () => {
    expect(getBodyShape('mcp')).toBe('json');
    for (const t of ['skill', 'agent', 'hook', 'plugin', 'marketplace'] as const) {
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
    expect(getResourceInstallPath('marketplace', 'claude-code', 'nos')).toBeUndefined();
  });
});

describe('hasDownloadableArtifact', () => {
  it('is true only where the body is the artifact itself', () => {
    for (const t of ['skill', 'agent', 'hook', 'mcp'] as const) {
      expect(hasDownloadableArtifact(t)).toBe(true);
    }
  });

  it('is false for the pointer-shaped bodies (plugin, marketplace)', () => {
    expect(hasDownloadableArtifact('plugin')).toBe(false);
    expect(hasDownloadableArtifact('marketplace')).toBe(false);
  });
});

describe('hasCopyableBody', () => {
  it('is false only for marketplace — its actionable copies are the journey commands', () => {
    for (const t of ['skill', 'agent', 'hook', 'mcp', 'plugin'] as const) {
      expect(hasCopyableBody(t)).toBe(true);
    }
    expect(hasCopyableBody('marketplace')).toBe(false);
  });
});

describe('getMarketplaceRepoSlug', () => {
  it('derives owner/repo from a GitHub blob URL', () => {
    expect(
      getMarketplaceRepoSlug(
        'url:https://github.com/nosportugal/ai-marketplace/blob/main/docs/marketplace.md',
      ),
    ).toBe('nosportugal/ai-marketplace');
  });

  it('derives owner/repo without the url: prefix', () => {
    expect(getMarketplaceRepoSlug('https://github.com/org/repo')).toBe('org/repo');
  });

  it('strips a .git suffix', () => {
    expect(getMarketplaceRepoSlug('url:https://github.com/org/repo.git')).toBe('org/repo');
  });

  it.each([
    [undefined],
    [''],
    ['not a url'],
    ['url:https://gitlab.com/org/repo/-/blob/main/m.md'],
    ['url:https://github.com/only-owner'],
  ])('is undefined for %s (body-only fallback)', input => {
    expect(getMarketplaceRepoSlug(input as string | undefined)).toBeUndefined();
  });
});

describe('getMarketplaceAddCommands', () => {
  it('produces one command per capable framework', () => {
    const commands = getMarketplaceAddCommands(
      ['claude-code', 'github-copilot'],
      'org/repo',
    );
    expect(commands.map(({ framework, command }) => ({ framework, command }))).toEqual([
      { framework: 'claude-code', command: '/plugin marketplace add org/repo' },
      { framework: 'github-copilot', command: 'copilot plugin marketplace add org/repo' },
    ]);
  });

  it('carries a prefill deep link for Claude Code; Copilot is copy-only', () => {
    const [claude, copilot] = getMarketplaceAddCommands(
      ['claude-code', 'github-copilot'],
      'org/repo',
    );
    expect(claude.deepLinks).toEqual([
      {
        label: 'Claude',
        href: `claude-cli://open?q=${encodeURIComponent('/plugin marketplace add org/repo')}`,
      },
    ]);
    expect(copilot.deepLinks).toEqual([]);
  });

  it('expands "all" and an empty list to every capable framework', () => {
    for (const frameworks of [['all'], []]) {
      expect(getMarketplaceAddCommands(frameworks, 'org/repo').map(c => c.framework)).toEqual([
        'claude-code',
        'github-copilot',
      ]);
    }
  });

  it('produces no row for frameworks without a marketplace concept', () => {
    expect(getMarketplaceAddCommands(['cursor', 'google-gemini'], 'org/repo')).toEqual([]);
  });

  it('normalises aliases', () => {
    const commands = getMarketplaceAddCommands(['claude'], 'org/repo');
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      framework: 'claude-code',
      command: '/plugin marketplace add org/repo',
    });
  });
});

describe('getAgentInstallLinks', () => {
  it('builds Claude, VS Code, and Insiders install links from a GitHub blob URL', () => {
    const rawUrl =
      'https://raw.githubusercontent.com/nosportugal/backstage-plugin-dev-ai-hub/main-nos/examples/agents/api-architect.md';
    const encodedRawUrl = encodeURIComponent(rawUrl);
    expect(
      getAgentInstallLinks(
        'url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/agents/api-architect.md',
        'api-architect',
      ),
    ).toEqual([
      {
        label: 'Claude',
        href: `claude-cli://open?q=${encodeURIComponent(
          `Install this agent: fetch ${rawUrl} and save it to .claude/agents/api-architect.md`,
        )}`,
      },
      { label: 'VS Code', href: `vscode:chat-agent/install?url=${encodedRawUrl}` },
      {
        label: 'VS Code Insiders',
        href: `vscode-insiders:chat-agent/install?url=${encodedRawUrl}`,
      },
    ]);
  });

  it.each([
    [undefined],
    ['not a url'],
    ['url:https://gitlab.com/org/repo/-/blob/main/a.md'],
    ['url:https://github.com/org/repo'],
    ['url:https://github.com/org/repo/tree/main/agents'],
    ['url:https://github.com/org/repo/blob/main'],
  ])('is empty for %s (copy/download fallback)', input => {
    expect(getAgentInstallLinks(input as string | undefined, 'x')).toEqual([]);
  });
});

describe('getMcpInstallLinks', () => {
  const body = JSON.stringify({
    mcpServers: { grafana: { type: 'http', url: 'http://localhost:8080/mcp' } },
  });
  const config = '{"type":"http","url":"http://localhost:8080/mcp"}';

  it('derives host links from the mcpServers body, following frameworks', () => {
    expect(getMcpInstallLinks(['claude-code', 'cursor'], 'grafana-mcp', body)).toEqual([
      {
        label: 'Claude',
        href: `claude-cli://open?q=${encodeURIComponent(
          `Install this MCP server by running: claude mcp add-json grafana '${config}'`,
        )}`,
      },
      {
        label: 'Cursor',
        href: `cursor://anysphere.cursor-deeplink/mcp/install?name=grafana&config=${btoa(config)}`,
      },
    ]);
  });

  it('produces the VS Code pair for github-copilot with the name folded in', () => {
    const links = getMcpInstallLinks(['github-copilot'], 'grafana-mcp', body);
    const vsConfig = encodeURIComponent(
      '{"name":"grafana","type":"http","url":"http://localhost:8080/mcp"}',
    );
    expect(links).toEqual([
      { label: 'VS Code', href: `vscode:mcp/install?${vsConfig}` },
      { label: 'VS Code Insiders', href: `vscode-insiders:mcp/install?${vsConfig}` },
    ]);
  });

  it('expands empty, "all", and unknown-only framework lists to every capable host', () => {
    for (const frameworks of [[], ['all'], ['google-gemini']]) {
      expect(getMcpInstallLinks(frameworks, 'grafana-mcp', body).map(l => l.label)).toEqual(
        ['Claude', 'VS Code', 'VS Code Insiders', 'Cursor'],
      );
    }
  });

  it('accepts a bare config body, naming the server after the resource', () => {
    const links = getMcpInstallLinks(['cursor'], 'grafana-mcp', config);
    expect(links).toEqual([
      {
        label: 'Cursor',
        href: `cursor://anysphere.cursor-deeplink/mcp/install?name=grafana-mcp&config=${btoa(config)}`,
      },
    ]);
  });

  it.each([
    [undefined],
    ['not json'],
    ['"just a string"'],
    ['{"unrelated":true}'],
    [JSON.stringify({ mcpServers: {} })],
    [JSON.stringify({ mcpServers: { a: { url: 'x' }, b: { url: 'y' } } })],
  ])('is empty for body %s (copy fallback)', input => {
    expect(getMcpInstallLinks([], 'grafana-mcp', input as string | undefined)).toEqual([]);
  });
});

describe('marketplace step-two helpers', () => {
  it('templates the plugin-install command on the marketplace name', () => {
    expect(getMarketplaceInstallTemplate('nos-marketplace')).toBe(
      '/plugin install <plugin>@nos-marketplace',
    );
  });

  it('builds a valid extraKnownMarketplaces settings snippet', () => {
    const snippet = getMarketplaceTeamSnippet('nos-marketplace', 'org/repo');
    expect(JSON.parse(snippet)).toEqual({
      extraKnownMarketplaces: {
        'nos-marketplace': { source: { source: 'github', repo: 'org/repo' } },
      },
    });
  });
});

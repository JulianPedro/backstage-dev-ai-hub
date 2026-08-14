import {
  ANNOTATION_COMPATIBLE_FRAMEWORKS,
  getBodyShape,
  getFrameworks,
  getMarketplaceAddCommands,
  getMarketplaceInstallTemplate,
  getMarketplaceRepoSlug,
  getMarketplaceTeamSnippet,
  expandInstallFrameworks,
  getResourceInstallTarget,
  getAgentInstallLinks,
  getMcpInstallLinks,
  getPromptInstallLinks,
  hasCopyableBody,
  hasDownloadableArtifact,
  isResourceType,
  normalizeFramework,
  RESOURCE_TYPE_REGISTRY,
  RESOURCE_TYPES,
  type InstallMode,
  type ResourceType,
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
      getFrameworks(
        entity({ type: 'skill', agents: ['github-copilot', 'claude-code'] }),
      ),
    ).toEqual(['github-copilot', 'claude-code']);
  });

  it('reads native spec.agents for a non-skill type', () => {
    expect(
      getFrameworks(entity({ type: 'agent', agents: ['claude', 'opencode'] })),
    ).toEqual(['claude-code', 'opencode']);
  });

  it('prefers spec.agents over the annotation', () => {
    expect(
      getFrameworks(
        entity({
          type: 'skill',
          agents: ['cursor'],
          annotation: 'claude-code',
        }),
      ),
    ).toEqual(['cursor']);
  });

  it('falls back to the annotation when spec.agents is empty', () => {
    expect(
      getFrameworks(
        entity({ type: 'skill', agents: [], annotation: 'claude-code' }),
      ),
    ).toEqual(['claude-code']);
  });

  it('reads the annotation when spec.agents is absent', () => {
    expect(
      getFrameworks(
        entity({ type: 'agent', annotation: 'claude-code, cursor' }),
      ),
    ).toEqual(['claude-code', 'cursor']);
  });

  it('returns [] when both sources are absent', () => {
    expect(getFrameworks(entity({ type: 'hook' }))).toEqual([]);
  });

  it('passes unknown tokens through', () => {
    expect(
      getFrameworks(
        entity({ type: 'mcp-config', annotation: 'claude-code,futuretool' }),
      ),
    ).toEqual(['claude-code', 'futuretool']);
  });

  it('normalises aliases and dedupes', () => {
    expect(
      getFrameworks(
        entity({ type: 'agent', annotation: 'claude, Claude-Code, copilot' }),
      ),
    ).toEqual(['claude-code', 'github-copilot']);
  });

  it('ignores non-string entries in spec.agents', () => {
    expect(
      getFrameworks(
        entity({ type: 'skill', agents: ['claude-code', 42, null] }),
      ),
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
  it.each(['skill', 'agent', 'hook', 'mcp-config', 'plugin', 'marketplace'])(
    'accepts %s',
    t => {
      expect(isResourceType(t)).toBe(true);
    },
  );

  it.each(['rule', 'instruction', '', undefined, 42])('rejects %s', t => {
    expect(isResourceType(t)).toBe(false);
  });
});

describe('getBodyShape', () => {
  it('is json for mcp-config, plugin and marketplace', () => {
    for (const t of ['mcp-config', 'plugin', 'marketplace'] as const) {
      expect(getBodyShape(t)).toBe('json');
    }
    for (const t of ['skill', 'agent', 'hook'] as const) {
      expect(getBodyShape(t)).toBe('markdown');
    }
  });
});

describe('getResourceInstallTarget', () => {
  /**
   * The full (type × framework) matrix, asserted as one table so a missing
   * combination has to be declared here rather than discovered by a user
   * staring at an empty install dialog. `null` means "deliberately no
   * filesystem convention", not "not done yet".
   */
  const MATRIX: Record<
    ResourceType,
    Record<string, [path: string, mode: InstallMode] | null>
  > = {
    skill: {
      'claude-code': ['.claude/skills/x/', 'drop-in'],
      'github-copilot': ['.github/skills/x/', 'drop-in'],
      'google-gemini': ['.gemini/skills/x/', 'drop-in'],
      cursor: ['.cursor/skills/x/', 'drop-in'],
      opencode: ['.opencode/skills/x/', 'drop-in'],
      default: ['.agents/skills/x/', 'drop-in'],
    },
    agent: {
      'claude-code': ['.claude/agents/x.md', 'drop-in'],
      'github-copilot': ['.github/agents/x.agent.md', 'drop-in'],
      'google-gemini': ['.gemini/agents/x.md', 'drop-in'],
      cursor: ['.cursor/rules/x.mdc', 'drop-in'],
      opencode: ['.opencode/agents/x.md', 'drop-in'],
      default: ['.ai/agents/x.md', 'drop-in'],
    },
    hook: {
      'claude-code': ['.claude/settings.json', 'merge'],
      'github-copilot': ['.github/hooks/x.json', 'drop-in'],
      'google-gemini': ['.gemini/settings.json', 'merge'],
      cursor: ['.cursor/hooks.json', 'merge'],
      // OpenCode has no declarative hook config — hooks are JS/TS plugin
      // modules — so it gets no entry, same as the type's missing `default`.
      opencode: null,
      default: null,
    },
    'mcp-config': {
      'claude-code': ['.mcp.json', 'merge'],
      'github-copilot': ['.vscode/mcp.json', 'merge'],
      'google-gemini': ['.gemini/settings.json', 'merge'],
      cursor: ['.cursor/mcp.json', 'merge'],
      opencode: ['opencode.json', 'merge'],
      default: null,
    },
    // Pointer-shaped bodies install through their framework (ADR-0009/0010).
    plugin: {
      'claude-code': null,
      'github-copilot': null,
      'google-gemini': null,
      cursor: null,
      opencode: null,
      default: null,
    },
    marketplace: {
      'claude-code': null,
      'github-copilot': null,
      'google-gemini': null,
      cursor: null,
      opencode: null,
      default: null,
    },
  };

  it.each(RESOURCE_TYPES)('resolves every framework for %s', type => {
    const expected = Object.fromEntries(
      Object.entries(MATRIX[type]).map(([framework, cell]) => [
        framework,
        cell && { path: cell[0], mode: cell[1] },
      ]),
    );
    const actual = Object.fromEntries(
      Object.keys(MATRIX[type]).map(framework => [
        framework,
        getResourceInstallTarget(type, framework, 'x') ?? null,
      ]),
    );
    expect(actual).toEqual(expected);
  });

  it('never points one host at another host’s directory', () => {
    const OWN_PREFIX: Record<string, string> = {
      'claude-code': '.claude/',
      'github-copilot': '.github/',
      'google-gemini': '.gemini/',
      cursor: '.cursor/',
      opencode: '.opencode/',
    };
    for (const type of ['skill', 'agent'] as const) {
      for (const [framework, prefix] of Object.entries(OWN_PREFIX)) {
        expect(getResourceInstallTarget(type, framework, 'x')?.path).toContain(
          prefix,
        );
      }
    }
  });

  it('normalises framework aliases', () => {
    expect(
      getResourceInstallTarget('agent', 'claude', 'threat-modeller'),
    ).toEqual({ path: '.claude/agents/threat-modeller.md', mode: 'drop-in' });
  });

  it('falls back to the default convention for unknown frameworks', () => {
    expect(getResourceInstallTarget('agent', 'zed', 'threat-modeller')).toEqual(
      {
        path: '.ai/agents/threat-modeller.md',
        mode: 'drop-in',
      },
    );
  });
});

describe('expandInstallFrameworks', () => {
  it('expands `all` to every installable host rather than one row', () => {
    expect(expandInstallFrameworks(['all'])).toEqual([
      'claude-code',
      'github-copilot',
      'google-gemini',
      'cursor',
      'opencode',
    ]);
  });

  it('gives `all` resources a path for hook, which has no default and no OpenCode convention', () => {
    // Regression: `all` previously resolved to a single lookup that missed,
    // so hook resources rendered an empty install dialog.
    const rows = expandInstallFrameworks(['all'])
      .map(f => getResourceInstallTarget('hook', f, 'x'))
      .filter(Boolean);
    expect(rows).toHaveLength(4);
  });

  it('gives `all` resources a path for every installable framework on mcp-config', () => {
    const rows = expandInstallFrameworks(['all'])
      .map(f => getResourceInstallTarget('mcp-config', f, 'x'))
      .filter(Boolean);
    expect(rows).toHaveLength(5);
  });

  it('uses the neutral default when nothing is declared', () => {
    expect(expandInstallFrameworks([])).toEqual(['default']);
  });

  it('passes declared frameworks through, normalised and deduped', () => {
    expect(
      expandInstallFrameworks(['claude', 'claude-code', 'cursor']),
    ).toEqual(['claude-code', 'cursor']);
  });
});

describe('hasDownloadableArtifact', () => {
  it('is true for every type — plugin/marketplace bodies are the manifest itself (ADR-0014)', () => {
    for (const t of RESOURCE_TYPES) {
      expect(hasDownloadableArtifact(t)).toBe(true);
    }
  });
});

describe('hasCopyableBody', () => {
  it('is true for every type — marketplace body is the manifest, not an instructions doc (ADR-0014)', () => {
    for (const t of RESOURCE_TYPES) {
      expect(hasCopyableBody(t)).toBe(true);
    }
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
    expect(getMarketplaceRepoSlug('https://github.com/org/repo')).toBe(
      'org/repo',
    );
  });

  it('strips a .git suffix', () => {
    expect(getMarketplaceRepoSlug('url:https://github.com/org/repo.git')).toBe(
      'org/repo',
    );
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
    expect(
      commands.map(({ framework, command }) => ({ framework, command })),
    ).toEqual([
      { framework: 'claude-code', command: '/plugin marketplace add org/repo' },
      {
        framework: 'github-copilot',
        command: 'copilot plugin marketplace add org/repo',
      },
    ]);
  });

  it('carries a prefill deep link for Claude Code', () => {
    const [claude] = getMarketplaceAddCommands(
      ['claude-code', 'github-copilot'],
      'org/repo',
    );
    expect(claude.deepLinks).toEqual([
      {
        label: 'Claude',
        href: `claude-cli://open?q=${encodeURIComponent(
          '/plugin marketplace add org/repo',
        )}`,
      },
    ]);
  });

  it('carries VS Code add-marketplace launchers for Copilot', () => {
    // Copilot's CLI has no URI scheme, but VS Code 1.113 ships
    // `vscode://chat-plugin/add-marketplace` — the row keeps its terminal
    // command for CLI users and gains editor launchers.
    const [, copilot] = getMarketplaceAddCommands(
      ['claude-code', 'github-copilot'],
      'org/repo',
    );
    expect(copilot.command).toBe('copilot plugin marketplace add org/repo');
    expect(copilot.deepLinks).toEqual([
      {
        label: 'VS Code',
        href: 'vscode://chat-plugin/add-marketplace?ref=org%2Frepo',
      },
      {
        label: 'VS Code Insiders',
        href: 'vscode-insiders://chat-plugin/add-marketplace?ref=org%2Frepo',
      },
    ]);
  });

  it('expands "all" and an empty list to every capable framework', () => {
    for (const frameworks of [['all'], []]) {
      expect(
        getMarketplaceAddCommands(frameworks, 'org/repo').map(c => c.framework),
      ).toEqual(['claude-code', 'github-copilot']);
    }
  });

  it('produces no row for frameworks without a marketplace concept', () => {
    expect(
      getMarketplaceAddCommands(['cursor', 'google-gemini'], 'org/repo'),
    ).toEqual([]);
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
  it('builds Claude, VS Code, Insiders, and Cursor install links from a GitHub blob URL', () => {
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
      {
        label: 'VS Code',
        href: `vscode:chat-agent/install?url=${encodedRawUrl}`,
      },
      {
        label: 'VS Code Insiders',
        href: `vscode-insiders:chat-agent/install?url=${encodedRawUrl}`,
      },
      {
        label: 'Cursor',
        href: `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(
          `Install this agent: fetch ${rawUrl} and save it to .cursor/rules/api-architect.mdc`,
        )}`,
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

  describe('follows the resource’s declared frameworks', () => {
    const blob =
      'url:https://github.com/org/repo/blob/main/agents/api-architect.md';
    const labels = (frameworks: string[]) =>
      getAgentInstallLinks(blob, 'api-architect', frameworks).map(l => l.label);

    it('offers only Claude when only claude-code is declared', () => {
      expect(labels(['claude-code'])).toEqual(['Claude']);
    });

    it('offers only the VS Code pair when only github-copilot is declared', () => {
      expect(labels(['github-copilot'])).toEqual([
        'VS Code',
        'VS Code Insiders',
      ]);
    });

    it('offers a prompt launcher for Cursor, pointed at Cursor’s own path', () => {
      const [link] = getAgentInstallLinks(blob, 'api-architect', ['cursor']);
      expect(link.label).toBe('Cursor');
      expect(link.href).toContain(
        'cursor://anysphere.cursor-deeplink/prompt?text=',
      );
      expect(decodeURIComponent(link.href)).toContain(
        '.cursor/rules/api-architect.mdc',
      );
    });

    it('percent-encodes the prompt so Cursor does not truncate at a raw &', () => {
      const [link] = getAgentInstallLinks(blob, 'api-architect', ['cursor']);
      expect(link.href.split('?text=')[1]).not.toContain('&');
    });

    it('offers nothing for hosts with no launcher at all', () => {
      // Gemini's only prompt URL drives the web app, which cannot write to a
      // local workspace — so it gets no launcher rather than a broken one.
      expect(labels(['google-gemini'])).toEqual([]);
    });

    it('treats `all` and an empty list as unrestricted', () => {
      expect(labels(['all'])).toEqual([
        'Claude',
        'VS Code',
        'VS Code Insiders',
        'Cursor',
      ]);
      expect(labels([])).toEqual([
        'Claude',
        'VS Code',
        'VS Code Insiders',
        'Cursor',
      ]);
    });

    it('resolves aliases before gating', () => {
      expect(labels(['claude'])).toEqual(['Claude']);
    });
  });
});

describe('getPromptInstallLinks', () => {
  // Skills carry a directory (`tree`) source-location, not a blob — the raw
  // file helper returns undefined for these, which is why skill launchers
  // need their own source resolution.
  const tree = 'url:https://github.com/org/repo/tree/main/skills/my-skill/';

  it('offers Claude and Cursor launchers for a tree-shaped skill source', () => {
    expect(
      getPromptInstallLinks('skill', tree, 'my-skill', ['all']).map(
        l => l.label,
      ),
    ).toEqual(['Claude', 'Cursor']);
  });

  it('names each host’s own install path in its prompt', () => {
    const [claude] = getPromptInstallLinks('skill', tree, 'my-skill', [
      'claude-code',
    ]);
    const [cursor] = getPromptInstallLinks('skill', tree, 'my-skill', [
      'cursor',
    ]);
    expect(decodeURIComponent(claude.href)).toContain(
      '.claude/skills/my-skill/',
    );
    expect(decodeURIComponent(cursor.href)).toContain(
      '.cursor/skills/my-skill/',
    );
  });

  it('asks for a merge, never an overwrite, on merge-mode targets', () => {
    const [claude] = getPromptInstallLinks('hook', tree, 'post-edit-lint', [
      'claude-code',
    ]);
    const prompt = decodeURIComponent(claude.href);
    expect(prompt).toContain('merge it into .claude/settings.json');
    expect(prompt).toContain('keeping my existing settings intact');
  });

  it('offers nothing for hosts without a prompt route', () => {
    for (const fw of ['github-copilot', 'google-gemini']) {
      expect(getPromptInstallLinks('skill', tree, 'my-skill', [fw])).toEqual(
        [],
      );
    }
  });

  it('percent-encodes so Cursor does not truncate at a raw &', () => {
    const [cursor] = getPromptInstallLinks('skill', tree, 'my-skill', [
      'cursor',
    ]);
    expect(cursor.href.split('?text=')[1]).not.toContain('&');
  });

  it.each([[undefined], ['not a url'], ['file:///local/path']])(
    'is empty for source %s (copy/download fallback)',
    input => {
      expect(
        getPromptInstallLinks('skill', input as string | undefined, 'x', [
          'all',
        ]),
      ).toEqual([]);
    },
  );
});

describe('getMcpInstallLinks', () => {
  const body = JSON.stringify({
    mcpServers: { grafana: { type: 'http', url: 'http://localhost:8080/mcp' } },
  });
  const config = '{"type":"http","url":"http://localhost:8080/mcp"}';

  it('derives host links from the mcpServers body, following frameworks', () => {
    expect(
      getMcpInstallLinks(['claude-code', 'cursor'], 'grafana-mcp', body),
    ).toEqual([
      {
        label: 'Claude',
        href: `claude-cli://open?q=${encodeURIComponent(
          `Install this MCP config by running: claude mcp add-json grafana '${config}'`,
        )}`,
      },
      {
        label: 'Cursor',
        href: `cursor://anysphere.cursor-deeplink/mcp/install?name=grafana&config=${btoa(
          config,
        )}`,
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
      {
        label: 'VS Code Insiders',
        href: `vscode-insiders:mcp/install?${vsConfig}`,
      },
    ]);
  });

  it('expands empty and "all" framework lists to every capable host', () => {
    for (const frameworks of [[], ['all']]) {
      expect(
        getMcpInstallLinks(frameworks, 'grafana-mcp', body).map(l => l.label),
      ).toEqual(['Claude', 'VS Code', 'VS Code Insiders', 'Cursor']);
    }
  });

  it('offers no links when no declared framework has a handler', () => {
    // Regression: a declared-but-incapable host (Gemini) used to widen to
    // every host, advertising installs the resource never claimed to support.
    expect(getMcpInstallLinks(['google-gemini'], 'grafana-mcp', body)).toEqual(
      [],
    );
    expect(getMcpInstallLinks(['zed'], 'grafana-mcp', body)).toEqual([]);
  });

  it('accepts a bare config body, naming the server after the resource', () => {
    const links = getMcpInstallLinks(['cursor'], 'grafana-mcp', config);
    expect(links).toEqual([
      {
        label: 'Cursor',
        href: `cursor://anysphere.cursor-deeplink/mcp/install?name=grafana-mcp&config=${btoa(
          config,
        )}`,
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
    expect(
      getMcpInstallLinks([], 'grafana-mcp', input as string | undefined),
    ).toEqual([]);
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

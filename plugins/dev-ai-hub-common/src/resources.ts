/**
 * The v2 read contract: AiResource vocabulary, the flat ResourceSummary
 * returned by the backend, and the shared framework resolver (ADR-0003).
 *
 * The legacy asset-model types in `types.ts` coexist with this module until
 * the legacy silo is deleted (slice 8, issue #34).
 */

/** The six canonical `spec.type` values of an AiResource (ADR-0003, ADR-0010). */
export const RESOURCE_TYPES = [
  'skill',
  'agent',
  'hook',
  'mcp',
  'plugin',
  'marketplace',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export function isResourceType(value: unknown): value is ResourceType {
  return (
    typeof value === 'string' &&
    (RESOURCE_TYPES as readonly string[]).includes(value)
  );
}

/** Annotation prefix owned by DevAI Hub. */
export const DEVAIHUB_ANNOTATION_PREFIX = 'devaihub.io';

/** Comma-separated compatible-framework tokens (non-skill read path, ADR-0003). */
export const ANNOTATION_COMPATIBLE_FRAMEWORKS = `${DEVAIHUB_ANNOTATION_PREFIX}/compatible-frameworks`;

/** Optional semantic version string, displayed on cards. */
export const ANNOTATION_VERSION = `${DEVAIHUB_ANNOTATION_PREFIX}/version`;

/** Optional free-form help text shown on the detail panel. */
export const ANNOTATION_HELP = `${DEVAIHUB_ANNOTATION_PREFIX}/help`;

/** Known framework tokens; unknown tokens pass through as-is (ADR-0003). */
export const KNOWN_FRAMEWORKS = [
  'github-copilot',
  'claude-code',
  'cursor',
  'google-gemini',
  'all',
] as const;

export type FrameworkToken = (typeof KNOWN_FRAMEWORKS)[number];

const FRAMEWORK_ALIASES: Record<string, FrameworkToken> = {
  copilot: 'github-copilot',
  claude: 'claude-code',
  gemini: 'google-gemini',
};

/**
 * Normalise a framework token: trim, lowercase, resolve aliases
 * (`claude` → `claude-code`). Unknown tokens pass through literally.
 */
export function normalizeFramework(token: string): string {
  const t = token.trim().toLowerCase();
  return FRAMEWORK_ALIASES[t] ?? t;
}

/**
 * The minimal structural shape of an AiResource entity that the read helpers
 * need. A real `@backstage/catalog-model` `Entity` satisfies it, but keeping
 * the shape local means `-common` (and therefore the frontend) never depends
 * on catalog packages (architecture.md).
 */
export interface AiResourceEntityLike {
  metadata: {
    annotations?: Record<string, string>;
  };
  spec?: {
    type?: unknown;
    /** Native skill subtype field: compatible frameworks. */
    agents?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Resolve the compatible frameworks of an AiResource (ADR-0003):
 * 1. `skill` with a non-empty `spec.agents` → the native field;
 * 2. otherwise → the `devaihub.io/compatible-frameworks` annotation
 *    (also the fallback for a skill whose `spec.agents` is empty/absent);
 * 3. otherwise → `[]`.
 * Tokens are normalised; unknown tokens pass through.
 */
export function getFrameworks(entity: AiResourceEntityLike): string[] {
  if (entity.spec?.type === 'skill' && Array.isArray(entity.spec.agents)) {
    const agents = entity.spec.agents
      .filter((a): a is string => typeof a === 'string')
      .map(normalizeFramework)
      .filter(Boolean);
    if (agents.length > 0) {
      return dedupe(agents);
    }
  }

  const raw = entity.metadata.annotations?.[ANNOTATION_COMPATIBLE_FRAMEWORKS];
  if (!raw) {
    return [];
  }
  return dedupe(raw.split(',').map(normalizeFramework).filter(Boolean));
}

function dedupe(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

/**
 * Icon identifiers for the type→card registry. `-common` is imported by the
 * backend, so it stays React-free: the frontend maps these identifiers to
 * actual icon components.
 */
export type ResourceTypeIcon =
  | 'tools'
  | 'robot'
  | 'flash'
  | 'plug'
  | 'puzzle'
  | 'store';

export interface ResourceTypeInfo {
  type: ResourceType;
  /** Singular display label, e.g. "Skill" (card type caption). */
  label: string;
  /** Plural display label, e.g. "Skills" (stat tiles, filters). */
  pluralLabel: string;
  /** Icon identifier resolved to a component by the frontend. */
  icon: ResourceTypeIcon;
  /**
   * Colour role name; the frontend resolves it to the plugin-owned
   * `--devaihub-type-<role>` custom properties (ADR-0008, NOS palette).
   */
  colorRole: ResourceType;
}

/**
 * The typed type→card registry (ADR-0003/ADR-0008): producer vocabulary and
 * consumer rendering share this single source, so they cannot drift. Adding
 * a type is one entry here plus one CSS token pair in the frontend.
 */
export const RESOURCE_TYPE_REGISTRY: Record<ResourceType, ResourceTypeInfo> = {
  skill: {
    type: 'skill',
    label: 'Skill',
    pluralLabel: 'Skills',
    icon: 'tools',
    colorRole: 'skill',
  },
  agent: {
    type: 'agent',
    label: 'Agent',
    pluralLabel: 'Agents',
    icon: 'robot',
    colorRole: 'agent',
  },
  hook: {
    type: 'hook',
    label: 'Hook',
    pluralLabel: 'Hooks',
    icon: 'flash',
    colorRole: 'hook',
  },
  mcp: {
    type: 'mcp',
    label: 'MCP',
    pluralLabel: 'MCP Servers',
    icon: 'plug',
    colorRole: 'mcp',
  },
  plugin: {
    type: 'plugin',
    label: 'Plugin',
    pluralLabel: 'Plugins',
    icon: 'puzzle',
    colorRole: 'plugin',
  },
  marketplace: {
    type: 'marketplace',
    label: 'Marketplace',
    pluralLabel: 'Marketplaces',
    icon: 'store',
    colorRole: 'marketplace',
  },
};

/**
 * The flat contract the backend returns to the frontend. The frontend never
 * sees a raw Backstage `Entity` — only this (architecture.md).
 */
export interface ResourceSummary {
  entityRef: string;
  name: string;
  title?: string;
  description?: string;
  tags: string[];
  type: ResourceType;
  lifecycle: string;
  owner?: string;
  sourceLocation?: string;
  frameworks: string[];
  version?: string;
  kind: string;
  /** `plugin` dependsOn count; unpopulated until containment lands (issue #32). */
  childCount?: number;
  helpText?: string;
  annotations: Record<string, string>;
}

export interface ResourceListResponse {
  items: ResourceSummary[];
}

/**
 * The shape of a resource's body (CONTEXT.md: bodies are type-shaped, not
 * uniformly markdown). Drives detail-panel rendering: markdown is rendered,
 * json is shown as a copyable code block.
 */
export type BodyShape = 'markdown' | 'json';

export function getBodyShape(type: ResourceType): BodyShape {
  return type === 'mcp' ? 'json' : 'markdown';
}

/**
 * Whether downloading the body delivers the artifact itself. True for the
 * types whose body IS the installable content (skill files, agent
 * definition, hook/mcp config to merge). False for the pointer-shaped
 * bodies: a `plugin` installs through its framework
 * (`/plugin install name@marketplace`) and a `marketplace` is *registered*,
 * not fetched — for both, a download could only deliver the instructions
 * doc, misrepresenting itself as the thing (ADR-0009 amendment, ADR-0010).
 */
export function hasDownloadableArtifact(type: ResourceType): boolean {
  return type !== 'marketplace' && type !== 'plugin';
}

/**
 * Whether copying the body to the clipboard is a meaningful install action.
 * False only for `marketplace`: its body is an instructions doc, and the
 * actionable copies (add command, team snippet) each carry their own copy
 * button — a "Copy content" that delivers the doc misrepresents itself as
 * the marketplace, mirroring the Download reasoning (ADR-0010). A `plugin`
 * body keeps copy: it is the canonical per-framework install guidance.
 */
export function hasCopyableBody(type: ResourceType): boolean {
  return type !== 'marketplace';
}

/**
 * Convention table: (type, framework) → workspace install path for the body.
 * `undefined` means the combination has no filesystem path — a `plugin` body
 * carries its own per-framework install links (ADR-0009), and a `hook`/`mcp`
 * body is merged into a settings file rather than dropped in as a file.
 */
const INSTALL_PATHS: Record<
  ResourceType,
  Record<string, (name: string) => string>
> = {
  skill: {
    'claude-code': name => `.claude/skills/${name}/`,
    'github-copilot': name => `.claude/skills/${name}/`,
    'google-gemini': name => `.claude/skills/${name}/`,
    cursor: name => `.cursor/skills/${name}/`,
    default: name => `.claude/skills/${name}/`,
  },
  agent: {
    'claude-code': name => `.claude/agents/${name}.md`,
    'github-copilot': name => `.github/agents/${name}.agent.md`,
    'google-gemini': () => `GEMINI.md`,
    cursor: name => `.cursor/rules/${name}.mdc`,
    default: name => `.ai/agents/${name}.md`,
  },
  hook: {
    'claude-code': () => `.claude/settings.json`,
  },
  mcp: {
    'claude-code': () => `.mcp.json`,
    'github-copilot': () => `.vscode/mcp.json`,
    'google-gemini': () => `.gemini/settings.json`,
    cursor: () => `.cursor/mcp.json`,
  },
  plugin: {},
  marketplace: {},
};

/**
 * The recommended workspace path to install a resource's body into, for one
 * framework. Returns `undefined` when the (type, framework) pair has no
 * filesystem convention.
 */
export function getResourceInstallPath(
  type: ResourceType,
  framework: string,
  name: string,
): string | undefined {
  const conventions = INSTALL_PATHS[type];
  const fn = conventions[normalizeFramework(framework)] ?? conventions.default;
  return fn?.(name);
}

/*
 * Marketplace journey helpers (ADR-0010). A marketplace installs in two
 * steps — register the catalog with the AI tool, then install plugins from
 * it. Both Claude Code and Copilot CLI read the same
 * `.claude-plugin/marketplace.json` format and address the repo as
 * `owner/repo`; the plugin derives that slug from the mandatory
 * `source-location` (the producer contract requires the body doc to live
 * inside the marketplace repo). No derivation → the UI falls back to the
 * rendered body, which stays canonical.
 */

/** Frameworks with a marketplace-add concept (Cursor/Gemini have none). */
export const MARKETPLACE_CAPABLE_FRAMEWORKS = [
  'claude-code',
  'github-copilot',
] as const;

/**
 * Derive the `owner/repo` slug from a marketplace's `source-location`.
 * GitHub URLs only — other hosts return `undefined` (body-only fallback).
 */
export function getMarketplaceRepoSlug(
  sourceLocation: string | undefined,
): string | undefined {
  if (!sourceLocation) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(sourceLocation.replace(/^url:/, ''));
  } catch {
    return undefined;
  }
  if (url.hostname !== 'github.com') {
    return undefined;
  }
  const [owner, repo] = url.pathname.split('/').filter(Boolean);
  if (!owner || !repo) {
    return undefined;
  }
  return `${owner}/${repo.replace(/\.git$/, '')}`;
}

/**
 * A one-click launcher for an add command: a custom-scheme URL that opens
 * the host app with the command pre-filled in the prompt box. The host
 * never auto-executes it — the user reviews and presses Enter — and an
 * unregistered scheme is a harmless no-op, so these complement the copy
 * button rather than replace it.
 */
export interface ResourceDeepLink {
  /** Host application name; render as "Add in <label>" / "Install in <label>". */
  label: string;
  href: string;
}

export interface MarketplaceAddCommand {
  framework: string;
  command: string;
  deepLinks: ResourceDeepLink[];
}

/**
 * The copyable marketplace-add command per compatible framework. `all`,
 * unknown-only, or empty framework lists expand to every capable framework;
 * frameworks without a marketplace concept produce no row.
 *
 * Claude Code carries a single deep link on the CLI's documented
 * `claude-cli://open?q=` handler, which opens a Claude Code terminal
 * session with the command pre-filled regardless of the user's editor.
 * Copilot has no URI scheme for its CLI, so its row is copy-only.
 */
export function getMarketplaceAddCommands(
  frameworks: string[],
  repoSlug: string,
): MarketplaceAddCommand[] {
  const normalized = dedupe(frameworks.map(normalizeFramework));
  const capable =
    normalized.length === 0 || normalized.includes('all')
      ? [...MARKETPLACE_CAPABLE_FRAMEWORKS]
      : normalized;
  const commands: MarketplaceAddCommand[] = [];
  for (const framework of capable) {
    if (framework === 'claude-code') {
      const command = `/plugin marketplace add ${repoSlug}`;
      commands.push({
        framework,
        command,
        deepLinks: [
          {
            label: 'Claude',
            href: `claude-cli://open?q=${encodeURIComponent(command)}`,
          },
        ],
      });
    } else if (framework === 'github-copilot') {
      commands.push({
        framework,
        command: `copilot plugin marketplace add ${repoSlug}`,
        deepLinks: [],
      });
    }
  }
  return commands;
}

/** The raw-file URL for a GitHub blob `source-location`; else `undefined`. */
function getRawGithubFileUrl(
  sourceLocation: string | undefined,
): string | undefined {
  if (!sourceLocation) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(sourceLocation.replace(/^url:/, ''));
  } catch {
    return undefined;
  }
  if (url.hostname !== 'github.com') {
    return undefined;
  }
  const [owner, repo, marker, ref, ...path] = url.pathname
    .split('/')
    .filter(Boolean);
  if (!owner || !repo || marker !== 'blob' || !ref || path.length === 0) {
    return undefined;
  }
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path.join(
    '/',
  )}`;
}

/**
 * One-click install links for an `agent` resource. VS Code stable and
 * Insiders use the native `chat-agent/install?url=` handler (the mechanism
 * behind awesome-copilot's Install buttons): VS Code downloads the file at
 * `url` and asks the user where to save it. Claude Code uses the
 * `claude-cli://open?q=` handler with an install prompt pre-filled to the
 * convention path — reviewed and sent by the user, never auto-executed.
 * All three derive from the GitHub blob URL in `source-location`; anything
 * else returns `[]` (copy/download fallback).
 */
export function getAgentInstallLinks(
  sourceLocation: string | undefined,
  name: string,
): ResourceDeepLink[] {
  const rawUrl = getRawGithubFileUrl(sourceLocation);
  if (!rawUrl) {
    return [];
  }
  const encodedRawUrl = encodeURIComponent(rawUrl);
  const claudePath = getResourceInstallPath('agent', 'claude-code', name);
  const claudePrompt = encodeURIComponent(
    `Install this agent: fetch ${rawUrl} and save it to ${claudePath}`,
  );
  return [
    { label: 'Claude', href: `claude-cli://open?q=${claudePrompt}` },
    {
      label: 'VS Code',
      href: `vscode:chat-agent/install?url=${encodedRawUrl}`,
    },
    {
      label: 'VS Code Insiders',
      href: `vscode-insiders:chat-agent/install?url=${encodedRawUrl}`,
    },
  ];
}

/**
 * One-click install links for an `mcp` resource, derived from its body —
 * the canonical `.mcp.json` snippet (spec §3.4). VS Code carries a native
 * `vscode:mcp/install?{json}` handler (Insiders scheme twin), Cursor a
 * documented `cursor://anysphere.cursor-deeplink/mcp/install` one, and
 * Claude Code gets a `claude-cli://open?q=` prompt around
 * `claude mcp add-json` — pre-filled, reviewed, never auto-executed.
 * Hosts follow the compatible frameworks (`all`/empty/unknown-only expands
 * to every capable host; Gemini has no handler and gets none). A missing,
 * unparseable, or multi-server body returns `[]` (copy fallback) — the
 * body stays canonical, links are conveniences derived from it.
 */
export function getMcpInstallLinks(
  frameworks: string[],
  resourceName: string,
  bodyContent: string | undefined,
): ResourceDeepLink[] {
  if (!bodyContent) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyContent);
  } catch {
    return [];
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return [];
  }

  let serverName = resourceName;
  let config: Record<string, unknown>;
  const servers = (parsed as { mcpServers?: unknown }).mcpServers;
  if (servers !== undefined) {
    if (typeof servers !== 'object' || servers === null) {
      return [];
    }
    const entries = Object.entries(servers as Record<string, unknown>);
    if (
      entries.length !== 1 ||
      typeof entries[0][1] !== 'object' ||
      entries[0][1] === null
    ) {
      return [];
    }
    serverName = entries[0][0];
    config = entries[0][1] as Record<string, unknown>;
  } else if ('command' in parsed || 'url' in parsed) {
    config = parsed as Record<string, unknown>;
  } else {
    return [];
  }

  const MCP_CAPABLE_FRAMEWORKS = ['claude-code', 'github-copilot', 'cursor'];
  const normalized = dedupe(frameworks.map(normalizeFramework));
  const capable =
    normalized.length === 0 ||
    normalized.includes('all') ||
    !normalized.some(f => MCP_CAPABLE_FRAMEWORKS.includes(f))
      ? MCP_CAPABLE_FRAMEWORKS
      : normalized;

  const configJson = JSON.stringify(config);
  const links: ResourceDeepLink[] = [];
  for (const framework of capable) {
    if (framework === 'claude-code') {
      const prompt = encodeURIComponent(
        `Install this MCP server by running: claude mcp add-json ${serverName} '${configJson}'`,
      );
      links.push({ label: 'Claude', href: `claude-cli://open?q=${prompt}` });
    } else if (framework === 'github-copilot') {
      const vsConfig = encodeURIComponent(
        JSON.stringify({ name: serverName, ...config }),
      );
      links.push({ label: 'VS Code', href: `vscode:mcp/install?${vsConfig}` });
      links.push({
        label: 'VS Code Insiders',
        href: `vscode-insiders:mcp/install?${vsConfig}`,
      });
    } else if (framework === 'cursor') {
      try {
        links.push({
          label: 'Cursor',
          href: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
            serverName,
          )}&config=${btoa(configJson)}`,
        });
      } catch {
        // btoa rejects non-Latin1 config content — skip the Cursor link.
      }
    }
  }
  return links;
}

/**
 * Step two of the journey: how to install a plugin from the marketplace.
 * `marketplaceName` is the entity name, which the producer contract requires
 * to equal the `name` in `marketplace.json`.
 */
export function getMarketplaceInstallTemplate(marketplaceName: string): string {
  return `/plugin install <plugin>@${marketplaceName}`;
}

/**
 * The `.claude/settings.json` snippet a team commits so collaborators are
 * prompted to install the marketplace automatically (Claude Code).
 */
export function getMarketplaceTeamSnippet(
  marketplaceName: string,
  repoSlug: string,
): string {
  return JSON.stringify(
    {
      extraKnownMarketplaces: {
        [marketplaceName]: { source: { source: 'github', repo: repoSlug } },
      },
    },
    null,
    2,
  );
}

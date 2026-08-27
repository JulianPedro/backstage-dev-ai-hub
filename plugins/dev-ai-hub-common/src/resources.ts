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
  'mcp-config',
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

/** Optional free-form help text shown on the detail panel. */
export const ANNOTATION_HELP = `${DEVAIHUB_ANNOTATION_PREFIX}/help`;

/** Known framework tokens; unknown tokens pass through as-is (ADR-0003). */
export const KNOWN_FRAMEWORKS = [
  'github-copilot',
  'claude-code',
  'cursor',
  'google-gemini',
  'opencode',
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
    /** Native compatible-frameworks field, honoured regardless of `spec.type`. */
    agents?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Resolve the compatible frameworks of an AiResource (ADR-0003):
 * 1. a non-empty `spec.agents` → the native field, for any `spec.type`;
 * 2. otherwise → the `devaihub.io/compatible-frameworks` annotation
 *    (also the fallback when `spec.agents` is empty/absent);
 * 3. otherwise → `[]`.
 * Tokens are normalised; unknown tokens pass through. `spec.agents` is
 * preferred over the annotation because it lives on the entity itself
 * rather than in an annotation namespace we may retire.
 */
export function getFrameworks(entity: AiResourceEntityLike): string[] {
  if (Array.isArray(entity.spec?.agents)) {
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
  'mcp-config': {
    type: 'mcp-config',
    label: 'MCP Config',
    pluralLabel: 'MCP Configs',
    icon: 'plug',
    colorRole: 'mcp-config',
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
  /** `plugin`/`marketplace` child count from spec.skills/spec.plugins; unpopulated until containment lands (issue #32). */
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
 * json is pretty-printed and syntax-highlighted (ADR-0014). `plugin` and
 * `marketplace` bodies are the real Claude Code `plugin.json` /
 * `marketplace.json` manifest — not a hand-authored pointer doc, superseding
 * ADR-0010's markdown-only body for `marketplace`.
 */
export type BodyShape = 'markdown' | 'json';

export function getBodyShape(type: ResourceType): BodyShape {
  return type === 'mcp-config' || type === 'plugin' || type === 'marketplace'
    ? 'json'
    : 'markdown';
}

/**
 * Whether downloading the body delivers the artifact itself. True for every
 * type: `plugin`/`marketplace` bodies are now the real manifest JSON, so a
 * download delivers that file itself rather than a non-actionable pointer
 * doc (ADR-0014, superseding ADR-0009's amendment and ADR-0010 on this
 * point).
 */
export function hasDownloadableArtifact(_type: ResourceType): boolean {
  return true;
}

/**
 * Whether copying the body to the clipboard is a meaningful install action.
 * True for every type: `marketplace`'s body is now the real manifest JSON,
 * not an instructions doc, so copying it is no longer a misrepresentation
 * (ADR-0014, superseding ADR-0010 on this point).
 */
export function hasCopyableBody(_type: ResourceType): boolean {
  return true;
}

/**
 * How a body reaches its install path.
 *
 * `drop-in` — the body becomes the file (or directory) at `path`, which is
 * the resource's own; writing it touches nothing else.
 *
 * `merge` — `path` is a shared settings file the user already owns, and the
 * body is a fragment to merge into it. The distinction is not cosmetic:
 * following a `merge` target as if it were a `drop-in` overwrites the user's
 * existing configuration, so the UI must never present the two identically.
 */
export type InstallMode = 'drop-in' | 'merge';

export interface ResourceInstallTarget {
  /** Workspace-relative path. */
  path: string;
  mode: InstallMode;
}

/**
 * The concrete framework tokens a body can be installed into — `all` is a
 * wildcard over these, never a destination itself.
 */
export const INSTALLABLE_FRAMEWORKS = [
  'claude-code',
  'github-copilot',
  'google-gemini',
  'cursor',
  'opencode',
] as const;

/**
 * Convention table: (type, framework) → where the body goes and how.
 * A missing entry means the pair has no filesystem convention — `plugin` and
 * `marketplace` bodies are pointers that install through their framework
 * (ADR-0009, ADR-0010), so they carry install commands rather than paths.
 */
const INSTALL_PATHS: Record<
  ResourceType,
  Record<string, { mode: InstallMode; path: (name: string) => string }>
> = {
  // Every host reads a skill as a self-contained directory. Copilot also
  // picks up `.claude/skills`, but each tool's own path is what we recommend;
  // `.agents/skills` is the cross-tool alias Copilot and Gemini both honour,
  // which makes it the right answer for an unrecognised framework.
  skill: {
    'claude-code': { mode: 'drop-in', path: name => `.claude/skills/${name}/` },
    'github-copilot': {
      mode: 'drop-in',
      path: name => `.github/skills/${name}/`,
    },
    'google-gemini': {
      mode: 'drop-in',
      path: name => `.gemini/skills/${name}/`,
    },
    cursor: { mode: 'drop-in', path: name => `.cursor/skills/${name}/` },
    opencode: { mode: 'drop-in', path: name => `.opencode/skills/${name}/` },
    default: { mode: 'drop-in', path: name => `.agents/skills/${name}/` },
  },
  agent: {
    'claude-code': {
      mode: 'drop-in',
      path: name => `.claude/agents/${name}.md`,
    },
    'github-copilot': {
      mode: 'drop-in',
      path: name => `.github/agents/${name}.agent.md`,
    },
    'google-gemini': {
      mode: 'drop-in',
      path: name => `.gemini/agents/${name}.md`,
    },
    cursor: { mode: 'drop-in', path: name => `.cursor/rules/${name}.mdc` },
    opencode: { mode: 'drop-in', path: name => `.opencode/agents/${name}.md` },
    default: { mode: 'drop-in', path: name => `.ai/agents/${name}.md` },
  },
  // All four hosts have a hook system, but only Copilot gives each hook its
  // own file; the rest register hooks inside a shared settings document.
  // OpenCode has no declarative hook config at all — hooks are exclusively
  // JS/TS plugin modules — so it deliberately carries no entry here, the same
  // way it carries no `default`.
  hook: {
    'claude-code': { mode: 'merge', path: () => `.claude/settings.json` },
    'github-copilot': {
      mode: 'drop-in',
      path: name => `.github/hooks/${name}.json`,
    },
    'google-gemini': { mode: 'merge', path: () => `.gemini/settings.json` },
    cursor: { mode: 'merge', path: () => `.cursor/hooks.json` },
  },
  'mcp-config': {
    'claude-code': { mode: 'merge', path: () => `.mcp.json` },
    'github-copilot': { mode: 'merge', path: () => `.vscode/mcp.json` },
    'google-gemini': { mode: 'merge', path: () => `.gemini/settings.json` },
    cursor: { mode: 'merge', path: () => `.cursor/mcp.json` },
    opencode: { mode: 'merge', path: () => `opencode.json` },
  },
  plugin: {},
  marketplace: {},
};

/**
 * Where a resource's body installs for one framework, and whether that path
 * is the body's own file or a settings file to merge into. Returns
 * `undefined` when the (type, framework) pair has no filesystem convention.
 */
export function getResourceInstallTarget(
  type: ResourceType,
  framework: string,
  name: string,
): ResourceInstallTarget | undefined {
  const conventions = INSTALL_PATHS[type];
  const entry =
    conventions[normalizeFramework(framework)] ?? conventions.default;
  return entry ? { path: entry.path(name), mode: entry.mode } : undefined;
}

/**
 * The frameworks to show install paths for. An empty list means the resource
 * declared no compatibility and gets the neutral `default` convention; `all`
 * is a wildcard and expands to every installable host, so it never collapses
 * to a single row — or, for types with no `default`, to no rows at all.
 */
export function expandInstallFrameworks(frameworks: string[]): string[] {
  const normalized = dedupe(frameworks.map(normalizeFramework));
  if (normalized.length === 0) {
    return ['default'];
  }
  if (normalized.includes('all')) {
    return [...INSTALLABLE_FRAMEWORKS];
  }
  return normalized;
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
 * Narrow a resource's declared frameworks to those a given journey can
 * actually launch. A deep link is a claim about compatibility: offering
 * "Install in Claude" for a resource that never declared `claude-code` tells
 * the user something untrue about the resource.
 *
 * `all` and an empty list both mean "unrestricted" and expand to every
 * capable host. Anything else is intersected, so a declared framework with no
 * handler (Gemini) — or an unknown token — yields no links rather than
 * silently widening to every host.
 */
export function resolveCapableFrameworks(
  declared: string[],
  capable: readonly string[],
): string[] {
  const normalized = dedupe(declared.map(normalizeFramework));
  if (normalized.length === 0 || normalized.includes('all')) {
    return [...capable];
  }
  return normalized.filter(f => capable.includes(f));
}

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
 *
 * Copilot's CLI still has no URI scheme, but Copilot's *other* surface does:
 * VS Code 1.113 ships `vscode://chat-plugin/add-marketplace?ref=`, which
 * accepts a plain or base64 `owner/repo` and always shows a confirmation
 * dialog before registering the marketplace (it also dedupes against the
 * user's existing entries). So the Copilot row keeps its terminal command for
 * CLI users *and* gains editor launchers, mirroring how `mcp-config` already
 * maps `github-copilot` onto the VS Code stable/Insiders pair.
 */
export function getMarketplaceAddCommands(
  frameworks: string[],
  repoSlug: string,
): MarketplaceAddCommand[] {
  const capable = resolveCapableFrameworks(
    frameworks,
    MARKETPLACE_CAPABLE_FRAMEWORKS,
  );
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
      const ref = encodeURIComponent(repoSlug);
      commands.push({
        framework,
        command: `copilot plugin marketplace add ${repoSlug}`,
        deepLinks: [
          {
            label: 'VS Code',
            href: `vscode://chat-plugin/add-marketplace?ref=${ref}`,
          },
          {
            label: 'VS Code Insiders',
            href: `vscode-insiders://chat-plugin/add-marketplace?ref=${ref}`,
          },
        ],
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
 * A launcher that opens an agent with an install prompt pre-filled. Neither
 * host auto-executes: the user reads the prompt and presses Enter. Claude Code
 * and Cursor are the two tools exposing a generic prompt URI — Copilot's
 * editor has purpose-built routes but no prompt handler, and Gemini has
 * neither (its `gemini.google.com/app?prompt=` link drives the web app, which
 * cannot write to a local workspace).
 *
 * Cursor truncates a deeplink at the first raw `&`, so the prompt must be
 * percent-encoded — `encodeURIComponent` handles that. Cursor also caps the
 * URL at ~8000 characters; these prompts are a URL plus a path, far under it.
 */
function claudePromptLink(prompt: string): ResourceDeepLink {
  return {
    label: 'Claude',
    href: `claude-cli://open?q=${encodeURIComponent(prompt)}`,
  };
}

function cursorPromptLink(prompt: string): ResourceDeepLink {
  return {
    label: 'Cursor',
    href: `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(
      prompt,
    )}`,
  };
}

/**
 * Frameworks with a one-click agent-install handler (Gemini has none).
 * OpenCode's Desktop app does register a real `opencode://` scheme, but every
 * route (`open-project`, `new-session`) requires an absolute local
 * `directory` param a web page cannot supply, so it's excluded here too.
 */
export const AGENT_LINK_CAPABLE_FRAMEWORKS = [
  'claude-code',
  'github-copilot',
  'cursor',
] as const;

/** Hosts reachable by a generic prompt URI — the only route for skill/hook. */
export const PROMPT_LINK_CAPABLE_FRAMEWORKS = [
  'claude-code',
  'cursor',
] as const;

/**
 * The plain http(s) URL behind a `source-location`. Unlike
 * `getRawGithubFileUrl` this accepts **directory (`tree`) URLs**, which is what
 * a multi-file `skill` actually carries — a raw-file URL would resolve to
 * `undefined` for exactly the type that most needs a launcher.
 */
function getSourceUrl(sourceLocation: string | undefined): string | undefined {
  if (!sourceLocation) {
    return undefined;
  }
  try {
    const url = new URL(sourceLocation.replace(/^url:/, ''));
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One-click launchers for the types with no purpose-built install route —
 * `skill` and `hook`. Both ride the generic prompt handlers, so the prompt
 * names the *host's own* install path and respects its install mode: a `merge`
 * target is asked to be merged into, never overwritten, so a launcher can
 * never cost the user their existing settings.
 *
 * Returns `[]` when the source URL cannot be derived, or for hosts with no
 * prompt route (Copilot, Gemini) — the path list and copy/download remain.
 */
export function getPromptInstallLinks(
  type: ResourceType,
  sourceLocation: string | undefined,
  name: string,
  frameworks: string[] = [],
): ResourceDeepLink[] {
  return getInstallSteps(type, sourceLocation, name, frameworks)
    .map(step => step.link)
    .filter((link): link is ResourceDeepLink => !!link);
}

/**
 * Everything a single host needs to install a resource: where the body goes,
 * the prompt that puts it there, and a launcher when the host has a URI to
 * launch.
 *
 * `link` is absent for hosts with no prompt route — Copilot and Gemini. That
 * absence is why the step carries `prompt` as text: a host without a URI is
 * not a host without an install path, and the same instruction that a launcher
 * would pre-fill can be pasted into that agent by hand. Every declared
 * framework therefore gets something actionable, not a bare path.
 */
export interface ResourceInstallStep {
  framework: string;
  target: ResourceInstallTarget;
  /** The install instruction, ready to run in that host's agent. */
  prompt: string;
  /** One-click launcher, where the host exposes a generic prompt URI. */
  link?: ResourceDeepLink;
}

export function getInstallSteps(
  type: ResourceType,
  sourceLocation: string | undefined,
  name: string,
  frameworks: string[] = [],
): ResourceInstallStep[] {
  const sourceUrl = getSourceUrl(sourceLocation);
  if (!sourceUrl) {
    return [];
  }
  const label = RESOURCE_TYPE_REGISTRY[type].label.toLowerCase();
  const steps: ResourceInstallStep[] = [];
  for (const framework of expandInstallFrameworks(frameworks)) {
    const target = getResourceInstallTarget(type, framework, name);
    if (!target) {
      continue;
    }
    const prompt =
      target.mode === 'merge'
        ? `Install the "${name}" ${label}: fetch ${sourceUrl} and merge it into ${target.path}, keeping my existing settings intact.`
        : `Install the "${name}" ${label}: fetch ${sourceUrl} and save it to ${target.path}.`;
    let link: ResourceDeepLink | undefined;
    if (framework === 'claude-code') {
      link = claudePromptLink(prompt);
    } else if (framework === 'cursor') {
      link = cursorPromptLink(prompt);
    }
    steps.push({ framework, target, prompt, link });
  }
  return steps;
}

/** Frameworks with a one-click MCP-install handler (Gemini has none). */
export const MCP_LINK_CAPABLE_FRAMEWORKS = [
  'claude-code',
  'github-copilot',
  'cursor',
] as const;

/**
 * One-click install links for an `agent` resource, restricted to the
 * resource's own compatible frameworks. VS Code stable and Insiders use the
 * native `chat-agent/install?url=` handler (the mechanism behind
 * awesome-copilot's Install buttons) and are Copilot's hosts, so they follow
 * `github-copilot`: VS Code downloads the file at `url` and asks the user
 * where to save it. Claude Code uses the `claude-cli://open?q=` handler with
 * an install prompt pre-filled to the convention path — reviewed and sent by
 * the user, never auto-executed. All derive from the GitHub blob URL in
 * `source-location`; anything else returns `[]` (copy/download fallback).
 */
export function getAgentInstallLinks(
  sourceLocation: string | undefined,
  name: string,
  frameworks: string[] = [],
): ResourceDeepLink[] {
  const rawUrl = getRawGithubFileUrl(sourceLocation);
  if (!rawUrl) {
    return [];
  }
  const capable = resolveCapableFrameworks(
    frameworks,
    AGENT_LINK_CAPABLE_FRAMEWORKS,
  );
  const encodedRawUrl = encodeURIComponent(rawUrl);
  const installPrompt = (framework: string) => {
    const target = getResourceInstallTarget('agent', framework, name);
    return `Install this agent: fetch ${rawUrl} and save it to ${target?.path}`;
  };
  const links: ResourceDeepLink[] = [];
  for (const framework of capable) {
    if (framework === 'claude-code') {
      links.push(claudePromptLink(installPrompt('claude-code')));
    } else if (framework === 'cursor') {
      links.push(cursorPromptLink(installPrompt('cursor')));
    } else if (framework === 'github-copilot') {
      links.push({
        label: 'VS Code',
        href: `vscode:chat-agent/install?url=${encodedRawUrl}`,
      });
      links.push({
        label: 'VS Code Insiders',
        href: `vscode-insiders:chat-agent/install?url=${encodedRawUrl}`,
      });
    }
  }
  return links;
}

/**
 * One-click install links for an `mcp-config` resource, derived from its body —
 * the canonical `.mcp.json` snippet (spec §3.4). VS Code carries a native
 * `vscode:mcp/install?{json}` handler (Insiders scheme twin), Cursor a
 * documented `cursor://anysphere.cursor-deeplink/mcp/install` one, and
 * Claude Code gets a `claude-cli://open?q=` prompt around
 * `claude mcp add-json` — pre-filled, reviewed, never auto-executed.
 * Hosts follow the resource's own compatible frameworks: `all`/empty expand
 * to every capable host, anything else is intersected, so an mcp-config
 * declaring only Gemini (no handler) gets no links rather than every host's.
 * A missing, unparseable, or multi-server body returns `[]` (copy fallback) —
 * the body stays canonical, links are conveniences derived from it.
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

  const capable = resolveCapableFrameworks(
    frameworks,
    MCP_LINK_CAPABLE_FRAMEWORKS,
  );

  const configJson = JSON.stringify(config);
  const links: ResourceDeepLink[] = [];
  for (const framework of capable) {
    if (framework === 'claude-code') {
      const prompt = encodeURIComponent(
        `Install this MCP config by running: claude mcp add-json ${serverName} '${configJson}'`,
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

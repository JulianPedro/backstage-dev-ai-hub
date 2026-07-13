/**
 * The v2 read contract: AiResource vocabulary, the flat ResourceSummary
 * returned by the backend, and the shared framework resolver (ADR-0003).
 *
 * The legacy asset-model types in `types.ts` coexist with this module until
 * the legacy silo is deleted (slice 8, issue #34).
 */

/** The five canonical `spec.type` values of an AiResource (ADR-0003). */
export const RESOURCE_TYPES = [
  'skill',
  'agent',
  'hook',
  'mcp',
  'plugin',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export function isResourceType(value: unknown): value is ResourceType {
  return (
    typeof value === 'string' && (RESOURCE_TYPES as readonly string[]).includes(value)
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
export type ResourceTypeIcon = 'tools' | 'robot' | 'flash' | 'plug' | 'puzzle';

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
  skill: { type: 'skill', label: 'Skill', pluralLabel: 'Skills', icon: 'tools', colorRole: 'skill' },
  agent: { type: 'agent', label: 'Agent', pluralLabel: 'Agents', icon: 'robot', colorRole: 'agent' },
  hook: { type: 'hook', label: 'Hook', pluralLabel: 'Hooks', icon: 'flash', colorRole: 'hook' },
  mcp: { type: 'mcp', label: 'MCP', pluralLabel: 'MCP Servers', icon: 'plug', colorRole: 'mcp' },
  plugin: { type: 'plugin', label: 'Plugin', pluralLabel: 'Plugins', icon: 'puzzle', colorRole: 'plugin' },
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

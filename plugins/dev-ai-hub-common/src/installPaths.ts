import type { AssetType, AiTool } from './types';

/** Sanitize asset name for use in file paths */
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

/**
 * Convention table: (type, tool) → install path template.
 * Returns the recommended filesystem path for an asset given the target tool.
 *
 * Priority: installPaths[tool] > installPath > convention below.
 */
const CONVENTIONS: Record<AssetType, Record<AiTool | 'default', (name: string) => string>> = {
  instruction: {
    'claude-code':    name => `.claude/rules/${name}.md`,
    'github-copilot': name => `.github/instructions/${name}.instructions.md`,
    'google-gemini':  _    => `GEMINI.md`,
    'cursor':         name => `.cursor/rules/${name}.mdc`,
    'all':            name => `.ai/instructions/${name}.md`,
    'default':        name => `.ai/instructions/${name}.md`,
  },
  agent: {
    'claude-code':    name => `.claude/agents/${name}.md`,
    'github-copilot': name => `.github/agents/${name}.agent.md`,
    'google-gemini':  _    => `GEMINI.md`,
    'cursor':         name => `.cursor/rules/${name}.mdc`,
    'all':            name => `.ai/agents/${name}.md`,
    'default':        name => `.ai/agents/${name}.md`,
  },
  skill: {
    'claude-code':    name => `.claude/skills/${name}/SKILL.md`,
    'github-copilot': name => `.claude/skills/${name}/SKILL.md`,
    'google-gemini':  name => `.claude/skills/${name}/SKILL.md`,
    'cursor':         name => `.cursor/skills/${name}/SKILL.md`,
    'all':            name => `.claude/skills/${name}/SKILL.md`,
    'default':        name => `.claude/skills/${name}/SKILL.md`,
  },
  workflow: {
    'claude-code':    name => `.claude/workflows/${name}.md`,
    'github-copilot': name => `.github/workflows/${name}.workflow.md`,
    'google-gemini':  name => `.gemini/workflows/${name}.md`,
    'cursor':         name => `.cursor/rules/${name}.mdc`,
    'all':            name => `.ai/workflows/${name}.md`,
    'default':        name => `.ai/workflows/${name}.md`,
  },
};

export interface InstallPathOverrides {
  /** Single path override — applies to all tools when installPaths has no entry for the tool */
  installPath?: string;
  /** Per-tool path overrides — highest priority */
  installPaths?: Record<string, string>;
}

/**
 * Returns the recommended install path for an asset in a given tool's workspace.
 * Resolution order: installPaths[tool] > installPath > built-in convention.
 */
export function getInstallPath(
  type: AssetType,
  tool: AiTool | string,
  name: string,
  overrides?: InstallPathOverrides,
): string {
  if (overrides?.installPaths?.[tool]) return overrides.installPaths[tool];
  if (overrides?.installPath) return overrides.installPath;

  const slug = toSlug(name);
  const toolConventions = CONVENTIONS[type];
  const fn = toolConventions[tool as AiTool] ?? toolConventions.default;
  return fn(slug);
}

/**
 * Returns install paths for all tools in the asset's tools list.
 * If tools contains 'all', returns paths for every known tool.
 */
export function getInstallPathsForAsset(
  type: AssetType,
  tools: (AiTool | string)[],
  name: string,
  overrides?: InstallPathOverrides,
): Record<string, string> {
  const ALL_TOOLS: AiTool[] = ['claude-code', 'github-copilot', 'google-gemini', 'cursor'];
  const resolvedTools = tools.includes('all') ? ALL_TOOLS : tools;

  return Object.fromEntries(
    resolvedTools.map(tool => [tool, getInstallPath(type, tool, name, overrides)]),
  );
}

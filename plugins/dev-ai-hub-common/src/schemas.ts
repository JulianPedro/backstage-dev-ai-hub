import { z } from 'zod';

export const AiToolEnum = z.enum([
  'all',
  'github-copilot',
  'claude-code',
  'google-gemini',
  'cursor',
]);

export const AssetTypeEnum = z.enum([
  'instruction',
  'agent',
  'skill',
  'workflow',
  'prompt',
  'bundle',
]);

/**
 * Schema for the YAML metadata file (.yaml) that acts as an envelope.
 * The actual asset content lives in the referenced .md file.
 */
export const AiAssetFrontmatterSchema = z
  .object({
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.string().optional(),
    name: z.string().min(1).max(200),
    /** Human-readable display label shown in the UI. Falls back to `name` when omitted. */
    label: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(500),
    type: AssetTypeEnum,
    tools: z.array(AiToolEnum).min(1),
    tags: z.array(z.string()).optional().default([]),
    author: z.string().optional().default('Unknown'),
    icon: z.string().optional(),
    version: z.string().optional().default('1.0.0'),
    updatedAt: z.string().optional(),
    // install path overrides
    installPath: z.string().optional(),
    installPaths: z.record(z.string()).optional(),
    // skill-specific
    resources: z.array(z.string()).optional(),
    // bundle-specific
    items: z.array(z.object({ ref: z.string() })).optional(),
    // usage guide — markdown shown when the user clicks the help button
    help: z.string().optional(),
    // agent-specific: model identifier (e.g. "claude-opus-4-5", "gpt-4o")
    model: z.string().optional(),
    // MCP servers required by this agent/skill
    mcps: z.array(
      z.union([
        z.string(),
        z.object({ id: z.string(), name: z.string().optional(), icon: z.string().optional() }),
      ]),
    ).optional(),
  })
  .passthrough();

export type AiAssetFrontmatter = z.infer<typeof AiAssetFrontmatterSchema>;

/**
 * Schema for the mcp-catalog.yaml file placed at the root of a provider repository.
 * Defines external MCP servers that users can install with one click.
 */
export const McpCatalogFileSchema = z.object({
  servers: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      type: z.enum(['http', 'stdio']),
      url: z.string().optional(),
      command: z.string().optional(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
    }),
  ),
});

export type McpCatalogFile = z.infer<typeof McpCatalogFileSchema>;
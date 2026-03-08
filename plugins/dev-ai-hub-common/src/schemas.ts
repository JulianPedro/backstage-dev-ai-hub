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
    // instruction-specific
    applyTo: z.string().optional(),
    // agent-specific
    model: z.string().optional(),
    mcpServers: z.record(z.unknown()).optional(),
    // skill-specific
    resources: z.array(z.string()).optional(),
    // workflow-specific
    steps: z
      .array(z.object({ name: z.string(), action: z.string() }))
      .optional(),
  })
  .passthrough();

export type AiAssetFrontmatter = z.infer<typeof AiAssetFrontmatterSchema>;

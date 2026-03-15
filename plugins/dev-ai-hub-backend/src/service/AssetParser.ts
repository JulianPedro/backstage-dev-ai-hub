import yaml from 'js-yaml';
import path from 'path';
import { AiAssetFrontmatterSchema } from '@internal/plugin-dev-ai-hub-common';
import type { AiAssetFrontmatter } from '@internal/plugin-dev-ai-hub-common';
import type { AiAssetInput } from '../types';

export interface ParsedAssetMeta {
  meta: AiAssetFrontmatter;
  /** Resolved path of the .md content file within the repo tree */
  mdPath: string;
  yamlRaw: string;
}

export class AssetParser {
  /**
   * Parse the YAML metadata file (the envelope).
   * Returns null when the YAML is invalid or missing required fields.
   */
  static parseYaml(
    yamlContent: string,
    yamlFilePath: string,
  ): ParsedAssetMeta | null {
    let data: unknown;
    try {
      data = yaml.load(yamlContent);
    } catch {
      return null;
    }

    const result = AiAssetFrontmatterSchema.safeParse(data);
    if (!result.success) {
      return null;
    }

    const meta = result.data;

    // Resolve .md path: use the `content` field, or fall back to <same-name>.md
    const mdReference =
      meta.content ?? `${path.basename(yamlFilePath, '.yaml')}.md`;
    const mdPath = path.posix.join(
      path.posix.dirname(yamlFilePath),
      mdReference,
    );

    return { meta, mdPath, yamlRaw: yamlContent };
  }

  /**
   * Build the full AiAssetInput from parsed metadata + raw markdown content.
   * The mdContent is stored verbatim — never modified.
   */
  static buildAsset(
    parsed: ParsedAssetMeta,
    mdContent: string,
    providerId: string,
    repoUrl: string,
    branch: string,
    yamlFilePath: string,
  ): AiAssetInput {
    const { meta } = parsed;

    // Extract type-specific extra fields into metadata
    const metadata: Record<string, unknown> = {};
    if (meta.mcpServers) metadata.mcpServers = meta.mcpServers;
    if (meta.steps) metadata.steps = meta.steps;
    if (meta.resources) metadata.resources = meta.resources;

    return {
      id: AssetParser.buildId(providerId, yamlFilePath),
      providerId,
      name: meta.name,
      description: meta.description,
      type: meta.type,
      tools: meta.tools,
      tags: meta.tags ?? [],
      author: meta.author ?? 'Unknown',
      icon: meta.icon,
      version: meta.version ?? '1.0.0',
      applyTo: meta.applyTo,
      model: meta.model,
      installPath: meta.installPath,
      installPaths: meta.installPaths,
      content: mdContent,
      yamlRaw: parsed.yamlRaw,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      yamlPath: yamlFilePath,
      mdPath: parsed.mdPath,
      repoUrl,
      branch,
    };
  }

  static buildId(providerId: string, yamlPath: string): string {
    // Simple deterministic ID: provider + normalized path
    const normalized = yamlPath.replace(/\\/g, '/').replace(/^\//, '');
    return Buffer.from(`${providerId}:${normalized}`).toString('base64url');
  }

  /** True if the file is in a known asset directory */
  static isAssetFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return (
      normalized.startsWith('instructions/') ||
      normalized.startsWith('agents/') ||
      normalized.startsWith('skills/') ||
      normalized.startsWith('workflows/')
    );
  }
}

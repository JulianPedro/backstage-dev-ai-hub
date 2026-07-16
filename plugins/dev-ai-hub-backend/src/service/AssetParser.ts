import yaml from 'js-yaml';
import path from 'path';
import { AiAssetFrontmatterSchema } from '@nospt/plugin-dev-ai-hub-common';
import type { AiAssetFrontmatter } from '@nospt/plugin-dev-ai-hub-common';
import type { AiAssetInput } from '../types';

export interface ParsedAssetMeta {
  meta: AiAssetFrontmatter;
  /**
   * Resolved explicit .md path — only set when the YAML has a `content:` field.
   * When absent, the sync service resolves the md file by directory junction.
   */
  mdPath?: string;
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

    // Only resolve mdPath when content: is explicitly set in the YAML.
    // Otherwise the sync service pairs yaml + md by directory junction.
    const mdPath = meta.content
      ? path.posix.join(path.posix.dirname(yamlFilePath), meta.content)
      : undefined;

    return { meta, mdPath, yamlRaw: yamlContent };
  }

  /**
   * Build the full AiAssetInput from parsed metadata + raw markdown content.
   * The mdContent is stored verbatim — never modified.
   * actualMdPath is the resolved path of the md file as found by the sync service.
   */
  static buildAsset(
    parsed: ParsedAssetMeta,
    mdContent: string,
    providerId: string,
    repoUrl: string,
    branch: string,
    yamlFilePath: string,
    actualMdPath: string,
    resourcesContent?: Record<string, string>,
  ): AiAssetInput {
    const { meta } = parsed;

    // Store extra fields in metadata (used for display/reference)
    const metadata: Record<string, unknown> = {};
    if (meta.resources) metadata.resources = meta.resources;
    if ((meta as any).mcpServers)
      metadata.mcpServers = (meta as any).mcpServers;
    if ((meta as any).steps) metadata.steps = (meta as any).steps;

    return {
      id: AssetParser.buildId(providerId, yamlFilePath),
      providerId,
      name: meta.name,
      label: meta.label,
      description: meta.description,
      type: meta.type,
      tools: meta.tools,
      tags: meta.tags ?? [],
      author: meta.author ?? 'Unknown',
      icon: meta.icon,
      version: meta.version ?? '1.0.0',
      installPath: meta.installPath,
      installPaths: meta.installPaths,
      content: mdContent,
      yamlRaw: parsed.yamlRaw,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      resourcesContent,
      yamlPath: yamlFilePath,
      mdPath: actualMdPath,
      repoUrl,
      branch,
    };
  }

  static buildId(providerId: string, yamlPath: string): string {
    // Simple deterministic ID: provider + normalized path
    const normalized = yamlPath.replace(/\\/g, '/').replace(/^\//, '');
    return Buffer.from(`${providerId}:${normalized}`).toString('base64url');
  }
}

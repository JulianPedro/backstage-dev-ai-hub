import type { AiAssetFrontmatter } from '@internal/plugin-dev-ai-hub-common';
import type { AiAssetInput } from '../types';
export interface ParsedAssetMeta {
    meta: AiAssetFrontmatter;
    /** Resolved path of the .md content file within the repo tree */
    mdPath: string;
    yamlRaw: string;
}
export declare class AssetParser {
    /**
     * Parse the YAML metadata file (the envelope).
     * Returns null when the YAML is invalid or missing required fields.
     */
    static parseYaml(yamlContent: string, yamlFilePath: string): ParsedAssetMeta | null;
    /**
     * Build the full AiAssetInput from parsed metadata + raw markdown content.
     * The mdContent is stored verbatim — never modified.
     */
    static buildAsset(parsed: ParsedAssetMeta, mdContent: string, providerId: string, repoUrl: string, branch: string, yamlFilePath: string, resourcesContent?: Record<string, string>): AiAssetInput;
    static buildId(providerId: string, yamlPath: string): string;
    /** True if the file is in a known asset directory */
    static isAssetFile(filePath: string): boolean;
}

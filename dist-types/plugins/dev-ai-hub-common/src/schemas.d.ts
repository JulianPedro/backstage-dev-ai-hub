import { z } from 'zod';
export declare const AiToolEnum: z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>;
export declare const AssetTypeEnum: z.ZodEnum<["instruction", "agent", "skill", "workflow"]>;
/**
 * Schema for the YAML metadata file (.yaml) that acts as an envelope.
 * The actual asset content lives in the referenced .md file.
 */
export declare const AiAssetFrontmatterSchema: z.ZodObject<{
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["instruction", "agent", "skill", "workflow"]>;
    tools: z.ZodArray<z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>, "many">;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    installPath: z.ZodOptional<z.ZodString>;
    installPaths: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    applyTo: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    mcpServers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        action: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        action: string;
    }, {
        name: string;
        action: string;
    }>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["instruction", "agent", "skill", "workflow"]>;
    tools: z.ZodArray<z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>, "many">;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    installPath: z.ZodOptional<z.ZodString>;
    installPaths: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    applyTo: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    mcpServers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        action: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        action: string;
    }, {
        name: string;
        action: string;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["instruction", "agent", "skill", "workflow"]>;
    tools: z.ZodArray<z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>, "many">;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    installPath: z.ZodOptional<z.ZodString>;
    installPaths: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    applyTo: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    mcpServers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        action: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        action: string;
    }, {
        name: string;
        action: string;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type AiAssetFrontmatter = z.infer<typeof AiAssetFrontmatterSchema>;

import { z } from 'zod';
export declare const AiToolEnum: z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>;
export declare const AssetTypeEnum: z.ZodEnum<["instruction", "agent", "skill", "workflow", "bundle"]>;
/**
 * Schema for the YAML metadata file (.yaml) that acts as an envelope.
 * The actual asset content lives in the referenced .md file.
 */
export declare const AiAssetFrontmatterSchema: z.ZodObject<{
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    /** Human-readable display label shown in the UI. Falls back to `name` when omitted. */
    label: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    type: z.ZodEnum<["instruction", "agent", "skill", "workflow", "bundle"]>;
    tools: z.ZodArray<z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>, "many">;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    installPath: z.ZodOptional<z.ZodString>;
    installPaths: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ref: string;
    }, {
        ref: string;
    }>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    /** Human-readable display label shown in the UI. Falls back to `name` when omitted. */
    label: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    type: z.ZodEnum<["instruction", "agent", "skill", "workflow", "bundle"]>;
    tools: z.ZodArray<z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>, "many">;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    installPath: z.ZodOptional<z.ZodString>;
    installPaths: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ref: string;
    }, {
        ref: string;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** Path to the .md content file, relative to the .yaml file directory.
     *  If omitted, the parser falls back to <same-name>.md by convention. */
    content: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    /** Human-readable display label shown in the UI. Falls back to `name` when omitted. */
    label: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    type: z.ZodEnum<["instruction", "agent", "skill", "workflow", "bundle"]>;
    tools: z.ZodArray<z.ZodEnum<["all", "github-copilot", "claude-code", "google-gemini", "cursor"]>, "many">;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    author: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    installPath: z.ZodOptional<z.ZodString>;
    installPaths: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        ref: string;
    }, {
        ref: string;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type AiAssetFrontmatter = z.infer<typeof AiAssetFrontmatterSchema>;

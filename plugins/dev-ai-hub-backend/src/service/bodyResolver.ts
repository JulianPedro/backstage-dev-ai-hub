import type { UrlReaderService } from '@backstage/backend-plugin-api';

/**
 * The body resolver (ADR-0002): given an entity's `backstage.io/source-location`
 * target, fetch the body via UrlReader — a single targeted read, never Git
 * enumeration. A target ending in `/` is a directory-shaped (resource-bearing)
 * body read as one subtree; anything else is a single-file body.
 */

export const SOURCE_LOCATION_ANNOTATION = 'backstage.io/source-location';

export interface BodyFile {
  path: string;
  content(): Promise<Buffer>;
}

export type ResolvedBody =
  | { kind: 'file'; name: string; content: Buffer }
  | {
      kind: 'tree';
      dirName: string;
      /** Server-resolved entry file path, when one exists (CONTEXT.md: entry file). */
      entryPath?: string;
      files: BodyFile[];
    };

/** Strip the `url:` location-ref prefix; undefined when it is another type. */
export function parseUrlTarget(sourceLocation: string): string | undefined {
  return sourceLocation.startsWith('url:')
    ? sourceLocation.slice('url:'.length)
    : undefined;
}

/** Last non-empty path segment of a directory target URL. */
export function dirNameOfTarget(target: string): string {
  const segments = new URL(target).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

/**
 * Pick the entry file of a directory body: the only `.md` in the tree, else
 * `SKILL.md`, else the `.md` named after the directory (CONTEXT.md).
 */
export function pickEntryFile(
  paths: string[],
  dirName: string,
): string | undefined {
  const markdown = paths.filter(p => p.toLowerCase().endsWith('.md'));
  if (markdown.length === 1) return markdown[0];
  return (
    markdown.find(p => p === 'SKILL.md') ??
    markdown.find(p => p === `${dirName}.md`)
  );
}

export function contentTypeFor(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'md':
      return 'text/markdown; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'yaml':
    case 'yml':
      return 'text/yaml; charset=utf-8';
    default:
      return 'text/plain; charset=utf-8';
  }
}

export async function resolveBody(
  reader: UrlReaderService,
  target: string,
): Promise<ResolvedBody> {
  if (!target.endsWith('/')) {
    const response = await reader.readUrl(target);
    const name =
      new URL(target).pathname.split('/').filter(Boolean).pop() ?? 'body';
    return { kind: 'file', name, content: await response.buffer() };
  }

  const tree = await reader.readTree(target);
  const files: BodyFile[] = await tree.files();
  const dirName = dirNameOfTarget(target);
  return {
    kind: 'tree',
    dirName,
    entryPath: pickEntryFile(
      files.map(f => f.path),
      dirName,
    ),
    files,
  };
}

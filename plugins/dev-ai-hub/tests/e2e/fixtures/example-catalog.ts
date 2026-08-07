/**
 * The e2e catalog, built from the *real* seed entities in `examples/catalog`.
 *
 * `all.yaml` describes those entities as being for "local development and
 * automated tests", and this is the automated-tests half. Nothing here
 * restates what a resource looks like: the YAML is parsed into an `Entity`
 * and run through `toResourceSummary` — the same function the backend router
 * serves `GET /resources` with — so the mock payload is byte-identical to
 * production's for the same input. Hand-written summaries could not do that;
 * the ones this replaced set `annotations: {}` and a top-level
 * `sourceLocation`, a shape the mapper never emits.
 *
 * Bodies come from the files the entities actually point at, resolved out of
 * each one's `backstage.io/source-location`, so `GET /entity/:ref/raw` serves
 * the real markdown and JSON too.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import type { Entity } from '@backstage/catalog-model';
import {
  toResourceSummary,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const CATALOG_DIR = join(REPO_ROOT, 'examples/catalog');

/** Strip the GitHub URL wrapper off a source-location, leaving a repo path. */
function repoPathFor(sourceLocation: string | undefined): string | undefined {
  if (!sourceLocation) return undefined;
  const match = /\/(?:blob|tree)\/[^/]+\/(.+)$/.exec(sourceLocation);
  return match?.[1];
}

function loadEntities(): Entity[] {
  return readdirSync(CATALOG_DIR)
    .filter(f => f.endsWith('.yaml') && f !== 'all.yaml')
    .sort()
    .map(f => parse(readFileSync(join(CATALOG_DIR, f), 'utf8')) as Entity)
    .filter(e => e.kind === 'AiResource');
}

const ENTITIES = loadEntities();

/**
 * Every seed entity, mapped exactly as the backend would.
 *
 * Deliberately not one-per-type: the seeds carry two skills and two agents,
 * which is what makes the stat tiles worth asserting at all — a fixture with
 * one of everything cannot tell a correct count from a hardcoded 1.
 */
export const EXAMPLE_RESOURCES: ResourceSummary[] = ENTITIES.map(
  toResourceSummary,
).filter((s): s is ResourceSummary => s !== undefined);

export function exampleByName(name: string): ResourceSummary {
  const found = EXAMPLE_RESOURCES.find(r => r.name === name);
  if (!found) {
    throw new Error(
      `No example resource named "${name}". Available: ${EXAMPLE_RESOURCES.map(
        r => r.name,
      ).join(', ')}`,
    );
  }
  return found;
}

/** Count of seeds per `spec.type`, for the stat-tile assertions. */
export function exampleCountByType(type: string): number {
  return EXAMPLE_RESOURCES.filter(r => r.type === type).length;
}

const MARKDOWN = 'text/markdown; charset=utf-8';
const JSON_TYPE = 'application/json; charset=utf-8';

/**
 * The body each entity points at, read off disk.
 *
 * A source-location ending in `/` is a directory — the multi-file skill,
 * which the real resolver serves as a zip (ADR-0009) rather than as a
 * viewable body. Those get no entry here, so the mock 404s them, which is
 * what the resolver does for a body request against a directory.
 */
const BODIES = new Map<string, { content: string; contentType: string }>();
for (const entity of ENTITIES) {
  const summary = toResourceSummary(entity);
  const path = repoPathFor(summary?.sourceLocation);
  if (!summary || !path || path.endsWith('/')) continue;
  BODIES.set(summary.entityRef, {
    content: readFileSync(join(REPO_ROOT, path), 'utf8'),
    contentType: path.endsWith('.json') ? JSON_TYPE : MARKDOWN,
  });
}

export function exampleBodyFor(
  entityRef: string,
): { content: string; contentType: string } | undefined {
  return BODIES.get(entityRef);
}

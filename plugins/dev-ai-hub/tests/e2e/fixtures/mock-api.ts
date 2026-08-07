/**
 * What the intercepted backend serves, against the v2 catalog-backed model
 * (ADR-0001): `ResourceSummary` items for `GET /resources`, bodies for
 * `GET /entity/:ref/raw`, telemetry for `GET /telemetry/:ref` and
 * `POST /telemetry`.
 *
 * The catalog itself is not written here — it is the real seed data from
 * `examples/catalog`, mapped by the real `toResourceSummary`. See
 * `example-catalog.ts`. This module adds only the things the seeds cannot
 * supply: telemetry numbers, bulk data for the pagination boundary, and
 * entities that are broken on purpose.
 */
import type {
  ResourceSummary,
  TelemetryCounts,
} from '@nospt/plugin-dev-ai-hub-common';
import {
  EXAMPLE_RESOURCES,
  exampleBodyFor,
  exampleByName,
} from './example-catalog';

export {
  EXAMPLE_RESOURCES,
  exampleByName,
  exampleCountByType,
} from './example-catalog';

/**
 * The resource most specs drive: a skill with a source location, an owner, a
 * version, tags and multiple frameworks — every drawer section populated.
 */
export const PRIMARY = exampleByName('azure-devops-cli');

/** The marketplace, whose GitHub source-location yields a derivable slug. */
export const MARKETPLACE = exampleByName('nos-plugin-marketplace');

/** Seeded at zero installs — the "no install count is rendered" case. */
export const UNINSTALLED = exampleByName('post-edit-lint');

/**
 * No `source-location` at all: browsable but not actionable. The seed
 * entities all publish one — as valid examples should — so this case has to
 * be hand-built. Opt in with
 * `test.use({ resources: { items: [...EXAMPLE_RESOURCES, NO_SOURCE_LOCATION_RESOURCE] } })`.
 *
 * Broken on purpose. Not a model to copy.
 */
export const NO_SOURCE_LOCATION_RESOURCE: ResourceSummary = {
  entityRef: 'airesource:default/no-source-location',
  name: 'no-source-location',
  title: 'Unpublished Draft Hook',
  description: 'Registered in the catalog without a content location.',
  type: 'hook',
  lifecycle: 'experimental',
  owner: 'group:ai-platform-team',
  frameworks: ['claude-code'],
  kind: 'AiResource',
  tags: ['broken-fixture'],
  annotations: {},
};

/**
 * Claims a body and cannot produce one: it has a `source-location`, so the
 * drawer commits to fetching, but nothing resolves it and the request 404s.
 *
 * Broken on purpose. Not a model to copy.
 */
export const UNRESOLVABLE_BODY_RESOURCE: ResourceSummary = {
  entityRef: 'airesource:default/unresolvable-body',
  name: 'unresolvable-body',
  title: 'Removed Content Skill',
  description: 'Points at a source location the resolver cannot fetch.',
  type: 'skill',
  lifecycle: 'production',
  owner: 'group:ai-platform-team',
  sourceLocation:
    'url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/skills/gone/gone.md',
  frameworks: ['claude-code'],
  kind: 'AiResource',
  tags: ['broken-fixture'],
  annotations: {},
};

/**
 * `count` interchangeable resources, for exercising the PAGE_SIZE=24
 * boundary — more than the seed catalog will ever hold. Titles are
 * zero-padded (`Bulk Resource 01`) so a search for "Bulk Resource 0" narrows
 * to a predictable nine.
 */
export function manyResources(count: number): ResourceSummary[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      entityRef: `airesource:default/bulk-resource-${n}`,
      name: `bulk-resource-${n}`,
      title: `Bulk Resource ${n}`,
      description: 'Generated fixture for pagination coverage.',
      type: 'skill' as const,
      lifecycle: 'production',
      owner: 'group:ai-platform-team',
      frameworks: ['claude-code'],
      kind: 'AiResource',
      tags: ['bulk'],
      annotations: {},
    };
  });
}

export function mockBodyFor(
  entityRef: string,
): { content: string; contentType: string } | undefined {
  return exampleBodyFor(entityRef);
}

/**
 * Telemetry per resource, keyed by entity name. Counts are the one thing the
 * seed entities genuinely cannot carry — telemetry lives in the backend's
 * database, not the catalog (ADR-0007) — so they are authored here.
 *
 * Chosen to be distinct across the catalog so a rendered count is
 * addressable by its own text, and to straddle the ≥5 "popular" threshold.
 */
const TELEMETRY_BY_NAME: Record<string, TelemetryCounts> = {
  'azure-devops-cli': { install: 22, copy: 4, download: 3, view: 40 },
  'api-architect': { install: 8, copy: 1, download: 0, view: 15 },
  'security-threat-modeller': { install: 2, copy: 1, download: 0, view: 9 },
  'post-edit-lint': { install: 0, copy: 0, download: 0, view: 2 },
  'grafana-mcp': { install: 3, copy: 0, download: 0, view: 6 },
  'secure-dev-bundle': { install: 1, copy: 0, download: 0, view: 3 },
  'approved-github-workflows': { install: 7, copy: 2, download: 5, view: 12 },
  'nos-plugin-marketplace': { install: 0, copy: 0, download: 0, view: 1 },
};

const MOCK_TELEMETRY: Record<string, TelemetryCounts> = Object.fromEntries(
  EXAMPLE_RESOURCES.filter(r => TELEMETRY_BY_NAME[r.name]).map(r => [
    r.entityRef,
    TELEMETRY_BY_NAME[r.name],
  ]),
);

/** `GET /telemetry/:ref` counts. Unlisted refs get zeros. */
export function mockCountsFor(ref: string): TelemetryCounts {
  return MOCK_TELEMETRY[ref] ?? { install: 0, copy: 0, download: 0, view: 0 };
}

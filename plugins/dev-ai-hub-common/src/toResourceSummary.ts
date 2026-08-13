import {
  ANNOTATION_SOURCE_LOCATION,
  parseEntityRef,
  stringifyEntityRef,
  type Entity,
} from '@backstage/catalog-model';
import {
  ANNOTATION_HELP,
  ANNOTATION_VERSION,
  getFrameworks,
  isResourceType,
  type ResourceSummary,
} from './resources';

/**
 * Map a catalog AiResource entity to the flat contract served to the
 * frontend. Returns undefined for entities with an unsupported `spec.type`,
 * which are silently dropped (ADR-0003).
 *
 * Lives in `common` rather than the backend because it is pure and
 * isomorphic — `Entity` in, `ResourceSummary` out — and both the backend
 * router and the frontend's e2e fixtures need it to agree. The e2e suite
 * builds its mock `GET /resources` payload by running the real examples in
 * `examples/catalog/` through this function, so a change to the mapping
 * cannot silently diverge from what the tests assert against.
 */
/**
 * Normalise `spec.owner` to a full entity ref. Producers write the short form
 * (`group:platforms-developer-experience`, or a bare group name), while
 * anything that compares or links refs needs the canonical
 * `group:default/platforms-developer-experience`.
 *
 * An unparseable ref passes through untouched: the owner is a display field,
 * never worth failing the whole resource over.
 */
function normalizeOwner(owner: string): string {
  try {
    return stringifyEntityRef(
      parseEntityRef(owner, {
        defaultKind: 'group',
        defaultNamespace: 'default',
      }),
    );
  } catch {
    return owner;
  }
}

/**
 * Whether a string is a parseable entity ref. The frontend links `owner` to
 * its catalog page (via `EntityRefLink`, which throws on an unparseable
 * ref) — this lets it fall back to plain text instead, matching
 * `normalizeOwner`'s own stance that a malformed owner is never worth
 * failing over.
 */
export function isParseableEntityRef(ref: string): boolean {
  try {
    parseEntityRef(ref, { defaultKind: 'group', defaultNamespace: 'default' });
    return true;
  } catch {
    return false;
  }
}

export function toResourceSummary(entity: Entity): ResourceSummary | undefined {
  const type = entity.spec?.type;
  if (!isResourceType(type)) {
    return undefined;
  }

  const annotations = entity.metadata.annotations ?? {};

  return {
    entityRef: stringifyEntityRef(entity),
    name: entity.metadata.name,
    title: entity.metadata.title,
    description: entity.metadata.description,
    tags: entity.metadata.tags ?? [],
    type,
    lifecycle:
      typeof entity.spec?.lifecycle === 'string' ? entity.spec.lifecycle : '',
    owner:
      typeof entity.spec?.owner === 'string'
        ? normalizeOwner(entity.spec.owner)
        : undefined,
    sourceLocation: annotations[ANNOTATION_SOURCE_LOCATION],
    frameworks: getFrameworks(entity),
    version: annotations[ANNOTATION_VERSION],
    kind: entity.kind,
    helpText: annotations[ANNOTATION_HELP],
    annotations,
  };
}

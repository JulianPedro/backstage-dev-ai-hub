import {
  ANNOTATION_SOURCE_LOCATION,
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
      typeof entity.spec?.owner === 'string' ? entity.spec.owner : undefined,
    sourceLocation: annotations[ANNOTATION_SOURCE_LOCATION],
    frameworks: getFrameworks(entity),
    version: annotations[ANNOTATION_VERSION],
    kind: entity.kind,
    helpText: annotations[ANNOTATION_HELP],
    annotations,
  };
}

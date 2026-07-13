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
} from '@nospt/plugin-dev-ai-hub-common';

/**
 * Map a catalog AiResource entity to the flat contract served to the
 * frontend. Returns undefined for entities with an unsupported `spec.type`,
 * which are silently dropped (ADR-0003).
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
    lifecycle: typeof entity.spec?.lifecycle === 'string' ? entity.spec.lifecycle : '',
    owner: typeof entity.spec?.owner === 'string' ? entity.spec.owner : undefined,
    sourceLocation: annotations[ANNOTATION_SOURCE_LOCATION],
    frameworks: getFrameworks(entity),
    version: annotations[ANNOTATION_VERSION],
    kind: entity.kind,
    helpText: annotations[ANNOTATION_HELP],
    annotations,
  };
}

import {
  ANNOTATION_SOURCE_LOCATION,
  parseEntityRef,
  stringifyEntityRef,
  type Entity,
} from '@backstage/catalog-model';
import {
  ANNOTATION_HELP,
  getFrameworks,
  isRenderableContainment,
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

/**
 * Normalise a declared child ref to the canonical, lowercased form
 * `stringifyEntityRef` emits, so it compares equal to a container entity's own
 * ref regardless of how the producer wrote it (bare name or full ref). A bare
 * name resolves in the *container's own* namespace — mirroring Backstage's
 * native relation fields, which declare `defaultNamespace: 'inherit'` — not
 * always `default`; a plugin in `team-a` listing a bare `child` must resolve
 * to `airesource:team-a/child`, or it silently loses the relationship. An
 * unparseable ref is dropped: a member the catalog could never resolve is not
 * a relationship worth carrying.
 */
function normalizeChildRef(
  ref: unknown,
  containerNamespace: string,
): string | undefined {
  if (typeof ref !== 'string') return undefined;
  try {
    return stringifyEntityRef(
      parseEntityRef(ref, {
        defaultKind: 'AiResource',
        defaultNamespace: containerNamespace,
      }),
    );
  } catch {
    return undefined;
  }
}

/**
 * The refs a container declares as its contents: a `marketplace`'s
 * `spec.plugins`, a `plugin`'s `spec.skills` (ADR-0015). Leaf types declare
 * nothing. Unparseable and duplicate refs are dropped; visibility filtering
 * happens in `toResourceSummaries`, which alone sees the whole read.
 */
function declaredChildren(entity: Entity): string[] {
  const type = entity.spec?.type;
  let raw: unknown;
  if (type === 'marketplace') raw = entity.spec?.plugins;
  else if (type === 'plugin') raw = entity.spec?.skills;
  if (!Array.isArray(raw)) return [];
  const containerNamespace = entity.metadata.namespace ?? 'default';
  const refs = raw
    .map(ref => normalizeChildRef(ref, containerNamespace))
    .filter((r): r is string => r !== undefined);
  return Array.from(new Set(refs));
}

export function toResourceSummary(entity: Entity): ResourceSummary | undefined {
  const type = entity.spec?.type;
  if (!isResourceType(type)) {
    return undefined;
  }

  const annotations = entity.metadata.annotations ?? {};
  const children = declaredChildren(entity);

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
    version:
      typeof entity.spec?.version === 'string'
        ? entity.spec.version
        : undefined,
    kind: entity.kind,
    // `parents` needs the whole read to invert; a single entity can't know
    // them, so `toResourceSummaries` fills them in. `children` here is still
    // the raw declared set — visibility filtering also needs the whole read.
    children,
    parents: [],
    childCount: children.length,
    helpText: annotations[ANNOTATION_HELP],
    annotations,
  };
}

/**
 * Map a whole caller-visible catalog read to summaries, resolving containment
 * in both directions (ADR-0015). This is the function the served payload uses;
 * `toResourceSummary` alone cannot, because containment is only knowable across
 * the whole set.
 *
 * Upstream imposes no type restriction on membership — `spec.skills` /
 * `spec.plugins` carry `allowedKinds: ["AiResource"]`, so any AiResource type
 * is a legal member. DevAI Hub narrows that to its rendering convention
 * (ADR-0010/0015): a `marketplace` renders `plugin` children only, a `plugin`
 * renders `skill`/`agent`/`hook`/`mcp-config`. That convention is applied here,
 * once, so `children`, `childCount`, `parents`, the card chip and the detail
 * sections cannot disagree:
 *
 * - `children` keeps only refs that resolve within this read **and** whose type
 *   the container legitimately contains — so a card never counts, nor a detail
 *   panel links, a hidden member (ADR-0006) or an off-convention one.
 * - `parents` is the in-memory inverse of those filtered children.
 */
export function toResourceSummaries(entities: Entity[]): ResourceSummary[] {
  const summaries = entities
    .map(toResourceSummary)
    .filter((s): s is ResourceSummary => s !== undefined);

  const byRef = new Map(summaries.map(s => [s.entityRef, s]));
  const parentsByChild = new Map<string, string[]>();

  for (const summary of summaries) {
    summary.children = summary.children.filter(ref => {
      const child = byRef.get(ref);
      return (
        child !== undefined && isRenderableContainment(summary.type, child.type)
      );
    });
    summary.childCount = summary.children.length;
    for (const childRef of summary.children) {
      const bucket = parentsByChild.get(childRef);
      if (bucket) bucket.push(summary.entityRef);
      else parentsByChild.set(childRef, [summary.entityRef]);
    }
  }

  for (const summary of summaries) {
    summary.parents = parentsByChild.get(summary.entityRef) ?? [];
  }

  return summaries;
}

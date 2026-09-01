import { Text } from '@backstage/ui';
import { RiArrowRightSLine } from '@remixicon/react';
import {
  isRenderableContainment,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import { getTypeMeta } from './typeMeta';
import styles from './ResourceRelationships.module.css';

interface ResourceRelationshipsProps {
  resource: ResourceSummary;
  /** Every resource the caller can see — used to resolve related refs. */
  items: ResourceSummary[];
  /** Opens another resource's detail (the existing `?resource=` swap). */
  onOpen: (entityRef: string) => void;
}

/**
 * Resolve declared refs against the caller-visible set and keep only pairings
 * the rendering convention allows (ADR-0015). A ref absent from `items`
 * (hidden or an unsupported type) or of the wrong type is silently dropped —
 * a section never leaks that an entity exists.
 */
function resolve(
  refs: string[],
  byRef: Map<string, ResourceSummary>,
  keep: (other: ResourceSummary) => boolean,
): ResourceSummary[] {
  const out: ResourceSummary[] = [];
  for (const ref of refs) {
    const found = byRef.get(ref);
    if (found && keep(found)) out.push(found);
  }
  return out;
}

/** One navigable relationship row: type icon, title, and the type label. */
function RelationshipRow({
  related,
  onOpen,
}: {
  related: ResourceSummary;
  onOpen: (entityRef: string) => void;
}) {
  const meta = getTypeMeta(related.type);
  return (
    <button
      type="button"
      className={styles.row}
      onClick={() => onOpen(related.entityRef)}
      style={
        {
          '--card-accent': meta.color,
          '--card-accent-bg': meta.colorBg,
        } as React.CSSProperties
      }
    >
      <span className={styles.rowIcon}>
        <meta.Icon size={16} />
      </span>
      <span className={styles.rowText}>
        <Text variant="body-small" weight="bold" className={styles.rowTitle}>
          {related.title ?? related.name}
        </Text>
        <Text variant="body-x-small" color="secondary">
          {meta.label}
        </Text>
      </span>
      <RiArrowRightSLine size={16} className={styles.rowChevron} />
    </button>
  );
}

function Section({
  label,
  related,
  onOpen,
}: {
  label: string;
  related: ResourceSummary[];
  onOpen: (entityRef: string) => void;
}) {
  return (
    <div className={styles.section}>
      <Text variant="body-x-small" color="secondary" weight="bold">
        {label}
      </Text>
      <div className={styles.rows}>
        {related.map(r => (
          <RelationshipRow key={r.entityRef} related={r} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

/**
 * The relationship sections of the detail panel (ADR-0015): "Part of" (the
 * containers this resource belongs to, upward) and, for containers, the
 * members it declares (downward). Renders nothing when neither resolves to a
 * visible, correctly-typed relation, so the panel never shows an empty
 * heading.
 */
export function ResourceRelationships({
  resource,
  items,
  onOpen,
}: ResourceRelationshipsProps) {
  const byRef = new Map(items.map(i => [i.entityRef, i]));

  // A parent is kept only if it legitimately contains this resource's type.
  const parents = resolve(resource.parents, byRef, parent =>
    isRenderableContainment(parent.type, resource.type),
  );
  // A child is kept only if this resource's type legitimately contains it.
  const children = resolve(resource.children, byRef, child =>
    isRenderableContainment(resource.type, child.type),
  );

  const childrenLabel =
    resource.type === 'marketplace'
      ? 'Plugins in this marketplace'
      : 'Includes';

  if (parents.length === 0 && children.length === 0) return null;

  return (
    <>
      {parents.length > 0 && (
        <Section label="Part of" related={parents} onOpen={onOpen} />
      )}
      {children.length > 0 && (
        <Section label={childrenLabel} related={children} onOpen={onOpen} />
      )}
    </>
  );
}

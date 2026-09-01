import { Text } from '@backstage/ui';
import { RiDownloadLine, RiEyeLine } from '@remixicon/react';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import { useTelemetryCounts } from '../../hooks/useTelemetryCounts';
import { ToolIcon } from '../ToolIcon';
import type { FrameworkToken } from '@nospt/plugin-dev-ai-hub-common';
import { frameworkLabel, getTypeMeta } from './typeMeta';
import styles from './ResourceCard.module.css';

interface ResourceCardProps {
  resource: ResourceSummary;
  onView: (entityRef: string) => void;
  /** Extra class (e.g. the initial-load entrance animation) merged onto the
   * card's own root — kept off a wrapper div so this stays the grid's direct
   * child and CSS Grid's row-height stretch (the footer's margin-top: auto
   * relies on it for equal card heights) keeps working. */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The per-type card: type identity (colour/icon/label from the registry),
 * title, framework badges, tags, and a footer of version · owner plus the
 * view and install counts.
 *
 * Deliberately no description — clamped to two lines at card width it was
 * unreadable, and the drawer shows it in full the moment a card is opened.
 * Deliberately no "View source" link either: it competed with the card's own
 * click target and lives in the drawer, which is where someone deciding
 * whether to install is already looking.
 */
const MAX_VISIBLE_TAGS = 3;
const POPULAR_THRESHOLD = 5;

/**
 * The count chip a container card shows for its members (ADR-0015). Reads the
 * caller-visible `childCount`; leaf types and empty containers show nothing.
 */
function containsLabel(resource: ResourceSummary): string | undefined {
  const count = resource.childCount ?? 0;
  if (count <= 0) return undefined;
  if (resource.type === 'marketplace')
    return `${count} ${count === 1 ? 'plugin' : 'plugins'}`;
  if (resource.type === 'plugin')
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  return undefined;
}

export function ResourceCard({
  resource,
  onView,
  className,
  style,
}: ResourceCardProps) {
  const meta = getTypeMeta(resource.type);
  const counts = useTelemetryCounts(resource.entityRef);

  const visibleTags = resource.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = resource.tags.length - visibleTags.length;
  const ownerLabel = resource.owner?.replace(/^(group|user):(default\/)?/, '');
  const parentCount = resource.parents?.length ?? 0;

  return (
    <div
      className={className ? `${styles.card} ${className}` : styles.card}
      style={
        {
          '--card-accent': meta.color,
          '--card-accent-bg': meta.colorBg,
          ...style,
        } as React.CSSProperties
      }
      onClick={() => onView(resource.entityRef)}
      onKeyDown={e => {
        if (e.key === 'Enter') onView(resource.entityRef);
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${resource.title ?? resource.name}`}
    >
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <meta.Icon size={18} />
        </div>
        <div className={styles.headerText}>
          {/* Type reads as an eyebrow above the title. Below it, the reserved
              second title line would leave a gap between a one-line title and
              its own label; above it, that space falls before the description
              where nothing looks detached. */}
          <Text variant="body-x-small" className={styles.typeLabel}>
            {meta.label}
          </Text>
          <Text
            variant="title-x-small"
            weight="bold"
            as="h3"
            className={styles.title}
          >
            {resource.title ?? resource.name}
          </Text>
        </div>
      </div>

      <div className={styles.body}>
        {resource.frameworks.length > 0 && (
          <div className={styles.badges}>
            {/* Icon only — the tool's mark is recognisable enough on a card,
                and dropping the label keeps the row narrow. The name stays
                reachable: ToolIcon carries it as an aria-label, and `title`
                surfaces it on hover. Every framework is shown: icons are
                narrow enough that the full set fits, so there is no overflow
                pill to hide the tail behind. */}
            {resource.frameworks.map(f => (
              <span
                key={f}
                className={styles.frameworkBadge}
                title={frameworkLabel(f)}
              >
                <ToolIcon tool={f as FrameworkToken} size={16} />
              </span>
            ))}
          </div>
        )}

        {resource.tags.length > 0 && (
          <div className={styles.tags}>
            {visibleTags.map(t => (
              <span key={t} className={styles.tag}>
                #{t}
              </span>
            ))}
            {hiddenTagCount > 0 && (
              <span
                className={styles.tag}
                title={resource.tags.slice(MAX_VISIBLE_TAGS).join(', ')}
              >
                +{hiddenTagCount}
              </span>
            )}
          </div>
        )}

        {(containsLabel(resource) || parentCount > 0) && (
          <div className={styles.relRow}>
            {containsLabel(resource) && (
              <span className={styles.relChip} title="Contains">
                {containsLabel(resource)}
              </span>
            )}
            {parentCount > 0 && (
              <span className={styles.relChip} title="Belongs to a container">
                part of {parentCount}
              </span>
            )}
          </div>
        )}

        {(resource.version ||
          ownerLabel ||
          !!counts?.install ||
          !!counts?.view) && (
          <div className={styles.footer}>
            <Text variant="body-x-small" color="secondary">
              {[
                resource.version && `v${resource.version.replace(/^v/, '')}`,
                ownerLabel,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {/* Views and installs are the social proof someone browsing
                actually scans for, so they are chips at full foreground rather
                than grey footnotes beside the version. */}
            <span className={styles.countsRow}>
              {!!counts?.view && (
                <span className={styles.count} title={`${counts.view} views`}>
                  <RiEyeLine size={14} />
                  {counts.view}
                </span>
              )}
              {!!counts?.install && (
                <span
                  className={
                    counts.install >= POPULAR_THRESHOLD
                      ? styles.countPopular
                      : styles.count
                  }
                  title={`${counts.install} installs`}
                >
                  {counts.install >= POPULAR_THRESHOLD ? (
                    '\u{1F525}'
                  ) : (
                    <RiDownloadLine size={14} />
                  )}
                  {counts.install}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

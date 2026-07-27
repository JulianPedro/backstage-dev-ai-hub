import { useEffect, type MouseEvent } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { Text } from '@backstage/ui';
import { RiExternalLinkLine, RiEyeLine } from '@remixicon/react';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import { devAiHubResourceApiRef } from '../../api/DevAiHubResourceClient';
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
 * The per-type card. Mirrors the legacy card layout: type identity
 * (colour/icon/label from the registry), title, description, framework
 * badges, tags, version · owner footer, View source link.
 */
const MAX_VISIBLE_TAGS = 3;
const MAX_VISIBLE_FRAMEWORKS = 2;
const POPULAR_THRESHOLD = 5;

export function ResourceCard({
  resource,
  onView,
  className,
  style,
}: ResourceCardProps) {
  const meta = getTypeMeta(resource.type);
  const api = useApi(devAiHubResourceApiRef);
  const counts = useTelemetryCounts(resource.entityRef);

  useEffect(() => {
    api.track(resource.entityRef, 'view');
    // Fires once per card mount, not per re-render (ADR-0007 anti-inflation intent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.entityRef]);

  const handleSourceClick = (e: MouseEvent) => e.stopPropagation();

  const visibleTags = resource.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = resource.tags.length - visibleTags.length;
  const visibleFrameworks = resource.frameworks.slice(
    0,
    MAX_VISIBLE_FRAMEWORKS,
  );
  const hiddenFrameworkCount =
    resource.frameworks.length - visibleFrameworks.length;
  const ownerLabel = resource.owner?.replace(/^(group|user):(default\/)?/, '');

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
          <Text
            variant="title-x-small"
            weight="bold"
            as="h3"
            className={styles.title}
          >
            {resource.title ?? resource.name}
          </Text>
          <Text variant="body-x-small" className={styles.typeLabel}>
            {meta.label}
          </Text>
        </div>
        {resource.sourceLocation && (
          <a
            className={styles.sourceLink}
            href={resource.sourceLocation.replace(/^url:/, '')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSourceClick}
            aria-label="View source"
            title="View source"
          >
            <RiExternalLinkLine size={16} />
          </a>
        )}
      </div>

      <div className={styles.body}>
        {resource.description && (
          <Text
            variant="body-small"
            color="secondary"
            className={styles.description}
          >
            {resource.description}
          </Text>
        )}

        {resource.frameworks.length > 0 && (
          <div className={styles.badges}>
            {visibleFrameworks.map(f => (
              <span key={f} className={styles.frameworkBadge}>
                <ToolIcon tool={f as FrameworkToken} size={14} />
                {frameworkLabel(f)}
              </span>
            ))}
            {hiddenFrameworkCount > 0 && (
              <span
                className={styles.frameworkBadge}
                title={resource.frameworks
                  .slice(MAX_VISIBLE_FRAMEWORKS)
                  .map(frameworkLabel)
                  .join(', ')}
              >
                +{hiddenFrameworkCount}
              </span>
            )}
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
            <span className={styles.countsRow}>
              {!!counts?.view && (
                <span className={styles.count} title={`${counts.view} views`}>
                  <RiEyeLine size={13} /> {counts.view}
                </span>
              )}
              {!!counts?.install && (
                <span
                  className={styles.count}
                  title={`${counts.install} installs`}
                >
                  {counts.install >= POPULAR_THRESHOLD ? '🔥' : '↓'}{' '}
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

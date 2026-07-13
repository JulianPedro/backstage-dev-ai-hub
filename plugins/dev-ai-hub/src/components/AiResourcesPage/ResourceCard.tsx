import type { MouseEvent } from 'react';
import { Text } from '@backstage/ui';
import { RiExternalLinkLine } from '@remixicon/react';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import type { AiTool } from '@nospt/plugin-dev-ai-hub-common';
import { frameworkLabel, getTypeMeta } from './typeMeta';
import styles from './ResourceCard.module.css';

interface ResourceCardProps {
  resource: ResourceSummary;
  onView: (entityRef: string) => void;
}

/**
 * The per-type card. Mirrors the legacy card layout: type identity
 * (colour/icon/label from the registry), title, description, framework
 * badges, tags, version · owner footer, View source link.
 */
export function ResourceCard({ resource, onView }: ResourceCardProps) {
  const meta = getTypeMeta(resource.type);

  const handleSourceClick = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      className={styles.card}
      style={{ '--card-accent': meta.color, '--card-accent-bg': meta.colorBg } as React.CSSProperties}
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
          <Text variant="title-x-small" weight="bold" as="h3" className={styles.title}>
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

      {resource.description && (
        <Text variant="body-x-small" color="secondary" className={styles.description}>
          {resource.description}
        </Text>
      )}

      {resource.frameworks.length > 0 && (
        <div className={styles.badges}>
          {resource.frameworks.map(f => (
            <span key={f} className={styles.frameworkBadge}>
              <ToolIcon tool={f as AiTool} size={14} />
              {frameworkLabel(f)}
            </span>
          ))}
        </div>
      )}

      {resource.tags.length > 0 && (
        <div className={styles.tags}>
          {resource.tags.map(t => (
            <span key={t} className={styles.tag}>
              #{t}
            </span>
          ))}
        </div>
      )}

      {(resource.version || resource.owner) && (
        <div className={styles.footer}>
          <Text variant="body-x-small" color="secondary">
            {[resource.version && `v${resource.version.replace(/^v/, '')}`, resource.owner]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </div>
      )}
    </div>
  );
}

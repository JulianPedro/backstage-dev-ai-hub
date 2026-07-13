import { Box, Text } from '@backstage/ui';
import { RESOURCE_TYPES, type ResourceType } from '@nospt/plugin-dev-ai-hub-common';
import { getTypeMeta } from './typeMeta';
import styles from './StatTiles.module.css';

interface StatTilesProps {
  counts: Record<ResourceType, number>;
  activeType?: ResourceType;
  onToggle: (type: ResourceType) => void;
}

/**
 * The five clickable stat tiles that act as the type filter (legacy pattern):
 * click filters to that type, click again clears.
 */
export function StatTiles({ counts, activeType, onToggle }: StatTilesProps) {
  return (
    <div className={styles.grid}>
      {RESOURCE_TYPES.map(type => {
        const meta = getTypeMeta(type);
        const isActive = activeType === type;
        return (
          <div
            key={type}
            className={isActive ? styles.tileActive : styles.tile}
            style={{ '--tile-color': meta.tileColor, '--tile-deep': meta.tileDeep } as React.CSSProperties}
            onClick={() => onToggle(type)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onToggle(type);
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Filter by ${meta.pluralLabel}`}
          >
            <div className={styles.tileInner}>
              <Box>
                <Text variant="title-large" weight="bold" className={styles.tileValue}>
                  {counts[type]}
                </Text>
                <Text variant="body-small" className={styles.tileLabel}>
                  {meta.pluralLabel}
                </Text>
              </Box>
              <div className={styles.tileIconBox}>
                <meta.Icon size={22} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

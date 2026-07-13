import { Box, ButtonIcon, Flex, Link, Text } from '@backstage/ui';
import { RiCloseLine, RiExternalLinkLine } from '@remixicon/react';
import type { AiTool, ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import { frameworkLabel, getTypeMeta } from './typeMeta';
import styles from './ResourceDetailPanel.module.css';

interface ResourceDetailPanelProps {
  resource: ResourceSummary | undefined;
  onClose: () => void;
}

/**
 * The detail drawer (legacy pattern, URL-param driven). Renders fully from
 * the catalog `ResourceSummary` — the body/copy/download/install actions
 * land in this same drawer with issue #30.
 */
export function ResourceDetailPanel({ resource, onClose }: ResourceDetailPanelProps) {
  if (!resource) return null;

  const meta = getTypeMeta(resource.type);

  const metadataRows: [string, string | undefined][] = [
    ['Type', meta.label],
    ['Lifecycle', resource.lifecycle || undefined],
    ['Owner', resource.owner],
    ['Version', resource.version],
    ['Entity ref', resource.entityRef],
  ];

  return (
    <>
      <div className={styles.overlay} onClick={onClose} role="presentation" />
      <div className={styles.drawer} role="dialog" aria-label={resource.title ?? resource.name}>
        <Flex className={styles.header}>
          <div
            className={styles.iconBox}
            style={{ '--card-accent': meta.color, '--card-accent-bg': meta.colorBg } as React.CSSProperties}
          >
            <meta.Icon size={20} />
          </div>
          <Box className={styles.headerText}>
            <Text variant="title-small" weight="bold" as="h2">
              {resource.title ?? resource.name}
            </Text>
            <Text variant="body-x-small" style={{ color: meta.color, fontWeight: 600 }}>
              {meta.label}
            </Text>
          </Box>
          <ButtonIcon
            icon={<RiCloseLine />}
            variant="tertiary"
            onClick={onClose}
            aria-label="Close"
          />
        </Flex>

        <div className={styles.body}>
          {resource.description && (
            <Text variant="body-small" as="p">
              {resource.description}
            </Text>
          )}

          {resource.frameworks.length > 0 && (
            <div className={styles.section}>
              <Text variant="body-x-small" color="secondary" weight="bold">
                Works with
              </Text>
              <div className={styles.badges}>
                {resource.frameworks.map(f => (
                  <span key={f} className={styles.frameworkBadge}>
                    <ToolIcon tool={f as AiTool} size={14} />
                    {frameworkLabel(f)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resource.tags.length > 0 && (
            <div className={styles.section}>
              <Text variant="body-x-small" color="secondary" weight="bold">
                Tags
              </Text>
              <div className={styles.badges}>
                {resource.tags.map(t => (
                  <span key={t} className={styles.tag}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <Text variant="body-x-small" color="secondary" weight="bold">
              Metadata
            </Text>
            <dl className={styles.metaList}>
              {metadataRows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className={styles.metaRow}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </div>

          {resource.sourceLocation && (
            <div className={styles.section}>
              <Link
                href={resource.sourceLocation.replace(/^url:/, '')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.sourceLinkContent}>
                  <RiExternalLinkLine size={14} /> View source
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Button,
  ButtonIcon,
  Flex,
  Link,
  Skeleton,
  Text,
} from '@backstage/ui';
import {
  RiCloseLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiInstallLine,
} from '@remixicon/react';
import { useApi } from '@backstage/core-plugin-api';
import {
  getBodyShape,
  hasCopyableBody,
  hasDownloadableArtifact,
  type AiTool,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import { devAiHubResourceApiRef } from '../../api/DevAiHubResourceClient';
import { useResourceBody } from '../../hooks/useResourceBody';
import { ToolIcon } from '../ToolIcon';
import { ResourceInstallDialog } from './ResourceInstallDialog';
import { frameworkLabel, getTypeMeta } from './typeMeta';
import styles from './ResourceDetailPanel.module.css';

interface ResourceDetailPanelProps {
  resource: ResourceSummary | undefined;
  onClose: () => void;
}

/**
 * The detail drawer (legacy pattern, URL-param driven). Metadata renders from
 * the catalog `ResourceSummary`; the body is fetched lazily on open from the
 * body resolver (issue #30) and rendered by shape. Resources without a
 * source-location are browsable but not actionable — no action buttons.
 */
export function ResourceDetailPanel({
  resource,
  onClose,
}: ResourceDetailPanelProps) {
  const api = useApi(devAiHubResourceApiRef);
  const actionable = !!resource?.sourceLocation;
  const bodyState = useResourceBody(resource?.entityRef, actionable);
  const [installOpen, setInstallOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!resource) return null;

  const meta = getTypeMeta(resource.type);
  const bodyShape = getBodyShape(resource.type);

  const handleCopy = async () => {
    if (!bodyState.body) return;
    await navigator.clipboard.writeText(bodyState.body.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div
        className={styles.drawer}
        style={{ '--drawer-accent': meta.color } as React.CSSProperties}
        role="dialog"
        aria-label={resource.title ?? resource.name}
      >
        <Flex className={styles.header}>
          <div
            className={styles.iconBox}
            style={
              {
                '--card-accent': meta.color,
                '--card-accent-bg': meta.colorBg,
              } as React.CSSProperties
            }
          >
            <meta.Icon size={20} />
          </div>
          <Box className={styles.headerText}>
            <Text variant="title-small" weight="bold" as="h2">
              {resource.title ?? resource.name}
            </Text>
            <Text
              variant="body-x-small"
              style={{ color: meta.color, fontWeight: 600 }}
            >
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

          {actionable && (
            <div className={styles.actions}>
              {hasCopyableBody(resource.type) && (
                <Button
                  size="small"
                  variant="secondary"
                  iconStart={<RiFileCopyLine />}
                  isDisabled={!bodyState.body}
                  onPress={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              )}
              {hasDownloadableArtifact(resource.type) && (
                <Button
                  size="small"
                  variant="secondary"
                  iconStart={<RiDownloadLine />}
                  onPress={() => api.downloadEntityBody(resource.entityRef)}
                >
                  Download
                </Button>
              )}
              <Button
                size="small"
                variant="primary"
                iconStart={<RiInstallLine />}
                onPress={() => setInstallOpen(true)}
              >
                Install
              </Button>
            </div>
          )}

          <div className={styles.section}>
            <Text variant="body-x-small" color="secondary" weight="bold">
              Content
            </Text>
            {!actionable && (
              <Text variant="body-small" as="p" color="secondary">
                No content location published for this resource.
              </Text>
            )}
            {actionable && bodyState.loading && (
              <div className={styles.bodyLoading}>
                <Skeleton width="100%" height={14} />
                <Skeleton width="85%" height={14} />
                <Skeleton width="60%" height={14} />
              </div>
            )}
            {actionable && bodyState.error === 'not-found' && (
              <Text variant="body-small" as="p" color="secondary">
                Content not available — it may have been removed, or you may not
                have access to it.
              </Text>
            )}
            {actionable && bodyState.error === 'upstream' && (
              <Flex align="center" gap="2">
                <Text variant="body-small" as="p" color="secondary">
                  Couldn’t fetch the content from its source.
                </Text>
                <Button
                  size="small"
                  variant="tertiary"
                  onPress={bodyState.retry}
                >
                  Retry
                </Button>
              </Flex>
            )}
            {bodyState.body && bodyShape === 'json' && (
              <pre className={styles.codeBlock}>
                <code>{bodyState.body.content}</code>
              </pre>
            )}
            {bodyState.body && bodyShape === 'markdown' && (
              <div className={styles.markdown}>
                <ReactMarkdown>{bodyState.body.content}</ReactMarkdown>
              </div>
            )}
          </div>

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

      <ResourceInstallDialog
        resource={resource}
        body={bodyState.body}
        isOpen={installOpen}
        onOpenChange={setInstallOpen}
      />
    </>
  );
}

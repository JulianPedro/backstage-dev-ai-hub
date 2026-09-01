import { useEffect, useState } from 'react';
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
  RiEyeLine,
  RiFileCopyLine,
  RiInstallLine,
} from '@remixicon/react';
import { useApi } from '@backstage/core-plugin-api';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import {
  getBodyShape,
  hasCopyableBody,
  hasDownloadableArtifact,
  isParseableEntityRef,
  type FrameworkToken,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import { devAiHubResourceApiRef } from '../../api/DevAiHubResourceClient';
import { useResourceBody } from '../../hooks/useResourceBody';
import { useTelemetryCounts } from '../../hooks/useTelemetryCounts';
import { CollapsibleSection } from './CollapsibleSection';
import { JsonBody } from './JsonBody';
import { ResourceRelationships } from './ResourceRelationships';
import { ToolIcon } from '../ToolIcon';
import { ResourceInstallDialog } from './ResourceInstallDialog';
import { stripFrontmatter } from './stripFrontmatter';
import { frameworkLabel, getTypeMeta } from './typeMeta';
import styles from './ResourceDetailPanel.module.css';

interface ResourceDetailPanelProps {
  resource: ResourceSummary | undefined;
  onClose: () => void;
  /** Every caller-visible resource, so relationship refs can be resolved. */
  items?: ResourceSummary[];
  /** Opens another resource's detail (the existing `?resource=` swap). */
  onOpen?: (entityRef: string) => void;
}

/**
 * Metadata rows that name a catalog entity and should link there. Rendering
 * still falls back to plain text per-row when the value isn't a parseable
 * ref (`isParseableEntityRef`) — Owner isn't guaranteed parseable, since
 * `toResourceSummary` deliberately passes a malformed one through rather
 * than dropping the resource, and `EntityRefLink` throws on a ref it can't
 * parse. Entity ref is always valid (built with `stringifyEntityRef`), so it
 * always renders as a link.
 */
const ENTITY_REF_ROWS = new Set(['Owner', 'Entity ref']);

/**
 * The detail drawer (legacy pattern, URL-param driven). Metadata renders from
 * the catalog `ResourceSummary`; the body is fetched lazily on open from the
 * body resolver (issue #30) and rendered by shape. Resources without a
 * source-location are browsable but not actionable — no action buttons.
 */
export function ResourceDetailPanel({
  resource: resourceProp,
  onClose,
  items = [],
  onOpen,
}: ResourceDetailPanelProps) {
  const isOpen = !!resourceProp;
  // The drawer slides out on close (issue: "add some flowers"), which needs
  // content to stay rendered during the exit transition — the `resource` prop
  // itself goes undefined the instant the URL param clears. `displayResource`
  // mirrors the last real resource and is only ever updated while one is
  // present, so the drawer keeps showing it while animating out instead of
  // blanking.
  const [displayResource, setDisplayResource] = useState(resourceProp);
  useEffect(() => {
    if (resourceProp) setDisplayResource(resourceProp);
  }, [resourceProp]);

  const api = useApi(devAiHubResourceApiRef);

  // A `view` is a deliberate look at one resource, so it is recorded here —
  // when the drawer opens — and not on card render, where merely loading the
  // page counted a view for every card in the grid. Keyed on the *live* prop,
  // not `displayResource`: that one stays set through the exit animation, and
  // closing must not count a second view.
  const openedRef = resourceProp?.entityRef;
  useEffect(() => {
    if (openedRef) api.track(openedRef, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedRef]);

  const actionable = !!displayResource?.sourceLocation;
  const bodyState = useResourceBody(displayResource?.entityRef, actionable);
  const counts = useTelemetryCounts(displayResource?.entityRef);
  const [installOpen, setInstallOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!displayResource) return null;

  const resource = displayResource;
  const meta = getTypeMeta(resource.type);
  const bodyShape = getBodyShape(resource.type);

  const handleCopy = async () => {
    if (!bodyState.body) return;
    await navigator.clipboard.writeText(bodyState.body.content);
    api.track(resource.entityRef, 'copy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    api.track(resource.entityRef, 'download');
    return api.downloadEntityBody(resource.entityRef);
  };

  const handleInstall = () => {
    api.track(resource.entityRef, 'install');
    setInstallOpen(true);
  };

  const metadataRows: [string, string | undefined][] = [
    ['Type', meta.label],
    ['Lifecycle', resource.lifecycle || undefined],
    ['Owner', resource.owner],
    ['Version', resource.version],
    ['Entity ref', resource.entityRef],
  ];

  // `plugin`/`marketplace` bodies are the full manifest JSON (ADR-0014) —
  // long enough to bury everything below them, so their Content collapses.
  const collapsibleContent = bodyShape === 'json';

  const contentInner = (
    <>
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
          Content not available — it may have been removed, or you may not have
          access to it.
        </Text>
      )}
      {actionable && bodyState.error === 'upstream' && (
        <Flex align="center" gap="2">
          <Text variant="body-small" as="p" color="secondary">
            Couldn’t fetch the content from its source.
          </Text>
          <Button size="small" variant="tertiary" onPress={bodyState.retry}>
            Retry
          </Button>
        </Flex>
      )}
      {bodyState.body && bodyShape === 'json' && (
        <JsonBody
          content={bodyState.body.content}
          className={styles.codeBlock}
        />
      )}
      {bodyState.body && bodyShape === 'markdown' && (
        <div className={styles.markdown}>
          <ReactMarkdown>
            {stripFrontmatter(bodyState.body.content)}
          </ReactMarkdown>
        </div>
      )}
    </>
  );

  return (
    <>
      <div
        className={styles.overlay}
        data-open={isOpen}
        onClick={onClose}
        role="presentation"
        aria-hidden={!isOpen}
      />
      <div
        className={styles.drawer}
        data-open={isOpen}
        style={{ '--drawer-accent': meta.color } as React.CSSProperties}
        role="dialog"
        aria-label={resource.title ?? resource.name}
        aria-hidden={!isOpen}
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

          {(!!counts?.view || !!counts?.install) && (
            <div className={styles.statsRow}>
              {!!counts?.view && (
                <span className={styles.statItem}>
                  <RiEyeLine size={14} /> {counts.view} views
                </span>
              )}
              {!!counts?.install && (
                <span className={styles.statItem}>
                  <RiInstallLine size={14} /> {counts.install} installs
                </span>
              )}
            </div>
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
                  onPress={handleDownload}
                >
                  Download
                </Button>
              )}
              <Button
                size="small"
                variant="primary"
                iconStart={<RiInstallLine />}
                onPress={handleInstall}
              >
                Install
              </Button>
            </div>
          )}

          {onOpen && (
            <ResourceRelationships
              resource={resource}
              items={items}
              onOpen={onOpen}
            />
          )}

          <div className={styles.section}>
            {collapsibleContent ? (
              // Keyed on entityRef: the drawer stays mounted across a
              // relationship navigation (only `displayResource` swaps), so
              // without a key React reuses this instance and carries a
              // collapsed choice from the previous resource onto the next
              // one, silently defeating "expanded by default".
              <CollapsibleSection
                key={resource.entityRef}
                label="Content"
                defaultOpen
              >
                {contentInner}
              </CollapsibleSection>
            ) : (
              <>
                <Text variant="body-x-small" color="secondary" weight="bold">
                  Content
                </Text>
                {contentInner}
              </>
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
                    <ToolIcon tool={f as FrameworkToken} size={14} />
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
                    <dd>
                      {ENTITY_REF_ROWS.has(k) && isParseableEntityRef(v!) ? (
                        <EntityRefLink entityRef={v!}>{v}</EntityRefLink>
                      ) : (
                        v
                      )}
                    </dd>
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

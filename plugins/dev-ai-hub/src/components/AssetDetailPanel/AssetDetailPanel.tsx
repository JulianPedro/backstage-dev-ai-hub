import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Alert,
  Box,
  Flex,
  Text,
  Button,
  ButtonIcon,
  Tag,
  TagGroup,
  Skeleton,
  Link,
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from '@backstage/ui';
import {
  RiCloseLine,
  RiFileCopyLine,
  RiFolderZipLine,
  RiExternalLinkLine,
} from '@remixicon/react';
import type { AssetType } from '@nospt/plugin-dev-ai-hub-common';
import { useAssetDetail } from '../../hooks';
import styles from './AssetDetailPanel.module.css';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SyntaxHighlighter =
  require('react-syntax-highlighter/dist/esm/prism').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { oneLight } = require('react-syntax-highlighter/dist/esm/styles/prism');

const TYPE_COLORS: Record<AssetType, string> = {
  instruction: '#1976d2',
  agent: '#7b1fa2',
  skill: '#388e3c',
  workflow: '#f57c00',
};

interface AssetDetailPanelProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetDetailPanel({ assetId, onClose }: AssetDetailPanelProps) {
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const { asset, loading } = useAssetDetail(assetId);

  const handleCopy = () => {
    if (!asset) return;
    navigator.clipboard
      .writeText(asset.content)
      .then(() => setSnackbar('Markdown copied to clipboard!'));
  };

  if (!assetId) return null;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} role="presentation" />

      {/* Drawer */}
      <div className={styles.drawer}>
        <Flex className={styles.panelContainer}>
          {/* Header */}
          <Flex className={styles.header}>
            <Box className={styles.headerContent}>
              {loading || !asset ? (
                <Flex className={styles.loadingRow}>
                  <Skeleton style={{ width: 16, height: 16 }} />
                  <Text variant="body-small" color="secondary">
                    Loading...
                  </Text>
                </Flex>
              ) : (
                <>
                  <Flex className={styles.nameRow}>
                    <Text variant="title-small" weight="bold">
                      {asset.name}
                    </Text>
                    <TagGroup aria-label="Asset type">
                      <Tag
                        id={asset.type}
                        size="small"
                        className={styles.typeTag}
                        style={{
                          backgroundColor: `${TYPE_COLORS[asset.type]}20`,
                          color: TYPE_COLORS[asset.type],
                        }}
                      >
                        {asset.type}
                      </Tag>
                    </TagGroup>
                  </Flex>
                  <Text variant="body-medium" color="secondary">
                    {asset.description}
                  </Text>
                </>
              )}
            </Box>
            <ButtonIcon
              aria-label="Close"
              icon={<RiCloseLine size={20} />}
              variant="tertiary"
              onPress={onClose}
            />
          </Flex>

          {/* Tabs */}
          <Tabs defaultSelectedKey="preview">
            <TabList className={styles.tabBar}>
              <Tab id="preview">Preview</Tab>
              <Tab id="metadata">Metadata</Tab>
              <Tab id="raw">Raw YAML</Tab>
            </TabList>

            <Box className={styles.contentArea}>
              {loading && (
                <Flex
                  style={{
                    justifyContent: 'center',
                    paddingTop: 'var(--bui-space-8)',
                  }}
                >
                  <Skeleton style={{ width: '100%', height: 200 }} />
                </Flex>
              )}

              {!loading && asset && (
                <>
                  <TabPanel id="preview">
                    <div className={styles.markdownContent}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({ children }) => (
                            <div className={styles.codeBlockWrapper}>
                              {children}
                            </div>
                          ),
                          code({ className, children }) {
                            const match = /language-(\w+)/.exec(
                              className || '',
                            );
                            const code = String(children).replace(/\n$/, '');
                            const isBlock = code.includes('\n') || !!match;
                            return isBlock ? (
                              <SyntaxHighlighter
                                style={oneLight}
                                language={match?.[1] ?? 'text'}
                                PreTag="div"
                                customStyle={{
                                  borderRadius: 8,
                                  fontSize: '0.8rem',
                                  margin: 0,
                                  border: '1px solid rgba(0,0,0,0.08)',
                                }}
                              >
                                {code}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className}>{children}</code>
                            );
                          },
                        }}
                      >
                        {asset.content}
                      </ReactMarkdown>
                    </div>
                  </TabPanel>

                  <TabPanel id="metadata">
                    <Flex className={styles.metaSection}>
                      <MetaRow label="Author" value={asset.author} />
                      <MetaRow label="Version" value={asset.version} />
                      <MetaRow label="Provider" value={asset.providerId} />
                      {asset.commitSha && (
                        <MetaRow
                          label="Commit"
                          value={asset.commitSha.slice(0, 8)}
                        />
                      )}
                      <MetaRow
                        label="Last synced"
                        value={new Date(asset.syncedAt).toLocaleString()}
                      />
                      <MetaRow label="Branch" value={asset.branch} />

                      <hr className={styles.divider} />

                      <Box>
                        <Text variant="body-small" color="secondary">
                          Compatible tools
                        </Text>
                        <Flex className={styles.chipsRow}>
                          <TagGroup aria-label="Compatible tools">
                            {asset.tools.map(t => (
                              <Tag key={t} id={t} size="small">
                                {t}
                              </Tag>
                            ))}
                          </TagGroup>
                        </Flex>
                      </Box>

                      {asset.tags.length > 0 && (
                        <Box>
                          <Text variant="body-small" color="secondary">
                            Tags
                          </Text>
                          <Flex className={styles.chipsRow}>
                            <TagGroup aria-label="Tags">
                              {asset.tags.map(t => (
                                <Tag key={t} id={t} size="small">
                                  {t}
                                </Tag>
                              ))}
                            </TagGroup>
                          </Flex>
                        </Box>
                      )}

                      {asset.type === 'skill' && (
                        <>
                          <hr className={styles.divider} />
                          <Box>
                            <Flex className={styles.bundledHeader}>
                              <RiFolderZipLine
                                size={14}
                                style={{ color: 'var(--bui-fg-secondary)' }}
                              />
                              <Text variant="body-small" color="secondary">
                                Bundled files
                              </Text>
                            </Flex>
                            {asset.resourcesContent &&
                            Object.keys(asset.resourcesContent).length > 0 ? (
                              <Flex
                                direction="column"
                                style={{
                                  gap: 'var(--bui-space-1)',
                                  marginTop: 'var(--bui-space-1)',
                                }}
                              >
                                <TagGroup aria-label="Bundled files">
                                  <Flex className={styles.chipsRow}>
                                    <Tag
                                      id="skill-md"
                                      size="small"
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        height: 20,
                                      }}
                                    >
                                      SKILL.md
                                    </Tag>
                                    {Object.keys(asset.resourcesContent).map(
                                      p => (
                                        <Tag
                                          key={p}
                                          id={p}
                                          size="small"
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.7rem',
                                            height: 20,
                                          }}
                                        >
                                          {p}
                                        </Tag>
                                      ),
                                    )}
                                  </Flex>
                                </TagGroup>
                                <Text variant="body-small" color="secondary">
                                  Downloads as .zip containing all files above.
                                </Text>
                              </Flex>
                            ) : (
                              <TagGroup aria-label="Bundled files">
                                <Flex className={styles.chipsRow}>
                                  <Tag
                                    id="skill-md-only"
                                    size="small"
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: '0.7rem',
                                      height: 20,
                                    }}
                                  >
                                    SKILL.md
                                  </Tag>
                                </Flex>
                              </TagGroup>
                            )}
                          </Box>
                        </>
                      )}

                      <hr className={styles.divider} />

                      <Box>
                        <Text variant="body-small" color="secondary">
                          Repository
                        </Text>
                        <Box>
                          <Link
                            href={asset.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.repoLink}
                          >
                            {asset.repoUrl} <RiExternalLinkLine size={12} />
                          </Link>
                        </Box>
                      </Box>
                    </Flex>
                  </TabPanel>

                  <TabPanel id="raw">
                    <pre className={styles.rawYaml}>{asset.yamlRaw}</pre>
                  </TabPanel>
                </>
              )}
            </Box>
          </Tabs>

          {/* Actions */}
          <Flex className={styles.actions}>
            <Button variant="primary" onClick={handleCopy} isDisabled={!asset}>
              <RiFileCopyLine size={16} />
              Copy Markdown
            </Button>

            <Button
              variant="secondary"
              onClick={() => asset && window.open(asset.repoUrl, '_blank')}
              isDisabled={!asset}
            >
              <RiExternalLinkLine size={16} />
              Open in Repo
            </Button>
          </Flex>
        </Flex>
      </div>

      {/* Snackbar replacement — simple toast */}
      {snackbar && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1400,
          }}
        >
          <Alert status="success" icon description={snackbar} />
        </div>
      )}
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex className={styles.metaRow}>
      <Text
        variant="body-medium"
        color="secondary"
        className={styles.metaLabel}
      >
        {label}:
      </Text>
      <Text variant="body-medium" weight="bold">
        {value}
      </Text>
    </Flex>
  );
}

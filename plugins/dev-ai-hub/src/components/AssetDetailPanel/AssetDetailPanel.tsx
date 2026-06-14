import { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AssetType } from '@julianpedro/plugin-dev-ai-hub-common';
import { useAssetDetail } from '../../hooks';
import { devAiHubTranslationRef } from '../../translation';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SyntaxHighlighter = require('react-syntax-highlighter/dist/esm/prism').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { oneLight, oneDark } = require('react-syntax-highlighter/dist/esm/styles/prism');

function parseFrontmatter(md: string): { meta: Record<string, string> | null; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: null, body: md };
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([^:#\s][^:]*?):\s*(.+)$/);
    if (m) meta[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta: Object.keys(meta).length > 0 ? meta : null, body: match[2].trimStart() };
}

const TYPE_COLORS: Record<AssetType, string> = {
  instruction: '#1976d2',
  agent: '#7b1fa2',
  skill: '#388e3c',
  workflow: '#f57c00',
  prompt: '#EC4899',
  bundle: '#8B5CF6',
};

interface AssetDetailPanelProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetDetailPanel({ assetId, onClose }: AssetDetailPanelProps) {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [frontmatterOpen, setFrontmatterOpen] = useState(false);
  const { asset, loading } = useAssetDetail(assetId);
  const theme = useTheme();
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const syntaxTheme = theme.palette.mode === 'dark' ? oneDark : oneLight;

  useEffect(() => { setFrontmatterOpen(false); }, [assetId]);

  const parsed = asset ? parseFrontmatter(asset.content) : null;

  const handleCopy = () => {
    if (!asset) return;
    navigator.clipboard.writeText(asset.content).then(() =>
      setSnackbar(t('assetDetailPanel.copiedMessage')),
    );
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={!!assetId}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100vw', md: 640 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flex: 1 }}>
              {loading || !asset ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    {t('assetDetailPanel.loading')}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700}>
                      {asset.label ?? asset.name}
                    </Typography>
                    <Chip
                      label={asset.type}
                      size="small"
                      sx={{
                        backgroundColor: TYPE_COLORS[asset.type],
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {asset.description}
                  </Typography>
                </>
              )}
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab label={t('assetDetailPanel.tabPreview')} />
            <Tab label={t('assetDetailPanel.tabMetadata')} />
            <Tab label={t('assetDetailPanel.tabRawYaml')} />
          </Tabs>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && asset && (
              <>
                {tab === 0 && asset.type === 'bundle' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                      <Inventory2Icon sx={{ fontSize: '1rem', color: '#8B5CF6' }} />
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                        {t('assetDetailPanel.bundlePreviewTitle', { total: String(asset.items?.length ?? 0) })}
                      </Typography>
                    </Box>
                    {asset.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {asset.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {(asset.items ?? []).map((item, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.25,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: item.description ? 0.25 : 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap title={item.label ?? item.name ?? item.ref ?? undefined}>
                                {item.label ?? item.name ?? item.ref}
                              </Typography>
                              {item.type && (
                                <Chip
                                  label={item.type}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    bgcolor: TYPE_COLORS[item.type as AssetType] ?? '#64748b',
                                    color: '#fff',
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Box>
                            {item.description && (
                              <Typography variant="caption" color="text.secondary" noWrap title={item.description}>
                                {item.description}
                              </Typography>
                            )}
                            {!item.assetId && (
                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                {t('assetDetailPanel.bundleItemNotSynced', { ref: item.ref })}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {tab === 0 && asset.type !== 'bundle' && (
                  <Box>
                    {/* Frontmatter card — collapsed by default */}
                    {parsed?.meta && (
                      <Box
                        sx={{
                          mb: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          onClick={() => setFrontmatterOpen(v => !v)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1.5,
                            py: 0.75,
                            cursor: 'pointer',
                            bgcolor: 'action.hover',
                            userSelect: 'none',
                            '&:hover': { bgcolor: 'action.selected' },
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.6 }}
                          >
                            frontmatter
                          </Typography>
                          <ExpandMoreIcon
                            sx={{
                              fontSize: '1rem',
                              color: 'text.secondary',
                              transform: frontmatterOpen ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </Box>
                        <Collapse in={frontmatterOpen}>
                          <Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {Object.entries(parsed.meta).map(([key, value]) => (
                              <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                                <Typography
                                  variant="caption"
                                  sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600, minWidth: 90, flexShrink: 0 }}
                                >
                                  {key}:
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                  {value}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Collapse>
                      </Box>
                    )}

                    {/* Markdown body — frontmatter stripped */}
                    <Box
                      sx={{
                        '& h1,h2,h3,h4,h5,h6': { mt: 2, mb: 1, fontWeight: 700 },
                        '& p': { mb: 1, lineHeight: 1.7 },
                        '& ul, & ol': { pl: 2.5, mb: 1 },
                        '& li': { mb: 0.5 },
                        '& blockquote': {
                          borderLeft: '3px solid',
                          borderColor: 'primary.main',
                          pl: 1.5,
                          color: 'text.secondary',
                          my: 1,
                          ml: 0,
                        },
                        '& table': { width: '100%', borderCollapse: 'collapse', mb: 1 },
                        '& th, & td': {
                          border: '1px solid',
                          borderColor: 'divider',
                          px: 1.5,
                          py: 0.75,
                          fontSize: '0.875rem',
                        },
                        '& th': { backgroundColor: 'action.hover', fontWeight: 700 },
                        '& code': {
                          bgcolor: 'action.hover',
                          px: 0.5,
                          py: 0.2,
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                          fontSize: '0.875em',
                        },
                        '& pre code': { bgcolor: 'transparent', px: 0, py: 0 },
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({ children }) => <Box sx={{ my: 1 }}>{children}</Box>,
                          code({ className, children }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const code = String(children).replace(/\n$/, '');
                            const isBlock = code.includes('\n') || !!match;
                            return isBlock ? (
                              <SyntaxHighlighter
                                style={syntaxTheme}
                                language={match?.[1] ?? 'text'}
                                PreTag="div"
                                customStyle={{
                                  borderRadius: 8,
                                  fontSize: '0.8rem',
                                  margin: 0,
                                  border: `1px solid ${theme.palette.divider}`,
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
                        {parsed?.body ?? asset.content}
                      </ReactMarkdown>
                    </Box>
                  </Box>
                )}

                {tab === 1 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <MetaRow label={t('assetDetailPanel.metaAuthor')} value={asset.author} />
                    <MetaRow label={t('assetDetailPanel.metaVersion')} value={asset.version} />
                    <MetaRow label={t('assetDetailPanel.metaProvider')} value={asset.providerId} />
                    {asset.commitSha && (
                      <MetaRow label={t('assetDetailPanel.metaCommit')} value={asset.commitSha.slice(0, 8)} />
                    )}
                    <MetaRow label={t('assetDetailPanel.metaLastSynced')} value={new Date(asset.syncedAt).toLocaleString()} />
                    <MetaRow label={t('assetDetailPanel.metaBranch')} value={asset.branch} />
                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('assetDetailPanel.compatibleTools')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {asset.tools.map(tool => (
                          <Chip key={tool} label={tool} size="small" />
                        ))}
                      </Box>
                    </Box>

                    {asset.tags.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('assetDetailPanel.tagsLabel')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {asset.tags.map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {asset.type === 'bundle' && asset.items && asset.items.length > 0 && (
                      <>
                        <Divider />
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                            <Inventory2Icon sx={{ fontSize: '0.85rem', color: '#8B5CF6' }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {t('assetDetailPanel.bundleContents', { total: String(asset.items.length) })}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {asset.items.map((item, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} noWrap title={item.label ?? item.name ?? item.ref ?? undefined}>
                                    {item.label ?? item.name ?? item.ref}
                                  </Typography>
                                  {item.type && (
                                    <Chip
                                      label={item.type}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: '0.6rem',
                                        bgcolor: `${TYPE_COLORS[item.type as AssetType] ?? '#666'}22`,
                                        color: TYPE_COLORS[item.type as AssetType] ?? 'text.secondary',
                                        border: '1px solid',
                                        borderColor: `${TYPE_COLORS[item.type as AssetType] ?? '#666'}55`,
                                        fontWeight: 600,
                                        mt: 0.25,
                                      }}
                                    />
                                  )}
                                  {!item.assetId && (
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                      {t('assetDetailPanel.bundleItemNotSyncedYet', { ref: item.ref })}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </>
                    )}

                    {asset.type === 'skill' && (
                      <>
                        <Divider />
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <FolderZipIcon sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {t('assetDetailPanel.bundledFiles')}
                            </Typography>
                          </Box>
                          {asset.resourcesContent && Object.keys(asset.resourcesContent).length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                <Chip
                                  label="SKILL.md"
                                  size="small"
                                  sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }}
                                />
                                {Object.keys(asset.resourcesContent).map(p => (
                                  <Chip
                                    key={p}
                                    label={p}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }}
                                  />
                                ))}
                              </Box>
                              <Typography variant="caption" color="text.disabled">
                                {t('assetDetailPanel.zipDescription')}
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              <Chip
                                label="SKILL.md"
                                size="small"
                                sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }}
                              />
                            </Box>
                          )}
                        </Box>
                      </>
                    )}

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('assetDetailPanel.repository')}
                      </Typography>
                      <Box>
                        <Link
                          href={asset.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                        >
                          {asset.repoUrl} <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </Link>
                      </Box>
                    </Box>
                  </Box>
                )}

                {tab === 2 && (
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: 'action.hover',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {asset.yamlRaw}
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Actions */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              disabled={!asset}
            >
              {t('assetDetailPanel.copyMarkdown')}
            </Button>

            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => asset && window.open(asset.repoUrl, '_blank')}
              disabled={!asset}
            >
              {t('assetDetailPanel.openInRepo')}
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={2500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbar(null)}>
          {snackbar}
        </Alert>
      </Snackbar>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
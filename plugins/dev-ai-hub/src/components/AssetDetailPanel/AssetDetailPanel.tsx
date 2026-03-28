import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import FolderZipIcon from '@mui/icons-material/FolderZip';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { AssetType } from '@internal/plugin-dev-ai-hub-common';
import { useAssetDetail } from '../../hooks';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SyntaxHighlighter = require('react-syntax-highlighter/dist/esm/prism').default;
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
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const { asset, loading } = useAssetDetail(assetId);

  const handleCopy = () => {
    if (!asset) return;
    navigator.clipboard.writeText(asset.content).then(() =>
      setSnackbar('Markdown copied to clipboard!'),
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
                    Loading...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700}>
                      {asset.name}
                    </Typography>
                    <Chip
                      label={asset.type}
                      size="small"
                      sx={{
                        backgroundColor: `${TYPE_COLORS[asset.type]}20`,
                        color: TYPE_COLORS[asset.type],
                        fontWeight: 600,
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
            <Tab label="Preview" />
            <Tab label="Metadata" />
            <Tab label="Raw YAML" />
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
                {tab === 0 && (
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
                  </Box>
                )}

                {tab === 1 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <MetaRow label="Author" value={asset.author} />
                    <MetaRow label="Version" value={asset.version} />
                    <MetaRow label="Provider" value={asset.providerId} />
                    {asset.commitSha && (
                      <MetaRow label="Commit" value={asset.commitSha.slice(0, 8)} />
                    )}
                    <MetaRow label="Last synced" value={new Date(asset.syncedAt).toLocaleString()} />
                    <MetaRow label="Branch" value={asset.branch} />

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Compatible tools
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {asset.tools.map(t => (
                          <Chip key={t} label={t} size="small" />
                        ))}
                      </Box>
                    </Box>

                    {asset.tags.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Tags
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {asset.tags.map(t => (
                            <Chip key={t} label={t} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}

                   {asset.type === 'skill' && (
                      <>
                        <Divider />
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <FolderZipIcon sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              Bundled files
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
                                Downloads as .zip containing all files above.
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
                        Repository
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
              Copy Markdown
            </Button>

            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => asset && window.open(asset.repoUrl, '_blank')}
              disabled={!asset}
            >
              Open in Repo
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

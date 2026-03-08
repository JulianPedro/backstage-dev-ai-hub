import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Link,
  Snackbar,
  Alert,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { AiAsset, AssetType } from '@internal/plugin-dev-ai-hub-common';

const TYPE_COLORS: Record<AssetType, string> = {
  instruction: '#1976d2',
  agent: '#7b1fa2',
  skill: '#388e3c',
  workflow: '#f57c00',
};


interface AssetDetailPanelProps {
  asset: AiAsset | null;
  onClose: () => void;
}

export function AssetDetailPanel({ asset, onClose }: AssetDetailPanelProps) {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState<string | null>(null);

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
        open={!!asset}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100vw', md: 640 } } }}
      >
        {asset && (
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
              {tab === 0 && (
                <Box
                  sx={{
                    '& h1,h2,h3,h4': { mt: 2, mb: 1 },
                    '& pre': {
                      bgcolor: 'action.hover',
                      p: 1.5,
                      borderRadius: 1,
                      overflow: 'auto',
                    },
                    '& code': {
                      bgcolor: 'action.hover',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontFamily: 'monospace',
                      fontSize: '0.875em',
                    },
                  }}
                >
                  <ReactMarkdown>{asset.content}</ReactMarkdown>
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
                  {asset.applyTo && (
                    <MetaRow label="Apply to" value={asset.applyTo} />
                  )}
                  {asset.model && (
                    <MetaRow label="Model" value={asset.model} />
                  )}

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
                  }}
                >
                  {asset.yamlRaw}
                </Box>
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
              >
                Copy Markdown
              </Button>

              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(asset.repoUrl, '_blank')}
              >
                Open in Repo
              </Button>
            </Box>
          </Box>
        )}
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

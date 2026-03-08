import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import type { AiAsset, AiTool } from '@internal/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset } from '@internal/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';

const TOOL_LABELS: Record<string, string> = {
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

interface AssetInstallDialogProps {
  asset: AiAsset | null;
  onClose: () => void;
  onInstall?: (asset: AiAsset) => void;
}

export function AssetInstallDialog({ asset, onClose, onInstall }: AssetInstallDialogProps) {
  const [copiedTool, setCopiedTool] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setCopiedTool(null);
  };

  if (!asset) return null;

  const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
    installPath: asset.installPath,
    installPaths: asset.installPaths,
  });

  const handleCopy = (tool: string) => {
    navigator.clipboard.writeText(asset.content).then(() => {
      setCopiedTool(tool);
      setTimeout(() => setCopiedTool(null), 2000);
    });
    if (onInstall) onInstall(asset);
  };

  const handleDownload = (tool: string, installPath: string) => {
    const filename = installPath.split('/').pop() ?? `${asset.name}.md`;
    const blob = new Blob([asset.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    if (onInstall) onInstall(asset);
  };

  return (
    <Dialog open={!!asset} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Install: {asset.name}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Copy the content and place the file at the path shown for your tool.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
        {Object.entries(installPaths).map(([tool, installPath]) => (
          <Box
            key={tool}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 1.5,
            }}
          >
            {/* Tool header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ToolIcon tool={tool as AiTool} sx={{ fontSize: '1rem' }} />
              <Typography variant="subtitle2" fontWeight={700}>
                {TOOL_LABELS[tool] ?? tool}
              </Typography>
            </Box>

            {/* Install path */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Install path
            </Typography>
            <Box
              sx={{
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: 'text.primary',
                wordBreak: 'break-all',
                mb: 1.25,
              }}
            >
              {installPath}
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={copiedTool === tool ? 'Copied!' : 'Copy markdown content'}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={copiedTool === tool ? <CheckIcon /> : <ContentCopyIcon />}
                  onClick={() => handleCopy(tool)}
                  color={copiedTool === tool ? 'success' : 'primary'}
                  sx={{ flex: 1 }}
                >
                  {copiedTool === tool ? 'Copied!' : 'Copy Content'}
                </Button>
              </Tooltip>
              <Tooltip title="Download file with correct name">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(tool, installPath)}
                  sx={{ flex: 1 }}
                >
                  Download
                </Button>
              </Tooltip>
            </Box>
          </Box>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

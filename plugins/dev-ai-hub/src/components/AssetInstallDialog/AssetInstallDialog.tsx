import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import type { AiTool } from '@internal/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset } from '@internal/plugin-dev-ai-hub-common';
import { useApi } from '@backstage/core-plugin-api';
import { devAiHubApiRef } from '../../api/DevAiHubClient';
import { useAssetDetail } from '../../hooks';
import { ToolIcon } from '../ToolIcon';

const TOOL_LABELS: Record<string, string> = {
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

interface AssetInstallDialogProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetInstallDialog({ assetId, onClose }: AssetInstallDialogProps) {
  const [copiedTool, setCopiedTool] = useState<string | null>(null);
  const api = useApi(devAiHubApiRef);
  const { asset, loading } = useAssetDetail(assetId);

  const handleClose = () => {
    onClose();
    setCopiedTool(null);
  };

  const handleCopy = (tool: string) => {
    if (!asset) return;
    navigator.clipboard.writeText(asset.content).then(() => {
      setCopiedTool(tool);
      setTimeout(() => setCopiedTool(null), 2000);
    });
    api.trackInstall(asset.id).catch(() => {});
  };

  const handleDownload = (_tool: string, installPath: string) => {
    if (!asset) return;
    const filename = installPath.split('/').pop() ?? `${asset.name}.md`;
    const blob = new Blob([asset.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    api.trackInstall(asset.id).catch(() => {});
  };

  const installPaths = asset
    ? getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      })
    : {};

  return (
    <Dialog open={!!assetId} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {asset ? `Install: ${asset.name}` : 'Install'}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Copy the content and place the file at the path shown for your tool.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && asset && Object.entries(installPaths).map(([tool, installPath]) => (
          <Box
            key={tool}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ToolIcon tool={tool as AiTool} sx={{ fontSize: '1rem' }} />
              <Typography variant="subtitle2" fontWeight={700}>
                {TOOL_LABELS[tool] ?? tool}
              </Typography>
            </Box>

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

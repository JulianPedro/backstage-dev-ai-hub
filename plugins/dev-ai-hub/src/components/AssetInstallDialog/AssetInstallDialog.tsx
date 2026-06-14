import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { AiAsset, AiTool, BundleItem } from '@julianpedro/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset } from '@julianpedro/plugin-dev-ai-hub-common';
import { useApi, discoveryApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { devAiHubApiRef } from '../../api/DevAiHubClient';
import { useAssetDetail } from '../../hooks';
import { ToolIcon } from '../ToolIcon';
import { devAiHubTranslationRef } from '../../translation';

const TOOL_LABELS: Record<string, string> = {
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

/**
 * vscode:chat-agent/install can only place files inside .github/ (agents → .github/agents/,
 * instructions → .github/instructions/). Root-level files like AGENTS.md, CLAUDE.md, etc.
 * cannot be installed via deep link — the handler would put them in the wrong directory.
 */
function canUseVscodeDeepLink(type: string, tools: string[], installPath?: string): boolean {
  if (type !== 'agent' && type !== 'instruction') return false;
  if (!tools.includes('github-copilot')) return false;
  // If a custom install path is defined and it doesn't live under .github/, skip the button.
  if (installPath && !installPath.startsWith('.github/')) return false;
  return true;
}

function buildVscodeRedirectUrl(asset: AiAsset, backendUrl: string): string {
  const safeName = (asset.label ?? asset.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = asset.type === 'instruction'
    ? `${safeName}.instructions.md`
    : `${safeName}.agent.md`;
  const fileUrl = `${backendUrl}/assets/${encodeURIComponent(asset.id)}/agent-md/${filename}`;
  const vscodeUri = `vscode:chat-agent/install?url=${encodeURIComponent(fileUrl)}`;
  return `https://vscode.dev/redirect?url=${encodeURIComponent(vscodeUri)}`;
}

// ─── Single-asset view ───────────────────────────────────────────────────────

interface SingleAssetViewProps {
  asset: AiAsset;
}

function SingleAssetView({ asset }: SingleAssetViewProps) {
  const [copiedTool, setCopiedTool] = useState<string | null>(null);
  const api = useApi(devAiHubApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const { t } = useTranslationRef(devAiHubTranslationRef);

  const resourcePaths = asset.resourcesContent ? Object.keys(asset.resourcesContent) : [];
  const isZipSkill = asset.type === 'skill' && resourcePaths.length > 0;

  const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
    installPath: asset.installPath,
    installPaths: asset.installPaths,
  });

  const handleCopy = (tool: string) => {
    navigator.clipboard.writeText(asset.content).then(() => {
      setCopiedTool(tool);
      setTimeout(() => setCopiedTool(null), 2000);
    });
    api.trackInstall(asset.id).catch(() => {});
  };

  const handleDownload = async (_tool: string, installPath: string) => {
    if (isZipSkill) {
      const url = await api.getDownloadUrl(asset.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
      a.click();
    } else {
      const filename = installPath.split('/').pop() ?? `${asset.name}.md`;
      const blob = new Blob([asset.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    api.trackInstall(asset.id).catch(() => {});
  };

  const handleInstallInVscode = async () => {
    const backendUrl = await discoveryApi.getBaseUrl('dev-ai-hub');
    const a = document.createElement('a');
    a.href = buildVscodeRedirectUrl(asset, backendUrl);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    api.trackInstall(asset.id).catch(() => {});
  };

  const showVscodeButton = canUseVscodeDeepLink(asset.type, asset.tools, installPaths['github-copilot']);

  return (
    <>
      {isZipSkill && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'info.main',
            borderRadius: 2,
            p: 1.5,
            bgcolor: theme => `${theme.palette.info.main}12`,
            mb: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FolderZipIcon sx={{ fontSize: '1rem', color: 'info.main' }} />
            <Typography variant="subtitle2" fontWeight={700} color="info.main">
              {t('assetInstallDialog.bundledSkillTitle')}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('assetInstallDialog.bundledSkillDescription')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip label="SKILL.md" size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }} />
            {resourcePaths.map(p => (
              <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }} />
            ))}
          </Box>
        </Box>
      )}

      {Object.entries(installPaths).map(([tool, installPath]) => (
        <Box
          key={tool}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ToolIcon tool={tool as AiTool} sx={{ fontSize: '1rem' }} />
            <Typography variant="subtitle2" fontWeight={700}>
              {TOOL_LABELS[tool] ?? tool}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('assetInstallDialog.installPathLabel')}
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
              wordBreak: 'break-all',
              mb: 1.25,
            }}
          >
            {installPath}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {showVscodeButton && tool === 'github-copilot' && (
              <Button
                size="small"
                variant="contained"
                startIcon={<OpenInBrowserIcon />}
                onClick={handleInstallInVscode}
                fullWidth
              >
                {t('assetInstallDialog.installInVscode')}
              </Button>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={copiedTool === tool ? t('assetInstallDialog.copied') : t('assetInstallDialog.copyTooltip')}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={copiedTool === tool ? <CheckIcon /> : <ContentCopyIcon />}
                  onClick={() => handleCopy(tool)}
                  color={copiedTool === tool ? 'success' : 'primary'}
                  sx={{ flex: 1 }}
                >
                  {copiedTool === tool ? t('assetInstallDialog.copied') : t('assetInstallDialog.copyContent')}
                </Button>
              </Tooltip>
              <Tooltip title={isZipSkill ? t('assetInstallDialog.downloadZipTooltip') : t('assetInstallDialog.downloadTooltip')}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isZipSkill ? <FolderZipIcon /> : <DownloadIcon />}
                  onClick={() => handleDownload(tool, installPath)}
                  sx={{ flex: 1 }}
                >
                  {isZipSkill ? t('assetInstallDialog.downloadZip') : t('assetInstallDialog.download')}
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      ))}
    </>
  );
}

// ─── Bundle item step ─────────────────────────────────────────────────────────

interface BundleItemStepProps {
  item: BundleItem;
  stepIndex: number;
  total: number;
}

function BundleItemStep({ item, stepIndex, total }: BundleItemStepProps) {
  const [copied, setCopied] = useState(false);
  const api = useApi(devAiHubApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const { asset, loading } = useAssetDetail(item.assetId ?? null);
  const { t } = useTranslationRef(devAiHubTranslationRef);

  const installPaths = asset
    ? getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      })
    : {};
  const firstInstallPath = Object.values(installPaths)[0];

  const handleCopy = () => {
    if (!asset) return;
    navigator.clipboard.writeText(asset.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    api.trackInstall(asset.id).catch(() => {});
  };

  const handleDownload = async () => {
    if (!asset) return;
    const filename = (firstInstallPath?.split('/').pop()) ?? `${asset.name}.md`;
    const blob = new Blob([asset.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    api.trackInstall(asset.id).catch(() => {});
  };

  const handleInstallInVscode = async () => {
    if (!asset) return;
    const backendUrl = await discoveryApi.getBaseUrl('dev-ai-hub');
    const a = document.createElement('a');
    a.href = buildVscodeRedirectUrl(asset, backendUrl);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    api.trackInstall(asset.id).catch(() => {});
  };

  const showVscodeButton = asset && canUseVscodeDeepLink(asset.type, asset.tools, installPaths['github-copilot']);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t('assetInstallDialog.stepProgress', { current: String(stepIndex + 1), total: String(total) })}
        </Typography>
        {item.type && (
          <Chip label={item.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        )}
      </Box>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>
        {item.label ?? item.name ?? item.ref}
      </Typography>

      {item.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {item.description}
        </Typography>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && !item.assetId && (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'warning.main',
            borderRadius: 2,
            p: 1.5,
            bgcolor: theme => `${theme.palette.warning.main}10`,
          }}
        >
          <Typography variant="body2" color="warning.main" fontWeight={600}>
            {t('assetInstallDialog.notSyncedTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('assetInstallDialog.notSyncedRef', { ref: item.ref })}
          </Typography>
        </Box>
      )}

      {!loading && asset && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {firstInstallPath && (
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
                wordBreak: 'break-all',
              }}
            >
              {firstInstallPath}
            </Box>
          )}

          {showVscodeButton && (
            <Button
              size="small"
              variant="contained"
              startIcon={<OpenInBrowserIcon />}
              onClick={handleInstallInVscode}
              fullWidth
            >
              {t('assetInstallDialog.installInVscode')}
            </Button>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopy}
              color={copied ? 'success' : 'primary'}
              sx={{ flex: 1 }}
            >
              {copied ? t('assetInstallDialog.copied') : t('assetInstallDialog.copyContent')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ flex: 1 }}
            >
              {t('assetInstallDialog.download')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface AssetInstallDialogProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetInstallDialog({ assetId, onClose }: AssetInstallDialogProps) {
  const [step, setStep] = useState(0);
  const api = useApi(devAiHubApiRef);
  const { asset, loading } = useAssetDetail(assetId);
  const { t } = useTranslationRef(devAiHubTranslationRef);

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const handleDownloadBundle = async () => {
    if (!asset) return;
    const url = await api.getDownloadUrl(asset.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.name.replace(/\s+/g, '-').toLowerCase()}-bundle.zip`;
    a.click();
    api.trackInstall(asset.id).catch(() => {});
  };

  const isBundle = asset?.type === 'bundle';
  const bundleItems = isBundle ? (asset.items ?? []) : [];
  const totalSteps = bundleItems.length;
  const progress = totalSteps > 0 ? ((step + 1) / totalSteps) * 100 : 0;

  return (
    <Dialog open={!!assetId} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {isBundle ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2Icon sx={{ color: '#8B5CF6', fontSize: '1.4rem' }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {t('assetInstallDialog.dialogTitleBundle', { name: asset?.name ?? '' })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
                {t('assetInstallDialog.dialogSubtitleBundle')}
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Typography variant="h6" fontWeight={700}>
              {asset ? t('assetInstallDialog.dialogTitle', { name: asset.name }) : t('assetInstallDialog.dialogTitle', { name: '' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
              {t('assetInstallDialog.dialogSubtitle')}
            </Typography>
          </>
        )}
      </DialogTitle>

      {isBundle && totalSteps > 0 && (
        <Box sx={{ px: 3, pb: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, height: 6 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
            {t('assetInstallDialog.bundleProgress', { current: String(step + 1), total: String(totalSteps) })}
          </Typography>
        </Box>
      )}

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && asset && !isBundle && <SingleAssetView asset={asset} />}

        {!loading && isBundle && bundleItems.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            {t('assetInstallDialog.bundleEmpty')}
          </Typography>
        )}

        {!loading && isBundle && bundleItems.length > 0 && (
          <BundleItemStep
            item={bundleItems[step]}
            stepIndex={step}
            total={totalSteps}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
        {isBundle ? (
          <>
            <Button
              startIcon={<FolderZipIcon />}
              variant="outlined"
              size="small"
              onClick={handleDownloadBundle}
              disabled={!asset}
            >
              {t('assetInstallDialog.downloadBundle')}
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                {t('assetInstallDialog.back')}
              </Button>
              {step < totalSteps - 1 ? (
                <Button
                  endIcon={<ArrowForwardIcon />}
                  variant="contained"
                  onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
                >
                  {t('assetInstallDialog.next')}
                </Button>
              ) : (
                <Button variant="contained" color="success" onClick={handleClose}>
                  {t('assetInstallDialog.finish')}
                </Button>
              )}
            </Box>
          </>
        ) : (
          <Button onClick={handleClose} sx={{ ml: 'auto' }}>{t('assetInstallDialog.close')}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import AppsIcon from '@mui/icons-material/Apps';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import StorageIcon from '@mui/icons-material/Storage';
import TuneIcon from '@mui/icons-material/Tune';
import { Content } from '@backstage/core-components';
import { useApi, discoveryApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AiTool, McpCatalogEntry } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubTranslationRef } from '../../translation';
import { ToolIcon } from '../ToolIcon';
import { useCopyToClipboard, useMcpCatalog, useProviders } from '../../hooks';

interface ToolConfig {
  tool: AiTool;
  label: string;
  file: string;
  description: string;
  buildConfig: (mcpUrl: string) => string;
}

const TYPE_ACCENT: Record<string, string> = {
  http: '#2563EB',
  stdio: '#059669',
};

function providerLabel(target: string): string {
  return target.split('/').pop()?.replace(/\.git$/, '') ?? target;
}

function CatalogEntryCard({ entry }: { entry: McpCatalogEntry }) {
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const accent = TYPE_ACCENT[entry.type] ?? '#64748b';

  const handleInstallVscode = () => {
    const config: Record<string, unknown> = { name: entry.id, type: entry.type };
    if (entry.type === 'http') config.url = entry.url;
    if (entry.type === 'stdio') {
      config.command = entry.command;
      if (entry.args?.length) config.args = entry.args;
      if (entry.env && Object.keys(entry.env).length) config.env = entry.env;
    }
    window.location.href = `vscode:mcp/install?${encodeURIComponent(JSON.stringify(config))}`;
  };

  const handleInstallCursor = () => {
    const config: Record<string, unknown> = { type: entry.type };
    if (entry.type === 'http') config.url = entry.url;
    if (entry.type === 'stdio') {
      config.command = entry.command;
      if (entry.args?.length) config.args = entry.args;
      if (entry.env && Object.keys(entry.env).length) config.env = entry.env;
    }
    window.location.href = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(entry.name)}&config=${btoa(JSON.stringify(config))}`;
  };

  const canInstall =
    (entry.type === 'http' && !!entry.url) ||
    (entry.type === 'stdio' && !!entry.command);

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `3px solid ${accent}`,
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: `0 6px 24px ${accent}30`,
          borderColor: accent,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, pb: '0 !important', flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 1.5,
              backgroundColor: alpha(accent, 0.12),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: `0 2px 8px ${accent}25`,
            }}
          >
            {entry.icon ? (
              <Box
                component="img" src={entry.icon} alt={entry.name}
                sx={{ width: 26, height: 26, objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <StorageIcon sx={{ color: accent, fontSize: '1.3rem' }} />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
              <Typography variant="body2" fontWeight={700} noWrap title={entry.name} sx={{ lineHeight: 1.2, flex: 1 }}>
                {entry.name}
              </Typography>
              <Chip
                label={entry.type} size="small"
                sx={{
                  height: 18, fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700,
                  bgcolor: accent, color: '#fff', flexShrink: 0,
                  '& .MuiChip-label': { px: '6px' },
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: accent, fontWeight: 600 }}>
              {entry.type === 'http' ? 'HTTP' : 'Stdio'}
            </Typography>
          </Box>
        </Box>

        {entry.description && (
          <Typography
            variant="caption" color="text.secondary" title={entry.description}
            sx={{
              mb: 0.75, display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4,
            }}
          >
            {entry.description}
          </Typography>
        )}

        {entry.type === 'http' && entry.url && (
          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: 'text.disabled', wordBreak: 'break-all' }}>
            {entry.url}
          </Typography>
        )}
        {entry.type === 'stdio' && entry.command && (
          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.65rem', color: 'text.disabled' }}>
            {[entry.command, ...(entry.args ?? [])].join(' ')}
          </Typography>
        )}
      </CardContent>

      {canInstall && (
        <CardActions sx={{ px: 1.5, py: 1, mt: 'auto', borderTop: '1px solid', borderColor: 'divider', gap: 0.75 }}>
          <Button
            size="small" variant="outlined" fullWidth
            startIcon={<OpenInBrowserIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={handleInstallVscode}
            sx={{ fontSize: '0.72rem', fontWeight: 700, py: 0.5, borderColor: accent, color: accent, '&:hover': { borderColor: accent, bgcolor: alpha(accent, 0.08) } }}
          >
            {t('mcpConfigDialog.installInVscode')}
          </Button>
          <Button
            size="small" variant="outlined" fullWidth
            startIcon={<ToolIcon tool="cursor" branded={false} sx={{ fontSize: '0.85rem !important', color: `${accent} !important` }} />}
            onClick={handleInstallCursor}
            sx={{ fontSize: '0.72rem', fontWeight: 700, py: 0.5, borderColor: accent, color: accent, '&:hover': { borderColor: accent, bgcolor: alpha(accent, 0.08) } }}
          >
            {t('mcpConfigDialog.installInCursor')}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}

interface McpPageProps {
  /** When true, renders without the <Content> wrapper — for use inside dialogs. */
  embedded?: boolean;
}

export function McpPage({ embedded = false }: McpPageProps) {
  const theme = useTheme();
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const discoveryApi = useApi(discoveryApiRef);
  const { copy: copyUrl, copied: copiedUrl } = useCopyToClipboard();
  const { copy: copySnippet, copied: copiedSnippet } = useCopyToClipboard();
  const [tab, setTab] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [proactiveEnabled, setProactiveEnabled] = useState(false);
  const [toolConfigExpanded, setToolConfigExpanded] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);

  const { providers } = useProviders();
  const { catalog } = useMcpCatalog();
  const showProviderFilter = providers.length > 1;

  const toolConfigs = useMemo<ToolConfig[]>(() => [
    {
      tool: 'claude-code', label: 'Claude Code', file: '.mcp.json',
      description: t('mcpConfigDialog.claudeConfigDesc'),
      buildConfig: url => JSON.stringify({ mcpServers: { 'dev-ai-hub': { type: 'http', url } } }, null, 2),
    },
    {
      tool: 'github-copilot', label: 'GitHub Copilot', file: '.vscode/settings.json',
      description: t('mcpConfigDialog.copilotConfigDesc'),
      buildConfig: url => JSON.stringify({ 'github.copilot.chat.mcp.servers': { 'dev-ai-hub': { type: 'http', url } } }, null, 2),
    },
    {
      tool: 'google-gemini', label: 'Google Gemini', file: 'gemini-config.json',
      description: t('mcpConfigDialog.geminiConfigDesc'),
      buildConfig: url => JSON.stringify({ mcpServers: { 'dev-ai-hub': { url } } }, null, 2),
    },
    {
      tool: 'cursor', label: 'Cursor', file: '.cursor/mcp.json',
      description: t('mcpConfigDialog.cursorConfigDesc'),
      buildConfig: url => JSON.stringify({ mcpServers: { 'dev-ai-hub': { type: 'http', url } } }, null, 2),
    },
  ], [t]);

  useEffect(() => {
    discoveryApi.getBaseUrl('dev-ai-hub').then(url => setBaseUrl(url));
  }, [discoveryApi]);

  const cfg = toolConfigs[tab] ?? toolConfigs[0];

  const buildMcpUrl = () => {
    if (!baseUrl) return 'loading...';
    const params = new URLSearchParams();
    params.set('tool', cfg.tool);
    if (selectedProvider) params.set('provider', selectedProvider);
    if (proactiveEnabled) params.set('proactive', 'true');
    return `${baseUrl}/mcp?${params.toString()}`;
  };

  const mcpUrl = buildMcpUrl();
  const configSnippet = baseUrl ? cfg.buildConfig(mcpUrl) : '';

  const handleInstallInVscode = () => {
    if (!baseUrl) return;
    const config = JSON.stringify({ name: 'dev-ai-hub', type: 'http', url: mcpUrl });
    window.location.href = `vscode:mcp/install?${encodeURIComponent(config)}`;
  };

  const handleInstallInCursor = () => {
    if (!baseUrl) return;
    const config = btoa(JSON.stringify({ type: 'http', url: mcpUrl }));
    window.location.href = `cursor://anysphere.cursor-deeplink/mcp/install?name=dev-ai-hub&config=${config}`;
  };

  const showVscodeButton = cfg.tool === 'github-copilot';
  const showCursorButton = cfg.tool === 'cursor';

  const body = (
    <>
      {/* MCP Catalog section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <AppsIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
            {t('mcpConfigDialog.catalogTab')}
          </Typography>
          {catalog.length > 0 && (
            <Chip
              label={catalog.length} size="small"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'action.selected', color: 'text.secondary', border: '1px solid', borderColor: 'divider' }}
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
          {t('mcpConfigDialog.catalogDescription')}
        </Typography>

        {catalog.length === 0 ? (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}>
            <AppsIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">{t('mcpConfigDialog.catalogEmpty')}</Typography>
            <Typography variant="caption" color="text.disabled">{t('mcpConfigDialog.catalogAddHint')}</Typography>
          </Box>
        ) : (
          <Grid container spacing={1.5}>
            {catalog.map(entry => (
              <Grid item xs={12} sm={6} md={4} key={entry.id}>
                <CatalogEntryCard entry={entry} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Divider sx={{ mb: 0 }} />

      {/* Tool Config section — collapsible */}
      <Box>
        <Box
          onClick={() => setToolConfigExpanded(v => !v)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', userSelect: 'none', py: 1.25, '&:hover': { opacity: 0.8 } }}
        >
          <TuneIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 }}>
            {t('mcpConfigDialog.toolConfigSection')}
          </Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ color: 'text.disabled', transition: 'transform 0.2s ease', transform: toolConfigExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </Box>

        <Collapse in={toolConfigExpanded} mountOnEnter unmountOnExit>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            {toolConfigs.map((toolCfg, i) => (
              <Tab
                key={toolCfg.tool} value={i}
                sx={{ color: 'text.secondary', minHeight: 40, '&.Mui-selected': { color: 'primary.main' }, '&:hover': { backgroundColor: 'transparent', color: 'text.primary' }, '&.Mui-selected:hover': { backgroundColor: 'transparent' } }}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <ToolIcon tool={toolCfg.tool} branded={false} sx={{ fontSize: '1rem' }} />
                    <span>{toolCfg.label}</span>
                  </Box>
                }
              />
            ))}
          </Tabs>

          {showProviderFilter && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                {t('mcpConfigDialog.scopeToProvider')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip
                  label={t('mcpConfigDialog.allProviders')} size="small" clickable
                  onClick={() => setSelectedProvider('')}
                  sx={{
                    fontWeight: 600, fontSize: '0.75rem', borderRadius: 2, border: '1.5px solid',
                    borderColor: !selectedProvider ? 'text.primary' : 'divider',
                    backgroundColor: !selectedProvider ? 'text.primary' : 'transparent',
                    color: !selectedProvider ? 'background.paper' : 'text.secondary',
                    transition: 'all 0.15s ease',
                  }}
                />
                {providers.map(p => {
                  const isSelected = selectedProvider === p.id;
                  return (
                    <Chip
                      key={p.id} size="small" clickable
                      icon={<StorageIcon sx={{ fontSize: '0.8rem !important', color: isSelected ? 'background.paper' : 'inherit' }} />}
                      label={providerLabel(p.target)}
                      onClick={() => setSelectedProvider(isSelected ? '' : p.id)}
                      sx={{
                        fontWeight: 600, fontSize: '0.75rem', borderRadius: 2, border: '1.5px solid',
                        borderColor: isSelected ? 'text.primary' : 'divider',
                        backgroundColor: isSelected ? 'text.primary' : 'transparent',
                        color: isSelected ? 'background.paper' : 'text.secondary',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={<Switch size="small" checked={proactiveEnabled} onChange={e => setProactiveEnabled(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>{t('mcpConfigDialog.proactiveSuggestions')}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('mcpConfigDialog.proactiveDescription')}</Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, gap: 1 }}
            />
          </Box>

          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('mcpConfigDialog.mcpEndpoint')}
          </Typography>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 1.5,
              px: 1.5, py: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
              {mcpUrl}
            </Typography>
            <Tooltip title={copiedUrl ? t('assetInstallDialog.copied') : t('mcpConfigDialog.copyUrl')}>
              <IconButton size="small" onClick={() => copyUrl(mcpUrl)}>
                {copiedUrl ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          {showVscodeButton && (
            <Button variant="contained" startIcon={<OpenInBrowserIcon />} onClick={handleInstallInVscode} disabled={!baseUrl} fullWidth sx={{ mb: 2, fontSize: '0.8rem' }}>
              {t('mcpConfigDialog.installInVscode')}
            </Button>
          )}
          {showCursorButton && (
            <Button
              variant="contained" fullWidth onClick={handleInstallInCursor} disabled={!baseUrl}
              startIcon={<ToolIcon tool="cursor" branded={false} sx={{ fontSize: '1rem !important' }} />}
              sx={{ mb: 2, fontSize: '0.8rem' }}
            >
              {t('mcpConfigDialog.installInCursor')}
            </Button>
          )}

          <Divider sx={{ mb: 1.5 }} />

          <Box
            onClick={() => setManualExpanded(v => !v)}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', py: 0.75 }}
          >
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('mcpConfigDialog.manualConfig', { file: cfg.file })}
            </Typography>
            <ExpandMoreIcon
              fontSize="small"
              sx={{ color: 'text.disabled', transition: 'transform 0.2s ease', transform: manualExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </Box>

          <Collapse in={manualExpanded} mountOnEnter unmountOnExit>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, mt: 0.5 }}>
              {cfg.description}
            </Typography>
            <Box sx={{ position: 'relative' }}>
              <Box
                component="pre"
                sx={{
                  m: 0, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  backgroundColor: theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
                  color: theme.palette.mode === 'dark' ? '#e6edf3' : '#24292f',
                  fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre',
                }}
              >
                {configSnippet}
              </Box>
              <Tooltip title={copiedSnippet ? t('assetInstallDialog.copied') : t('mcpConfigDialog.copyUrl')}>
                <IconButton
                  size="small"
                  onClick={e => { e.stopPropagation(); copySnippet(configSnippet); }}
                  sx={{
                    position: 'absolute', top: 8, right: 8,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                  }}
                >
                  {copiedSnippet ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
              {t('mcpConfigDialog.omitToolHint')}
            </Typography>
          </Collapse>
        </Collapse>
      </Box>
    </>
  );

  return embedded ? body : <Content>{body}</Content>;
}
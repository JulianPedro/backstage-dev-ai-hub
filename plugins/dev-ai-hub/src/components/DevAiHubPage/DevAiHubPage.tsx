import { useState, useMemo, type ElementType } from 'react';
import { useSearchParams } from 'react-router-dom';
import { darken } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExtensionIcon from '@mui/icons-material/Extension';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import HubIcon from '@mui/icons-material/Hub';
import SyncIcon from '@mui/icons-material/Sync';
import { Content, Header, Page } from '@backstage/core-components';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import type { AssetType, AiTool } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubSyncPermission } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubTranslationRef } from '../../translation';
import { AssetCard } from '../AssetCard';
import { AssetFilters } from '../AssetFilters';
import type { AssetFiltersValue } from '../AssetFilters';
import { AssetDetailPanel } from '../AssetDetailPanel';
import { AssetInstallDialog } from '../AssetInstallDialog';
import { AssetHelpDialog } from '../AssetHelpDialog';
import { McpConfigDialog } from '../McpConfigDialog';
import { ToolIcon } from '../ToolIcon';
import { useAssets, useStats, useProviders, useMcpCatalog, useSyncProvider, useTypeConfig } from '../../hooks';

const SUPPORTED_TOOLS: AiTool[] = ['claude-code', 'github-copilot', 'google-gemini', 'cursor'];

const TOOL_LABELS: Record<AiTool, string> = {
  'all':            'Universal',
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

const DEFAULT_FILTERS: AssetFiltersValue = {
  types: [],
  tools: [],
  search: '',
  tags: [],
  providerId: undefined,
};

const PAGE_SIZE = 24;

const STATS_META: Record<AssetType, { label: string; Icon: ElementType }> = {
  instruction: { label: 'Instructions', Icon: ArticleIcon },
  agent:       { label: 'Agents',       Icon: SmartToyIcon },
  skill:       { label: 'Skills',       Icon: BuildIcon },
  workflow:    { label: 'Workflows',    Icon: AccountTreeIcon },
  prompt:      { label: 'Prompts',      Icon: ChatIcon },
  bundle:      { label: 'Bundles',      Icon: Inventory2Icon },
};

type TFunc = (key: string, params?: Record<string, unknown>) => string | undefined;

function timeAgo(iso: string, translate: TFunc): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return (translate('devAiHubPage.timeJustNow') ?? '') as string;
  if (diff < 3600) return (translate('devAiHubPage.timeMinutesAgo', { count: Math.floor(diff / 60) }) ?? '') as string;
  if (diff < 86400) return (translate('devAiHubPage.timeHoursAgo', { count: Math.floor(diff / 3600) }) ?? '') as string;
  return (translate('devAiHubPage.timeDaysAgo', { count: Math.floor(diff / 86400) }) ?? '') as string;
}

/**
 * Legacy frontend system entry point.
 * Mount at /dev-ai-hub/* in FlatRoutes (/* needed for asset detail URL params).
 * NFS apps use devAiHubPlugin from plugin.tsx with SubPageBlueprint tabs instead.
 */
export function DevAiHubPage() {
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const [filters, setFilters] = useState<AssetFiltersValue>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [syncSnackbar, setSyncSnackbar] = useState(false);
  const [providersDrawerOpen, setProvidersDrawerOpen] = useState(false);

  const { allowed: canSync } = usePermission({ permission: devAiHubSyncPermission });
  const { syncing, triggerSync, triggerSyncAll } = useSyncProvider();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAssetId = searchParams.get('assetId');
  const installAssetId = searchParams.get('installId');
  const helpAssetId = searchParams.get('helpId');

  const handleViewAsset = (id: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('assetId', id); return n; });
  const handleCloseDetail = () =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('assetId'); return n; });
  const handleInstallAsset = (id: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('installId', id); return n; });
  const handleCloseInstall = () =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('installId'); return n; });
  const handleHelpAsset = (id: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('helpId', id); return n; });
  const handleCloseHelp = () =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('helpId'); return n; });

  const { typeColors, statsCards } = useTypeConfig();
  const { stats } = useStats();
  const { providers } = useProviders();
  const { catalog } = useMcpCatalog();

  const apiFilter = useMemo(() => ({
    type: filters.types.length === 1 ? (filters.types[0] as AssetType) : undefined,
    tool: filters.tools.length === 1 ? (filters.tools[0] as AiTool) : undefined,
    search: filters.search || undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    providerId: filters.providerId || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [filters, page]);

  const { result, loading } = useAssets(apiFilter);

  const handleFiltersChange = (next: AssetFiltersValue) => {
    setFilters(next);
    setPage(1);
  };

  const totalPages = result ? Math.ceil(result.totalCount / PAGE_SIZE) : 0;

  const availableTags = useMemo(() => {
    if (!result) return [];
    const tagSet = new Set<string>();
    result.items.forEach(a => a.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [result]);

  return (
    <Page themeId="tool">
      <Header
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: 2.5,
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            >
              <HubIcon sx={{ fontSize: '1.5rem', color: '#fff' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              <Box sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: '#fff' }}>
                Dev AI Hub
              </Box>
              <Box sx={{ fontSize: '0.85rem', fontWeight: 400, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>
                {stats
                  ? (() => {
                      const providerCount = Object.keys(stats.byProvider).length;
                      const providerStr = t(providerCount === 1 ? 'devAiHubPage.providerCountOne' : 'devAiHubPage.providerCountOther', { n: String(providerCount) });
                      return t('devAiHubPage.totalStats', { totalAssets: String(stats.totalAssets), providers: providerStr });
                    })()
                  : t('devAiHubPage.subtitle')}
              </Box>
            </Box>
          </Box>
        }
        pageTitleOverride="Dev AI Hub"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Supported tool icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {SUPPORTED_TOOLS.map(tool => (
              <Tooltip key={tool} title={TOOL_LABELS[tool]} arrow>
                <Box
                  sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)', transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <ToolIcon tool={tool} branded={false} sx={{ fontSize: '1rem', color: '#fff' }} />
                </Box>
              </Tooltip>
            ))}
          </Box>

          {/* Last sync indicator */}
          {stats?.lastSync && (
            <Tooltip title={t('devAiHubPage.lastSync', { time: new Date(stats.lastSync).toLocaleString() })} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                <FiberManualRecordIcon sx={{ fontSize: '0.6rem', color: '#4ade80' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                  {timeAgo(stats.lastSync, t as TFunc)}
                </Typography>
              </Box>
            </Tooltip>
          )}

          {/* MCP Servers button */}
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<ExtensionIcon />}
              onClick={() => setMcpDialogOpen(true)}
              sx={{
                borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', boxShadow: 'none',
                '&:hover': {
                  background: 'rgba(255,255,255,0.32)',
                  borderColor: 'rgba(255,255,255,0.7)',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.15)',
                },
              }}
            >
              {t('devAiHubPage.configMcp')}
            </Button>
            {catalog.length > 0 && (
              <Box
                sx={{
                  position: 'absolute', top: -3, right: -3,
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: '#4ade80', boxShadow: '0 0 0 2px rgba(0,0,0,0.15)',
                  animation: 'mcpPulse 2s ease-in-out infinite',
                  '@keyframes mcpPulse': {
                    '0%':   { boxShadow: '0 0 0 0 rgba(74,222,128,0.7), 0 0 0 2px rgba(0,0,0,0.15)' },
                    '70%':  { boxShadow: '0 0 0 6px rgba(74,222,128,0),  0 0 0 2px rgba(0,0,0,0.15)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(74,222,128,0),    0 0 0 2px rgba(0,0,0,0.15)' },
                  },
                }}
              />
            )}
          </Box>
        </Box>
      </Header>

      <Content>
        {/* Stats row — cards and colors configurable via devAiHub.ui */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statsCards.map(key => {
            const { label, Icon } = STATS_META[key];
            const color = typeColors[key];
            const gradient = `linear-gradient(135deg, ${color} 0%, ${darken(color, 0.15)} 100%)`;
            const shadow = `${color}40`;
            const selected = filters.types[0] === key;
            return (
              <Grid item xs={6} sm={3} key={key}>
                <Box
                  onClick={() => handleFiltersChange({ ...filters, types: selected ? [] : [key] })}
                  sx={{
                    background: gradient, borderRadius: 3, p: 2, cursor: 'pointer',
                    boxShadow: selected ? `0 8px 24px ${shadow}` : `0 2px 8px ${shadow}`,
                    transform: selected ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease',
                    outline: selected ? '2px solid rgba(255,255,255,0.6)' : 'none',
                    outlineOffset: 2,
                    '&:hover': { boxShadow: `0 8px 24px ${shadow}`, transform: 'translateY(-2px)' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', lineHeight: 1 }}>
                        {stats ? (stats.byType[key] ?? 0) : <Skeleton width={32} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, mt: 0.5 }}>
                        {label}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon sx={{ color: '#fff', fontSize: '1.4rem' }} />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Providers icon — discrete, opens Drawer */}
        {providers.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, mt: -1 }}>
            <Tooltip
              title={t(providers.length === 1 ? 'devAiHubPage.providerCountOne' : 'devAiHubPage.providerCountOther', { n: String(providers.length) })}
              placement="left"
            >
              <IconButton
                size="small"
                onClick={() => setProvidersDrawerOpen(true)}
                sx={{
                  color: providers.some(p => p.status === 'error') ? 'error.main' : 'text.disabled',
                  '&:hover': { color: providers.some(p => p.status === 'error') ? 'error.dark' : 'text.secondary' },
                }}
              >
                <CloudSyncIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Filters */}
        <AssetFilters
          value={filters}
          onChange={handleFiltersChange}
          availableTags={availableTags}
          providers={providers.length > 1 ? providers : undefined}
        />

        {/* Results count */}
        {result && !loading && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {t(result.totalCount === 1 ? 'devAiHubPage.assetCountOne' : 'devAiHubPage.assetCountOther', { n: String(result.totalCount) })}
          </Typography>
        )}

        {/* Asset grid */}
        <Grid container spacing={1.5}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                  <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
                </Grid>
              ))
            : result?.items.map(asset => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={asset.id}>
                  <AssetCard
                    asset={asset}
                    onView={handleViewAsset}
                    onInstall={handleInstallAsset}
                    onHelp={handleHelpAsset}
                    onOpenMcpCatalog={() => setMcpDialogOpen(true)}
                    mcpCatalog={catalog}
                  />
                </Grid>
              ))}
        </Grid>

        {/* Empty state */}
        {!loading && result?.items.length === 0 && (
          <Box sx={{ py: 12, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ mb: 2, opacity: 0.15, fontSize: '5rem' }}>🤖</Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={600}>{t('devAiHubPage.noAssetsTitle')}</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              {t('devAiHubPage.noAssetsSubtitle')}
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Content>

      <AssetDetailPanel assetId={selectedAssetId} onClose={handleCloseDetail} />
      <AssetInstallDialog assetId={installAssetId} onClose={handleCloseInstall} />
      <AssetHelpDialog
        asset={helpAssetId ? (result?.items.find(a => a.id === helpAssetId) ?? null) : null}
        onClose={handleCloseHelp}
      />
      <McpConfigDialog open={mcpDialogOpen} onClose={() => setMcpDialogOpen(false)} />

      <Snackbar
        open={syncSnackbar}
        autoHideDuration={3000}
        onClose={() => setSyncSnackbar(false)}
        message={t('devAiHubPage.syncTriggered')}
      />

      {/* Providers Drawer */}
      <Drawer
        anchor="right"
        open={providersDrawerOpen}
        onClose={() => setProvidersDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 400 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: 1, borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              {t('devAiHubPage.providersSectionTitle')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {canSync && (
                <Button
                  size="small" variant="outlined"
                  startIcon={providers.some(p => syncing[p.id]) ? <CircularProgress size={14} /> : <SyncIcon />}
                  disabled={providers.some(p => syncing[p.id])}
                  onClick={async () => {
                    await triggerSyncAll(providers.map(p => p.id));
                    setSyncSnackbar(true);
                  }}
                >
                  {t('devAiHubPage.syncAllButton')}
                </Button>
              )}
              <IconButton size="small" onClick={() => setProvidersDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {providers.map((provider, idx) => (
              <Box key={provider.id}>
                <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {provider.status === 'error' && (
                    <Tooltip title={provider.error ?? t('devAiHubPage.providerStatusError')}>
                      <ErrorOutlineIcon sx={{ fontSize: '1.1rem', color: 'error.main', flexShrink: 0 }} />
                    </Tooltip>
                  )}
                  {provider.status === 'syncing' && (
                    <CircularProgress size={16} sx={{ flexShrink: 0 }} />
                  )}
                  {provider.status !== 'error' && provider.status !== 'syncing' && (
                    <CheckCircleOutlineIcon sx={{ fontSize: '1.1rem', color: 'success.main', flexShrink: 0 }} />
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap title={provider.target}
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {provider.target}
                    </Typography>
                    {provider.lastSync && (
                      <Typography variant="caption" color="text.disabled">
                        {timeAgo(provider.lastSync, t as TFunc)}
                      </Typography>
                    )}
                    {provider.status === 'error' && provider.error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }} noWrap title={provider.error}>
                        {provider.error}
                      </Typography>
                    )}
                  </Box>

                  {canSync && (
                    <Tooltip title={t('devAiHubPage.syncButton')}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={!!syncing[provider.id]}
                          onClick={async () => {
                            await triggerSync(provider.id);
                            setSyncSnackbar(true);
                          }}
                        >
                          {syncing[provider.id]
                            ? <CircularProgress size={16} />
                            : <SyncIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
                {idx < providers.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        </Box>
      </Drawer>
    </Page>
  );
}
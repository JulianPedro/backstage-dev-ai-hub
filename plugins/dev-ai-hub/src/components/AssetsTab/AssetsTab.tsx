import { type ElementType, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { darken } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { Content } from '@backstage/core-components';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AssetType, AiTool } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubTranslationRef } from '../../translation';
import { AssetCard } from '../AssetCard';
import { AssetFilters } from '../AssetFilters';
import type { AssetFiltersValue } from '../AssetFilters';
import { AssetDetailPanel } from '../AssetDetailPanel';
import { AssetInstallDialog } from '../AssetInstallDialog';
import { AssetHelpDialog } from '../AssetHelpDialog';
import { useAssets, useStats, useProviders, useMcpCatalog, useTypeConfig } from '../../hooks';

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

export function AssetsTab() {
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Strip current sub-route to get the plugin base path — works in both NFS (/dev-ai-hub/assets)
  // and legacy TabbedLayout (/dev-ai-hub/).
  const pluginBasePath = pathname.replace(/\/(assets|mcp|admin)\/?$/, '').replace(/\/$/, '');

  const [filters, setFilters] = useState<AssetFiltersValue>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
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

  const { stats } = useStats();
  const { providers } = useProviders();
  const { catalog } = useMcpCatalog();
  const { typeColors, statsCards } = useTypeConfig();

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
    <Content>
      {/* Stats cards — configurable via devAiHub.ui.statsCards (max 4) */}
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
                  background: gradient,
                  borderRadius: 3,
                  p: 2,
                  cursor: 'pointer',
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

      {/* Providers icon — navigates to Admin tab */}
      {providers.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, mt: -1 }}>
          <Tooltip
            title={t(providers.length === 1 ? 'devAiHubPage.providerCountOne' : 'devAiHubPage.providerCountOther', { n: String(providers.length) })}
            placement="left"
          >
            <IconButton
              size="small"
              onClick={() => navigate(`${pluginBasePath}/admin`)}
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
                  onOpenMcpCatalog={() => navigate(`${pluginBasePath}/mcp`)}
                  mcpCatalog={catalog}
                />
              </Grid>
            ))}
      </Grid>

      {/* Empty state */}
      {!loading && result?.items.length === 0 && (
        <Box sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h1" sx={{ mb: 2, opacity: 0.15, fontSize: '5rem' }}>🤖</Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            {t('devAiHubPage.noAssetsTitle')}
          </Typography>
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

      <AssetDetailPanel assetId={selectedAssetId} onClose={handleCloseDetail} />
      <AssetInstallDialog assetId={installAssetId} onClose={handleCloseInstall} />
      <AssetHelpDialog
        asset={helpAssetId ? (result?.items.find(a => a.id === helpAssetId) ?? null) : null}
        onClose={handleCloseHelp}
      />
    </Content>
  );
}
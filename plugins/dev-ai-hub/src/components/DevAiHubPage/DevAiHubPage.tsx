import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import HubIcon from '@mui/icons-material/Hub';
import { Content, Header, Page } from '@backstage/core-components';
import type { AssetType, AiTool } from '@internal/plugin-dev-ai-hub-common';
import { AssetCard } from '../AssetCard';
import { AssetFilters } from '../AssetFilters';
import type { AssetFiltersValue } from '../AssetFilters';
import { AssetDetailPanel } from '../AssetDetailPanel';
import { AssetInstallDialog } from '../AssetInstallDialog';
import { McpConfigDialog } from '../McpConfigDialog';
import { ToolIcon } from '../ToolIcon';
import { useAssets, useStats, useProviders } from '../../hooks';

const SUPPORTED_TOOLS: AiTool[] = ['claude-code', 'github-copilot', 'google-gemini', 'cursor'];

const TOOL_LABELS: Record<AiTool, string> = {
  'all':            'Universal',
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const DEFAULT_FILTERS: AssetFiltersValue = {
  types: [],
  tools: [],
  search: '',
  tags: [],
  providerId: undefined,
};

const PAGE_SIZE = 24;

const STATS_CONFIG = [
  { key: 'instruction' as AssetType, label: 'Instructions', Icon: ArticleIcon,
    gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', shadow: '#2563EB40' },
  { key: 'agent'       as AssetType, label: 'Agents',       Icon: SmartToyIcon,
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', shadow: '#7C3AED40' },
  { key: 'skill'       as AssetType, label: 'Skills',       Icon: BuildIcon,
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', shadow: '#05966940' },
  { key: 'workflow'    as AssetType, label: 'Workflows',    Icon: AccountTreeIcon,
    gradient: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', shadow: '#D9770640' },
];

export function DevAiHubPage() {
  const [filters, setFilters] = useState<AssetFiltersValue>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAssetId = searchParams.get('assetId');
  const installAssetId = searchParams.get('installId');

  const handleViewAsset = (id: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('assetId', id); return n; });

  const handleCloseDetail = () =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('assetId'); return n; });

  const handleInstallAsset = (id: string) =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('installId', id); return n; });

  const handleCloseInstall = () =>
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('installId'); return n; });

  const { stats } = useStats();
  const { providers } = useProviders();

  const apiFilter = useMemo(
    () => ({
      type: filters.types.length === 1 ? (filters.types[0] as AssetType) : undefined,
      tool: filters.tools.length === 1 ? (filters.tools[0] as AiTool) : undefined,
      search: filters.search || undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      providerId: filters.providerId || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [filters, page],
  );

  const { result, loading } = useAssets(apiFilter);

  const handleFiltersChange = (next: AssetFiltersValue) => {
    setFilters(next);
    setPage(1);
  };

  const totalPages = result ? Math.ceil(result.totalCount / PAGE_SIZE) : 0;

  const availableTags = useMemo(() => {
    if (!result) return [];
    const tagSet = new Set<string>();
    result.items.forEach(a => a.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [result]);

  return (
    <Page themeId="tool">
      <Header
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 2.5,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
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
                  ? `${stats.totalAssets} assets · ${Object.keys(stats.byProvider).length} provider${Object.keys(stats.byProvider).length !== 1 ? 's' : ''}`
                  : 'Centralized AI assets for your team'}
              </Box>
            </Box>
          </Box>
        }
        pageTitleOverride="Dev AI Hub"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Supported tools */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {SUPPORTED_TOOLS.map(tool => (
              <Tooltip key={tool} title={TOOL_LABELS[tool]} arrow>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                    transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <ToolIcon tool={tool} branded={false} sx={{ fontSize: '1rem', color: '#fff' }} />
                </Box>
              </Tooltip>
            ))}
          </Box>

          {/* Last sync status */}
          {stats?.lastSync && (
            <Tooltip title={`Last sync: ${new Date(stats.lastSync).toLocaleString()}`} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                <FiberManualRecordIcon sx={{ fontSize: '0.6rem', color: '#4ade80' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                  {timeAgo(stats.lastSync)}
                </Typography>
              </Box>
            </Tooltip>
          )}

          {/* Configure MCP button */}
          <Button
            variant="contained"
            size="small"
            startIcon={<SettingsEthernetIcon />}
            onClick={() => setMcpDialogOpen(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              boxShadow: 'none',
              '&:hover': {
                background: 'rgba(255,255,255,0.25)',
                boxShadow: 'none',
              },
            }}
          >
            Configure MCP
          </Button>
        </Box>
      </Header>

      <Content>

        {/* Stats row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {STATS_CONFIG.map(({ key, label, Icon, gradient, shadow }) => (
            <Grid item xs={6} sm={3} key={key}>
              <Box
                onClick={() => handleFiltersChange({ ...filters, types: filters.types[0] === key ? [] : [key] })}
                sx={{
                  background: gradient,
                  borderRadius: 3,
                  p: 2,
                  cursor: 'pointer',
                  boxShadow: filters.types[0] === key ? `0 8px 24px ${shadow}` : `0 2px 8px ${shadow}`,
                  transform: filters.types[0] === key ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease',
                  outline: filters.types[0] === key ? '2px solid rgba(255,255,255,0.6)' : 'none',
                  outlineOffset: 2,
                  '&:hover': {
                    boxShadow: `0 8px 24px ${shadow}`,
                    transform: 'translateY(-2px)',
                  },
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
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ color: '#fff', fontSize: '1.4rem' }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <AssetFilters
          value={filters}
          onChange={handleFiltersChange}
          availableTags={availableTags}
          providers={providers.length > 1 ? providers : undefined}
        />

        {/* Results summary */}
        {result && !loading && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {result.totalCount} asset{result.totalCount !== 1 ? 's' : ''} found
          </Typography>
        )}

        {/* Asset grid — 4 columns on large screens */}
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
                  />
                </Grid>
              ))}
        </Grid>

        {/* Empty state */}
        {!loading && result?.items.length === 0 && (
          <Box sx={{ py: 12, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ mb: 2, opacity: 0.15, fontSize: '5rem' }}>🤖</Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={600}>No assets found</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              Try adjusting your filters or search terms.
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

      <AssetDetailPanel
        assetId={selectedAssetId}
        onClose={handleCloseDetail}
      />

      <AssetInstallDialog
        assetId={installAssetId}
        onClose={handleCloseInstall}
      />

      <McpConfigDialog
        open={mcpDialogOpen}
        onClose={() => setMcpDialogOpen(false)}
      />
    </Page>
  );
}

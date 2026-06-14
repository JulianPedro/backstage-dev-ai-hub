import type { ElementType } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StorageIcon from '@mui/icons-material/Storage';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AiAssetSummary, AssetType, AiTool, McpCatalogEntry, McpRequirement } from '@julianpedro/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import { ModelBadge } from '../ModelIcon';
import { devAiHubTranslationRef } from '../../translation';
import { useTypeConfig } from '../../hooks';

const POPULAR_THRESHOLD = 5;
const NEW_DAYS_MS     = 14 * 24 * 60 * 60 * 1000;
const UPDATED_DAYS_MS =  7 * 24 * 60 * 60 * 1000;

const TOOL_LABELS: Record<AiTool, string> = {
  'all':            'Universal',
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

const TYPE_LABELS: Record<AssetType, string> = {
  instruction: 'Instruction',
  agent:       'Agent',
  skill:       'Skill',
  workflow:    'Workflow',
  prompt:      'Prompt',
  bundle:      'Bundle',
};

const TYPE_ICONS: Record<AssetType, ElementType> = {
  instruction: ArticleIcon,
  agent:       SmartToyIcon,
  skill:       BuildIcon,
  workflow:    AccountTreeIcon,
  prompt:      ChatIcon,
  bundle:      Inventory2Icon,
};

function resolveMcp(req: McpRequirement, catalog: McpCatalogEntry[]): { name: string; icon?: string } {
  const entry = catalog.find(e => e.id === req.id);
  return {
    name: req.name ?? entry?.name ?? req.id,
    icon: req.icon ?? entry?.icon,
  };
}

interface AssetCardProps {
  asset: AiAssetSummary;
  onView: (id: string) => void;
  onInstall: (id: string) => void;
  onHelp?: (id: string) => void;
  onOpenMcpCatalog?: () => void;
  mcpCatalog?: McpCatalogEntry[];
}

export function AssetCard({ asset, onView, onInstall, onHelp, onOpenMcpCatalog, mcpCatalog = [] }: AssetCardProps) {
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const theme = useTheme();
  const { typeColors } = useTypeConfig();
  const isDark = (theme.palette as any).mode === 'dark' || (theme.palette as any).type === 'dark';
  const color = typeColors[asset.type];
  const TypeIcon = TYPE_ICONS[asset.type];
  const isPopular = asset.installCount >= POPULAR_THRESHOLD;
  const isNew     = Date.now() - new Date(asset.createdAt).getTime() < NEW_DAYS_MS;
  const isUpdated = !isNew && Date.now() - new Date(asset.updatedAt).getTime() < UPDATED_DAYS_MS;

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
        borderLeft: `3px solid ${color}`,
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: `0 6px 24px ${color}30`,
          borderColor: color,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, pb: '0 !important', flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              backgroundColor: alpha(color, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${color}25`,
            }}
          >
            {asset.icon ? (
              <Box
                component="img"
                src={asset.icon}
                alt={asset.label ?? asset.name}
                sx={{ width: 26, height: 26, objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <TypeIcon sx={{ color, fontSize: '1.3rem' }} />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
              <Typography variant="body2" fontWeight={700} noWrap title={asset.label ?? asset.name} sx={{ lineHeight: 1.2, flex: 1 }}>
                {asset.label ?? asset.name}
              </Typography>
              {isNew && (
                <Chip
                  label={t('assetCard.newBadge')}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    backgroundColor: alpha('#059669', isDark ? 0.25 : 0.14),
                    backdropFilter: 'blur(8px)',
                    color: isDark ? '#6ee7b7' : '#059669',
                    border: '1px solid',
                    borderColor: alpha('#059669', isDark ? 0.5 : 0.3),
                    borderRadius: 1,
                    flexShrink: 0,
                    '& .MuiChip-label': { px: '6px' },
                  }}
                />
              )}
              {isUpdated && (
                <Chip
                  label={t('assetCard.updatedBadge')}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    backgroundColor: alpha('#D97706', isDark ? 0.25 : 0.12),
                    color: isDark ? '#fcd34d' : '#D97706',
                    border: '1px solid',
                    borderColor: alpha('#D97706', isDark ? 0.5 : 0.3),
                    borderRadius: 1,
                    flexShrink: 0,
                    '& .MuiChip-label': { px: '6px' },
                  }}
                />
              )}
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                {TYPE_LABELS[asset.type]}
              </Typography>
              {asset.type === 'agent' && asset.model && (
                <Box sx={{ mt: 0.3 }}>
                  <ModelBadge model={asset.model} />
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="caption"
          color="text.secondary"
          title={asset.description}
          sx={{
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {asset.description}
        </Typography>

        {/* Tools */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: asset.tags.length > 0 ? 0.75 : 0 }}>
          {asset.tools.map(tool => (
            <Chip
              key={tool}
              icon={<ToolIcon tool={tool as AiTool} sx={{ fontSize: '0.75rem !important' }} />}
              label={TOOL_LABELS[tool as AiTool] ?? tool}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: 'action.hover',
                color: 'text.secondary',
                borderRadius: 1,
                '& .MuiChip-icon': { ml: '4px' },
              }}
            />
          ))}
        </Box>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {asset.tags.slice(0, 3).map(tag => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  color: 'text.disabled',
                  backgroundColor: 'transparent',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              />
            ))}
            {asset.tags.length > 3 && (
              <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center' }}>
                +{asset.tags.length - 3}
              </Typography>
            )}
          </Box>
        )}

        {/* Required MCPs — circular icon-only badges, below tags */}
        {asset.mcps && asset.mcps.length > 0 && (
          <Box sx={{ mt: 0.75, mb: 1 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
              {t('assetCard.mcpsRequired')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {asset.mcps.map(req => {
                const { name, icon } = resolveMcp(req, mcpCatalog);
                return (
                  <Box
                    key={req.id}
                    title={name}
                    onClick={onOpenMcpCatalog}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                      cursor: onOpenMcpCatalog ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                      '&:hover': onOpenMcpCatalog ? { backgroundColor: 'action.selected' } : {},
                    }}
                  >
                    {icon ? (
                      <Box
                        component="img"
                        src={icon}
                        alt={name}
                        sx={{ width: 18, height: 18, objectFit: 'contain' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <StorageIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ px: 1.5, py: 1, justifyContent: 'space-between', mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            {asset.type === 'bundle' && asset.itemCount !== undefined
              ? t('assetCard.bundleFooter', { itemCount: String(asset.itemCount), author: asset.author })
              : t('assetCard.versionFooter', { version: asset.version, author: asset.author })}
          </Typography>
          {asset.installCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                {isPopular ? '🔥' : '↓'}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                {asset.installCount}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          <Tooltip title={t('assetCard.installTooltip')}>
            <IconButton size="small" onClick={() => onInstall(asset.id)} color="primary">
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('assetCard.detailsTooltip')}>
            <IconButton size="small" onClick={() => onView(asset.id)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {asset.helpText && onHelp && (
            <Tooltip title={t('assetCard.helpTooltip')}>
              <IconButton size="small" onClick={() => onHelp(asset.id)}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  );
}
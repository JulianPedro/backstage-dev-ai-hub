import type { ElementType } from 'react';
import { alpha } from '@mui/material/styles';
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
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type { AiAssetSummary, AssetType, AiTool } from '@internal/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';

const POPULAR_THRESHOLD = 5;
const NEW_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const TOOL_LABELS: Record<AiTool, string> = {
  'all':            'Universal',
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

const TYPE_CONFIG: Record<AssetType, { label: string; color: string; Icon: ElementType }> = {
  instruction: { label: 'Instruction', color: '#2563EB', Icon: ArticleIcon },
  agent:       { label: 'Agent',       color: '#7C3AED', Icon: SmartToyIcon },
  skill:       { label: 'Skill',       color: '#059669', Icon: BuildIcon },
  workflow:    { label: 'Workflow',    color: '#D97706', Icon: AccountTreeIcon },
};

interface AssetCardProps {
  asset: AiAssetSummary;
  onView: (id: string) => void;
  onInstall: (id: string) => void;
}

export function AssetCard({ asset, onView, onInstall }: AssetCardProps) {
  const cfg = TYPE_CONFIG[asset.type];
  const TypeIcon = cfg.Icon;
  const isPopular = asset.installCount >= POPULAR_THRESHOLD;
  const isNew = Date.now() - new Date(asset.updatedAt).getTime() < NEW_DAYS_MS;

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
        borderLeft: `3px solid ${cfg.color}`,
        transition: 'all 0.18s ease',
        '&:hover': {
          boxShadow: `0 6px 24px ${cfg.color}30`,
          borderColor: cfg.color,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, pb: '0 !important', flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              backgroundColor: alpha(cfg.color, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${cfg.color}25`,
            }}
          >
            {asset.icon ? (
              <Box
                component="img"
                src={asset.icon}
                alt={asset.label ?? asset.name}
                sx={{ width: 20, height: 20, objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <TypeIcon sx={{ color: cfg.color, fontSize: '1.1rem' }} />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
              <Typography variant="body2" fontWeight={700} noWrap title={asset.label ?? asset.name} sx={{ lineHeight: 1.2, flex: 1 }}>
                {asset.label ?? asset.name}
              </Typography>
              {isNew && (
                <Chip
                  label="New"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    backgroundColor: 'success.main',
                    color: 'success.contrastText',
                    borderRadius: 1,
                    flexShrink: 0,
                    '& .MuiChip-label': { px: '5px' },
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>
              {cfg.label}
            </Typography>
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="caption"
          color="text.secondary"
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
      </CardContent>

      <CardActions sx={{ px: 1.5, py: 1, justifyContent: 'space-between', mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            v{asset.version} · {asset.author}
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
          <Tooltip title="Install in editor">
            <IconButton size="small" onClick={() => onInstall(asset.id)} color="primary">
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => onView(asset.id)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
}

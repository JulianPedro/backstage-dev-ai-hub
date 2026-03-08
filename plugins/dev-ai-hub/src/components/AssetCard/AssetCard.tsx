import React from 'react';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckIcon from '@mui/icons-material/Check';
import type { AiAsset, AssetType, AiTool } from '@internal/plugin-dev-ai-hub-common';
import { useCopyToClipboard } from '../../hooks';
import { ToolIcon } from '../ToolIcon';

const TOOL_LABELS: Record<AiTool, string> = {
  'all':            'Universal',
  'claude-code':    'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini':  'Google Gemini',
  'cursor':         'Cursor',
};

const TYPE_CONFIG: Record<AssetType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  instruction: { label: 'Instruction', color: '#2563EB', bg: '#EFF6FF', Icon: ArticleIcon },
  agent:       { label: 'Agent',       color: '#7C3AED', bg: '#F5F3FF', Icon: SmartToyIcon },
  skill:       { label: 'Skill',       color: '#059669', bg: '#ECFDF5', Icon: BuildIcon },
  workflow:    { label: 'Workflow',    color: '#D97706', bg: '#FFFBEB', Icon: AccountTreeIcon },
};


interface AssetCardProps {
  asset: AiAsset;
  onView: (asset: AiAsset) => void;
  onInstall: (asset: AiAsset) => void;
}

export function AssetCard({ asset, onView, onInstall }: AssetCardProps) {
  const { copy, copied } = useCopyToClipboard();
  const cfg = TYPE_CONFIG[asset.type];
  const TypeIcon = cfg.Icon;

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
        transition: 'all 0.15s ease',
        '&:hover': {
          boxShadow: `0 4px 20px ${cfg.color}25`,
          borderColor: cfg.color,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, pb: '0 !important', flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              backgroundColor: cfg.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {asset.icon ? (
              <Box
                component="img"
                src={asset.icon}
                alt={asset.name}
                sx={{ width: 20, height: 20, objectFit: 'contain' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <TypeIcon sx={{ color: cfg.color, fontSize: '1rem' }} />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap title={asset.name} sx={{ lineHeight: 1.2 }}>
              {asset.name}
            </Typography>
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
              <DownloadDoneIcon sx={{ fontSize: '0.65rem', color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                {asset.installCount}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          <Tooltip title={copied ? 'Copied!' : 'Copy Markdown'}>
            <IconButton size="small" onClick={() => copy(asset.content)}>
              {copied
                ? <CheckIcon fontSize="small" color="success" />
                : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Install in editor">
            <IconButton size="small" onClick={() => onInstall(asset)} color="primary">
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => onView(asset)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
}

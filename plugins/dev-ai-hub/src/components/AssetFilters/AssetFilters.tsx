import { type ElementType, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import ArticleIcon from '@mui/icons-material/Article';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ChatIcon from '@mui/icons-material/Chat';
import AppsIcon from '@mui/icons-material/Apps';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AssetType, AiTool, AiHubProvider } from '@julianpedro/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import { devAiHubTranslationRef } from '../../translation';

const ASSET_TYPES: { value: AssetType | 'all'; label: string; color: string; Icon: ElementType }[] = [
  { value: 'all', label: 'All', color: '#64748b', Icon: AppsIcon },
  { value: 'instruction', label: 'Instructions', color: '#2563EB', Icon: ArticleIcon },
  { value: 'agent', label: 'Agents', color: '#7C3AED', Icon: SmartToyIcon },
  { value: 'skill', label: 'Skills', color: '#059669', Icon: BuildIcon },
  { value: 'workflow', label: 'Workflows', color: '#D97706', Icon: AccountTreeIcon },
  { value: 'prompt',   label: 'Prompts',   color: '#EC4899', Icon: ChatIcon },
  { value: 'bundle',   label: 'Bundles',   color: '#8B5CF6', Icon: Inventory2Icon },
];

const AI_TOOLS: { value: AiTool | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tools' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'github-copilot', label: 'GitHub Copilot' },
  { value: 'google-gemini', label: 'Google Gemini' },
  { value: 'cursor', label: 'Cursor' },
];

export interface AssetFiltersValue {
  types: AssetType[];
  tools: AiTool[];
  search: string;
  tags: string[];
  providerId?: string;
}

interface AssetFiltersProps {
  value: AssetFiltersValue;
  onChange: (value: AssetFiltersValue) => void;
  availableTags?: string[];
  providers?: AiHubProvider[];
}

const TAG_LIMIT = 10;

export function AssetFilters({ value, onChange, availableTags = [], providers }: AssetFiltersProps) {
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const selectedType = value.types.length === 1 ? value.types[0] : 'all';
  const selectedTool = value.tools.length === 1 ? value.tools[0] : 'all';
  const showProviderFilter = providers && providers.length > 1;

  // Selected tags always appear first so they're never hidden when collapsed
  const sortedTags = [...availableTags].sort((a, b) => {
    const aSelected = value.tags.includes(a);
    const bSelected = value.tags.includes(b);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });
  const visibleTags = tagsExpanded ? sortedTags : sortedTags.slice(0, TAG_LIMIT);
  const hiddenCount = sortedTags.length - TAG_LIMIT;

  const handleTypeClick = (type: AssetType | 'all') => {
    onChange({ ...value, types: type === 'all' ? [] : [type] });
  };

  const handleToolClick = (tool: AiTool | 'all') => {
    onChange({ ...value, tools: tool === 'all' ? [] : [tool] });
  };

  const handleTagToggle = (tag: string) => {
    const next = value.tags.includes(tag)
      ? value.tags.filter(tag_ => tag_ !== tag)
      : [...value.tags, tag];
    onChange({ ...value, tags: next });
  };

  const handleProviderClick = (id: string | undefined) => {
    onChange({ ...value, providerId: id });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
      <TextField
        fullWidth
        size="small"
        placeholder={t('assetFilters.searchPlaceholder')}
        value={value.search}
        onChange={e => onChange({ ...value, search: e.target.value })}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
        }}
      />

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Type filter */}
        <Box>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('assetFilters.typeHeader')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {ASSET_TYPES.map(typ => {
              const isSelected = selectedType === typ.value;
              const TypeIcon = typ.Icon;
              const label = typ.value === 'all' ? t('assetFilters.typeAll') : typ.label;
              return (
                <Chip
                  key={typ.value}
                  icon={<TypeIcon sx={{ fontSize: '0.9rem !important', color: isSelected ? '#fff !important' : typ.color }} />}
                  label={label}
                  size="small"
                  clickable
                  onClick={() => handleTypeClick(typ.value as AssetType | 'all')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: isSelected ? typ.color : `${typ.color}60`,
                    backgroundColor: isSelected ? typ.color : 'transparent',
                    color: isSelected ? '#fff' : typ.color,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: isSelected ? typ.color : `${typ.color}18`,
                      borderColor: typ.color,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* AI Tool filter */}
        <Box>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('assetFilters.aiToolHeader')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {AI_TOOLS.map(tool => {
              const isSelected = selectedTool === tool.value;
              const toolLabel = tool.value === 'all' ? t('assetFilters.allTools') : tool.label;
              const iconEl = tool.value !== 'all'
                ? <ToolIcon tool={tool.value as AiTool} branded={!isSelected} sx={{ fontSize: '0.85rem !important', color: isSelected ? 'background.paper' : 'inherit' }} />
                : undefined;
              return (
                <Chip
                  key={tool.value}
                  icon={iconEl}
                  label={toolLabel}
                  size="small"
                  clickable
                  onClick={() => handleToolClick(tool.value as AiTool | 'all')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: isSelected ? 'text.primary' : 'divider',
                    backgroundColor: isSelected ? 'text.primary' : 'transparent',
                    color: isSelected ? 'background.paper' : 'text.secondary',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: 'text.primary',
                      backgroundColor: isSelected ? 'text.primary' : 'action.hover',
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Provider filter — only shown when there are 2+ providers */}
        {showProviderFilter && (
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('assetFilters.providerHeader')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Chip
                icon={<AppsIcon sx={{ fontSize: '0.9rem !important' }} />}
                label={t('assetFilters.typeAll')}
                size="small"
                clickable
                onClick={() => handleProviderClick(undefined)}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderRadius: 2,
                  border: '1.5px solid',
                  borderColor: !value.providerId ? 'text.primary' : 'divider',
                  backgroundColor: !value.providerId ? 'text.primary' : 'transparent',
                  color: !value.providerId ? 'background.paper' : 'text.secondary',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: 'text.primary',
                    backgroundColor: !value.providerId ? 'text.primary' : 'action.hover',
                  },
                }}
              />
              {providers.map(p => {
                const isSelected = value.providerId === p.id;
                const label = p.target.split('/').slice(-1)[0]?.replace(/\.git$/, '') ?? p.id;
                return (
                  <Chip
                    key={p.id}
                    icon={<StorageIcon sx={{ fontSize: '0.85rem !important', color: isSelected ? 'background.paper' : 'inherit' }} />}
                    label={label}
                    size="small"
                    clickable
                    onClick={() => handleProviderClick(p.id)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: isSelected ? 'text.primary' : 'divider',
                      backgroundColor: isSelected ? 'text.primary' : 'transparent',
                      color: isSelected ? 'background.paper' : 'text.secondary',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: 'text.primary',
                        backgroundColor: isSelected ? 'text.primary' : 'action.hover',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {availableTags.length > 0 && (
        <Box>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('assetFilters.tagsHeader')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {visibleTags.map(tag => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                clickable
                onClick={() => handleTagToggle(tag)}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: value.tags.includes(tag) ? 700 : 400,
                  borderRadius: 1.5,
                  backgroundColor: value.tags.includes(tag) ? 'primary.main' : 'transparent',
                  color: value.tags.includes(tag) ? '#fff' : 'text.secondary',
                  border: '1px solid',
                  borderColor: value.tags.includes(tag) ? 'primary.main' : 'divider',
                }}
              />
            ))}
            {!tagsExpanded && hiddenCount > 0 && (
              <Chip
                label={t('assetFilters.tagsShowMore', { remaining: String(hiddenCount) })}
                size="small"
                clickable
                onClick={() => setTagsExpanded(true)}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  backgroundColor: 'transparent',
                  color: 'text.disabled',
                  border: '1px dashed',
                  borderColor: 'divider',
                  '&:hover': { color: 'text.secondary', borderColor: 'text.secondary' },
                }}
              />
            )}
            {tagsExpanded && availableTags.length > TAG_LIMIT && (
              <Chip
                label={t('assetFilters.tagsShowLess')}
                size="small"
                clickable
                onClick={() => setTagsExpanded(false)}
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  backgroundColor: 'transparent',
                  color: 'text.disabled',
                  border: '1px dashed',
                  borderColor: 'divider',
                  '&:hover': { color: 'text.secondary', borderColor: 'text.secondary' },
                }}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
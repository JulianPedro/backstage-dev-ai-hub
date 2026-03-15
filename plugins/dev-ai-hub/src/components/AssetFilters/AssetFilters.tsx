import type { ElementType } from 'react';
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
import AppsIcon from '@mui/icons-material/Apps';
import type { AssetType, AiTool, AiHubProvider } from '@internal/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';

const ASSET_TYPES: { value: AssetType | 'all'; label: string; color: string; Icon: ElementType }[] = [
  { value: 'all', label: 'All', color: '#64748b', Icon: AppsIcon },
  { value: 'instruction', label: 'Instructions', color: '#2563EB', Icon: ArticleIcon },
  { value: 'agent', label: 'Agents', color: '#7C3AED', Icon: SmartToyIcon },
  { value: 'skill', label: 'Skills', color: '#059669', Icon: BuildIcon },
  { value: 'workflow', label: 'Workflows', color: '#D97706', Icon: AccountTreeIcon },
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

export function AssetFilters({ value, onChange, availableTags = [], providers }: AssetFiltersProps) {
  const selectedType = value.types.length === 1 ? value.types[0] : 'all';
  const selectedTool = value.tools.length === 1 ? value.tools[0] : 'all';
  const showProviderFilter = providers && providers.length > 1;

  const handleTypeClick = (type: AssetType | 'all') => {
    onChange({ ...value, types: type === 'all' ? [] : [type] });
  };

  const handleToolClick = (tool: AiTool | 'all') => {
    onChange({ ...value, tools: tool === 'all' ? [] : [tool] });
  };

  const handleTagToggle = (tag: string) => {
    const next = value.tags.includes(tag)
      ? value.tags.filter(t => t !== tag)
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
        placeholder="Search assets by name, description or content…"
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
            Type
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {ASSET_TYPES.map(t => {
              const isSelected = selectedType === t.value;
              const TypeIcon = t.Icon;
              return (
                <Chip
                  key={t.value}
                  icon={<TypeIcon sx={{ fontSize: '0.9rem !important', color: isSelected ? '#fff !important' : t.color }} />}
                  label={t.label}
                  size="small"
                  clickable
                  onClick={() => handleTypeClick(t.value as AssetType | 'all')}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: isSelected ? t.color : `${t.color}60`,
                    backgroundColor: isSelected ? t.color : 'transparent',
                    color: isSelected ? '#fff' : t.color,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: isSelected ? t.color : `${t.color}18`,
                      borderColor: t.color,
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
            AI Tool
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {AI_TOOLS.map(t => {
              const isSelected = selectedTool === t.value;
              const iconEl = t.value !== 'all'
                ? <ToolIcon tool={t.value as AiTool} branded={!isSelected} sx={{ fontSize: '0.85rem !important', color: isSelected ? 'background.paper' : 'inherit' }} />
                : undefined;
              return (
                <Chip
                  key={t.value}
                  icon={iconEl}
                  label={t.label}
                  size="small"
                  clickable
                  onClick={() => handleToolClick(t.value as AiTool | 'all')}
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
              Provider
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Chip
                icon={<AppsIcon sx={{ fontSize: '0.9rem !important' }} />}
                label="All"
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
            Tags
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {availableTags.map(tag => (
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
          </Box>
        </Box>
      )}
    </Box>
  );
}

import { useState, useRef, useEffect, type ReactNode, type ElementType } from 'react';
import { Box, Flex, Text, SearchField } from '@backstage/ui';
import { RiAppsLine, RiArticleLine, RiRobot2Line, RiToolsLine, RiGitBranchLine, RiCheckLine } from '@remixicon/react';
import type { AssetType, AiTool, AiHubProvider } from '@nospt/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import styles from './AssetFilters.module.css';

const ASSET_TYPE_OPTIONS: { value: AssetType | 'all'; label: string; color: string; Icon: ElementType }[] = [
  { value: 'all',         label: 'All Types',     color: '#DCDDE1', Icon: RiAppsLine },
  { value: 'instruction', label: 'Instructions',  color: '#54A0FF', Icon: RiArticleLine },
  { value: 'agent',       label: 'Agents',        color: '#FF6B9D', Icon: RiRobot2Line },
  { value: 'skill',       label: 'Skills',        color: '#6AB04C', Icon: RiToolsLine },
  { value: 'workflow',    label: 'Workflows',     color: '#F9CA24', Icon: RiGitBranchLine },
];

const AI_TOOL_OPTIONS: { value: AiTool | 'all'; label: string }[] = [
  { value: 'all',            label: 'All Tools' },
  { value: 'claude-code',    label: 'Claude Code' },
  { value: 'github-copilot', label: 'GitHub Copilot' },
  { value: 'google-gemini',  label: 'Google Gemini' },
  { value: 'cursor',         label: 'Cursor' },
];

function useDropdownClose(ref: React.RefObject<HTMLElement | null>, onClose: () => void, open: boolean) {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, ref, onClose]);
}

function IconSelectBox<T extends string>({ value: selected, options, onChange, ariaLabel }: {
  value: T;
  options: { value: T; label: string; icon: ReactNode }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDropdownClose(containerRef, () => setOpen(false), open);

  const current = options.find(o => o.value === selected) ?? options[0];

  return (
    <div ref={containerRef} className={styles.tagsDropdown}>
      <button
        type="button"
        className={styles.tagsDropdownTrigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
      >
        <span className={styles.iconSelectTriggerContent}>
          {current.icon}
          <span>{current.label}</span>
        </span>
        <span className={styles.tagsDropdownArrow}>▾</span>
      </button>
      {open && (
        <div className={styles.tagsDropdownPanel} role="listbox" aria-label={ariaLabel}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === selected}
              className={`${styles.iconSelectItem} ${opt.value === selected ? styles.iconSelectItemActive : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className={styles.iconSelectItemIcon}>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.value === selected && <RiCheckLine size={14} className={styles.iconSelectCheck} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagsFilterBox({ selectedTags, availableTags, onChange }: {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  useDropdownClose(containerRef, () => setOpen(false), open);

  const allTags = Array.from(new Set([...availableTags, ...selectedTags]));
  const filtered = allTags.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  const toggleTag = (tag: string) => {
    onChange(selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]);
  };

  const triggerLabel = selectedTags.length > 0
    ? selectedTags.map(t => `#${t}`).join(' ')
    : 'All Tags';
  const showZeroResultsHint = availableTags.length === 0 && selectedTags.length > 0;

  return (
    <div ref={containerRef} className={styles.tagsDropdown}>
      <button
        type="button"
        className={styles.tagsDropdownTrigger}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Filter by tags"
        aria-haspopup="dialog"
      >
        <span>{triggerLabel}</span>
        <span className={styles.tagsDropdownArrow}>▾</span>
      </button>
      {showZeroResultsHint && (
        <p className={styles.tagsDropdownNoResults}>Clear tags to see results…</p>
      )}
      {open && (
        <div className={styles.tagsDropdownPanel} role="dialog" aria-label="Filter by tags">
          <input
            type="search"
            className={styles.tagsDropdownSearch}
            placeholder="Search tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <div className={styles.tagsDropdownSectionLabel}>FILTER YOUR SEARCH</div>
          <div className={styles.tagsDropdownList}>
            {filtered.length === 0 && (
              <div className={styles.tagsDropdownNoResults}>No tags found</div>
            )}
            {filtered.map(tag => (
              <label key={tag} className={styles.tagsDropdownItem}>
                <input
                  type="checkbox"
                  className={styles.tagsDropdownCheckbox}
                  aria-label={tag}
                  checked={selectedTags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                />
                <span>{tag}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const providerOptions = [
    { value: 'all', label: 'All Providers' },
    ...(providers ?? []).map(p => ({
      value: p.id,
      label: p.target.split('/').slice(-1)[0]?.replace(/\.git$/, '') ?? p.id,
    })),
  ];

  const typeSelectOptions = ASSET_TYPE_OPTIONS.map(t => ({
    value: t.value,
    label: t.label,
    icon: <t.Icon size={14} style={{ color: t.color, flexShrink: 0 }} />,
  }));

  const toolSelectOptions = AI_TOOL_OPTIONS.map(t => ({
    value: t.value,
    label: t.label,
    icon: t.value !== 'all'
      ? <ToolIcon tool={t.value as AiTool} branded size={14} />
      : <RiAppsLine size={14} style={{ color: 'var(--bui-fg-secondary)', flexShrink: 0 }} />,
  }));

  return (
    <Flex className={styles.container}>
      <SearchField
        aria-label="Search assets"
        className={styles.searchField}
        placeholder="Search assets by name, description or content…"
        value={value.search}
        onChange={v => onChange({ ...value, search: v })}
      />

      <Flex className={styles.filtersRow}>
        {/* Type filter */}
        <Box className={styles.filterBox}>
          <Text variant="body-x-small" color="secondary" className={styles.filterLabel}>
            Type
          </Text>
          <IconSelectBox
            ariaLabel="Filter by type"
            value={selectedType}
            options={typeSelectOptions}
            onChange={key => onChange({ ...value, types: key === 'all' ? [] : [key as AssetType] })}
          />
        </Box>

        {/* AI Tool filter */}
        <Box className={styles.filterBox}>
          <Text variant="body-x-small" color="secondary" className={styles.filterLabel}>
            AI Tool
          </Text>
          <IconSelectBox
            ariaLabel="Filter by AI tool"
            value={selectedTool}
            options={toolSelectOptions}
            onChange={key => onChange({ ...value, tools: key === 'all' ? [] : [key as AiTool] })}
          />
        </Box>

        {/* Provider filter — only shown when there are 2+ providers */}
        {showProviderFilter && (
          <Box className={styles.filterBox}>
            <Text variant="body-x-small" color="secondary" className={styles.filterLabel}>
              Provider
            </Text>
            <IconSelectBox
              ariaLabel="Filter by provider"
              value={value.providerId ?? 'all'}
              options={providerOptions.map(p => ({
                value: p.value,
                label: p.label,
                icon: <RiAppsLine size={14} style={{ color: 'var(--bui-fg-secondary)', flexShrink: 0 }} />,
              }))}
              onChange={key => onChange({ ...value, providerId: key === 'all' ? undefined : key })}
            />
          </Box>
        )}

        {/* Tags filter */}
        {(availableTags.length > 0 || value.tags.length > 0) && (
          <Box className={styles.filterBox}>
            <Text variant="body-x-small" color="secondary" className={styles.filterLabel}>
              Tags
            </Text>
            <TagsFilterBox
              selectedTags={value.tags}
              availableTags={availableTags}
              onChange={tags => onChange({ ...value, tags })}
            />
          </Box>
        )}
      </Flex>
    </Flex>
  );
}

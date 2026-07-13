import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Flex, SearchField, Text } from '@backstage/ui';
import { RiAppsLine, RiCheckLine } from '@remixicon/react';
import type { AiTool } from '@nospt/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import { frameworkLabel } from './typeMeta';
import styles from './ResourceFilters.module.css';

export interface ResourceFiltersValue {
  search: string;
  framework?: string;
  tags: string[];
}

interface ResourceFiltersProps {
  value: ResourceFiltersValue;
  onChange: (next: ResourceFiltersValue) => void;
  availableFrameworks: string[];
  availableTags: string[];
}

function useDropdownClose(
  ref: React.RefObject<HTMLElement>,
  onClose: () => void,
  open: boolean,
) {
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

function IconSelectBox<T extends string>({
  value: selected,
  options,
  onChange,
  ariaLabel,
}: {
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
              className={`${styles.iconSelectItem} ${
                opt.value === selected ? styles.iconSelectItemActive : ''
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className={styles.iconSelectItemIcon}>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.value === selected && (
                <RiCheckLine size={14} className={styles.iconSelectCheck} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagsFilterBox({
  selectedTags,
  availableTags,
  onChange,
}: {
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
    onChange(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag],
    );
  };

  const triggerLabel =
    selectedTags.length > 0 ? selectedTags.map(t => `#${t}`).join(' ') : 'All Tags';
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

/**
 * Search + labelled filter boxes, copied from the legacy AssetFilters
 * design: full-width search bar with the Tags and AI Tool dropdowns below
 * it. Composes with the StatTiles type filter; search is client-side over
 * name/description/tags (bodies are not in the catalog, ADR-0001).
 */
export function ResourceFilters({
  value,
  onChange,
  availableFrameworks,
  availableTags,
}: ResourceFiltersProps) {
  const toolSelectOptions = [
    {
      value: 'all',
      label: 'All Tools',
      icon: <RiAppsLine size={14} style={{ color: 'var(--bui-fg-secondary)', flexShrink: 0 }} />,
    },
    ...availableFrameworks.map(fw => ({
      value: fw,
      label: frameworkLabel(fw),
      icon: <ToolIcon tool={fw as AiTool} branded size={14} />,
    })),
  ];

  return (
    <Flex className={styles.container}>
      <SearchField
        aria-label="Search resources"
        className={styles.searchField}
        placeholder="Search by name, description or tags…"
        value={value.search}
        onChange={search => onChange({ ...value, search })}
      />

      <Flex className={styles.filtersRow}>
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

        <Box className={styles.filterBox}>
          <Text variant="body-x-small" color="secondary" className={styles.filterLabel}>
            AI Tool
          </Text>
          <IconSelectBox
            ariaLabel="Filter by AI tool"
            value={value.framework ?? 'all'}
            options={toolSelectOptions}
            onChange={key =>
              onChange({ ...value, framework: key === 'all' ? undefined : key })
            }
          />
        </Box>
      </Flex>
    </Flex>
  );
}

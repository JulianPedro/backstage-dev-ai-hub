import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Flex, Skeleton, TablePagination, Text } from '@backstage/ui';
import {
  RESOURCE_TYPES,
  type ResourceSummary,
  type ResourceType,
} from '@nospt/plugin-dev-ai-hub-common';
import { useResources } from '../../hooks/useResources';
import { StatTiles } from './StatTiles';
import { ResourceCard } from './ResourceCard';
import { ResourceFilters, type ResourceFiltersValue } from './ResourceFilters';
import { ResourceDetailPanel } from './ResourceDetailPanel';
import styles from './AiResourcesPage.module.css';

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: ResourceFiltersValue = {
  search: '',
  framework: undefined,
  tags: [],
};

function matchesSearch(r: ResourceSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    r.name.toLowerCase().includes(q) ||
    (r.title ?? '').toLowerCase().includes(q) ||
    (r.description ?? '').toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  );
}

export function AiResourcesPage() {
  const { items, error, loading } = useResources();
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>(
    undefined,
  );
  const [filters, setFilters] = useState<ResourceFiltersValue>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // Staggered card entrance plays once, on the initial load only — re-playing
  // it on every filter/search keystroke would be noisy rather than delightful
  // ("add some flowers"), and cards already remount when they re-enter the
  // filtered set (a separate, pre-existing telemetry consideration).
  const [playEntrance, setPlayEntrance] = useState(true);
  useEffect(() => {
    if (loading || !playEntrance) return undefined;
    const timer = setTimeout(() => setPlayEntrance(false), 900);
    return () => clearTimeout(timer);
  }, [loading, playEntrance]);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRef = searchParams.get('resource');

  const openDetail = (entityRef: string) =>
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      n.set('resource', entityRef);
      return n;
    });

  const closeDetail = () =>
    setSearchParams(p => {
      const n = new URLSearchParams(p);
      n.delete('resource');
      return n;
    });

  const counts = useMemo(() => {
    const c = Object.fromEntries(RESOURCE_TYPES.map(t => [t, 0])) as Record<
      ResourceType,
      number
    >;
    (items ?? []).forEach(r => {
      c[r.type] += 1;
    });
    return c;
  }, [items]);

  const availableFrameworks = useMemo(
    () => Array.from(new Set((items ?? []).flatMap(r => r.frameworks))).sort(),
    [items],
  );

  const availableTags = useMemo(
    () => Array.from(new Set((items ?? []).flatMap(r => r.tags))).sort(),
    [items],
  );

  const visible = useMemo(
    () =>
      (items ?? []).filter(
        r =>
          (!typeFilter || r.type === typeFilter) &&
          (!filters.framework || r.frameworks.includes(filters.framework)) &&
          (filters.tags.length === 0 ||
            filters.tags.every(t => r.tags.includes(t))) &&
          matchesSearch(r, filters.search),
      ),
    [items, typeFilter, filters],
  );

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTileToggle = (type: ResourceType) => {
    setTypeFilter(current => (current === type ? undefined : type));
    setPage(1);
  };

  const handleFiltersChange = (next: ResourceFiltersValue) => {
    setFilters(next);
    setPage(1);
  };

  const selectedResource = selectedRef
    ? (items ?? []).find(r => r.entityRef === selectedRef)
    : undefined;

  return (
    <div className={styles.pageRoot}>
      <StatTiles
        counts={counts}
        activeType={typeFilter}
        onToggle={handleTileToggle}
      />

      <ResourceFilters
        value={filters}
        onChange={handleFiltersChange}
        availableFrameworks={availableFrameworks}
        availableTags={availableTags}
      />

      {loading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              style={{ height: 170, borderRadius: 'var(--bui-radius-2)' }}
            />
          ))}
        </div>
      )}

      {error && (
        <div className={styles.emptyState}>
          <Text variant="title-small" color="secondary" weight="bold" as="p">
            Could not load resources
          </Text>
          <Text variant="body-small" color="secondary" as="p">
            {error.message}
          </Text>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <>
          <Box mb="4">
            <Text variant="body-x-small" color="secondary">
              {visible.length} resource{visible.length !== 1 ? 's' : ''} found
            </Text>
          </Box>
          <div className={styles.grid}>
            {pageItems.map((r, i) => (
              <ResourceCard
                key={r.entityRef}
                resource={r}
                onView={openDetail}
                className={playEntrance ? styles.cardEntrance : undefined}
                style={
                  playEntrance
                    ? ({ '--card-index': i } as React.CSSProperties)
                    : undefined
                }
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Flex className={styles.paginationRow}>
              <TablePagination
                pageSize={PAGE_SIZE}
                offset={(page - 1) * PAGE_SIZE}
                totalCount={visible.length}
                hasNextPage={page < totalPages}
                hasPreviousPage={page > 1}
                onNextPage={() => setPage(p => p + 1)}
                onPreviousPage={() => setPage(p => p - 1)}
              />
            </Flex>
          )}
        </>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyEmoji}>🤖</div>
          <Text variant="title-small" color="secondary" weight="bold" as="p">
            No AI resources found
          </Text>
          <Text variant="body-small" color="secondary" as="p">
            {items && items.length > 0
              ? 'No resources match the current filters.'
              : 'Register AiResource entities in the catalog to see them here.'}
          </Text>
        </div>
      )}

      <ResourceDetailPanel resource={selectedResource} onClose={closeDetail} />
    </div>
  );
}

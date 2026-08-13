import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  devAiHubResourceApiRef,
  ResourceBody,
  ResourceBodyError,
} from '../api/DevAiHubResourceClient';

export type ResourceBodyErrorKind = 'not-found' | 'upstream';

export interface ResourceBodyState {
  body?: ResourceBody;
  loading: boolean;
  error?: ResourceBodyErrorKind;
  retry: () => void;
}

/**
 * Session-lifetime cache, keyed by entityRef. Reopening a resource within the
 * same tab shouldn't repay its network cost every time. Populated on success
 * only — a failed fetch is never cached, so Retry always hits the network.
 * Module-scoped (not per-hook-instance) since the drawer's body content is
 * the same regardless of which component instance asks for it.
 */
const bodyCache = new Map<string, ResourceBody>();

/** Test-only seam: the cache is module-scoped and outlives any one render. */
export function clearResourceBodyCache(): void {
  bodyCache.clear();
}

/**
 * Lazily fetch a resource's viewable body when the detail drawer opens.
 * `enabled` is false for non-actionable resources (no source-location) —
 * nothing is fetched and the state stays empty.
 */
export function useResourceBody(
  entityRef: string | undefined,
  enabled: boolean,
): ResourceBodyState {
  const api = useApi(devAiHubResourceApiRef);
  const [body, setBody] = useState<ResourceBody>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ResourceBodyErrorKind>();
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  useEffect(() => {
    setError(undefined);
    if (!entityRef || !enabled) {
      setBody(undefined);
      setLoading(false);
      return undefined;
    }

    const cached = bodyCache.get(entityRef);
    if (cached) {
      setBody(cached);
      setLoading(false);
      return undefined;
    }

    setBody(undefined);
    let cancelled = false;
    setLoading(true);
    api
      .getEntityBody(entityRef)
      .then(result => {
        bodyCache.set(entityRef, result);
        if (!cancelled) setBody(result);
      })
      .catch(err => {
        if (cancelled) return;
        setError(
          err instanceof ResourceBodyError && err.status === 404
            ? 'not-found'
            : 'upstream',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, entityRef, enabled, attempt]);

  return { body, loading, error, retry };
}

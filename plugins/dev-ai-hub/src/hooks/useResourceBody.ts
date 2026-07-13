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
    setBody(undefined);
    setError(undefined);
    if (!entityRef || !enabled) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    api
      .getEntityBody(entityRef)
      .then(result => {
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

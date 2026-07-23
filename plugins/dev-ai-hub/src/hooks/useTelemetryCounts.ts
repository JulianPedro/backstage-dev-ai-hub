import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import type { TelemetryCounts } from '@nospt/plugin-dev-ai-hub-common';
import { devAiHubResourceApiRef } from '../api/DevAiHubResourceClient';

/**
 * Raw per-action telemetry counts for a resource (ADR-0007). Fetch failures
 * are swallowed — a missing count is not worth surfacing as a UI error, the
 * card/detail just renders without it.
 */
export function useTelemetryCounts(
  entityRef: string | undefined,
): TelemetryCounts | undefined {
  const api = useApi(devAiHubResourceApiRef);
  const [counts, setCounts] = useState<TelemetryCounts>();

  useEffect(() => {
    setCounts(undefined);
    if (!entityRef) return undefined;

    let cancelled = false;
    api
      .getInstallCount(entityRef)
      .then(result => {
        if (!cancelled) setCounts(result);
      })
      .catch(() => {
        // ignored — see above
      });
    return () => {
      cancelled = true;
    };
  }, [api, entityRef]);

  return counts;
}

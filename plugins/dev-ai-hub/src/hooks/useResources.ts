import { useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import { devAiHubResourceApiRef } from '../api/DevAiHubResourceClient';

export function useResources() {
  const api = useApi(devAiHubResourceApiRef);
  const [items, setItems] = useState<ResourceSummary[] | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setItems(undefined);
    setError(undefined);
    api
      .getResources()
      .then(result => {
        if (active) setItems(result);
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      active = false;
    };
  }, [api]);

  return { items, error, loading: items === undefined && error === undefined };
}

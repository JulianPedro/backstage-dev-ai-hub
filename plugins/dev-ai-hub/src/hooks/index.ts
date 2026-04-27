import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { devAiHubApiRef } from '../api/DevAiHubClient';
import type {
  AiAsset,
  AiAssetListResponse,
  AiHubProvider,
  AiHubStats,
  AssetListFilter,
} from '@julianpedro/plugin-dev-ai-hub-common';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useAssets(filter: AssetListFilter) {
  const api = useApi(devAiHubApiRef);
  const [result, setResult] = useState<AiAssetListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedSearch = useDebounce(filter.search, 300);

  const effectiveFilter = { ...filter, search: debouncedSearch };
  const filterKey = JSON.stringify(effectiveFilter);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listAssets(effectiveFilter)
      .then(data => {
        if (!cancelled) {
          setResult(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, api]);

  return { result, loading, error };
}

export function useAssetDetail(id: string | null) {
  const api = useApi(devAiHubApiRef);
  const [asset, setAsset] = useState<AiAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setAsset(null);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    api
      .getAsset(id)
      .then(data => {
        if (!cancelled) {
          setAsset(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, api]);

  return { asset, loading, error };
}

export function useProviders() {
  const api = useApi(devAiHubApiRef);
  const [providers, setProviders] = useState<AiHubProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listProviders()
      .then(data => {
        setProviders(data);
        setError(null);
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return { providers, loading, error, reload: load };
}

export function useStats() {
  const api = useApi(devAiHubApiRef);
  const [stats, setStats] = useState<AiHubStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getStats()
      .then(data => {
        setStats(data);
        setError(null);
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [api]);

  return { stats, loading, error };
}

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return { copy, copied };
}

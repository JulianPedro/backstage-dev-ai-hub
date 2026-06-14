import { useState, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { devAiHubApiRef } from '../api/DevAiHubClient';
import type { AssetType } from '@julianpedro/plugin-dev-ai-hub-common';

const CACHE_KEY = 'dev-ai-hub:ui-config-v1';

const ALL_TYPES: AssetType[] = ['instruction', 'agent', 'skill', 'workflow', 'prompt', 'bundle'];

const DEFAULT_TYPE_COLORS: Record<AssetType, string> = {
  instruction: '#2563EB',
  agent:       '#7C3AED',
  skill:       '#059669',
  workflow:    '#D97706',
  prompt:      '#EC4899',
  bundle:      '#8B5CF6',
};

const DEFAULT_STATS_CARDS: AssetType[] = ['instruction', 'agent', 'skill', 'workflow'];

interface UiConfigValue {
  typeColors: Record<AssetType, string>;
  statsCards: AssetType[];
}

function buildTypeColors(raw: Record<string, string>): Record<AssetType, string> {
  return { ...DEFAULT_TYPE_COLORS, ...(raw as Record<AssetType, string>) };
}

function buildStatsCards(raw: string[]): AssetType[] {
  const configured = raw
    .filter(t => ALL_TYPES.includes(t as AssetType))
    .slice(0, 4) as AssetType[];
  if (!configured.length) return DEFAULT_STATS_CARDS;
  const fill = DEFAULT_STATS_CARDS.filter(t => !configured.includes(t));
  return [...configured, ...fill].slice(0, 4);
}

// ── Module-level store ─────────────────────────────────────────────────────
// Shared across all components in the same page session.
// On first mount: reads localStorage (instant, no flash on revisits).
// Then fetches from backend once and notifies all subscribers.

const subscribers = new Set<(v: UiConfigValue) => void>();
let currentConfig: UiConfigValue | null = null;
let fetchInitiated = false;

function readLocalStorage(): UiConfigValue | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as { typeColors: Record<string, string>; statsCards: string[] };
    return {
      typeColors: buildTypeColors(cfg.typeColors ?? {}),
      statsCards: buildStatsCards(cfg.statsCards ?? []),
    };
  } catch { return null; }
}

function getInitialConfig(): UiConfigValue {
  if (currentConfig) return currentConfig;
  const cached = readLocalStorage();
  currentConfig = cached ?? { typeColors: DEFAULT_TYPE_COLORS, statsCards: DEFAULT_STATS_CARDS };
  return currentConfig;
}

function applyRemoteConfig(raw: { typeColors: Record<string, string>; statsCards: string[] }) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch (_e) { /* storage unavailable */ }
  currentConfig = {
    typeColors: buildTypeColors(raw.typeColors ?? {}),
    statsCards: buildStatsCards(raw.statsCards ?? []),
  };
  subscribers.forEach(fn => fn(currentConfig!));
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTypeConfig(): UiConfigValue {
  const api = useApi(devAiHubApiRef);
  const [config, setConfig] = useState<UiConfigValue>(getInitialConfig);

  useEffect(() => {
    subscribers.add(setConfig);

    // One fetch per page session regardless of how many components mount
    if (!fetchInitiated) {
      fetchInitiated = true;
      api.getUiConfig()
        .then(cfg => applyRemoteConfig(cfg as { typeColors: Record<string, string>; statsCards: string[] }))
        .catch(() => { fetchInitiated = false; }); // allow retry on transient error
    } else if (currentConfig) {
      // Fetch already done or in progress — sync to latest known value
      setConfig(currentConfig);
    }

    return () => { subscribers.delete(setConfig); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return config;
}
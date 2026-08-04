import type { ElementType } from 'react';
import {
  RiFlashlightLine,
  RiPlugLine,
  RiPuzzleLine,
  RiRobot2Line,
  RiStore2Line,
  RiToolsLine,
} from '@remixicon/react';
import {
  RESOURCE_TYPE_REGISTRY,
  type ResourceType,
  type ResourceTypeIcon,
  type ResourceTypeInfo,
} from '@nospt/plugin-dev-ai-hub-common';

/** Maps the registry's React-free icon identifiers to components. */
const ICONS: Record<ResourceTypeIcon, ElementType> = {
  tools: RiToolsLine,
  robot: RiRobot2Line,
  flash: RiFlashlightLine,
  plug: RiPlugLine,
  puzzle: RiPuzzleLine,
  store: RiStore2Line,
};

export interface TypeMeta extends ResourceTypeInfo {
  Icon: ElementType;
  /** The plugin-owned colour tokens for this role (ADR-0008). */
  color: string;
  colorBg: string;
  /**
   * The stat tile's solid fill: the brand hex as published, which is NOT
   * `color` — that one is darkened in light mode to read against a card.
   */
  tileFill: string;
}

export function getTypeMeta(type: ResourceType): TypeMeta {
  const info = RESOURCE_TYPE_REGISTRY[type];
  return {
    ...info,
    Icon: ICONS[info.icon],
    color: `var(--devaihub-type-${info.colorRole})`,
    colorBg: `var(--devaihub-type-${info.colorRole}-bg)`,
    tileFill: `var(--devaihub-tile-${info.colorRole})`,
  };
}

/** Display labels for the known framework tokens; unknown pass through. */
const FRAMEWORK_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini': 'Google Gemini',
  cursor: 'Cursor',
  all: 'All tools',
};

export function frameworkLabel(token: string): string {
  return FRAMEWORK_LABELS[token] ?? token;
}

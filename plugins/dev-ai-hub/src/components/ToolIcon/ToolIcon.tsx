import type { CSSProperties } from 'react';
import { RiInfinityLine } from '@remixicon/react';
import { siAnthropic, siGithub, siGooglegemini } from 'simple-icons';
import type { AiTool } from '@nospt/plugin-dev-ai-hub-common';

/* Cursor's cube mark isn't in simple-icons; path from Boxicons Brands
   (`bxl:cursor-ai`, MIT). Monochrome brand — no branded hex. */
const CURSOR_PATH =
  'm20.42 6.73l-8-4.62a.82.82 0 0 0-.83 0L3.58 6.73c-.22.12-.35.36-.35.61v9.32c0 .25.13.48.35.61l8.01 4.62c.26.15.57.15.83 0l8.01-4.62c.22-.12.35-.36.35-.61V7.34c0-.25-.13-.48-.35-.61Zm-.5.98L12.19 21.1c-.05.09-.19.05-.19-.05v-8.77c0-.18-.09-.34-.25-.43L4.16 7.47c-.09-.05-.05-.19.05-.19h15.46c.22 0 .36.24.25.43';

type SvgTool = Exclude<AiTool, 'all' | 'cursor'>;

const TOOL_ICON: Record<SvgTool, { path: string; hex: string; label: string }> =
  {
    'claude-code': { ...siAnthropic, label: 'Claude Code' },
    'github-copilot': { ...siGithub, label: 'GitHub Copilot' },
    'google-gemini': { ...siGooglegemini, label: 'Google Gemini' },
  };

interface ToolIconProps {
  tool: AiTool;
  /** Use the brand's official color. Defaults to true. */
  branded?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Icon size in pixels. Defaults to 20. */
  size?: number;
}

export function ToolIcon({
  tool,
  branded = true,
  className,
  style,
  size = 20,
}: ToolIconProps) {
  if (tool === 'all') {
    return (
      <RiInfinityLine
        size={size}
        className={className}
        style={{ color: 'var(--bui-fg-secondary)', ...style }}
        aria-label="Universal"
      />
    );
  }

  if (tool === 'cursor') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
        style={{
          color: branded ? 'var(--bui-fg-primary)' : 'inherit',
          ...style,
        }}
        aria-label="Cursor"
        role="img"
      >
        <path d={CURSOR_PATH} />
      </svg>
    );
  }

  const cfg = TOOL_ICON[tool as SvgTool];
  if (!cfg) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={{ color: branded ? `#${cfg.hex}` : 'inherit', ...style }}
      aria-label={cfg.label}
      role="img"
    >
      <path d={cfg.path} />
    </svg>
  );
}

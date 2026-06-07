import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import NearMeIcon from '@mui/icons-material/NearMe';
import { siAnthropic, siGithub, siGooglegemini } from 'simple-icons';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AiTool } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubTranslationRef } from '../../translation';

type SvgTool = Exclude<AiTool, 'all' | 'cursor'>;

const TOOL_ICON: Record<SvgTool, { path: string; hex: string; label: string }> = {
  'claude-code':    { ...siAnthropic,    label: 'Claude Code' },
  'github-copilot': { ...siGithub,       label: 'GitHub Copilot' },
  'google-gemini':  { ...siGooglegemini, label: 'Google Gemini' },
};

interface ToolIconProps extends Omit<SvgIconProps, 'color'> {
  tool: AiTool;
  /** Use the brand's official color. Defaults to true. */
  branded?: boolean;
}

export function ToolIcon({ tool, branded = true, sx, ...props }: ToolIconProps) {
  const { t } = useTranslationRef(devAiHubTranslationRef);

  if (tool === 'all') {
    return <AllInclusiveIcon {...props} sx={{ color: 'text.secondary', ...sx }} titleAccess={t('toolIcon.universal')} />;
  }

  if (tool === 'cursor') {
    return (
      <NearMeIcon
        {...props}
        sx={{ color: branded ? 'text.primary' : 'inherit', ...sx }}
        titleAccess="Cursor"
      />
    );
  }

  const cfg = TOOL_ICON[tool as SvgTool];
  if (!cfg) return null;

  return (
    <SvgIcon
      {...props}
      sx={{ color: branded ? `#${cfg.hex}` : 'inherit', ...sx }}
      titleAccess={cfg.label}
      viewBox="0 0 24 24"
    >
      <path d={cfg.path} />
    </SvgIcon>
  );
}

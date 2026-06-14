import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { siAnthropic, siGooglegemini, siMeta, siOpenai, siOllama } from 'simple-icons';

interface ModelFamily {
  path: string;
  hex: string;
  label: string;
}

export function detectFamily(model: string): ModelFamily | null {
  const m = model.toLowerCase();
  if (m.startsWith('claude'))
    return { path: siAnthropic.path, hex: siAnthropic.hex, label: 'Anthropic' };
  if (m.startsWith('gpt') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('chatgpt'))
    return { path: siOpenai.path, hex: siOpenai.hex, label: 'OpenAI' };
  if (m.startsWith('gemini'))
    return { path: siGooglegemini.path, hex: siGooglegemini.hex, label: 'Google' };
  if (m.startsWith('llama') || m.startsWith('meta-'))
    return { path: siMeta.path, hex: siMeta.hex, label: 'Meta' };
  if (m.startsWith('ollama'))
    return { path: siOllama.path, hex: siOllama.hex, label: 'Ollama' };
  return null;
}

interface ModelIconProps extends Omit<SvgIconProps, 'color'> {
  model: string;
  /** Use the brand's official color. Defaults to true. */
  branded?: boolean;
}

export function ModelIcon({ model, branded = true, sx, ...props }: ModelIconProps) {
  const family = detectFamily(model);

  if (!family) {
    return (
      <SmartToyIcon
        {...props}
        sx={{ color: 'text.secondary', ...sx }}
        titleAccess={model}
      />
    );
  }

  return (
    <SvgIcon
      {...props}
      sx={{ color: branded ? `#${family.hex}` : 'inherit', ...sx }}
      titleAccess={`${family.label} — ${model}`}
      viewBox="0 0 24 24"
    >
      <path d={family.path} />
    </SvgIcon>
  );
}
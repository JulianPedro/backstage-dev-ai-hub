import { alpha, useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import { ModelIcon } from './ModelIcon';
import { detectFamily } from './ModelIcon';

// simple-icons hex values are often too dark (Anthropic=191919, Ollama=000000).
// These are curated badge colors optimized for readability as a filled chip background.
const BADGE_COLORS: Record<string, string> = {
  Anthropic: '#CC6B3D',  // Anthropic terra-cotta orange
  OpenAI:    '#10A37F',  // ChatGPT green (more recognizable than their dark purple)
  Google:    '#3D5AFE',  // Gemini indigo
  Meta:      '#0467DF',  // Meta blue
  Ollama:    '#4F7FBF',  // Neutral blue (Ollama has no distinctive brand color)
};

interface ModelBadgeProps {
  model: string;
}

export function ModelBadge({ model }: ModelBadgeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const family = detectFamily(model);
  const hex = family ? (BADGE_COLORS[family.label] ?? `#${family.hex}`) : undefined;

  // Light mode: solid brand fill + white text. Dark mode: translucent fill + brand text.
  let bg: string;
  let fg: string;
  let border: string;
  if (hex) {
    bg     = isDark ? alpha(hex, 0.22) : hex;
    fg     = isDark ? hex : '#fff';
    border = isDark ? alpha(hex, 0.40) : hex;
  } else {
    bg     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    fg     = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    border = 'transparent';
  }

  return (
    <Chip
      icon={
        <ModelIcon
          model={model}
          branded={false}
          sx={{ fontSize: '0.72rem !important', ml: '4px !important', color: `${fg} !important` }}
        />
      }
      label={model}
      size="small"
      title={model}
      sx={{
        height: 18,
        fontSize: '0.6rem',
        fontWeight: 700,
        maxWidth: 160,
        backgroundColor: bg,
        color: fg,
        border: '1px solid',
        borderColor: border,
        borderRadius: 1,
        flexShrink: 0,
        '& .MuiChip-label': {
          px: '5px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        '& .MuiChip-icon': { ml: 0, mr: 0, flexShrink: 0 },
      }}
    />
  );
}
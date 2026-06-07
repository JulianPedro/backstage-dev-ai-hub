import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import type { AiAssetSummary } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubTranslationRef } from '../../translation';

interface AssetHelpDialogProps {
  asset: AiAssetSummary | null;
  onClose: () => void;
}

export function AssetHelpDialog({ asset, onClose }: AssetHelpDialogProps) {
  const { t } = useTranslationRef(devAiHubTranslationRef);

  return (
    <Dialog open={!!asset} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <HelpOutlineIcon sx={{ color: 'text.secondary', fontSize: '1.3rem', flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} noWrap>
            {asset?.label ?? asset?.name ?? ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
            {t('assetCard.helpTooltip')}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            '& h1,h2,h3,h4,h5,h6': { mt: 2, mb: 1, fontWeight: 700 },
            '& h1': { mt: 0 },
            '& p': { mb: 1, lineHeight: 1.7 },
            '& ul, & ol': { pl: 2.5, mb: 1 },
            '& li': { mb: 0.5 },
            '& blockquote': {
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 1.5,
              color: 'text.secondary',
              my: 1,
              ml: 0,
            },
            '& table': { width: '100%', borderCollapse: 'collapse', mb: 1 },
            '& th, & td': {
              border: '1px solid',
              borderColor: 'divider',
              px: 1.5,
              py: 0.75,
              fontSize: '0.875rem',
            },
            '& th': { backgroundColor: 'action.hover', fontWeight: 700 },
            '& code': {
              bgcolor: 'action.hover',
              px: 0.5,
              py: 0.2,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.875em',
            },
            '& pre': {
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 1.5,
              overflow: 'auto',
              my: 1,
              '& code': { bgcolor: 'transparent', px: 0, py: 0 },
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {asset?.helpText ?? ''}
          </ReactMarkdown>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} sx={{ ml: 'auto' }}>
          {t('assetInstallDialog.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

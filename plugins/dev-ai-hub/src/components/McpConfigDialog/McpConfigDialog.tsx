import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import AppsIcon from '@mui/icons-material/Apps';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { devAiHubTranslationRef } from '../../translation';
import { McpPage } from '../McpPage';

interface McpConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

export function McpConfigDialog({ open, onClose }: McpConfigDialogProps) {
  const { t } = useTranslationRef(devAiHubTranslationRef);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 8px #6366f140',
            }}
          >
            <AppsIcon sx={{ color: '#fff', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {t('mcpConfigDialog.title')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('mcpConfigDialog.subtitle')}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Only mount McpPage when dialog is open so useEffect fires on each open */}
        {open && <McpPage embedded />}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('mcpConfigDialog.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
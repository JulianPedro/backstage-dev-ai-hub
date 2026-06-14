import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SyncIcon from '@mui/icons-material/Sync';
import { Content } from '@backstage/core-components';
import { useTranslationRef } from '@backstage/frontend-plugin-api';
import { usePermission } from '@backstage/plugin-permission-react';
import { devAiHubSyncPermission } from '@julianpedro/plugin-dev-ai-hub-common';
import { devAiHubTranslationRef } from '../../translation';
import { useProviders, useSyncProvider } from '../../hooks';

type TFunc = (key: string, params?: Record<string, unknown>) => string | undefined;

function timeAgo(iso: string, translate: TFunc): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return (translate('devAiHubPage.timeJustNow') ?? '') as string;
  if (diff < 3600) return (translate('devAiHubPage.timeMinutesAgo', { count: Math.floor(diff / 60) }) ?? '') as string;
  if (diff < 86400) return (translate('devAiHubPage.timeHoursAgo', { count: Math.floor(diff / 3600) }) ?? '') as string;
  return (translate('devAiHubPage.timeDaysAgo', { count: Math.floor(diff / 86400) }) ?? '') as string;
}

export function AdminPage() {
  const { t } = useTranslationRef(devAiHubTranslationRef);
  const [syncSnackbar, setSyncSnackbar] = useState(false);
  const { allowed: canSync } = usePermission({ permission: devAiHubSyncPermission });
  const { providers } = useProviders();
  const { syncing, triggerSync, triggerSyncAll } = useSyncProvider();

  return (
    <Content>
      <Box sx={{ maxWidth: 720 }}>
        {/* Section header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {t('devAiHubPage.providersSectionTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(providers.length === 1 ? 'devAiHubPage.providerCountOne' : 'devAiHubPage.providerCountOther', { n: String(providers.length) })}
            </Typography>
          </Box>
          {canSync && providers.length > 1 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={providers.some(p => syncing[p.id]) ? <CircularProgress size={14} /> : <SyncIcon />}
              disabled={providers.some(p => syncing[p.id])}
              onClick={async () => {
                await triggerSyncAll(providers.map(p => p.id));
                setSyncSnackbar(true);
              }}
            >
              {t('devAiHubPage.syncAllButton')}
            </Button>
          )}
        </Box>

        {/* Provider list */}
        {providers.length === 0 ? (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('devAiHubPage.noProvidersConfigured')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {providers.map((provider, idx) => (
              <Box key={provider.id}>
                <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {provider.status === 'error' && (
                    <Tooltip title={provider.error ?? t('devAiHubPage.providerStatusError')}>
                      <ErrorOutlineIcon sx={{ fontSize: '1.1rem', color: 'error.main', flexShrink: 0 }} />
                    </Tooltip>
                  )}
                  {provider.status === 'syncing' && (
                    <CircularProgress size={16} sx={{ flexShrink: 0 }} />
                  )}
                  {provider.status !== 'error' && provider.status !== 'syncing' && (
                    <CheckCircleOutlineIcon sx={{ fontSize: '1.1rem', color: 'success.main', flexShrink: 0 }} />
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2" fontWeight={600} noWrap title={provider.target}
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    >
                      {provider.target}
                    </Typography>
                    {provider.lastSync && (
                      <Typography variant="caption" color="text.disabled">
                        {timeAgo(provider.lastSync, t as TFunc)}
                      </Typography>
                    )}
                    {provider.status === 'error' && provider.error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }} noWrap title={provider.error}>
                        {provider.error}
                      </Typography>
                    )}
                  </Box>

                  {canSync && (
                    <Tooltip title={t('devAiHubPage.syncButton')}>
                      <span>
                        <IconButton
                          size="small"
                          aria-label={t('devAiHubPage.syncButton') as string}
                          disabled={!!syncing[provider.id]}
                          onClick={async () => {
                            await triggerSync(provider.id);
                            setSyncSnackbar(true);
                          }}
                        >
                          {syncing[provider.id]
                            ? <CircularProgress size={16} />
                            : <SyncIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
                {idx < providers.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Snackbar
        open={syncSnackbar}
        autoHideDuration={3000}
        onClose={() => setSyncSnackbar(false)}
        message={t('devAiHubPage.syncTriggered')}
      />
    </Content>
  );
}
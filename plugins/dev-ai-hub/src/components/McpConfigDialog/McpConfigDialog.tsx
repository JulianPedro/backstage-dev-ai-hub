import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import StorageIcon from '@mui/icons-material/Storage';
import { useApi, discoveryApiRef } from '@backstage/core-plugin-api';
import { ToolIcon } from '../ToolIcon';
import { useCopyToClipboard, useProviders } from '../../hooks';
import type { AiTool } from '@internal/plugin-dev-ai-hub-common';

interface ToolConfig {
  tool: AiTool;
  label: string;
  file: string;
  description: string;
  buildConfig: (mcpUrl: string) => string;
}

const TOOL_CONFIGS: ToolConfig[] = [
  {
    tool: 'claude-code',
    label: 'Claude Code',
    file: '.mcp.json',
    description: 'Add to .mcp.json in your project root (or run via claude mcp add):',
    buildConfig: url => JSON.stringify({
      mcpServers: { 'dev-ai-hub': { type: 'http', url } },
    }, null, 2),
  },
  {
    tool: 'github-copilot',
    label: 'GitHub Copilot',
    file: '.vscode/settings.json',
    description: 'Add to your VS Code settings (.vscode/settings.json or user settings):',
    buildConfig: url => JSON.stringify({
      'github.copilot.chat.mcp.servers': { 'dev-ai-hub': { type: 'http', url } },
    }, null, 2),
  },
  {
    tool: 'google-gemini',
    label: 'Google Gemini',
    file: 'gemini-config.json',
    description: 'Add to your Gemini CLI configuration:',
    buildConfig: url => JSON.stringify({
      mcpServers: { 'dev-ai-hub': { url } },
    }, null, 2),
  },
];

function providerLabel(target: string): string {
  return target.split('/').pop()?.replace(/\.git$/, '') ?? target;
}

interface McpConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

export function McpConfigDialog({ open, onClose }: McpConfigDialogProps) {
  const theme = useTheme();
  const discoveryApi = useApi(discoveryApiRef);
  const { copy: copyUrl, copied: copiedUrl } = useCopyToClipboard();
  const { copy: copySnippet, copied: copiedSnippet } = useCopyToClipboard();
  const [tab, setTab] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const { providers } = useProviders();
  const showProviderFilter = providers.length > 1;

  useEffect(() => {
    if (open) {
      discoveryApi.getBaseUrl('dev-ai-hub').then(url => setBaseUrl(url));
    }
  }, [open, discoveryApi]);

  const cfg = TOOL_CONFIGS[tab];

  const buildMcpUrl = () => {
    if (!baseUrl) return 'loading...';
    const params = new URLSearchParams();
    params.set('tool', cfg.tool);
    if (selectedProvider) params.set('provider', selectedProvider);
    return `${baseUrl}/mcp?${params.toString()}`;
  };

  const mcpUrl = buildMcpUrl();
  const configSnippet = baseUrl ? cfg.buildConfig(mcpUrl) : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Typography variant="h6" fontWeight={700}>Configure MCP Server</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Connect your AI tool to the Dev AI Hub via Model Context Protocol.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {TOOL_CONFIGS.map((t, i) => (
            <Tab
              key={t.tool}
              value={i}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToolIcon
                    tool={t.tool}
                    sx={{ fontSize: '1rem', color: theme.palette.mode === 'dark' ? '#fff' : undefined }}
                  />
                  <span>{t.label}</span>
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Provider filter — only shown when there are 2+ providers */}
        {showProviderFilter && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
              Scope to Provider
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Chip
                label="All providers"
                size="small"
                clickable
                onClick={() => setSelectedProvider('')}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderRadius: 2,
                  border: '1.5px solid',
                  borderColor: !selectedProvider ? 'text.primary' : 'divider',
                  backgroundColor: !selectedProvider ? 'text.primary' : 'transparent',
                  color: !selectedProvider ? 'background.paper' : 'text.secondary',
                  transition: 'all 0.15s ease',
                }}
              />
              {providers.map(p => {
                const isSelected = selectedProvider === p.id;
                const label = providerLabel(p.target);
                return (
                  <Chip
                    key={p.id}
                    icon={<StorageIcon sx={{ fontSize: '0.8rem !important', color: isSelected ? 'background.paper' : 'inherit' }} />}
                    label={label}
                    size="small"
                    clickable
                    onClick={() => setSelectedProvider(isSelected ? '' : p.id)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: isSelected ? 'text.primary' : 'divider',
                      backgroundColor: isSelected ? 'text.primary' : 'transparent',
                      color: isSelected ? 'background.paper' : 'text.secondary',
                      transition: 'all 0.15s ease',
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* MCP URL */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          MCP Endpoint
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 0.5,
            mb: 2,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          }}
        >
          <Typography
            variant="body2"
            sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
          >
            {mcpUrl}
          </Typography>
          <Tooltip title={copiedUrl ? 'Copied!' : 'Copy URL'}>
            <IconButton size="small" onClick={() => copyUrl(mcpUrl)}>
              {copiedUrl ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Config snippet */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {cfg.file}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, mt: 0.5 }}>
          {cfg.description}
        </Typography>
        <Box sx={{ position: 'relative' }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
              color: theme.palette.mode === 'dark' ? '#e6edf3' : '#24292f',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflowX: 'auto',
              whiteSpace: 'pre',
            }}
          >
            {configSnippet}
          </Box>
          <Tooltip title={copiedSnippet ? 'Copied!' : 'Copy config'}>
            <IconButton
              size="small"
              onClick={() => copySnippet(configSnippet)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                },
              }}
            >
              {copiedSnippet ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
          💡 Omit <code>?tool=</code> from the URL to receive assets for all AI tools.
          {showProviderFilter && ' Omit ?provider= to receive assets from all repositories.'}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Dialog, DialogBody, DialogHeader, Text } from '@backstage/ui';
import { RiDownloadLine, RiFileCopyLine } from '@remixicon/react';
import { useApi } from '@backstage/core-plugin-api';
import {
  getBodyShape,
  getResourceInstallPath,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import {
  devAiHubResourceApiRef,
  type ResourceBody,
} from '../../api/DevAiHubResourceClient';
import { frameworkLabel } from './typeMeta';
import styles from './ResourceInstallDialog.module.css';

interface ResourceInstallDialogProps {
  resource: ResourceSummary;
  body?: ResourceBody;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_HINTS: Record<ResourceSummary['type'], string> = {
  skill: 'Download the skill (multi-file skills arrive as one zip) and extract it into the path for your framework.',
  agent: 'Download or copy the agent definition into the path for your framework.',
  hook: 'Merge the hook definition into your settings file.',
  mcp: 'Add this server entry to your MCP configuration file.',
  plugin: 'This plugin installs through its framework — follow the instructions below.',
};

/**
 * Install guidance wired to the body resolver (issue #30): copy the body,
 * download the artifact (file or zip, ADR-0009), and per-framework install
 * paths. The body is canonical — nothing here is reconstructed from
 * annotations (CONTEXT.md: body).
 */
export function ResourceInstallDialog({
  resource,
  body,
  isOpen,
  onOpenChange,
}: ResourceInstallDialogProps) {
  const api = useApi(devAiHubResourceApiRef);
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const shape = getBodyShape(resource.type);
  const frameworks =
    resource.frameworks.length > 0 ? resource.frameworks : ['default'];
  const pathRows = frameworks
    .map(f => ({
      framework: f,
      path: getResourceInstallPath(resource.type, f, resource.name),
    }))
    .filter((row): row is { framework: string; path: string } => !!row.path);

  const handleCopy = async () => {
    if (!body) return;
    await navigator.clipboard.writeText(body.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloadError(false);
    try {
      await api.downloadEntityBody(resource.entityRef);
    } catch {
      setDownloadError(true);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={480}>
      <DialogHeader>Install {resource.title ?? resource.name}</DialogHeader>
      <DialogBody>
        <div className={styles.content}>
          <Text variant="body-small" as="p">
            {TYPE_HINTS[resource.type]}
          </Text>

          {body && shape === 'json' && (
            <pre className={styles.codeBlock}>
              <code>{body.content}</code>
            </pre>
          )}

          {body && resource.type === 'plugin' && (
            <div className={styles.markdown}>
              <ReactMarkdown>{body.content}</ReactMarkdown>
            </div>
          )}

          {pathRows.length > 0 && (
            <dl className={styles.pathList}>
              {pathRows.map(({ framework, path }) => (
                <div key={framework} className={styles.pathRow}>
                  <dt>
                    {framework === 'default'
                      ? 'Any framework'
                      : frameworkLabel(framework)}
                  </dt>
                  <dd>
                    <code>{path}</code>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className={styles.actions}>
            <Button
              size="small"
              variant="secondary"
              iconStart={<RiFileCopyLine />}
              isDisabled={!body}
              onPress={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy content'}
            </Button>
            <Button
              size="small"
              variant="primary"
              iconStart={<RiDownloadLine />}
              onPress={handleDownload}
            >
              Download
            </Button>
          </div>
          {downloadError && (
            <Text variant="body-x-small" as="p">
              Download failed — the source may be unreachable. Try again or use
              “View source”.
            </Text>
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
}

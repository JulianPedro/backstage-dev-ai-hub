import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Button,
  ButtonIcon,
  ButtonLink,
  Dialog,
  DialogBody,
  DialogHeader,
  Text,
} from '@backstage/ui';
import {
  RiCheckLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiFileCopyLine,
} from '@remixicon/react';
import { siClaude } from 'simple-icons';
import { useApi } from '@backstage/core-plugin-api';
import {
  getAgentInstallLinks,
  getBodyShape,
  getMarketplaceAddCommands,
  getMcpInstallLinks,
  getMarketplaceInstallTemplate,
  getMarketplaceRepoSlug,
  getMarketplaceTeamSnippet,
  getResourceInstallPath,
  hasCopyableBody,
  hasDownloadableArtifact,
  type FrameworkToken,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import {
  devAiHubResourceApiRef,
  type ResourceBody,
} from '../../api/DevAiHubResourceClient';
import { ToolIcon } from '../ToolIcon';
import { frameworkLabel } from './typeMeta';
import styles from './ResourceInstallDialog.module.css';

interface ResourceInstallDialogProps {
  resource: ResourceSummary;
  body?: ResourceBody;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_HINTS: Record<ResourceSummary['type'], string> = {
  skill:
    'Download the skill (multi-file skills arrive as one zip) and extract it into the path for your framework.',
  agent:
    'Download or copy the agent definition into the path for your framework.',
  hook: 'Merge the hook definition into your settings file.',
  'mcp-config': 'Add this server entry to your MCP configuration file.',
  plugin:
    'This plugin installs through its framework — follow the instructions below.',
  marketplace:
    'Register this marketplace with your AI tool once, then install any of its plugins from it.',
};

/** The VS Code chevron mark (devicon's mono path), for a button's iconStart slot. */
function VsCodeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M90.767 127.126a7.968 7.968 0 0 0 6.35-.244l26.353-12.681a8 8 0 0 0 4.53-7.209V21.009a8 8 0 0 0-4.53-7.21L97.117 1.12a7.97 7.97 0 0 0-9.093 1.548l-50.45 46.026L15.6 32.013a5.328 5.328 0 0 0-6.807.302l-7.048 6.411a5.335 5.335 0 0 0-.006 7.888L20.796 64 1.74 81.387a5.336 5.336 0 0 0 .006 7.887l7.048 6.411a5.327 5.327 0 0 0 6.807.303l21.974-16.68 50.45 46.025a7.96 7.96 0 0 0 2.743 1.793Zm5.252-92.183L57.74 64l38.28 29.058V34.943Z"
      />
    </svg>
  );
}

/** The Claude starburst, sized for a button's iconStart slot. */
function ClaudeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden
    >
      <path d={siClaude.path} />
    </svg>
  );
}

/** The one-click install links for the resource types that have them. */
function getInstallLinks(resource: ResourceSummary, body?: ResourceBody) {
  if (resource.type === 'agent') {
    return getAgentInstallLinks(resource.sourceLocation, resource.name);
  }
  if (resource.type === 'mcp-config') {
    return getMcpInstallLinks(
      resource.frameworks,
      resource.name,
      body?.content,
    );
  }
  return [];
}

/** Brand styling for the known deep-link hosts, keyed by link label. */
function launchBrand(label: string): {
  className?: string;
  icon: React.ReactElement;
} {
  switch (label) {
    case 'Claude':
      return { className: styles.claudeLaunch, icon: <ClaudeIcon /> };
    case 'VS Code':
      return { className: styles.vscodeLaunch, icon: <VsCodeIcon /> };
    case 'VS Code Insiders':
      return { className: styles.insidersLaunch, icon: <VsCodeIcon /> };
    case 'Cursor':
      return {
        className: styles.cursorLaunch,
        icon: <ToolIcon tool="cursor" branded={false} size={16} />,
      };
    default:
      return { icon: <RiExternalLinkLine /> };
  }
}

/**
 * Icon-only copy button for a single generated command (marketplace journey
 * rows); flashes a check mark as the copied feedback.
 */
function CopyCommandButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <ButtonIcon
      size="small"
      variant="tertiary"
      icon={copied ? <RiCheckLine /> : <RiFileCopyLine />}
      aria-label={copied ? 'Copied' : 'Copy command'}
      onPress={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    />
  );
}

/**
 * The two-step marketplace journey (ADR-0010): ① register the catalog with
 * the AI tool, ② install plugins from it — plus a team-distribution snippet.
 * Commands are derived from the repo slug in `source-location`; when the
 * slug cannot be derived this renders nothing and the canonical body below
 * carries the guidance alone.
 */
function MarketplaceJourney({ resource }: { resource: ResourceSummary }) {
  const repoSlug = getMarketplaceRepoSlug(resource.sourceLocation);
  if (!repoSlug) {
    return null;
  }
  const addCommands = getMarketplaceAddCommands(resource.frameworks, repoSlug);
  if (addCommands.length === 0) {
    return null;
  }
  return (
    <div className={styles.journey}>
      <Text variant="body-small" as="p" className={styles.stepTitle}>
        1. Add the marketplace to your AI tool
      </Text>
      <dl className={styles.commandList}>
        {addCommands.map(({ framework, command, deepLinks }) => (
          <div key={framework} className={styles.commandRow}>
            <dt className={styles.commandLabel}>
              <ToolIcon tool={framework as FrameworkToken} size={16} />
              {frameworkLabel(framework)}
            </dt>
            <dd className={styles.commandCell}>
              <code>{command}</code>
              <CopyCommandButton text={command} />
            </dd>
            {deepLinks.length > 0 && (
              <dd className={styles.deepLinks}>
                {deepLinks.map(link => {
                  const brand = launchBrand(link.label);
                  return (
                    <ButtonLink
                      key={link.label}
                      size="small"
                      variant="secondary"
                      className={brand.className}
                      iconStart={brand.icon}
                      href={link.href}
                    >
                      Add in {link.label}
                    </ButtonLink>
                  );
                })}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <Text variant="body-small" as="p" className={styles.stepTitle}>
        2. Install plugins from it
      </Text>
      <div className={styles.commandCell}>
        <code>{getMarketplaceInstallTemplate(resource.name)}</code>
      </div>

      <details className={styles.teamSection}>
        <summary>For teams: auto-install via project settings</summary>
        <Text variant="body-x-small" as="p">
          Commit this to your repository’s <code>.claude/settings.json</code>{' '}
          and collaborators are prompted to install the marketplace when they
          trust the folder.
        </Text>
        <pre className={styles.codeBlock}>
          <code>{getMarketplaceTeamSnippet(resource.name, repoSlug)}</code>
        </pre>
        <CopyCommandButton
          text={getMarketplaceTeamSnippet(resource.name, repoSlug)}
        />
      </details>
    </div>
  );
}

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
  const installLinks = getInstallLinks(resource, body);
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
    api.track(resource.entityRef, 'copy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloadError(false);
    try {
      await api.downloadEntityBody(resource.entityRef);
      api.track(resource.entityRef, 'download');
    } catch {
      setDownloadError(true);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      /* Size to the widest command line so generated commands stay unwrapped,
         clamped so prose-heavy bodies can't balloon the dialog. */
      style={{
        width: 'fit-content',
        minWidth: 'min(480px, calc(100vw - 3rem))',
        maxWidth: 'min(760px, calc(100vw - 3rem))',
      }}
    >
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

          {resource.type === 'marketplace' && (
            <MarketplaceJourney resource={resource} />
          )}

          {body &&
            (resource.type === 'plugin' || resource.type === 'marketplace') && (
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
            {installLinks.map(link => {
              const brand = launchBrand(link.label);
              return (
                <ButtonLink
                  key={link.label}
                  size="small"
                  variant="secondary"
                  className={brand.className}
                  iconStart={brand.icon}
                  href={link.href}
                >
                  Install in {link.label}
                </ButtonLink>
              );
            })}
            {hasCopyableBody(resource.type) && (
              <Button
                size="small"
                variant="secondary"
                iconStart={<RiFileCopyLine />}
                isDisabled={!body}
                onPress={handleCopy}
              >
                {copied ? 'Copied!' : 'Copy content'}
              </Button>
            )}
            {hasDownloadableArtifact(resource.type) && (
              <Button
                size="small"
                variant="primary"
                iconStart={<RiDownloadLine />}
                onPress={handleDownload}
              >
                Download
              </Button>
            )}
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

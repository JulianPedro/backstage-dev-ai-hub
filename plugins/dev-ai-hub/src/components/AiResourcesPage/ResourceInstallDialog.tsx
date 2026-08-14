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
  expandInstallFrameworks,
  getAgentInstallLinks,
  getBodyShape,
  getMarketplaceAddCommands,
  getMcpInstallLinks,
  getMarketplaceInstallTemplate,
  getMarketplaceRepoSlug,
  getMarketplaceTeamSnippet,
  getInstallSteps,
  getResourceInstallTarget,
  hasCopyableBody,
  hasDownloadableArtifact,
  type FrameworkToken,
  type MarketplaceAddCommand,
  type ResourceInstallTarget,
  type ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import {
  devAiHubResourceApiRef,
  type ResourceBody,
} from '../../api/DevAiHubResourceClient';
import { ToolIcon } from '../ToolIcon';
import { JsonBody } from './JsonBody';
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
  hook: 'Register the hook definition at the path for your framework — most hosts merge it into a shared settings file.',
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

/**
 * The one-click install links for the types with a *native* install route,
 * rendered once in the actions row. `skill` and `hook` are absent on purpose:
 * their launchers are per-host and live in their own rows, so returning them
 * here too would render every button twice.
 */
function getInstallLinks(resource: ResourceSummary, body?: ResourceBody) {
  if (resource.type === 'agent') {
    return getAgentInstallLinks(
      resource.sourceLocation,
      resource.name,
      resource.frameworks,
    );
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
 * Clipboard fallback for a host with no prompt URI (Copilot, Gemini). It
 * carries the identical instruction a launcher would pre-fill, so the only
 * difference is the delivery — the user pastes it into their own agent.
 */
function CopyPromptButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="small"
      variant="secondary"
      iconStart={copied ? <RiCheckLine /> : <RiFileCopyLine />}
      onPress={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? 'Copied!' : `Copy prompt for ${label}`}
    </Button>
  );
}

/**
 * The two-step marketplace journey (ADR-0010): ① register the catalog with
 * the AI tool, ② install plugins from it — plus a team-distribution snippet.
 * Whether this can render at all is decided by the caller, which needs the
 * same answer to know if the body doc is still required as a fallback.
 */
function MarketplaceJourney({
  resource,
  repoSlug,
  addCommands,
}: {
  resource: ResourceSummary;
  repoSlug: string;
  addCommands: MarketplaceAddCommand[];
}) {
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

  // A marketplace body doc repeats the generated journey almost verbatim —
  // same two steps, same commands — so rendering both doubles the dialog's
  // height to say one thing twice. The journey wins when it can be derived;
  // the body stays as ADR-0010's fallback for when the slug cannot be.
  const marketplaceRepoSlug =
    resource.type === 'marketplace'
      ? getMarketplaceRepoSlug(resource.sourceLocation)
      : undefined;
  const marketplaceAddCommands = marketplaceRepoSlug
    ? getMarketplaceAddCommands(resource.frameworks, marketplaceRepoSlug)
    : [];
  const hasMarketplaceJourney = marketplaceAddCommands.length > 0;
  // plugin/marketplace bodies are the real manifest JSON (ADR-0014), so this
  // markdown fallback can only fire if shape is still 'markdown' — kept for
  // the (currently unreachable) case bodyShape ever becomes content-driven.
  const showBodyDoc =
    shape === 'markdown' &&
    (resource.type === 'plugin' ||
      (resource.type === 'marketplace' && !hasMarketplaceJourney));

  // skill/hook install by instructing the agent, so each host gets a row that
  // is actionable on its own: a launcher where the host has a prompt URI, a
  // copyable prompt where it does not. Other types keep the plain path list —
  // their launchers are native routes, rendered once in the actions row.
  const usesPromptInstall =
    resource.type === 'skill' || resource.type === 'hook';
  const installSteps = usesPromptInstall
    ? getInstallSteps(
        resource.type,
        resource.sourceLocation,
        resource.name,
        resource.frameworks,
      )
    : [];
  const pathRows = expandInstallFrameworks(resource.frameworks)
    .map(f => ({
      framework: f,
      target: getResourceInstallTarget(resource.type, f, resource.name),
    }))
    .filter(
      (row): row is { framework: string; target: ResourceInstallTarget } =>
        !!row.target,
    );
  const hasMergeTarget = (
    installSteps.length > 0
      ? installSteps.map(s => s.target)
      : pathRows.map(r => r.target)
  ).some(t => t.mode === 'merge');

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
         clamped so prose-heavy bodies can't balloon the dialog. The height cap
         keeps a long fallback body scrolling inside the dialog rather than
         running off-screen — the install actions must always stay reachable. */
      style={{
        width: 'fit-content',
        minWidth: 'min(480px, calc(100vw - 3rem))',
        maxWidth: 'min(760px, calc(100vw - 3rem))',
        maxHeight: 'min(80vh, calc(100vh - 4rem))',
      }}
    >
      <DialogHeader>Install {resource.title ?? resource.name}</DialogHeader>
      <DialogBody>
        <div className={styles.content}>
          <Text variant="body-small" as="p">
            {TYPE_HINTS[resource.type]}
          </Text>

          {body && shape === 'json' && (
            <JsonBody content={body.content} className={styles.codeBlock} />
          )}

          {hasMarketplaceJourney && marketplaceRepoSlug && (
            <MarketplaceJourney
              resource={resource}
              repoSlug={marketplaceRepoSlug}
              addCommands={marketplaceAddCommands}
            />
          )}

          {body && showBodyDoc && (
            <div className={styles.markdown}>
              <ReactMarkdown>{body.content}</ReactMarkdown>
            </div>
          )}

          {installSteps.length > 0 && (
            <dl className={styles.commandList}>
              {installSteps.map(({ framework, target, prompt, link }) => (
                <div key={framework} className={styles.commandRow}>
                  <dt className={styles.commandLabel}>
                    <ToolIcon tool={framework as FrameworkToken} size={16} />
                    {frameworkLabel(framework)}
                  </dt>
                  <dd className={styles.pathRow}>
                    <code>{target.path}</code>
                    {target.mode === 'merge' && (
                      <span className={styles.mergeBadge}>merge into</span>
                    )}
                  </dd>
                  <dd className={styles.deepLinks}>
                    {link ? (
                      (() => {
                        const brand = launchBrand(link.label);
                        return (
                          <ButtonLink
                            size="small"
                            variant="secondary"
                            className={brand.className}
                            iconStart={brand.icon}
                            href={link.href}
                            onPress={() =>
                              api.track(
                                resource.entityRef,
                                'install',
                                framework,
                              )
                            }
                          >
                            Install in {link.label}
                          </ButtonLink>
                        );
                      })()
                    ) : (
                      /* No prompt URI for this host — the same instruction,
                         delivered by clipboard so the row is still actionable. */
                      <CopyPromptButton
                        text={prompt}
                        label={frameworkLabel(framework)}
                      />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {installSteps.length === 0 && pathRows.length > 0 && (
            <>
              <dl className={styles.pathList}>
                {pathRows.map(({ framework, target }) => (
                  <div key={framework} className={styles.pathRow}>
                    <dt>
                      {framework === 'default'
                        ? 'Any framework'
                        : frameworkLabel(framework)}
                    </dt>
                    <dd>
                      <code>{target.path}</code>
                      {/* A merge target is a file the user already owns —
                          flagged inline so the path is never mistaken for a
                          drop-in destination to overwrite. */}
                      {target.mode === 'merge' && (
                        <span className={styles.mergeBadge}>merge into</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {hasMergeTarget && (
                <Text
                  variant="body-x-small"
                  as="p"
                  className={styles.mergeNote}
                >
                  Paths marked <strong>merge into</strong> are shared
                  configuration files. Add this entry to the existing file —
                  replacing it discards your other settings.
                </Text>
              )}
            </>
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

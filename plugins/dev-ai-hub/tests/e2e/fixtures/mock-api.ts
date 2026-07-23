/**
 * Canonical mock data for e2e tests, against the v2 catalog-backed model
 * (ADR-0001): `ResourceSummary` items served by `GET /resources`, bodies by
 * `GET /entity/:ref/raw`, and telemetry by `GET /telemetry/:ref` /
 * `POST /telemetry`. One resource per `ResourceType` so the stat tiles and
 * type filter have real counts to assert against.
 */
import type {
  ResourceSummary,
  TelemetryCounts,
} from '@nospt/plugin-dev-ai-hub-common';

export const MOCK_RESOURCES: ResourceSummary[] = [
  {
    entityRef: 'airesource:default/git-commit',
    name: 'git-commit',
    title: 'Git Commit',
    description:
      'Creates well-structured commit messages following the Conventional Commits specification.',
    type: 'skill',
    lifecycle: 'production',
    owner: 'group:platform-team',
    sourceLocation:
      'url:https://github.com/example/ai-resources/blob/main/skills/git-commit/skill.yaml',
    frameworks: ['claude-code', 'github-copilot'],
    version: '1.0.0',
    kind: 'AiResource',
    tags: ['git', 'commits', 'conventional-commits'],
    annotations: {},
  },
  {
    entityRef: 'airesource:default/code-review-agent',
    name: 'code-review-agent',
    title: 'Code Review Agent',
    description:
      'Specialized agent for performing thorough and constructive code reviews.',
    type: 'agent',
    lifecycle: 'production',
    owner: 'group:platform-team',
    sourceLocation:
      'url:https://github.com/example/ai-resources/blob/main/agents/code-review.yaml',
    frameworks: ['claude-code'],
    version: '1.2.0',
    kind: 'AiResource',
    tags: ['code-review', 'quality'],
    annotations: {},
  },
  {
    entityRef: 'airesource:default/pre-commit-lint',
    name: 'pre-commit-lint',
    title: 'Pre-commit Lint Hook',
    description: 'Runs lint checks before every commit.',
    type: 'hook',
    lifecycle: 'production',
    frameworks: ['claude-code'],
    kind: 'AiResource',
    tags: ['hooks', 'lint'],
    annotations: {},
    // No sourceLocation — exercises the non-actionable path (no action
    // buttons, no "View source" link, body never fetched).
  },
  {
    entityRef: 'airesource:default/github-mcp',
    name: 'github-mcp',
    title: 'GitHub MCP Server',
    description:
      'Read-only repo search and issue lookup for GitHub, exposed over MCP.',
    type: 'mcp-config',
    lifecycle: 'production',
    owner: 'group:platform-team',
    sourceLocation:
      'url:https://github.com/example/ai-resources/blob/main/mcp/github.yaml',
    frameworks: ['claude-code', 'cursor'],
    kind: 'AiResource',
    tags: ['mcp', 'github'],
    annotations: {},
  },
  {
    entityRef: 'airesource:default/security-toolkit',
    name: 'security-toolkit',
    title: 'Security Toolkit Plugin',
    description: 'Bundles security-focused skills, agents and hooks.',
    type: 'plugin',
    lifecycle: 'production',
    owner: 'group:security-team',
    sourceLocation:
      'url:https://github.com/example/ai-resources/blob/main/plugins/security-toolkit.yaml',
    frameworks: ['github-copilot'],
    version: '2.0.0',
    kind: 'AiResource',
    tags: ['security'],
    annotations: {},
  },
  {
    entityRef: 'airesource:default/team-marketplace',
    name: 'team-marketplace',
    title: 'Team Marketplace',
    description:
      'Curated marketplace of internal plugins for the platform team.',
    type: 'marketplace',
    lifecycle: 'production',
    owner: 'group:platform-team',
    sourceLocation:
      'url:https://github.com/example/ai-resources/blob/main/marketplace.yaml',
    frameworks: ['claude-code', 'github-copilot'],
    kind: 'AiResource',
    tags: ['marketplace'],
    annotations: {},
  },
];

/** `GET /entity/:ref/raw` bodies, keyed by entityRef. */
const MOCK_BODIES: Record<string, { content: string; contentType: string }> = {
  'airesource:default/git-commit': {
    content:
      '# Git Commit Skill\n\nCreate commit messages following the Conventional Commits specification.',
    contentType: 'text/markdown; charset=utf-8',
  },
  'airesource:default/code-review-agent': {
    content:
      '# Code Review Agent\n\nYou are an expert code reviewer. Focus on correctness, performance, security, and maintainability.',
    contentType: 'text/markdown; charset=utf-8',
  },
  'airesource:default/github-mcp': {
    content: JSON.stringify(
      {
        mcpServers: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
          },
        },
      },
      null,
      2,
    ),
    contentType: 'application/json; charset=utf-8',
  },
  'airesource:default/security-toolkit': {
    content: '# Security Toolkit\n\nInstalls through your framework of choice.',
    contentType: 'text/markdown; charset=utf-8',
  },
  'airesource:default/team-marketplace': {
    content:
      '# Team Marketplace\n\nRegister this marketplace with your AI tool.',
    contentType: 'text/markdown; charset=utf-8',
  },
};

export function mockBodyFor(
  entityRef: string,
): { content: string; contentType: string } | undefined {
  return MOCK_BODIES[entityRef];
}

/** `GET /telemetry/:ref` counts, keyed by entityRef. Unlisted refs get zeros. */
const MOCK_TELEMETRY: Record<string, TelemetryCounts> = {
  'airesource:default/git-commit': {
    install: 22,
    copy: 4,
    download: 3,
    view: 40,
  },
  'airesource:default/code-review-agent': {
    install: 8,
    copy: 1,
    download: 0,
    view: 15,
  },
  'airesource:default/pre-commit-lint': {
    install: 0,
    copy: 0,
    download: 0,
    view: 2,
  },
  'airesource:default/github-mcp': {
    install: 3,
    copy: 0,
    download: 0,
    view: 6,
  },
  'airesource:default/security-toolkit': {
    install: 1,
    copy: 0,
    download: 0,
    view: 3,
  },
  'airesource:default/team-marketplace': {
    install: 0,
    copy: 0,
    download: 0,
    view: 1,
  },
};

export function mockCountsFor(ref: string): TelemetryCounts {
  return MOCK_TELEMETRY[ref] ?? { install: 0, copy: 0, download: 0, view: 0 };
}

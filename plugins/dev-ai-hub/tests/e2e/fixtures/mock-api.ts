/**
 * Canonical mock data for e2e tests.
 *
 * DEV_ASSETS / DEV_STATS are used directly in test assertions.
 * MOCK_ASSETS_FULL / buildListResponse / MOCK_PROVIDER / MOCK_STATS are used
 * by the base fixture to intercept real API calls with predictable responses.
 */
import type {
  AiAsset,
  AiAssetListResponse,
  AiHubProvider,
  AiHubStats,
} from '@nospt/plugin-dev-ai-hub-common';

// ── Summary data used in test assertions ──────────────────────────────────────

export const DEV_ASSETS = [
  {
    id: 'mock-1',
    name: 'TypeScript Best Practices',
    type: 'instruction',
    installCount: 14,
    tools: ['claude-code', 'github-copilot'],
  },
  {
    id: 'mock-2',
    name: 'Code Review Agent',
    type: 'agent',
    installCount: 8,
    tools: ['claude-code'],
  },
  {
    id: 'mock-3',
    name: 'Git Commit',
    type: 'skill',
    installCount: 22,
    tools: ['all'],
  },
  {
    id: 'mock-4',
    name: 'Feature Development Workflow',
    type: 'workflow',
    installCount: 5,
    tools: ['github-copilot', 'cursor'],
  },
  {
    id: 'mock-5',
    name: 'Security Guidelines',
    type: 'instruction',
    installCount: 3,
    tools: ['google-gemini', 'claude-code'],
  },
  {
    id: 'mock-6',
    name: 'Product Manager',
    type: 'agent',
    installCount: 0,
    tools: ['github-copilot'],
  },
] as const;

export const DEV_STATS = {
  total: DEV_ASSETS.length,
  byType: { instruction: 2, agent: 2, skill: 1, workflow: 1 },
};

export const FIRST_ASSET = DEV_ASSETS[0].name;

// ── Full asset data for API route interception ────────────────────────────────

export const MOCK_ASSETS_FULL: AiAsset[] = [
  {
    id: 'mock-1',
    providerId: 'mock-provider',
    name: 'TypeScript Best Practices',
    description: 'Coding standards and best practices for TypeScript projects.',
    type: 'instruction',
    tools: ['claude-code', 'github-copilot'],
    tags: ['typescript', 'best-practices'],
    author: 'Platform Team',
    version: '1.0.0',
    content:
      '# TypeScript Best Practices\n\nAlways use strict mode. Prefer `interface` over `type` for object shapes. Use explicit return types on public functions.',
    yamlRaw: 'name: TypeScript Best Practices\ntype: instruction',
    yamlPath: 'instructions/typescript-best-practices.yaml',
    mdPath: 'instructions/typescript-best-practices.md',
    repoUrl: 'https://github.com/example/ai-assets',
    branch: 'main',
    installCount: 14,
    syncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'mock-2',
    providerId: 'mock-provider',
    name: 'Code Review Agent',
    description:
      'Specialized agent for performing thorough and constructive code reviews.',
    type: 'agent',
    tools: ['claude-code'],
    tags: ['code-review', 'quality'],
    author: 'Platform Team',
    version: '1.2.0',
    content:
      '# Code Review Agent\n\nYou are an expert code reviewer. Focus on correctness, performance, security, and maintainability.',
    yamlRaw: 'name: Code Review Agent\ntype: agent',
    yamlPath: 'agents/code-review.yaml',
    mdPath: 'agents/code-review.md',
    repoUrl: 'https://github.com/example/ai-assets',
    branch: 'main',
    installCount: 8,
    syncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-03-10T09:00:00Z',
  },
  {
    id: 'mock-3',
    providerId: 'mock-provider',
    name: 'Git Commit',
    description:
      'Skill for creating well-structured, conventional git commit messages.',
    type: 'skill',
    tools: ['all'],
    tags: ['git', 'commits', 'conventional-commits'],
    author: 'Platform Team',
    version: '1.0.0',
    content:
      '# Git Commit Skill\n\nCreate commit messages following the Conventional Commits specification.',
    yamlRaw: 'name: Git Commit\ntype: skill',
    yamlPath: 'skills/git-commit/skill.yaml',
    mdPath: 'skills/git-commit/SKILL.md',
    repoUrl: 'https://github.com/example/ai-assets',
    branch: 'main',
    installCount: 22,
    syncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-02-15T14:00:00Z',
  },
  {
    id: 'mock-4',
    providerId: 'mock-provider',
    name: 'Feature Development Workflow',
    description:
      'Step-by-step workflow for planning, implementing and shipping a new feature.',
    type: 'workflow',
    tools: ['github-copilot', 'cursor'],
    tags: ['workflow', 'feature', 'development'],
    author: 'Platform Team',
    version: '2.0.0',
    content:
      '# Feature Development Workflow\n\n## Step 1: Planning\n\n## Step 2: Implementation\n\n## Step 3: Testing\n\n## Step 4: Review',
    yamlRaw: 'name: Feature Development Workflow\ntype: workflow',
    yamlPath: 'workflows/feature-development.yaml',
    mdPath: 'workflows/feature-development.md',
    repoUrl: 'https://github.com/example/ai-assets',
    branch: 'main',
    installCount: 5,
    syncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-20T16:00:00Z',
  },
  {
    id: 'mock-5',
    providerId: 'mock-provider',
    name: 'Security Guidelines',
    description:
      'Security best practices and guidelines for backend development.',
    type: 'instruction',
    tools: ['google-gemini', 'claude-code'],
    tags: ['security', 'backend', 'best-practices'],
    author: 'Security Team',
    version: '1.1.0',
    content:
      '# Security Guidelines\n\nNever store secrets in code. Always validate user input. Use parameterized queries.',
    yamlRaw: 'name: Security Guidelines\ntype: instruction',
    yamlPath: 'instructions/security-guidelines.yaml',
    mdPath: 'instructions/security-guidelines.md',
    repoUrl: 'https://github.com/example/ai-assets',
    branch: 'main',
    installCount: 3,
    syncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-03-05T11:00:00Z',
  },
  {
    id: 'mock-6',
    providerId: 'mock-provider',
    name: 'Product Manager',
    description:
      'Data-driven product decision assistant for roadmap and prioritization.',
    type: 'agent',
    tools: ['github-copilot'],
    tags: ['product', 'roadmap', 'prioritization'],
    author: 'Product Team',
    version: '1.0.0',
    content:
      '# Product Manager Agent\n\nYou are a data-driven product manager. Help prioritize features using impact/effort frameworks.',
    yamlRaw: 'name: Product Manager\ntype: agent',
    yamlPath: 'agents/product-manager.yaml',
    mdPath: 'agents/product-manager.md',
    repoUrl: 'https://github.com/example/ai-assets',
    branch: 'main',
    installCount: 0,
    syncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
  },
];

export const MOCK_PROVIDER: AiHubProvider = {
  id: 'mock-provider',
  type: 'github',
  target: 'https://github.com/example/ai-assets.git',
  branch: 'main',
  lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  status: 'idle',
  assetCount: MOCK_ASSETS_FULL.length,
};

export const MOCK_STATS: AiHubStats = {
  totalAssets: MOCK_ASSETS_FULL.length,
  byType: { instruction: 2, agent: 2, skill: 1, workflow: 1 },
  byTool: {
    'claude-code': MOCK_ASSETS_FULL.filter(
      a => a.tools.includes('claude-code') || a.tools.includes('all'),
    ).length,
    'github-copilot': MOCK_ASSETS_FULL.filter(
      a => a.tools.includes('github-copilot') || a.tools.includes('all'),
    ).length,
    'google-gemini': MOCK_ASSETS_FULL.filter(
      a => a.tools.includes('google-gemini') || a.tools.includes('all'),
    ).length,
    cursor: MOCK_ASSETS_FULL.filter(
      a => a.tools.includes('cursor') || a.tools.includes('all'),
    ).length,
  },
  byProvider: { 'mock-provider': MOCK_ASSETS_FULL.length },
  lastSync: MOCK_PROVIDER.lastSync,
};

/** Applies the same filter logic the backend uses, for use in page.route() handlers. */
export function buildListResponse(
  params: URLSearchParams,
): AiAssetListResponse {
  let items = [...MOCK_ASSETS_FULL];

  const type = params.get('type');
  const tool = params.get('tool');
  const search = params.get('search');
  const tags = params.get('tags')?.split(',').filter(Boolean);
  const provider = params.get('provider');
  const page = Number(params.get('page') ?? '1');
  const pageSize = Number(params.get('pageSize') ?? '24');

  if (type) items = items.filter(a => a.type === type);
  if (tool)
    items = items.filter(
      a => a.tools.includes(tool as any) || a.tools.includes('all'),
    );
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)),
    );
  }
  if (tags?.length)
    items = items.filter(a => tags.every(t => a.tags.includes(t)));
  if (provider) items = items.filter(a => a.providerId === provider);

  const totalCount = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize) as any,
    totalCount,
    page,
    pageSize,
  };
}

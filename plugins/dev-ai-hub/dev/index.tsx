import { createDevApp } from '@backstage/dev-utils';
import { DevAiHubPage } from '../src/components/DevAiHubPage';
import { devAiHubApiRef } from '../src/api/DevAiHubClient';
import type {
  AiAsset,
  AiAssetListResponse,
  AiHubProvider,
  AiHubStats,
  AssetListFilter,
} from '@internal/plugin-dev-ai-hub-common';

const MOCK_ASSETS: AiAsset[] = [
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
    content: '# TypeScript Best Practices\n\nAlways use strict mode. Prefer `interface` over `type` for object shapes. Use explicit return types on public functions.',
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
    description: 'Specialized agent for performing thorough and constructive code reviews.',
    type: 'agent',
    tools: ['claude-code'],
    tags: ['code-review', 'quality'],
    author: 'Platform Team',
    version: '1.2.0',
    model: 'claude-sonnet-4-6',
    content: '# Code Review Agent\n\nYou are an expert code reviewer. Focus on correctness, performance, security, and maintainability.',
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
    description: 'Skill for creating well-structured, conventional git commit messages.',
    type: 'skill',
    tools: ['all'],
    tags: ['git', 'commits', 'conventional-commits'],
    author: 'Platform Team',
    version: '1.0.0',
    content: '# Git Commit Skill\n\nCreate commit messages following the Conventional Commits specification.',
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
    description: 'Step-by-step workflow for planning, implementing and shipping a new feature.',
    type: 'workflow',
    tools: ['github-copilot', 'cursor'],
    tags: ['workflow', 'feature', 'development'],
    author: 'Platform Team',
    version: '2.0.0',
    content: '# Feature Development Workflow\n\n## Step 1: Planning\n\n## Step 2: Implementation\n\n## Step 3: Testing\n\n## Step 4: Review',
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
    description: 'Security best practices and guidelines for backend development.',
    type: 'instruction',
    tools: ['google-gemini', 'claude-code'],
    tags: ['security', 'backend', 'best-practices'],
    author: 'Security Team',
    version: '1.1.0',
    content: '# Security Guidelines\n\nNever store secrets in code. Always validate user input. Use parameterized queries.',
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
    description: 'Data-driven product decision assistant for roadmap and prioritization.',
    type: 'agent',
    tools: ['github-copilot'],
    tags: ['product', 'roadmap', 'prioritization'],
    author: 'Product Team',
    version: '1.0.0',
    content: '# Product Manager Agent\n\nYou are a data-driven product manager. Help prioritize features using impact/effort frameworks.',
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

const MOCK_PROVIDER: AiHubProvider = {
  id: 'mock-provider',
  type: 'github',
  target: 'https://github.com/example/ai-assets.git',
  branch: 'main',
  lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  status: 'idle',
  assetCount: MOCK_ASSETS.length,
};

const MOCK_STATS: AiHubStats = {
  totalAssets: MOCK_ASSETS.length,
  byType: {
    instruction: MOCK_ASSETS.filter(a => a.type === 'instruction').length,
    agent: MOCK_ASSETS.filter(a => a.type === 'agent').length,
    skill: MOCK_ASSETS.filter(a => a.type === 'skill').length,
    workflow: MOCK_ASSETS.filter(a => a.type === 'workflow').length,
  },
  byTool: {
    'claude-code': MOCK_ASSETS.filter(a => a.tools.includes('claude-code') || a.tools.includes('all')).length,
    'github-copilot': MOCK_ASSETS.filter(a => a.tools.includes('github-copilot') || a.tools.includes('all')).length,
    'google-gemini': MOCK_ASSETS.filter(a => a.tools.includes('google-gemini') || a.tools.includes('all')).length,
    'cursor': MOCK_ASSETS.filter(a => a.tools.includes('cursor') || a.tools.includes('all')).length,
  },
  byProvider: { 'mock-provider': MOCK_ASSETS.length },
  lastSync: MOCK_PROVIDER.lastSync,
};

function applyFilter(assets: AiAsset[], filter?: AssetListFilter): AiAsset[] {
  let result = [...assets];
  if (filter?.type) result = result.filter(a => a.type === filter.type);
  if (filter?.tool) result = result.filter(a => a.tools.includes(filter.tool as any) || a.tools.includes('all'));
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)),
    );
  }
  if (filter?.tags?.length) {
    result = result.filter(a => filter.tags!.every(t => a.tags.includes(t)));
  }
  if (filter?.providerId) {
    result = result.filter(a => a.providerId === filter.providerId);
  }
  return result;
}

createDevApp()
  .registerApi({
    api: devAiHubApiRef,
    deps: {},
    factory: () => ({
      listAssets: async (filter?: AssetListFilter): Promise<AiAssetListResponse> => {
        const filtered = applyFilter(MOCK_ASSETS, filter);
        const page = filter?.page ?? 1;
        const pageSize = filter?.pageSize ?? 24;
        const start = (page - 1) * pageSize;
        return {
          items: filtered.slice(start, start + pageSize),
          totalCount: filtered.length,
          page,
          pageSize,
        };
      },
      getAsset: async (id: string): Promise<AiAsset> => {
        const asset = MOCK_ASSETS.find(a => a.id === id);
        if (!asset) throw new Error(`Asset not found: ${id}`);
        return asset;
      },
      getAssetRaw: async (id: string): Promise<string> => {
        const asset = MOCK_ASSETS.find(a => a.id === id);
        return asset?.content ?? '';
      },
      trackInstall: async (_id: string): Promise<void> => { },
      listProviders: async (): Promise<AiHubProvider[]> => [MOCK_PROVIDER],
      getProviderStatus: async (_id: string): Promise<AiHubProvider> => MOCK_PROVIDER,
      triggerSync: async (_id: string): Promise<void> => {
        await new Promise(r => setTimeout(r, 1000));
      },
      getStats: async (): Promise<AiHubStats> => MOCK_STATS,
    }),
  })
  .addPage({
    element: <DevAiHubPage />,
    title: 'Dev AI Hub',
    path: '/dev-ai-hub',
  })
  .render();

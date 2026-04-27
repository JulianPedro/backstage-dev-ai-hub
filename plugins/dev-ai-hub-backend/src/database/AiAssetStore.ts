import type { Knex } from 'knex';
import { resolvePackagePath, type DatabaseService } from '@backstage/backend-plugin-api';
import type { AiAsset, AiAssetSummary, AiHubStats, AssetListFilter, AssetType } from '@julianpedro/plugin-dev-ai-hub-common';
import type { AiAssetInput, SyncStatus } from '../types';

export class AiAssetStore {
  private constructor(private readonly db: Knex) {}

  static async create(options: { database: DatabaseService }): Promise<AiAssetStore> {
    const db = await options.database.getClient();
    await db.migrate.latest({
      directory: resolvePackagePath('@julianpedro/plugin-dev-ai-hub-backend', 'migrations'),
      loadExtensions: ['.js'],
    });
    return new AiAssetStore(db);
  }

  async upsertAsset(input: AiAssetInput): Promise<void> {
    const now = new Date().toISOString();
    const row = {
      id: input.id,
      provider_id: input.providerId,
      name: input.name,
      label: input.label ?? null,
      description: input.description,
      type: input.type,
      tools: JSON.stringify(input.tools),
      tags: JSON.stringify(input.tags),
      author: input.author,
      icon: input.icon ?? null,
      version: input.version,
      install_path: input.installPath ?? null,
      install_paths: input.installPaths ? JSON.stringify(input.installPaths) : null,
      content: input.content,
      yaml_raw: input.yamlRaw,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      resources_content: input.resourcesContent ? JSON.stringify(input.resourcesContent) : null,
      yaml_path: input.yamlPath,
      md_path: input.mdPath,
      repo_url: input.repoUrl,
      branch: input.branch,
      commit_sha: input.commitSha ?? null,
      synced_at: now,
      updated_at: now,
    };

    await this.db('ai_assets')
      .insert({ ...row, created_at: now })
      .onConflict('id')
      .merge(Object.keys(row) as (keyof typeof row)[]);
  }

  async listAssets(
    filter: AssetListFilter,
  ): Promise<{ items: AiAssetSummary[]; totalCount: number }> {
    let query = this.db<Record<string, unknown>>('ai_assets');

    if (filter.type) {
      query = query.where('type', filter.type);
    }
    if (filter.tool) {
      query = query.where(function toolFilter() {
        this.where('tools', 'like', `%"${filter.tool}"%`)
          .orWhere('tools', 'like', `%"all"%`);
      });
    }
    if (filter.providerId) {
      query = query.where('provider_id', filter.providerId);
    }
    if (filter.search) {
      // Split into words so "Python linting" matches items containing both words
      const words = filter.search.trim().split(/\s+/).filter(Boolean);
      for (const word of words) {
        const term = `%${word}%`;
        query = query.where(function searchFilter() {
          this.where('name', 'like', term)
            .orWhere('label', 'like', term)
            .orWhere('description', 'like', term)
            .orWhere('tags', 'like', term)
            .orWhere('content', 'like', term);
        });
      }
    }
    if (filter.tags && filter.tags.length > 0) {
      for (const tag of filter.tags) {
        query = query.where('tags', 'like', `%"${tag}"%`);
      }
    }

    const countResult = await query.clone().count('id as count').first();
    const totalCount = Number(countResult?.count ?? 0);

    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

    const rows = await query
      .select('id', 'provider_id', 'name', 'label', 'description', 'type', 'tools', 'tags',
              'author', 'icon', 'version', 'install_count', 'synced_at', 'created_at', 'updated_at')
      .orderBy('name', 'asc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { items: rows.map(r => this.rowToAssetSummary(r)), totalCount };
  }

  async getAsset(id: string): Promise<AiAsset | null> {
    const row = await this.db('ai_assets').where('id', id).first();
    return row ? this.rowToAsset(row) : null;
  }

  async incrementInstallCount(id: string): Promise<void> {
    await this.db('ai_assets').where('id', id).increment('install_count', 1);
  }

  async deleteAssetsNotIn(providerId: string, ids: string[]): Promise<void> {
    let query = this.db('ai_assets').where('provider_id', providerId);
    if (ids.length > 0) {
      query = query.whereNotIn('id', ids);
    }
    await query.delete();
  }

  /**
   * Removes all assets and sync status for a provider in a single transaction.
   * Called when a provider is no longer present in the Backstage config.
   */
  async purgeProvider(providerId: string): Promise<void> {
    await this.db.transaction(async trx => {
      await trx('ai_assets').where('provider_id', providerId).delete();
      await trx('ai_asset_sync_status').where('provider_id', providerId).delete();
    });
  }

  async upsertSyncStatus(status: SyncStatus): Promise<void> {
    const row = {
      provider_id: status.providerId,
      last_sync: status.lastSync ?? null,
      last_commit: status.lastCommit ?? null,
      status: status.status,
      error: status.error ?? null,
      asset_count: status.assetCount,
    };
    await this.db('ai_asset_sync_status')
      .insert(row)
      .onConflict('provider_id')
      .merge(Object.keys(row) as (keyof typeof row)[]);
  }

  async getSyncStatus(providerId: string): Promise<SyncStatus | null> {
    const row = await this.db('ai_asset_sync_status')
      .where('provider_id', providerId)
      .first();
    if (!row) return null;
    return {
      providerId: row.provider_id,
      lastSync: row.last_sync ?? undefined,
      lastCommit: row.last_commit ?? undefined,
      status: row.status,
      error: row.error ?? undefined,
      assetCount: row.asset_count ?? 0,
    };
  }

  async getAllSyncStatuses(): Promise<SyncStatus[]> {
    const rows = await this.db('ai_asset_sync_status').select('*');
    return rows.map(row => ({
      providerId: row.provider_id,
      lastSync: row.last_sync ?? undefined,
      lastCommit: row.last_commit ?? undefined,
      status: row.status,
      error: row.error ?? undefined,
      assetCount: row.asset_count ?? 0,
    }));
  }

  async getStats(): Promise<AiHubStats> {
    const rows = await this.db('ai_assets').select('type', 'tools', 'provider_id');

    const byType: Record<AssetType, number> = {
      instruction: 0,
      agent: 0,
      skill: 0,
      workflow: 0,
    };
    const byTool: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    for (const row of rows) {
      byType[row.type as AssetType] = (byType[row.type as AssetType] ?? 0) + 1;
      byProvider[row.provider_id] = (byProvider[row.provider_id] ?? 0) + 1;

      const tools: string[] = JSON.parse(row.tools || '[]');
      for (const tool of tools) {
        byTool[tool] = (byTool[tool] ?? 0) + 1;
      }
    }

    const lastSyncRow = await this.db('ai_asset_sync_status')
      .select(this.db.raw('max(last_sync) as last_sync'))
      .first();

    return {
      totalAssets: rows.length,
      byType,
      byTool,
      byProvider,
      lastSync: (lastSyncRow?.last_sync as string | null) ?? undefined,
    };
  }

  private rowToAssetSummary(row: Record<string, unknown>): AiAssetSummary {
    return {
      id: row.id as string,
      providerId: row.provider_id as string,
      name: row.name as string,
      label: (row.label as string | null) ?? undefined,
      description: row.description as string,
      type: row.type as AssetType,
      tools: JSON.parse((row.tools as string) || '[]'),
      tags: JSON.parse((row.tags as string) || '[]'),
      author: row.author as string,
      icon: (row.icon as string | null) ?? undefined,
      version: row.version as string,
      installCount: (row.install_count as number) ?? 0,
      syncedAt: row.synced_at as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToAsset(row: Record<string, unknown>): AiAsset {
    return {
      id: row.id as string,
      providerId: row.provider_id as string,
      name: row.name as string,
      label: (row.label as string | null) ?? undefined,
      description: row.description as string,
      type: row.type as AssetType,
      tools: JSON.parse((row.tools as string) || '[]'),
      tags: JSON.parse((row.tags as string) || '[]'),
      author: row.author as string,
      icon: (row.icon as string | null) ?? undefined,
      version: row.version as string,
      installPath: (row.install_path as string | null) ?? undefined,
      installPaths: row.install_paths
        ? JSON.parse(row.install_paths as string)
        : undefined,
      content: row.content as string,
      yamlRaw: row.yaml_raw as string,
      metadata: row.metadata
        ? JSON.parse(row.metadata as string)
        : undefined,
      resourcesContent: row.resources_content
        ? JSON.parse(row.resources_content as string)
        : undefined,
      yamlPath: row.yaml_path as string,
      mdPath: row.md_path as string,
      repoUrl: row.repo_url as string,
      branch: row.branch as string,
      commitSha: (row.commit_sha as string | null) ?? undefined,
      installCount: (row.install_count as number) ?? 0,
      syncedAt: row.synced_at as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

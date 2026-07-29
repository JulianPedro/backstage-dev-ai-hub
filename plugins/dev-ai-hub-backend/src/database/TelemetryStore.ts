import { randomBytes } from 'node:crypto';
import type { Knex } from 'knex';
import {
  resolvePackagePath,
  type DatabaseService,
} from '@backstage/backend-plugin-api';
import type {
  TelemetryAction,
  TelemetryCounts,
} from '@nospt/plugin-dev-ai-hub-common';

/** Settings key holding the salt used to hash telemetry actor identity. */
const SALT_KEY = 'actor_salt';

const ZERO_COUNTS: TelemetryCounts = {
  install: 0,
  copy: 0,
  download: 0,
  view: 0,
};

export interface TelemetryEventRecord {
  entityRef: string;
  action: TelemetryAction;
  actorHash: string | null;
  tool?: string;
}

/**
 * Telemetry event log (ADR-0007): store-all writes, raw counts on read for
 * this slice — per-(hash, day)-distinct dedup for `view` is a follow-up.
 */
export class TelemetryStore {
  private constructor(private readonly db: Knex) {}

  static async create(options: {
    database: DatabaseService;
  }): Promise<TelemetryStore> {
    const db = await options.database.getClient();
    await db.migrate.latest({
      directory: resolvePackagePath(
        '@nospt/plugin-dev-ai-hub-backend',
        'migrations',
      ),
      loadExtensions: ['.js'],
    });
    return new TelemetryStore(db);
  }

  /**
   * The salt used to hash actor identity (ADR-0007). A configured value wins
   * and is never persisted, so a deployment can keep the salt outside the
   * database it protects. Otherwise the salt is generated once and stored,
   * which is what makes it survive restarts — the property per-day dedup
   * actually depends on. It is deliberately not required from config: a
   * missing value used to fail the plugin's init and take the whole backend
   * down with it.
   *
   * Concurrent replicas starting together race on the insert; the loser reads
   * back the winner's value, so every replica ends up on the same salt.
   */
  async resolveSalt(configured?: string): Promise<string> {
    if (configured) {
      return configured;
    }
    const existing = await this.readSalt();
    if (existing) {
      return existing;
    }
    await this.db('telemetry_settings')
      .insert({ key: SALT_KEY, value: randomBytes(32).toString('hex') })
      .onConflict('key')
      .ignore();
    const stored = await this.readSalt();
    if (!stored) {
      throw new Error('Failed to persist the telemetry actor salt');
    }
    return stored;
  }

  private async readSalt(): Promise<string | undefined> {
    const row = await this.db('telemetry_settings')
      .where('key', SALT_KEY)
      .first<{ value: string } | undefined>('value');
    return row?.value;
  }

  async record(event: TelemetryEventRecord): Promise<void> {
    const now = new Date();
    await this.db('telemetry_events').insert({
      entity_ref: event.entityRef,
      action: event.action,
      actor_hash: event.actorHash,
      tool: event.tool ?? null,
      day: now.toISOString().slice(0, 10),
      occurred_at: now.toISOString(),
    });
  }

  async getCounts(entityRef: string): Promise<TelemetryCounts> {
    const rows = await this.db('telemetry_events')
      .where('entity_ref', entityRef)
      .groupBy('action')
      .select('action')
      .count<Array<{ action: TelemetryAction; count: string | number }>>(
        'id as count',
      );

    const counts = { ...ZERO_COUNTS };
    for (const row of rows) {
      counts[row.action] = Number(row.count);
    }
    return counts;
  }
}

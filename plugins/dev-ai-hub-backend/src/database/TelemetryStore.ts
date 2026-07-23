import type { Knex } from 'knex';
import {
  resolvePackagePath,
  type DatabaseService,
} from '@backstage/backend-plugin-api';
import type {
  TelemetryAction,
  TelemetryCounts,
} from '@nospt/plugin-dev-ai-hub-common';

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

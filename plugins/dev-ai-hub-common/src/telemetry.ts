import { z } from 'zod';

/**
 * Telemetry actions (ADR-0007). All four are stored raw; read-time dedup for
 * `view` is deferred (follow-up to #31) — `GET /telemetry/:ref` currently
 * returns raw counts for all four.
 */
export const TelemetryActionEnum = z.enum([
  'install',
  'copy',
  'download',
  'view',
]);
export type TelemetryAction = z.infer<typeof TelemetryActionEnum>;

export const TelemetryEventInputSchema = z.object({
  ref: z.string().min(1),
  action: TelemetryActionEnum,
  tool: z.string().min(1).optional(),
});
export type TelemetryEventInput = z.infer<typeof TelemetryEventInputSchema>;

/** Raw per-action counts for one resource, as returned by `GET /telemetry/:ref`. */
export type TelemetryCounts = Record<TelemetryAction, number>;

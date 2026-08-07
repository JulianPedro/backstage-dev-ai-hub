/**
 * Tests for the telemetry zod schemas (ADR-0007): valid events accepted,
 * invalid `action` rejected, optional `tool` accepted and absent.
 */
import { TelemetryActionEnum, TelemetryEventInputSchema } from './telemetry';

describe('TelemetryActionEnum', () => {
  it.each(['install', 'copy', 'download', 'view'])(
    'accepts the known action %s',
    action => {
      expect(TelemetryActionEnum.safeParse(action).success).toBe(true);
    },
  );

  it('rejects an action outside the known set', () => {
    const result = TelemetryActionEnum.safeParse('delete');
    expect(result.success).toBe(false);
  });
});

describe('TelemetryEventInputSchema', () => {
  it('accepts a valid event with a tool', () => {
    const data = TelemetryEventInputSchema.parse({
      ref: 'airesource:default/x',
      action: 'install',
      tool: 'claude-code',
    });

    expect(data).toEqual({
      ref: 'airesource:default/x',
      action: 'install',
      tool: 'claude-code',
    });
  });

  it('accepts a valid event with tool absent (optional)', () => {
    const data = TelemetryEventInputSchema.parse({
      ref: 'airesource:default/x',
      action: 'view',
    });

    expect(data.tool).toBeUndefined();
  });

  it('rejects an invalid action', () => {
    const result = TelemetryEventInputSchema.safeParse({
      ref: 'airesource:default/x',
      action: 'delete',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a missing ref', () => {
    const result = TelemetryEventInputSchema.safeParse({
      action: 'view',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty ref', () => {
    const result = TelemetryEventInputSchema.safeParse({
      ref: '',
      action: 'view',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty tool', () => {
    const result = TelemetryEventInputSchema.safeParse({
      ref: 'airesource:default/x',
      action: 'install',
      tool: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an event missing the action', () => {
    const result = TelemetryEventInputSchema.safeParse({
      ref: 'airesource:default/x',
    });

    expect(result.success).toBe(false);
  });
});

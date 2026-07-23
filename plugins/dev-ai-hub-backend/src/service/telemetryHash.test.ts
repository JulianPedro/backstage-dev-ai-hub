import type { BackstageCredentials } from '@backstage/backend-plugin-api';
import { hashActor } from './telemetryHash';

const userCredentials = {
  principal: { type: 'user', userEntityRef: 'user:default/jdoe' },
} as BackstageCredentials;

const serviceCredentials = {
  principal: { type: 'service', subject: 'plugin:catalog' },
} as BackstageCredentials;

describe('hashActor', () => {
  it('hashes a user principal deterministically for the same salt', () => {
    const a = hashActor(userCredentials, 'salt-1');
    const b = hashActor(userCredentials, 'salt-1');
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
  });

  it('produces different hashes for different salts (rotation changes dedup identity)', () => {
    const a = hashActor(userCredentials, 'salt-1');
    const b = hashActor(userCredentials, 'salt-2');
    expect(a).not.toEqual(b);
  });

  it('never returns the plaintext user ref', () => {
    const hash = hashActor(userCredentials, 'salt-1');
    expect(hash).not.toContain('jdoe');
  });

  it('returns null for non-user (service) principals', () => {
    expect(hashActor(serviceCredentials, 'salt-1')).toBeNull();
  });
});

import { createHmac } from 'node:crypto';
import type {
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';

/**
 * Salted one-way hash of the calling user's entity ref (ADR-0007). Only
 * `'user'` principals get a hash — service principals record `null`
 * (identity-less writes are still stored and counted raw, never rejected).
 */
export function hashActor(
  credentials: BackstageCredentials,
  salt: string,
): string | null {
  const principal = credentials.principal as { type: string };
  if (principal.type !== 'user') {
    return null;
  }
  return createHmac('sha256', salt)
    .update((principal as BackstageUserPrincipal).userEntityRef)
    .digest('hex');
}

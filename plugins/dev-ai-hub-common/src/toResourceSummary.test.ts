/**
 * Tests for `toResourceSummary`: the isomorphic Entity → ResourceSummary
 * mapper shared by the backend router and the e2e fixtures.
 */
import type { Entity } from '@backstage/catalog-model';
import { isParseableEntityRef, toResourceSummary } from './toResourceSummary';

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'AiResource',
    metadata: { name: 'x', namespace: 'default' },
    spec: { type: 'skill', lifecycle: 'production' },
    ...overrides,
  };
}

describe('toResourceSummary', () => {
  it('maps a full entity to the flat ResourceSummary contract', () => {
    const result = toResourceSummary(
      entity({
        metadata: {
          name: 'approved-github-workflows',
          namespace: 'default',
          title: 'Approved GitHub Workflows',
          description: 'CI/CD hardening skill',
          tags: ['security'],
          annotations: {
            'backstage.io/source-location':
              'url:https://github.com/org/repo/blob/main/skill.yaml',
            'devaihub.io/version': '1.0.0',
            'devaihub.io/help': 'Some help text',
          },
        },
        spec: {
          type: 'skill',
          lifecycle: 'production',
          owner: 'group:ai-platform-team',
          agents: ['claude-code'],
        },
      }),
    );

    expect(result).toEqual({
      entityRef: 'airesource:default/approved-github-workflows',
      name: 'approved-github-workflows',
      title: 'Approved GitHub Workflows',
      description: 'CI/CD hardening skill',
      tags: ['security'],
      type: 'skill',
      lifecycle: 'production',
      owner: 'group:default/ai-platform-team',
      sourceLocation: 'url:https://github.com/org/repo/blob/main/skill.yaml',
      frameworks: ['claude-code'],
      version: '1.0.0',
      kind: 'AiResource',
      helpText: 'Some help text',
      annotations: {
        'backstage.io/source-location':
          'url:https://github.com/org/repo/blob/main/skill.yaml',
        'devaihub.io/version': '1.0.0',
        'devaihub.io/help': 'Some help text',
      },
    });
  });

  it('returns undefined for an unsupported spec.type (ADR-0003)', () => {
    expect(
      toResourceSummary(entity({ spec: { type: 'rule', lifecycle: 'x' } })),
    ).toBeUndefined();
  });

  it('defaults tags to an empty array and lifecycle to an empty string when absent', () => {
    const result = toResourceSummary(
      entity({
        metadata: { name: 'x', namespace: 'default' },
        spec: { type: 'agent' },
      }),
    );

    expect(result?.tags).toEqual([]);
    expect(result?.lifecycle).toBe('');
  });

  it('leaves owner, sourceLocation, version and helpText undefined when not set', () => {
    const result = toResourceSummary(entity());

    expect(result?.owner).toBeUndefined();
    expect(result?.sourceLocation).toBeUndefined();
    expect(result?.version).toBeUndefined();
    expect(result?.helpText).toBeUndefined();
    expect(result?.annotations).toEqual({});
  });

  it('ignores a non-string owner', () => {
    const result = toResourceSummary(
      entity({ spec: { type: 'skill', lifecycle: 'x', owner: 42 } }),
    );

    expect(result?.owner).toBeUndefined();
  });

  it.each([
    ['group:platforms-developer-experience'],
    ['platforms-developer-experience'],
    ['group:default/platforms-developer-experience'],
  ])('normalises owner %s to a full entity ref', owner => {
    const result = toResourceSummary(
      entity({ spec: { type: 'skill', lifecycle: 'x', owner } }),
    );

    expect(result?.owner).toBe('group:default/platforms-developer-experience');
  });

  it('keeps a non-default kind and namespace when the owner spells them out', () => {
    const result = toResourceSummary(
      entity({
        spec: { type: 'skill', lifecycle: 'x', owner: 'user:ops/ana' },
      }),
    );

    expect(result?.owner).toBe('user:ops/ana');
  });

  it('passes an unparseable owner through rather than dropping the resource', () => {
    const result = toResourceSummary(
      entity({ spec: { type: 'skill', lifecycle: 'x', owner: 'a:b:c/d/e' } }),
    );

    expect(result?.owner).toBe('a:b:c/d/e');
  });
});

describe('isParseableEntityRef', () => {
  it.each([
    ['group:default/platforms-developer-experience'],
    ['group:platforms-developer-experience'],
    ['platforms-developer-experience'],
    ['user:ops/ana'],
    ['airesource:default/approved-github-workflows'],
  ])('accepts %s', ref => {
    expect(isParseableEntityRef(ref)).toBe(true);
  });

  it('rejects a malformed ref', () => {
    expect(isParseableEntityRef('group:')).toBe(false);
  });
});

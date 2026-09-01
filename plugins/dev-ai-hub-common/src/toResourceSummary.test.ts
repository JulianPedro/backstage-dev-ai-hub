/**
 * Tests for `toResourceSummary`: the isomorphic Entity → ResourceSummary
 * mapper shared by the backend router and the e2e fixtures.
 */
import type { Entity } from '@backstage/catalog-model';
import {
  isParseableEntityRef,
  toResourceSummaries,
  toResourceSummary,
} from './toResourceSummary';

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
            'devaihub.io/help': 'Some help text',
          },
        },
        spec: {
          type: 'skill',
          lifecycle: 'production',
          owner: 'group:ai-platform-team',
          agents: ['claude-code'],
          version: '1.0.0',
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
      children: [],
      parents: [],
      childCount: 0,
      helpText: 'Some help text',
      annotations: {
        'backstage.io/source-location':
          'url:https://github.com/org/repo/blob/main/skill.yaml',
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

describe('toResourceSummary — containment children (ADR-0015)', () => {
  it('reads a plugin’s spec.skills as its children', () => {
    const result = toResourceSummary(
      entity({
        metadata: { name: 'bundle', namespace: 'default' },
        spec: {
          type: 'plugin',
          lifecycle: 'production',
          skills: ['airesource:default/one', 'airesource:default/two'],
        },
      }),
    );

    expect(result?.children).toEqual([
      'airesource:default/one',
      'airesource:default/two',
    ]);
    expect(result?.childCount).toBe(2);
    expect(result?.parents).toEqual([]);
  });

  it('reads a marketplace’s spec.plugins as its children', () => {
    const result = toResourceSummary(
      entity({
        metadata: { name: 'market', namespace: 'default' },
        spec: {
          type: 'marketplace',
          lifecycle: 'production',
          plugins: ['airesource:default/bundle'],
        },
      }),
    );

    expect(result?.children).toEqual(['airesource:default/bundle']);
  });

  it('normalises a bare child name to a full AiResource ref', () => {
    const result = toResourceSummary(
      entity({
        metadata: { name: 'bundle', namespace: 'default' },
        spec: {
          type: 'plugin',
          lifecycle: 'production',
          skills: ['one'],
        },
      }),
    );

    expect(result?.children).toEqual(['airesource:default/one']);
  });

  it('resolves a bare child name in the container’s own namespace, not always default', () => {
    // Mirrors Backstage's native relation fields (defaultNamespace: 'inherit'):
    // a plugin outside `default` must not have its bare members land there.
    const result = toResourceSummary(
      entity({
        metadata: { name: 'bundle', namespace: 'team-a' },
        spec: {
          type: 'plugin',
          lifecycle: 'production',
          skills: ['child'],
        },
      }),
    );

    expect(result?.children).toEqual(['airesource:team-a/child']);
  });

  it('gives leaf types no children', () => {
    const result = toResourceSummary(
      entity({ spec: { type: 'skill', lifecycle: 'production' } }),
    );

    expect(result?.children).toEqual([]);
    expect(result?.childCount).toBe(0);
  });

  it('reads containment only from the container’s own field', () => {
    // Only `plugin` reads spec.skills — a skill carrying a stray one is a leaf.
    const strayField = toResourceSummary(
      entity({
        spec: {
          type: 'skill',
          lifecycle: 'production',
          skills: ['airesource:default/x'],
        },
      }),
    );

    expect(strayField?.children).toEqual([]);
  });

  it('drops an unparseable child ref while keeping the valid ones', () => {
    const result = toResourceSummary(
      entity({
        metadata: { name: 'bundle', namespace: 'default' },
        spec: {
          type: 'plugin',
          lifecycle: 'production',
          // '' throws in parseEntityRef; 42 is not a string — both drop out.
          skills: ['airesource:default/one', '', 42],
        },
      }),
    );

    // toStrictEqual (not toEqual) so a stray undefined array item can't slip by.
    expect(result?.children).toStrictEqual(['airesource:default/one']);
  });

  it('matches a bare member ref against a visible entity in the same non-default namespace', () => {
    const namespacedPlugin = entity({
      metadata: { name: 'bundle', namespace: 'team-a' },
      spec: {
        type: 'plugin',
        lifecycle: 'production',
        skills: ['child'],
      },
    });
    const namespacedSkill = entity({
      metadata: { name: 'child', namespace: 'team-a' },
      spec: { type: 'skill', lifecycle: 'production' },
    });

    const summaries = toResourceSummaries([namespacedPlugin, namespacedSkill]);
    const bundle = summaries.find(s => s.name === 'bundle');
    const child = summaries.find(s => s.name === 'child');

    expect(bundle?.children).toEqual(['airesource:team-a/child']);
    expect(child?.parents).toEqual(['airesource:team-a/bundle']);
  });
});

describe('toResourceSummaries — parent inversion and visibility (ADR-0015)', () => {
  const marketplace = entity({
    metadata: { name: 'market', namespace: 'default' },
    spec: {
      type: 'marketplace',
      lifecycle: 'production',
      plugins: ['airesource:default/bundle'],
    },
  });
  const plugin = entity({
    metadata: { name: 'bundle', namespace: 'default' },
    spec: {
      type: 'plugin',
      lifecycle: 'production',
      skills: ['airesource:default/skill-a'],
    },
  });
  const skill = entity({
    metadata: { name: 'skill-a', namespace: 'default' },
    spec: { type: 'skill', lifecycle: 'production' },
  });

  it('inverts children into parents across the whole read', () => {
    const byRef = new Map(
      toResourceSummaries([marketplace, plugin, skill]).map(s => [
        s.entityRef,
        s,
      ]),
    );

    expect(byRef.get('airesource:default/bundle')?.parents).toEqual([
      'airesource:default/market',
    ]);
    expect(byRef.get('airesource:default/skill-a')?.parents).toEqual([
      'airesource:default/bundle',
    ]);
    expect(byRef.get('airesource:default/market')?.parents).toEqual([]);
  });

  it('drops a child ref absent from the caller-visible read (no leak)', () => {
    // The plugin is hidden: only the marketplace and skill are visible.
    const summaries = toResourceSummaries([marketplace, skill]);
    const market = summaries.find(s => s.name === 'market');

    expect(market?.children).toEqual([]);
    expect(market?.childCount).toBe(0);
  });

  it('lists a plugin in every marketplace that declares it', () => {
    const otherMarket = entity({
      metadata: { name: 'market-2', namespace: 'default' },
      spec: {
        type: 'marketplace',
        lifecycle: 'production',
        plugins: ['airesource:default/bundle'],
      },
    });
    const summaries = toResourceSummaries([marketplace, otherMarket, plugin]);
    const bundle = summaries.find(s => s.name === 'bundle');

    expect(bundle?.parents).toEqual([
      'airesource:default/market',
      'airesource:default/market-2',
    ]);
  });

  it('drops an off-convention member the catalog allows but the hub does not render', () => {
    // Upstream lets a marketplace list any AiResource; the hub renders plugins
    // only. A skill listed directly must not be counted or inverted.
    const loudMarket = entity({
      metadata: { name: 'market-3', namespace: 'default' },
      spec: {
        type: 'marketplace',
        lifecycle: 'production',
        plugins: ['airesource:default/bundle', 'airesource:default/skill-a'],
      },
    });
    const summaries = toResourceSummaries([loudMarket, plugin, skill]);
    const market = summaries.find(s => s.name === 'market-3');
    const skillSummary = summaries.find(s => s.name === 'skill-a');

    expect(market?.children).toEqual(['airesource:default/bundle']);
    expect(market?.childCount).toBe(1);
    // The skill's only real parent is its plugin, never the marketplace.
    expect(skillSummary?.parents).toEqual(['airesource:default/bundle']);
  });

  it('drops a nested plugin a plugin declares (containers are not plugin members)', () => {
    const outer = entity({
      metadata: { name: 'outer', namespace: 'default' },
      spec: {
        type: 'plugin',
        lifecycle: 'production',
        skills: ['airesource:default/bundle'],
      },
    });
    const summaries = toResourceSummaries([outer, plugin]);
    const outerSummary = summaries.find(s => s.name === 'outer');

    expect(outerSummary?.children).toEqual([]);
    expect(outerSummary?.childCount).toBe(0);
  });

  it('sets childCount to exactly the filtered children length', () => {
    // Two valid skills, one wrong-type (marketplace) and one absent ref: the
    // count must be 2, matching the rendered children.
    const bigPlugin = entity({
      metadata: { name: 'big', namespace: 'default' },
      spec: {
        type: 'plugin',
        lifecycle: 'production',
        skills: [
          'airesource:default/skill-a',
          'airesource:default/skill-b',
          'airesource:default/market',
          'airesource:default/ghost',
        ],
      },
    });
    const extraSkill = entity({
      metadata: { name: 'skill-b', namespace: 'default' },
      spec: { type: 'skill', lifecycle: 'production' },
    });
    const summaries = toResourceSummaries([
      bigPlugin,
      skill,
      extraSkill,
      marketplace,
    ]);
    const big = summaries.find(s => s.name === 'big');

    expect(big?.children).toEqual([
      'airesource:default/skill-a',
      'airesource:default/skill-b',
    ]);
    expect(big?.childCount).toBe(big?.children.length);
    expect(big?.childCount).toBe(2);
  });

  it('de-duplicates a child listed more than once', () => {
    const dupPlugin = entity({
      metadata: { name: 'dup', namespace: 'default' },
      spec: {
        type: 'plugin',
        lifecycle: 'production',
        skills: ['airesource:default/skill-a', 'airesource:default/skill-a'],
      },
    });
    const summaries = toResourceSummaries([dupPlugin, skill]);
    const dup = summaries.find(s => s.name === 'dup');

    expect(dup?.children).toEqual(['airesource:default/skill-a']);
  });

  it('drops a container that lists itself', () => {
    const selfRef = entity({
      metadata: { name: 'selfie', namespace: 'default' },
      spec: {
        type: 'plugin',
        lifecycle: 'production',
        skills: ['airesource:default/selfie'],
      },
    });
    const summaries = toResourceSummaries([selfRef]);
    const s = summaries.find(x => x.name === 'selfie');

    expect(s?.children).toEqual([]);
    expect(s?.parents).toEqual([]);
  });

  it('preserves declaration order in the inverted parents list', () => {
    const first = entity({
      metadata: { name: 'aaa', namespace: 'default' },
      spec: {
        type: 'marketplace',
        lifecycle: 'production',
        plugins: ['airesource:default/bundle'],
      },
    });
    const second = entity({
      metadata: { name: 'zzz', namespace: 'default' },
      spec: {
        type: 'marketplace',
        lifecycle: 'production',
        plugins: ['airesource:default/bundle'],
      },
    });
    // Input order zzz-before-aaa must be the parents order (not sorted).
    const summaries = toResourceSummaries([second, first, plugin]);
    const bundle = summaries.find(s => s.name === 'bundle');

    expect(bundle?.parents).toEqual([
      'airesource:default/zzz',
      'airesource:default/aaa',
    ]);
  });

  it('resolves a bare child name to the same ref as a full one', () => {
    const bareParent = entity({
      metadata: { name: 'bare', namespace: 'default' },
      spec: {
        type: 'plugin',
        lifecycle: 'production',
        skills: ['skill-a'], // bare name, no airesource:default/ prefix
      },
    });
    const summaries = toResourceSummaries([bareParent, skill]);
    const bare = summaries.find(s => s.name === 'bare');

    expect(bare?.children).toEqual(['airesource:default/skill-a']);
    expect(summaries.find(s => s.name === 'skill-a')?.parents).toEqual([
      'airesource:default/bare',
    ]);
  });

  it('drops entities of an unsupported spec.type from the read', () => {
    const rule = entity({
      metadata: { name: 'a-rule', namespace: 'default' },
      spec: { type: 'rule', lifecycle: 'production' },
    });
    const summaries = toResourceSummaries([plugin, skill, rule]);

    expect(summaries.map(s => s.name).sort()).toEqual(['bundle', 'skill-a']);
    expect(summaries.every(s => s !== undefined)).toBe(true);
  });
});

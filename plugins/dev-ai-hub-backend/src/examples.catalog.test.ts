/**
 * Catalog example fixtures validation (issue #27, acceptance criterion 4+6)
 *
 * Parses every AiResource yaml in examples/catalog/ and asserts:
 *   - kind is AiResource
 *   - spec.type is one of the canonical ResourceTypes (RESOURCE_TYPES)
 *   - all canonical types are represented (one file each)
 *   - required fields are present per AIRESOURCE-SPEC.md
 *   - backstage.io/source-location annotation is present
 *
 * This is the CI floor for criterion 6 ("one entity per type returned by
 * getEntities kind=AiResource"). A live catalog-boot test would be
 * stronger but depends on the alpha ai-model module being stable enough
 * to boot in jest — deferred to a follow-up if needed.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  RESOURCE_TYPES,
  type ResourceType,
} from '@nospt/plugin-dev-ai-hub-common';
import type { Entity, KindValidator } from '@backstage/catalog-model';
import {
  aiResourceEntityV1alpha1Validator,
  skillAiResourceEntityV1alpha1Validator,
  pluginAiResourceEntityV1alpha1Validator,
  marketplaceAiResourceEntityV1alpha1Validator,
} from '@backstage/catalog-model/alpha';

// Path relative to this file: ../../../examples/catalog/
const CATALOG_DIR = path.resolve(__dirname, '../../../examples/catalog');

const VALID_TYPES = RESOURCE_TYPES;

// The upstream schema (Backstage 1.54) enforces subtype-specific required
// fields — `spec.skills` on `plugin`, `spec.plugins` on `marketplace`. Types
// without a dedicated subtype validate against the base AiResource schema.
const VALIDATOR_BY_TYPE: Record<ResourceType, KindValidator> = {
  skill: skillAiResourceEntityV1alpha1Validator,
  plugin: pluginAiResourceEntityV1alpha1Validator,
  marketplace: marketplaceAiResourceEntityV1alpha1Validator,
  agent: aiResourceEntityV1alpha1Validator,
  hook: aiResourceEntityV1alpha1Validator,
  'mcp-config': aiResourceEntityV1alpha1Validator,
};

interface ParsedEntity {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    title?: string;
    description?: string;
    annotations?: Record<string, string>;
  };
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
    [key: string]: unknown;
  };
}

function loadEntityFiles(): Array<{ file: string; entity: ParsedEntity }> {
  const files = fs
    .readdirSync(CATALOG_DIR)
    .filter(f => f.endsWith('.yaml') && f !== 'all.yaml');

  return files.map(file => {
    const raw = fs.readFileSync(path.join(CATALOG_DIR, file), 'utf-8');
    const entity = yaml.load(raw) as ParsedEntity;
    return { file, entity };
  });
}

describe('examples/catalog — AiResource fixture validation (#27)', () => {
  let fixtures: Array<{ file: string; entity: ParsedEntity }>;

  beforeAll(() => {
    fixtures = loadEntityFiles();
  });

  it('covers every ResourceType at least once', () => {
    const types = new Set(fixtures.map(f => f.entity.spec?.type));
    for (const type of VALID_TYPES) {
      expect(types).toContain(type);
    }
  });

  it.each(VALID_TYPES)('has a %s entity', type => {
    const match = fixtures.find(f => f.entity.spec?.type === type);
    expect(match).toBeDefined();
  });

  describe.each(
    // populated after beforeAll — use a lazy approach. Filtered to
    // AiResource-kind files: examples/catalog also carries owner-group
    // entities (e.g. group-ai-platform-team.yaml) that spec.owner refs
    // resolve against, which are real catalog fixtures but not part of
    // the AiResource contract this describe block checks. They're still
    // covered by the "all.yaml Location targets" assertion below.
    (() => {
      const items = loadEntityFiles();
      return items
        .filter(({ entity }) => entity.kind === 'AiResource')
        .map(({ file, entity }) => ({ file, entity }));
    })(),
  )('$file', ({ entity }) => {
    it('has kind AiResource', () => {
      expect(entity.kind).toBe('AiResource');
    });

    it('has a valid spec.type', () => {
      expect(VALID_TYPES).toContain(entity.spec.type as ResourceType);
    });

    it('has metadata.name', () => {
      expect(entity.metadata.name).toBeTruthy();
    });

    it('has spec.lifecycle', () => {
      expect(entity.spec.lifecycle).toBeTruthy();
    });

    it('has spec.owner', () => {
      expect(entity.spec.owner).toBeTruthy();
    });

    it('has backstage.io/source-location annotation', () => {
      const loc = entity.metadata.annotations?.['backstage.io/source-location'];
      expect(loc).toBeTruthy();
    });

    it('validates against the upstream 1.54 schema for its spec.type', async () => {
      const validator = VALIDATOR_BY_TYPE[entity.spec.type as ResourceType];
      // check() throws with the schema error on a known-but-invalid entity
      // (e.g. a `plugin` missing spec.skills) and resolves true when valid.
      await expect(validator.check(entity as unknown as Entity)).resolves.toBe(
        true,
      );
    });
  });

  it('all.yaml Location targets exactly the entity files that exist', () => {
    const allYaml = path.join(CATALOG_DIR, 'all.yaml');
    expect(fs.existsSync(allYaml)).toBe(true);

    const raw = fs.readFileSync(allYaml, 'utf-8');
    const location = yaml.load(raw) as {
      kind: string;
      spec: { targets: string[] };
    };

    expect(location.kind).toBe('Location');

    const targeted = location.spec.targets
      .map(t => t.replace(/^\.\//, ''))
      .sort();
    const existing = fixtures.map(f => f.file).sort();
    expect(targeted).toEqual(existing);
  });
});

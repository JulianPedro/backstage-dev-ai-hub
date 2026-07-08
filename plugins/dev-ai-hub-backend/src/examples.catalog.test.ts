/**
 * Catalog example fixtures validation (issue #27, acceptance criterion 4+6)
 *
 * Parses every AiResource yaml in examples/catalog/ and asserts:
 *   - kind is AiResource
 *   - spec.type is one of the five canonical ResourceTypes
 *   - all five types are represented (one file each)
 *   - required fields are present per AIRESOURCE-SPEC.md
 *   - backstage.io/source-location annotation is present
 *
 * This is the CI floor for criterion 6 ("5 entities returned by
 * getEntities kind=AiResource"). A live catalog-boot test would be
 * stronger but depends on the alpha ai-model module being stable enough
 * to boot in jest — deferred to a follow-up if needed.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Path relative to this file: ../../../examples/catalog/
const CATALOG_DIR = path.resolve(__dirname, '../../../examples/catalog');

const VALID_TYPES = ['skill', 'agent', 'hook', 'mcp', 'plugin'] as const;
type ResourceType = (typeof VALID_TYPES)[number];

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

  it('has exactly 5 entity files (one per ResourceType)', () => {
    expect(fixtures).toHaveLength(5);
  });

  it.each(VALID_TYPES)('has a %s entity', type => {
    const match = fixtures.find(f => f.entity.spec?.type === type);
    expect(match).toBeDefined();
  });

  describe.each(
    // populated after beforeAll — use a lazy approach
    (() => {
      const items = loadEntityFiles();
      return items.map(({ file, entity }) => ({ file, entity }));
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
  });

  it('all.yaml Location exists and targets the 5 entity files', () => {
    const allYaml = path.join(CATALOG_DIR, 'all.yaml');
    expect(fs.existsSync(allYaml)).toBe(true);

    const raw = fs.readFileSync(allYaml, 'utf-8');
    const location = yaml.load(raw) as { kind: string; spec: { targets: string[] } };

    expect(location.kind).toBe('Location');
    expect(location.spec.targets).toHaveLength(5);

    // Every target must resolve to an existing file
    for (const target of location.spec.targets) {
      const resolved = path.join(CATALOG_DIR, target);
      expect(fs.existsSync(resolved)).toBe(true);
    }
  });
});

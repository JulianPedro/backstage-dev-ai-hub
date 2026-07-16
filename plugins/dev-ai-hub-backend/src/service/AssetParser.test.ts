import { AssetParser } from './AssetParser';

const VALID_YAML = `
name: My Instruction
description: A test instruction
type: instruction
tools:
  - claude-code
tags:
  - testing
author: Test Author
version: 1.2.3
`;

describe('AssetParser.parseYaml', () => {
  it('parses a valid YAML envelope and returns metadata + mdPath', () => {
    const result = AssetParser.parseYaml(
      VALID_YAML,
      'instructions/my-instruction.yaml',
    );
    expect(result).not.toBeNull();
    expect(result!.meta.name).toBe('My Instruction');
    expect(result!.meta.description).toBe('A test instruction');
    expect(result!.meta.type).toBe('instruction');
    expect(result!.meta.tools).toEqual(['claude-code']);
    expect(result!.meta.tags).toEqual(['testing']);
    expect(result!.meta.author).toBe('Test Author');
    expect(result!.meta.version).toBe('1.2.3');
    expect(result!.yamlRaw).toBe(VALID_YAML);
  });

  it('leaves mdPath undefined when no content field is set', () => {
    const result = AssetParser.parseYaml(
      VALID_YAML,
      'instructions/my-instruction.yaml',
    );
    expect(result!.mdPath).toBeUndefined();
  });

  it('uses the content field to resolve mdPath when present', () => {
    const yaml = `${VALID_YAML}content: custom-content.md\n`;
    const result = AssetParser.parseYaml(
      yaml,
      'instructions/my-instruction.yaml',
    );
    expect(result!.mdPath).toBe('instructions/custom-content.md');
  });

  it('resolves content path relative to the yaml directory', () => {
    const yaml = `${VALID_YAML}content: sub/custom.md\n`;
    const result = AssetParser.parseYaml(yaml, 'agents/my-agent.yaml');
    expect(result!.mdPath).toBe('agents/sub/custom.md');
  });

  it('returns null for invalid YAML syntax', () => {
    expect(AssetParser.parseYaml(': bad: yaml: :', 'test.yaml')).toBeNull();
  });

  it('returns null when required field "name" is missing', () => {
    const yaml = `
description: A description
type: instruction
tools:
  - claude-code
`;
    expect(AssetParser.parseYaml(yaml, 'test.yaml')).toBeNull();
  });

  it('returns null when required field "type" is missing', () => {
    const yaml = `
name: Test
description: A description
tools:
  - claude-code
`;
    expect(AssetParser.parseYaml(yaml, 'test.yaml')).toBeNull();
  });

  it('returns null when type is not a recognised enum value', () => {
    const yaml = `
name: Test
description: A description
type: invalid-type
tools:
  - claude-code
`;
    expect(AssetParser.parseYaml(yaml, 'test.yaml')).toBeNull();
  });

  it('returns null when tools array is empty', () => {
    const yaml = `
name: Test
description: A description
type: instruction
tools: []
`;
    expect(AssetParser.parseYaml(yaml, 'test.yaml')).toBeNull();
  });

  it('applies schema defaults for optional fields', () => {
    const yaml = `
name: Minimal
description: Minimal description
type: agent
tools:
  - claude-code
`;
    const result = AssetParser.parseYaml(yaml, 'agents/minimal.yaml');
    expect(result!.meta.author).toBe('Unknown');
    expect(result!.meta.version).toBe('1.0.0');
    expect(result!.meta.tags).toEqual([]);
  });

  it('passes through unrecognised fields (passthrough schema)', () => {
    const yaml = `${VALID_YAML}unknownField: some-value\n`;
    const result = AssetParser.parseYaml(yaml, 'test.yaml');
    expect(result).not.toBeNull();
  });
});

describe('AssetParser.buildId', () => {
  it('returns a base64url encoded string', () => {
    const id = AssetParser.buildId('provider-1', 'instructions/my-asset.yaml');
    expect(id).toBe(
      Buffer.from('provider-1:instructions/my-asset.yaml').toString(
        'base64url',
      ),
    );
  });

  it('normalises backslashes to forward slashes', () => {
    const id1 = AssetParser.buildId('p', 'instructions\\my-asset.yaml');
    const id2 = AssetParser.buildId('p', 'instructions/my-asset.yaml');
    expect(id1).toBe(id2);
  });

  it('strips a leading slash', () => {
    const id1 = AssetParser.buildId('p', '/instructions/my-asset.yaml');
    const id2 = AssetParser.buildId('p', 'instructions/my-asset.yaml');
    expect(id1).toBe(id2);
  });

  it('is deterministic for the same inputs', () => {
    const id1 = AssetParser.buildId('provider-1', 'path/to/asset.yaml');
    const id2 = AssetParser.buildId('provider-1', 'path/to/asset.yaml');
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different providers', () => {
    const id1 = AssetParser.buildId('provider-1', 'path/asset.yaml');
    const id2 = AssetParser.buildId('provider-2', 'path/asset.yaml');
    expect(id1).not.toBe(id2);
  });

  it('produces different IDs for different paths', () => {
    const id1 = AssetParser.buildId('p', 'instructions/a.yaml');
    const id2 = AssetParser.buildId('p', 'agents/a.yaml');
    expect(id1).not.toBe(id2);
  });
});

describe('AssetParser.buildAsset', () => {
  const parsed = AssetParser.parseYaml(
    VALID_YAML,
    'instructions/my-instruction.yaml',
  )!;

  it('builds a complete AiAssetInput with all expected fields', () => {
    const asset = AssetParser.buildAsset(
      parsed,
      '# Content',
      'my-provider',
      'https://github.com/org/repo',
      'main',
      'instructions/my-instruction.yaml',
      'instructions/my-instruction.md',
    );

    expect(asset.id).toBe(
      AssetParser.buildId('my-provider', 'instructions/my-instruction.yaml'),
    );
    expect(asset.name).toBe('My Instruction');
    expect(asset.type).toBe('instruction');
    expect(asset.tools).toEqual(['claude-code']);
    expect(asset.tags).toEqual(['testing']);
    expect(asset.content).toBe('# Content');
    expect(asset.yamlRaw).toBe(VALID_YAML);
    expect(asset.providerId).toBe('my-provider');
    expect(asset.repoUrl).toBe('https://github.com/org/repo');
    expect(asset.branch).toBe('main');
    expect(asset.yamlPath).toBe('instructions/my-instruction.yaml');
    expect(asset.mdPath).toBe('instructions/my-instruction.md');
    expect(asset.author).toBe('Test Author');
    expect(asset.version).toBe('1.2.3');
  });

  it('sets metadata.mcpServers when mcpServers is present in the YAML', () => {
    const yaml = `${VALID_YAML}mcpServers:\n  my-server:\n    url: http://localhost\n`;
    const parsedWithMcp = AssetParser.parseYaml(yaml, 'agents/agent.yaml')!;
    const asset = AssetParser.buildAsset(
      parsedWithMcp,
      '',
      'p',
      'url',
      'main',
      'agents/agent.yaml',
      'agents/agent.md',
    );
    expect(asset.metadata?.mcpServers).toEqual({
      'my-server': { url: 'http://localhost' },
    });
  });

  it('sets metadata.steps when steps is present in the YAML', () => {
    const yaml = `${VALID_YAML}steps:\n  - name: step1\n    action: do-something\n`;
    const parsedWithSteps = AssetParser.parseYaml(yaml, 'workflows/w.yaml')!;
    const asset = AssetParser.buildAsset(
      parsedWithSteps,
      '',
      'p',
      'url',
      'main',
      'workflows/w.yaml',
      'workflows/w.md',
    );
    expect(asset.metadata?.steps).toEqual([
      { name: 'step1', action: 'do-something' },
    ]);
  });

  it('leaves metadata undefined when no extra fields are present', () => {
    const asset = AssetParser.buildAsset(
      parsed,
      '',
      'p',
      'url',
      'main',
      'instructions/my-instruction.yaml',
      'instructions/my-instruction.md',
    );
    expect(asset.metadata).toBeUndefined();
  });

  it('defaults tags to [] when not specified', () => {
    const yaml = `
name: No Tags
description: A description
type: instruction
tools:
  - claude-code
`;
    const parsedNoTags = AssetParser.parseYaml(
      yaml,
      'instructions/no-tags.yaml',
    )!;
    const asset = AssetParser.buildAsset(
      parsedNoTags,
      '',
      'p',
      'url',
      'main',
      'instructions/no-tags.yaml',
      'instructions/no-tags.md',
    );
    expect(asset.tags).toEqual([]);
  });

  it('defaults author to "Unknown" when not specified', () => {
    const yaml = `
name: No Author
description: A description
type: instruction
tools:
  - claude-code
`;
    const parsedNoAuthor = AssetParser.parseYaml(
      yaml,
      'instructions/no-author.yaml',
    )!;
    const asset = AssetParser.buildAsset(
      parsedNoAuthor,
      '',
      'p',
      'url',
      'main',
      'instructions/no-author.yaml',
      'instructions/no-author.md',
    );
    expect(asset.author).toBe('Unknown');
  });
});

describe('AssetParser.parseYaml — schema-as-gatekeeper (arbitrary path discovery)', () => {
  it('discovers a valid asset at an arbitrary custom directory', () => {
    const result = AssetParser.parseYaml(
      VALID_YAML,
      'ai-artifacts/my-agent.yaml',
    );
    expect(result).not.toBeNull();
    expect(result!.meta.name).toBe('My Instruction');
    expect(result!.mdPath).toBeUndefined();
  });

  it('discovers a valid asset at a deeply nested path', () => {
    const result = AssetParser.parseYaml(
      VALID_YAML,
      'team/ai-assets/copilot/my-agent.yaml',
    );
    expect(result).not.toBeNull();
    expect(result!.mdPath).toBeUndefined();
  });

  it('discovers a valid asset at the repo root (no subdirectory)', () => {
    const result = AssetParser.parseYaml(VALID_YAML, 'my-instruction.yaml');
    expect(result).not.toBeNull();
    expect(result!.mdPath).toBeUndefined();
  });

  it('rejects a GitHub Actions workflow YAML (missing required fields)', () => {
    const ghActionsYaml = `
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
    expect(
      AssetParser.parseYaml(ghActionsYaml, '.github/workflows/ci.yaml'),
    ).toBeNull();
  });

  it('rejects a Helm values YAML (no name/type/tools)', () => {
    const helmYaml = `
replicaCount: 2
image:
  repository: nginx
  tag: latest
service:
  type: ClusterIP
  port: 80
`;
    expect(AssetParser.parseYaml(helmYaml, 'helm/values.yaml')).toBeNull();
  });

  it('rejects a Kubernetes manifest YAML (apiVersion/kind fields, no asset fields)', () => {
    const k8sYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
`;
    expect(AssetParser.parseYaml(k8sYaml, 'k8s/deployment.yaml')).toBeNull();
  });

  it('rejects a YAML with a valid-looking name but invalid type enum', () => {
    const yaml = `
name: CI Pipeline
description: Continuous integration pipeline config
type: pipeline
tools:
  - claude-code
`;
    expect(
      AssetParser.parseYaml(yaml, 'ai-artifacts/pipeline.yaml'),
    ).toBeNull();
  });

  it('rejects a YAML with a valid-looking type but unrecognised tool', () => {
    const yaml = `
name: My Agent
description: An agent config
type: agent
tools:
  - unknown-tool
`;
    expect(AssetParser.parseYaml(yaml, 'ai-artifacts/agent.yaml')).toBeNull();
  });

  it('buildAsset correctly sets yamlPath and mdPath for an arbitrary directory', () => {
    const parsed = AssetParser.parseYaml(
      VALID_YAML,
      'ai-artifacts/my-agent.yaml',
    )!;
    const asset = AssetParser.buildAsset(
      parsed,
      '# Content',
      'my-provider',
      'https://github.com/org/repo',
      'main',
      'ai-artifacts/my-agent.yaml',
      'ai-artifacts/SKILL.md',
    );
    expect(asset.yamlPath).toBe('ai-artifacts/my-agent.yaml');
    expect(asset.mdPath).toBe('ai-artifacts/SKILL.md');
    expect(asset.id).toBe(
      AssetParser.buildId('my-provider', 'ai-artifacts/my-agent.yaml'),
    );
  });
});

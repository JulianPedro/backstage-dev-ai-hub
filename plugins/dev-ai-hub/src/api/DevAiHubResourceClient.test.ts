/**
 * Tests for the v2 frontend API client: the only code that talks to the
 * backend, so every method and every failure path a real deployment can
 * produce (404 from the body resolver — missing entity *or* no access,
 * indistinguishable by design (ADR-0006) — 5xx, a network throw, and a
 * malformed payload) is exercised here against a mocked `fetch`.
 */
import type { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  DevAiHubResourceClient,
  ResourceBodyError,
} from './DevAiHubResourceClient';

const BASE_URL = 'http://example.com/api/dev-ai-hub';

function makeApis(fetchImpl: jest.Mock) {
  const discoveryApi: jest.Mocked<DiscoveryApi> = {
    getBaseUrl: jest.fn().mockResolvedValue(BASE_URL),
  };
  const fetchApi: FetchApi = { fetch: fetchImpl };
  return { discoveryApi, fetchApi };
}

function okResponse(body: unknown): Partial<Response> {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers(),
  };
}

describe('DevAiHubResourceClient — getResources', () => {
  it('fetches the resources endpoint and returns the flat items list', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(okResponse({ items: [{ name: 'a' }] }));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const result = await client.getResources();

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE_URL}/resources`);
    expect(result).toEqual([{ name: 'a' }]);
  });

  it('throws with the status and body text on a non-ok response (5xx)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: jest.fn().mockResolvedValue('upstream unavailable'),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(client.getResources()).rejects.toThrow(
      'Dev AI Hub API error 502: upstream unavailable',
    );
  });

  it('propagates a network throw as-is', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(client.getResources()).rejects.toThrow('Failed to fetch');
  });

  it('rejects on a malformed (non-JSON) payload', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(client.getResources()).rejects.toThrow('Unexpected token');
  });
});

describe('DevAiHubResourceClient — getEntityBodyUrl', () => {
  it('builds the raw body URL for an entity ref', async () => {
    const { discoveryApi, fetchApi } = makeApis(jest.fn());
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const url = await client.getEntityBodyUrl('airesource:default/x');

    expect(url).toBe(`${BASE_URL}/entity/airesource%3Adefault%2Fx/raw`);
  });

  it('appends the download flag when requested', async () => {
    const { discoveryApi, fetchApi } = makeApis(jest.fn());
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const url = await client.getEntityBodyUrl('airesource:default/x', {
      download: true,
    });

    expect(url).toBe(
      `${BASE_URL}/entity/airesource%3Adefault%2Fx/raw?download=true`,
    );
  });
});

describe('DevAiHubResourceClient — getEntityBody', () => {
  it('returns the body content and content-type on success', async () => {
    const headers = new Headers({ 'content-type': 'text/markdown' });
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('# hello'),
      headers,
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const body = await client.getEntityBody('airesource:default/x');

    expect(body).toEqual({ content: '# hello', contentType: 'text/markdown' });
  });

  it('defaults the content type to text/plain when the header is absent', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('plain'),
      headers: new Headers(),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const body = await client.getEntityBody('airesource:default/x');

    expect(body.contentType).toBe('text/plain');
  });

  it('throws a ResourceBodyError with status 404 — missing entity or no access, indistinguishable by design (ADR-0006)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.getEntityBody('airesource:default/x'),
    ).rejects.toMatchObject({ status: 404, name: 'ResourceBodyError' });
  });

  it('throws a ResourceBodyError with status 502 on an upstream failure', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 502 });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const error = await client
      .getEntityBody('airesource:default/x')
      .catch(e => e);

    expect(error).toBeInstanceOf(ResourceBodyError);
    expect(error.status).toBe(502);
  });

  it('propagates a network throw as-is', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('offline'));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(client.getEntityBody('airesource:default/x')).rejects.toThrow(
      'offline',
    );
  });
});

describe('DevAiHubResourceClient — downloadEntityBody', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('fetches the artifact and triggers a browser download via a blob anchor', async () => {
    const blob = new Blob(['content']);
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(blob),
      headers: new Headers({
        'content-disposition': 'attachment; filename="my-skill.zip"',
      }),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    await client.downloadEntityBody('airesource:default/my-skill');

    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE_URL}/entity/airesource%3Adefault%2Fmy-skill/raw?download=true`,
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    clickSpy.mockRestore();
  });

  it('falls back to a name derived from the entity ref when there is no content-disposition', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['content'])),
      headers: new Headers(),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    let downloadAttr: string | undefined;
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function click(this: HTMLAnchorElement) {
        downloadAttr = this.download;
      });

    await client.downloadEntityBody('airesource:default/my-skill');

    expect(downloadAttr).toBe('my-skill.md');
  });

  it('revokes the blob URL even when the click handler throws', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['content'])),
      headers: new Headers(),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click failed');
    });

    await expect(
      client.downloadEntityBody('airesource:default/my-skill'),
    ).rejects.toThrow('click failed');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('throws a ResourceBodyError on a non-ok response and never touches the blob machinery', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.downloadEntityBody('airesource:default/x'),
    ).rejects.toMatchObject({ status: 404, name: 'ResourceBodyError' });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('propagates a network throw as-is', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('offline'));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.downloadEntityBody('airesource:default/x'),
    ).rejects.toThrow('offline');
  });
});

describe('DevAiHubResourceClient — track', () => {
  it('posts the telemetry event with ref, action and tool', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(okResponse({}));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await client.track('airesource:default/x', 'install', 'claude-code');

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: 'airesource:default/x',
        action: 'install',
        tool: 'claude-code',
      }),
    });
  });

  it('is fire-and-forget: a network throw never surfaces to the caller (ADR-0007)', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('offline'));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.track('airesource:default/x', 'copy'),
    ).resolves.toBeUndefined();
  });

  it('is fire-and-forget: a non-ok (5xx) response never surfaces to the caller', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, text: jest.fn() });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.track('airesource:default/x', 'download'),
    ).resolves.toBeUndefined();
  });

  it('is fire-and-forget: discovery failures never surface to the caller', async () => {
    const discoveryApi: jest.Mocked<DiscoveryApi> = {
      getBaseUrl: jest.fn().mockRejectedValue(new Error('discovery down')),
    };
    const fetchApi: FetchApi = { fetch: jest.fn() };
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.track('airesource:default/x', 'view'),
    ).resolves.toBeUndefined();
  });
});

describe('DevAiHubResourceClient — getInstallCount', () => {
  it('returns the raw per-action counts on success', async () => {
    const counts = { install: 3, copy: 1, download: 0, view: 5 };
    const fetchImpl = jest.fn().mockResolvedValue(okResponse(counts));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    const result = await client.getInstallCount('airesource:default/x');

    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE_URL}/telemetry/airesource%3Adefault%2Fx`,
    );
    expect(result).toEqual(counts);
  });

  it('throws with the status on a non-ok response (5xx)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.getInstallCount('airesource:default/x'),
    ).rejects.toThrow('Dev AI Hub API error 503');
  });

  it('throws on a 404 (missing telemetry row for this ref)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.getInstallCount('airesource:default/x'),
    ).rejects.toThrow('Dev AI Hub API error 404');
  });

  it('propagates a network throw as-is', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('offline'));
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.getInstallCount('airesource:default/x'),
    ).rejects.toThrow('offline');
  });

  it('rejects on a malformed (non-JSON) payload', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    });
    const { discoveryApi, fetchApi } = makeApis(fetchImpl);
    const client = new DevAiHubResourceClient(discoveryApi, fetchApi);

    await expect(
      client.getInstallCount('airesource:default/x'),
    ).rejects.toThrow('Unexpected token');
  });
});

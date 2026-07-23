import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type {
  ResourceListResponse,
  ResourceSummary,
  TelemetryAction,
  TelemetryCounts,
} from '@nospt/plugin-dev-ai-hub-common';

/**
 * v2 API client: consumes the catalog-backed `/resources` endpoint and knows
 * only the flat `ResourceSummary` contract (architecture.md).
 */
export const devAiHubResourceApiRef = createApiRef<DevAiHubResourceApi>({
  id: 'plugin.dev-ai-hub.resources',
});

/** The resolved body of a resource, as served by `GET /entity/:ref/raw`. */
export interface ResourceBody {
  content: string;
  contentType: string;
}

/** API error carrying the HTTP status so the UI can distinguish 404 from 502. */
export class ResourceBodyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ResourceBodyError';
  }
}

export interface DevAiHubResourceApi {
  getResources(): Promise<ResourceSummary[]>;
  /** Fetch the viewable body (a directory body's entry file). */
  getEntityBody(entityRef: string): Promise<ResourceBody>;
  /** Backend URL of the body; `download: true` yields the artifact form. */
  getEntityBodyUrl(
    entityRef: string,
    options?: { download?: boolean },
  ): Promise<string>;
  /** Trigger a browser download of the artifact (file, or zip if multi-file). */
  downloadEntityBody(entityRef: string): Promise<void>;
  /** Record a telemetry event (ADR-0007). Fire-and-forget from callers. */
  track(ref: string, action: TelemetryAction, tool?: string): Promise<void>;
  /** Raw per-action counts for a resource (ADR-0007 — dedup for `view` is a follow-up). */
  getInstallCount(ref: string): Promise<TelemetryCounts>;
}

export class DevAiHubResourceClient implements DevAiHubResourceApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  async getResources(): Promise<ResourceSummary[]> {
    const base = await this.discoveryApi.getBaseUrl('dev-ai-hub');
    const response = await this.fetchApi.fetch(`${base}/resources`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Dev AI Hub API error ${response.status}: ${text}`);
    }
    const body = (await response.json()) as ResourceListResponse;
    return body.items;
  }

  async getEntityBodyUrl(
    entityRef: string,
    options?: { download?: boolean },
  ): Promise<string> {
    const base = await this.discoveryApi.getBaseUrl('dev-ai-hub');
    const url = `${base}/entity/${encodeURIComponent(entityRef)}/raw`;
    return options?.download ? `${url}?download=true` : url;
  }

  async getEntityBody(entityRef: string): Promise<ResourceBody> {
    const response = await this.fetchApi.fetch(
      await this.getEntityBodyUrl(entityRef),
    );
    if (!response.ok) {
      throw new ResourceBodyError(
        `Failed to fetch body: ${response.status}`,
        response.status,
      );
    }
    return {
      content: await response.text(),
      contentType: response.headers.get('content-type') ?? 'text/plain',
    };
  }

  async downloadEntityBody(entityRef: string): Promise<void> {
    // The endpoint is auth-gated (ADR-0005), so a plain <a href> cannot carry
    // the token — fetch the artifact and hand the browser a blob instead.
    const response = await this.fetchApi.fetch(
      await this.getEntityBodyUrl(entityRef, { download: true }),
    );
    if (!response.ok) {
      throw new ResourceBodyError(
        `Failed to download body: ${response.status}`,
        response.status,
      );
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const filename =
      /filename="([^"]+)"/.exec(disposition)?.[1] ??
      `${entityRef.split('/').pop() ?? 'resource'}.md`;

    const blobUrl = URL.createObjectURL(await response.blob());
    try {
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.click();
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async track(
    ref: string,
    action: TelemetryAction,
    tool?: string,
  ): Promise<void> {
    // Fire-and-forget (ADR-0007): a telemetry failure must never surface as
    // a user-facing error or block the copy/download/install it's tracking.
    try {
      const base = await this.discoveryApi.getBaseUrl('dev-ai-hub');
      await this.fetchApi.fetch(`${base}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, action, tool }),
      });
    } catch {
      // ignored — see above
    }
  }

  async getInstallCount(ref: string): Promise<TelemetryCounts> {
    const base = await this.discoveryApi.getBaseUrl('dev-ai-hub');
    const response = await this.fetchApi.fetch(
      `${base}/telemetry/${encodeURIComponent(ref)}`,
    );
    if (!response.ok) {
      throw new Error(`Dev AI Hub API error ${response.status}`);
    }
    return (await response.json()) as TelemetryCounts;
  }
}

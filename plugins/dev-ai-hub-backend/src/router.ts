import express from 'express';
import archiver from 'archiver';
import type {
  HttpAuthService,
  LoggerService,
  UrlReaderService,
} from '@backstage/backend-plugin-api';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import type { TelemetryStore } from './database/TelemetryStore';
import type { ResourceSummary } from '@nospt/plugin-dev-ai-hub-common';
import {
  TelemetryEventInputSchema,
  toResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';
import { hashActor } from './service/telemetryHash';
import {
  SOURCE_LOCATION_ANNOTATION,
  contentTypeFor,
  parseUrlTarget,
  resolveBody,
} from './service/bodyResolver';

interface RouterOptions {
  logger: LoggerService;
  telemetryStore: TelemetryStore;
  telemetrySalt: string;
  catalog: CatalogService;
  httpAuth: HttpAuthService;
  reader: UrlReaderService;
}

export function createRouter(options: RouterOptions): express.Router {
  const { telemetryStore, telemetrySalt, catalog, httpAuth, reader } = options;
  const router = express.Router();

  router.use(express.json());

  // ── Resources (v2 — catalog-backed, ADR-0001) ─────────────────────────────

  router.get('/resources', async (req, res) => {
    try {
      const credentials = await httpAuth.credentials(req);
      const { items: entities } = await catalog.getEntities(
        { filter: { kind: 'AiResource' } },
        { credentials },
      );
      const items = entities
        .map(toResourceSummary)
        .filter((s): s is ResourceSummary => s !== undefined);
      res.json({ items });
    } catch (error) {
      if ((error as Error).name === 'AuthenticationError') {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      options.logger.error(`Failed to list resources: ${error}`);
      res.status(500).json({ error: 'Failed to list resources' });
    }
  });

  // ── Body resolver (v2 — ADR-0002/0006/0009) ───────────────────────────────

  const safeFilename = (name: string) => name.replace(/[^\w.-]+/g, '_');

  const sendBodyFile = (
    res: express.Response,
    name: string,
    content: Buffer,
    download: boolean,
  ) => {
    res.setHeader('Content-Type', contentTypeFor(name));
    if (download) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename(name.split('/').pop() ?? name)}"`,
      );
    }
    res.send(content);
  };

  const handleBodyRequest = async (
    req: express.Request,
    res: express.Response,
    filename?: string,
  ) => {
    try {
      // Re-fetch as the caller: catalog visibility is the only gate (ADR-0006).
      const credentials = await httpAuth.credentials(req);
      const entity = await catalog.getEntityByRef(req.params.ref, {
        credentials,
      });
      if (!entity) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      const sourceLocation =
        entity.metadata.annotations?.[SOURCE_LOCATION_ANNOTATION];
      const target = sourceLocation && parseUrlTarget(sourceLocation);
      if (!target) {
        res.status(404).json({ error: 'Resource has no content location' });
        return;
      }

      let body;
      try {
        body = await resolveBody(reader, target);
      } catch (error) {
        if ((error as Error).name === 'NotFoundError') {
          res.status(404).json({ error: 'Resource content not found' });
          return;
        }
        options.logger.error(
          `Body fetch failed for ${req.params.ref}: ${error}`,
        );
        res
          .status(502)
          .json({ error: 'Failed to fetch resource content from source' });
        return;
      }

      const download = req.query.download === 'true';

      if (filename !== undefined) {
        const file =
          body.kind === 'tree'
            ? body.files.find(f => f.path === filename)
            : undefined;
        if (!file) {
          res.status(404).json({ error: 'File not found in resource body' });
          return;
        }
        sendBodyFile(res, filename, await file.content(), download);
        return;
      }

      if (body.kind === 'file') {
        sendBodyFile(res, body.name, body.content, download);
        return;
      }

      if (!download) {
        if (!body.entryPath) {
          res.status(404).json({ error: 'Resource body has no entry file' });
          return;
        }
        const entry = body.files.find(f => f.path === body.entryPath)!;
        sendBodyFile(res, body.entryPath, await entry.content(), false);
        return;
      }

      // Multi-file artifact: one zip (ADR-0009 — interim, not the golden road).
      if (body.files.length === 1) {
        sendBodyFile(
          res,
          body.files[0].path,
          await body.files[0].content(),
          true,
        );
        return;
      }
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename(entity.metadata.name)}.zip"`,
      );
      const archive = archiver('zip');
      archive.on('error', error => {
        options.logger.error(
          `Zip assembly failed for ${req.params.ref}: ${error}`,
        );
        res.destroy(error);
      });
      archive.pipe(res);
      for (const file of body.files) {
        archive.append(await file.content(), { name: file.path });
      }
      await archive.finalize();
    } catch (error) {
      if ((error as Error).name === 'AuthenticationError') {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      options.logger.error(
        `Body resolution failed for ${req.params.ref}: ${error}`,
      );
      res.status(500).json({ error: 'Failed to resolve resource body' });
    }
  };

  router.get('/entity/:ref/raw', (req, res) => handleBodyRequest(req, res));
  router.get('/entity/:ref/raw/:filename', (req, res) =>
    handleBodyRequest(req, res, req.params.filename),
  );

  // ── Telemetry (v2 — ADR-0007) ──────────────────────────────────────────────

  router.post('/telemetry', async (req, res) => {
    try {
      const parsed = TelemetryEventInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const credentials = await httpAuth.credentials(req);
      const entity = await catalog.getEntityByRef(parsed.data.ref, {
        credentials,
      });
      if (!entity) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      await telemetryStore.record({
        entityRef: parsed.data.ref,
        action: parsed.data.action,
        actorHash: hashActor(credentials, telemetrySalt),
        tool: parsed.data.tool,
      });
      res.sendStatus(204);
    } catch (error) {
      if ((error as Error).name === 'AuthenticationError') {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      options.logger.error(`POST /telemetry failed: ${error}`);
      res.status(500).json({ error: 'Failed to record telemetry event' });
    }
  });

  router.get('/telemetry/:ref', async (req, res) => {
    try {
      await httpAuth.credentials(req);
      const counts = await telemetryStore.getCounts(req.params.ref);
      res.json(counts);
    } catch (error) {
      if ((error as Error).name === 'AuthenticationError') {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      options.logger.error(`GET /telemetry/${req.params.ref} failed: ${error}`);
      res.status(500).json({ error: 'Failed to fetch telemetry counts' });
    }
  });

  return router;
}

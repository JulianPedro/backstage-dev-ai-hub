# Ingestion is hand-authored, not plugin-owned

`AiResource` entities enter the catalog through normal Backstage registration — hand-authored
`catalog-info.yaml` descriptors registered as catalog Locations, exactly like a `Component`. The
DevAI Hub plugin ships **no** ingestion path: no EntityProvider, no Git discovery, no scheduled
sync.

This follows directly from "catalog is the sole source of truth" (ADR-0001). Bundling a producer
into the plugin would recreate the silo we are removing. Teams that want automated Git discovery
can install a *separate, optional* catalog backend module — explicitly out of scope for this
plugin.

For local development and verification, the repo carries an `examples/` folder of `AiResource`
descriptors, registered as a static Location in the dev harness. These doubles as demo data and as
the fixtures proving the cards render — with zero Git-reading code in the plugin.

## Consequences

- The dev backend harness registers `examples/` as a Location so the page has real data locally.
- A future Git auto-discovery producer, if built, is a standalone package, not part of DevAI Hub.
- The plugin documents the authoring contract (ADR-0003) for producers to follow.

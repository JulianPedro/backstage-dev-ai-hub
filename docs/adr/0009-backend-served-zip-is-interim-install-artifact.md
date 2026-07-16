# Install delivers a backend-served artifact (zip for multi-file) — an interim, not the golden road

Install must deliver a resource's body to the user's machine. We serve the artifact from the
backend body resolver — a single file streams as-is, a multi-file body is assembled into one zip
via `UrlReader.readTree` — because that is the only delivery path governed by the same and only
authorization gate we have: catalog entity visibility (ADR-0006).

We rejected a user-side install command (e.g. a copyable `git`/`curl` incantation that fetches
from the source repo) for two reasons: it silently swaps the auth model to the user's Git
credentials — a user entitled per the catalog but without repo access gets a broken install,
while any user who can *view* the body can copy it anyway, so Git access as a gate is security
by obscurity — and plain commands cannot carry the Backstage token our auth-gated routes
require (ADR-0005).

**This is not the golden road.** Zip-download-and-unpack is a stopgap ergonomic: the desired
end state is native install integration (framework-side installers / marketplaces, or the
upstream `AiResource` content reference — backstage/backstage#34318 — per ADR-0002's removal
path for the body resolver). A copyable install command may return later as *sugar on top of*
the backend-served artifact, never as the primary mechanism.

## Amendment (ADR-0010): download only where the body is the artifact

The backend-served artifact applies to the types whose body IS the installable content —
`skill`, `agent`, `hook`, `mcp`. A `plugin` or `marketplace` body is pointer-shaped
(instructions + install link / add command): downloading it delivers a doc that
misrepresents itself as the thing, so the UI hides Download for those two types
(`hasDownloadableArtifact` in `-common`). Their native path is the framework itself —
`/plugin marketplace add` and `/plugin install name@marketplace` — which is exactly the
"native install integration" horizon anticipated below. The marketplace journey's copyable
add commands do not conflict with the rejection of user-side install commands above: they
register a catalog with the tool rather than fetching a catalog-gated body, so no auth
model is swapped.

## Consequences

- Zip assembly lives in the body resolver; the install dialog offers download + copy-body +
  per-framework path guidance (download only for artifact-shaped bodies, per the amendment),
  and never emits shell commands as the primary flow.
- Producers need no repo-access alignment for install to work — catalog visibility alone
  decides who can browse, view, and install.
- When a native install path ships, the zip flow is a candidate for demotion or removal;
  design new install UX against that horizon, not around the zip.

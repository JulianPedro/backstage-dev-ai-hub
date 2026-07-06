# Body reads inherit catalog visibility via the caller's credentials

When resolving a resource body (`GET /entity/:ref/raw`), the backend re-fetches the `AiResource`
entity from the catalog **using the calling user's credentials**, not the backend service token.
If the catalog hides that entity from the user, the fetch returns not-found and the body is never
served. Authorization for body reads is therefore *delegated to catalog entity visibility* — no
DevAI Hub permission vocabulary is introduced.

We chose this over (a) authentication-only (any logged-in user reads any body) and (b) a bespoke
permission system. Delegating to the catalog is the correct posture because "can read this body"
should mean exactly "can see this entity" — and the catalog already enforces per-user entity
visibility. Using the service token for this read would have let a user pull the body of a repo
they cannot see.

## Consequences

- The body resolver forwards the caller's credentials to the `CatalogClient`; only the *body
  resolver* changes — other catalog reads that are genuinely background work keep the service token.
- The dead `dev-ai-hub.sync.trigger` permission (and `devAiHubPermissions`) are removed; DevAI Hub
  defines no permissions.
- Telemetry and (retired) UI-config remain authentication-only — no per-entity authorization.
- The MCP server keeps the service token (no per-request user); revisit if MCP is ever exposed to
  a wider caller set.

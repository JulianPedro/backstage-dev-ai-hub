# Security Policy

## Reporting a vulnerability

Report vulnerabilities through GitHub's private vulnerability reporting, which is enabled on this repository.
Open the [Security tab](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/security) and choose **Report a vulnerability**.
That opens a private advisory visible only to you and the maintainers.

Please do not open a public issue, a pull request, or a discussion for a suspected vulnerability, and do not send reports to the `nosportugal` organisation address — it is unmonitored.

A useful report describes what an attacker can do, not only what looks wrong.
Include the affected package and version, the configuration needed to reach the code path, and a reproduction if you have one.

We aim to acknowledge a report within five working days.

## Supported versions

The four `@nospt/plugin-dev-ai-hub*` packages are published in lockstep and are pre-1.0.
Only the latest published version receives fixes — there are no backports to earlier 0.x releases.
If you are running an older version, the remedy for any advisory is to upgrade.

## Scope

In scope:

- The four published packages under `plugins/`.
- The GitHub Actions workflows in this repository, including anything affecting the publish path to npm.

Out of scope:

- Backstage itself, and the `AiResource` catalog kind, which comes from Backstage's own alpha catalog module — report those to [backstage/backstage](https://github.com/backstage/backstage/security).
- Content reachable through an `AiResource` entity's `backstage.io/source-location`.
  Bodies are fetched from repositories the operator configures, through Backstage's `UrlReader` and its integration credentials.
  This plugin does not validate or sandbox that content, and it never renders it as trusted markup — a hostile body is an operator-side catalog problem, not a plugin vulnerability.
- Findings that require an operator to have already configured the plugin insecurely (for example, granting a Backstage integration credentials to repositories that should not be readable).

## What the trust model assumes

Understanding these makes for sharper reports.

- Every backend route requires standard Backstage authentication ([ADR-0005](../docs/adr/0005-backend-routes-require-backstage-auth.md)).
  There are no unauthenticated endpoints.
- Body reads re-fetch the entity as the calling user, so catalog visibility is the authorization gate ([ADR-0006](../docs/adr/0006-body-reads-delegate-to-catalog-visibility.md)).
  A report showing a user reading a body for an entity the catalog hides from them is a real finding.
- The backend reaches Git only through `UrlReader` and never re-derives Git trees, which is the SSRF boundary ([ADR-0002](../docs/adr/0002-thin-backend-body-resolver-and-mcp.md)).
  A report showing a way to make the backend fetch an arbitrary host is a real finding.
- Telemetry stores a salted one-way hash of the caller, never a plaintext user ref ([ADR-0007](../docs/adr/0007-telemetry-store-all-read-time-dedup.md)).
  A report recovering user identity from stored telemetry is a real finding.

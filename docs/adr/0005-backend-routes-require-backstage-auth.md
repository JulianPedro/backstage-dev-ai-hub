# Backend routes require Backstage authentication (internal-consumer trust model)

DevAI Hub's backend is treated as a **Backstage-internal service**: every route requires Backstage
authentication, and the previous blanket `allow: 'unauthenticated'` policies on `/entity`,
`/telemetry`, `/ui-config` and `/mcp` are removed. DevAI Hub is a consumer of the Backstage
catalog and is only ever reached by authenticated callers within the Backstage deployment.

We chose this ("A-pure") over keeping public/unauthenticated endpoints because the body resolver
and MCP server expose Git-sourced catalog content; leaving them open let any caller who could
reach the backend read that content. Requiring Backstage auth by default is the safe baseline for
an internal developer-tools plugin.

## Considered options

- **Public MCP with a shared token** (external AI tools hit `/mcp` directly from laptops). Rejected
  for now — no concrete external consumer, and it introduces a static shared secret. Left as a
  documented future follow-up.
- **Mixed (frontend routes authed, MCP public)** — same rejection; deferred with the MCP-auth
  question.

## Consequences

- All routes fall back to Backstage's default authentication; the `unauthenticated` auth policies
  are deleted.
- **MCP authentication is an open follow-up.** With external access out of scope, `/mcp`'s
  dedicated auth model (service token vs. a new external token) is deliberately undecided. The
  "paste this MCP URL into your AI tool" flow is treated as dev-only until that is designed.
- The catalog reads *inside* the MCP server keep using a backend **service token** (it is a
  background transport with no per-request user); only the route reachability changes.

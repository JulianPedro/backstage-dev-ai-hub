# Per-type rules

Apply the one section matching this resource's `spec.type`.

Three rules hold across every type. Annotations the hub does not render are noted where they exist — write them for other consumers if you like, but do not promise the user they will appear. A deep link is generated only for frameworks the resource itself declared, so a narrow `compatible-frameworks` list narrows the buttons. And **`spec.agents` overrides the annotation on every type, not just `skill`**: a top-level array of framework tokens —

```yaml
spec:
  type: agent   # any of the six
  agents: [claude-code, github-copilot]
```

— is read first, regardless of `spec.type`. When it is present and non-empty, framework resolution reads it and ignores `devaihub.io/compatible-frameworks` entirely; two lists that disagree is a bug the hub cannot warn you about, so either keep them identical or write only `spec.agents`. An empty or absent `agents` falls back to the annotation. Prefer `spec.agents` when you'd rather not depend on the `devaihub.io/*` annotation namespace, since it lives on the entity itself.

## skill

The only type with a formal native spec shape — `agents` is one of several fields it defines:

```yaml
spec:
  type: skill
  lifecycle: production
  owner: group:ai-platform-team
  agents: [claude-code, github-copilot]
  disciplines: [security, devops]
  categories: [review]
  usecases: ['CI/CD hardening']
```

`disciplines`, `categories`, `usecases` and `allowedTools` reach the catalog but not the hub — nothing renders them.

A skill body is usually a directory: end `source-location` with `/` and put a `SKILL.md` at the tree root. This is the one type multi-file suits — every host installs a skill as a directory, so the tree lands intact.

Installs drop-in, one directory per host: `.claude/skills/<name>/`, `.github/skills/<name>/`, `.gemini/skills/<name>/`, `.cursor/skills/<name>/`, and `.agents/skills/<name>/` when no framework is declared. Claude and Cursor also get one-click prompt launchers.

## agent

No formal native spec fields, but `spec.agents` still works for frameworks (see the universal rule above) — otherwise falls back to `devaihub.io/compatible-frameworks`.

**VS Code's install buttons need a GitHub blob URL.** They are derived by rewriting `source-location` into a raw URL, which requires the `/blob/<ref>/<path>` form on `github.com`. A `tree/` URL, a raw URL, or any other host yields no VS Code buttons — copy and download still work.

Installs drop-in as a single file: `.claude/agents/<name>.md`, `.github/agents/<name>.agent.md`, `.gemini/agents/<name>.md`, `.cursor/rules/<name>.mdc`, else `.ai/agents/<name>.md`.

`devaihub.io/role` is not rendered.

## hook

No native spec fields. `devaihub.io/hook-event` and `devaihub.io/hook-matcher` are conventional but render nowhere.

Installs **merge** everywhere except Copilot: `.claude/settings.json`, `.gemini/settings.json` and `.cursor/hooks.json` are files the user already owns, so the generated prompt asks the agent to merge and keep existing settings intact. Only `github-copilot` is drop-in, at `.github/hooks/<name>.json`.

Write the body as a fragment that merges cleanly — a whole settings file as the body invites a reader to overwrite their own.

There is no neutral fallback: a hook declaring no framework, or only unknown ones, produces no install rows at all. Declare at least one real host.

## mcp-config

The body **is** the install artifact: the JSON snippet merged into the user's MCP config. Transport and endpoint live only there — no annotation carries them, deliberately, so nothing can drift from the body.

Installs merge at `.mcp.json`, `.vscode/mcp.json`, `.gemini/settings.json`, `.cursor/mcp.json`.

**One-click links require a single-server body.** The body must parse as JSON and be either an `mcpServers` object holding exactly one entry, or a bare object carrying `command` or `url`. Two servers under `mcpServers` produces no links on any host — split them into two resources if you want launchers.

```json
{
  "mcpServers": {
    "grafana": { "command": "npx", "args": ["-y", "@grafana/mcp-server"] }
  }
}
```

Like `hook`, there is no neutral fallback — declare at least one real framework.

## plugin

A pointer, not content: a plugin installs through its host's own plugin system, so it has **no filesystem install path and no download** — offering one would hand the user an instructions document dressed up as the plugin. The body is the plugin's own manifest — JSON, not markdown.

Point `source-location` at `plugin.json`, wherever the plugin actually lives (`plugins/<name>/.claude-plugin/plugin.json`) — not at a README or other doc written about the plugin.

`devaihub.io/plugin-manifest` is not rendered. A plugin lists no children — see the containment note in `SKILL.md`.

## marketplace

A distribution point, registered rather than fetched: **no download and no copy**. The actionable snippets each carry their own copy button, generated from the entity.

Three rules, and breaking any one degrades the dialog to the rendered body alone:

1. `source-location` must be a `github.com` URL — the `owner/repo` slug is derived from it to build `/plugin marketplace add owner/repo`.
2. `marketplace.json` must live **inside the marketplace repo itself**, since that same URL supplies the slug.
3. `metadata.name` must equal the `name` field inside that `marketplace.json`, because it becomes the `@<marketplace>` half of `/plugin install <plugin>@<name>` and the key in the team `extraKnownMarketplaces` snippet.

The body **is** `marketplace.json` itself — the manifest users register (`/plugin marketplace add owner/repo`), not a doc written about it.

Only `claude-code` and `github-copilot` have a marketplace concept. Declaring only Cursor or Gemini yields no add commands; `all` or an empty list expands to both capable hosts.

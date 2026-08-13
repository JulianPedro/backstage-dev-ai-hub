# Per-type rules

Apply the one section matching this resource's `spec.type`.

Two rules hold across every type. Annotations the hub does not render are noted where they exist — write them for other consumers if you like, but do not promise the user they will appear. And a deep link is generated only for frameworks the resource itself declared, so a narrow `compatible-frameworks` list narrows the buttons.

## skill

The only type with native spec fields:

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

**`spec.agents` overrides the annotation.** When it is present and non-empty, framework resolution reads it and ignores `devaihub.io/compatible-frameworks` entirely. Two lists that disagree is a bug the hub cannot warn you about — either keep them identical or write only `spec.agents`. An empty or absent `agents` falls back to the annotation.

`disciplines`, `categories`, `usecases` and `allowedTools` reach the catalog but not the hub — nothing renders them.

A skill body is usually a directory: end `source-location` with `/` and put a `SKILL.md` at the tree root. This is the one type multi-file suits — every host installs a skill as a directory, so the tree lands intact.

Installs drop-in, one directory per host: `.claude/skills/<name>/`, `.github/skills/<name>/`, `.gemini/skills/<name>/`, `.cursor/skills/<name>/`, `.opencode/skills/<name>/`, and `.agents/skills/<name>/` when no framework is declared. Claude and Cursor also get one-click prompt launchers. OpenCode's Desktop app *does* register an `opencode://` handler (`open-project`, `new-session?prompt=`), but every route requires a `directory` param — an absolute local path we have no way to supply from a web page — so it gets the path only, same as a CLI-only host.

## agent

No native spec fields — frameworks come only from `devaihub.io/compatible-frameworks`.

**VS Code's install buttons need a GitHub blob URL.** They are derived by rewriting `source-location` into a raw URL, which requires the `/blob/<ref>/<path>` form on `github.com`. A `tree/` URL, a raw URL, or any other host yields no VS Code buttons — copy and download still work.

Installs drop-in as a single file: `.claude/agents/<name>.md`, `.github/agents/<name>.agent.md`, `.gemini/agents/<name>.md`, `.cursor/rules/<name>.mdc`, `.opencode/agents/<name>.md`, else `.ai/agents/<name>.md`.

Keep the body a single file. Every install target above is one `.md`, and the raw-URL rewrite that powers the VS Code buttons needs a `/blob/` file URL — a tree `source-location` costs you the buttons and leaves the remaining hosts instructed to save a directory into a file.

`devaihub.io/role` is not rendered.

## hook

No native spec fields. `devaihub.io/hook-event` and `devaihub.io/hook-matcher` are conventional but render nowhere.

Installs **merge** everywhere except Copilot: `.claude/settings.json`, `.gemini/settings.json` and `.cursor/hooks.json` are files the user already owns, so the generated prompt asks the agent to merge and keep existing settings intact. Only `github-copilot` is drop-in, at `.github/hooks/<name>.json`.

Write the body as a single-file fragment that merges cleanly — a whole settings file as the body invites a reader to overwrite their own, and a tree has nothing coherent to merge.

There is no neutral fallback: a hook declaring no framework, or only unknown ones, produces no install rows at all. Declare at least one real host.

**OpenCode has no row here at all.** It has no declarative hook config — hooks are exclusively JS/TS plugin modules, a different body shape entirely than this type's markdown fragment. Declaring `opencode` on a `hook` resource is a claim the hub cannot honour: it produces no install row and the badge shows compatibility the body can't deliver.

## mcp-config

The body **is** the install artifact: the JSON snippet merged into the user's MCP config. Transport and endpoint live only there — no annotation carries them, deliberately, so nothing can drift from the body.

Installs merge at `.mcp.json`, `.vscode/mcp.json`, `.gemini/settings.json`, `.cursor/mcp.json`, `opencode.json`.

**OpenCode's own JSON shape differs** from the `mcpServers`/bare `command`/`url` convention this body follows — OpenCode expects `{ "mcp": { "<name>": { "type": "local"|"remote", ... } } }`. There's no transform: the generated install prompt asks the target agent to merge and adapt the body into its own config, the same as every other merge-mode row. OpenCode gets no one-click link either way: no link handler is wired for it, and even the Desktop app's real `opencode://` scheme couldn't help here — it launches sessions, not MCP config merges, and every one of its routes needs an absolute local `directory` a web page can't supply.

**Keep the body a single `.json` file.** A tree fails twice over: entry-file resolution considers only `.md`, so viewing returns `404 Resource body has no entry file`, and with no body content to parse there are no one-click links on any host.

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

A pointer, not content: a plugin installs through its host's own plugin system, so it has **no filesystem install path and no download** — offering one would hand the user an instructions document dressed up as the plugin. The body is markdown carrying per-framework install guidance, and it stays copyable.

Point `source-location` at that markdown doc.

`devaihub.io/plugin-manifest` is not rendered. A plugin lists no children — see the containment note in `SKILL.md`.

## marketplace

A distribution point, registered rather than fetched: **no download and no copy**. The actionable snippets each carry their own copy button, generated from the entity.

Three rules, and breaking any one degrades the dialog to the rendered body alone:

1. `source-location` must be a `github.com` URL — the `owner/repo` slug is derived from it to build `/plugin marketplace add owner/repo`.
2. The body doc must live **inside the marketplace repo itself**, since that same URL supplies the slug.
3. `metadata.name` must equal the `name` field in the repo's `.claude-plugin/marketplace.json`, because it becomes the `@<marketplace>` half of `/plugin install <plugin>@<name>` and the key in the team `extraKnownMarketplaces` snippet.

The body is a markdown doc about the marketplace — never the `marketplace.json` manifest, which users register rather than copy.

Only `claude-code` and `github-copilot` have a marketplace concept. Declaring only Cursor or Gemini yields no add commands; `all` or an empty list expands to both capable hosts.

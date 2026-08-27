# @nospt/plugin-dev-ai-hub

The frontend half of **Dev AI Hub** — a catalog-backed browser for AI assets usable by GitHub Copilot, Claude Code, Google Gemini, Cursor and other AI coding tools.

> **Requires Backstage 1.54 or later.** The `AiResource` kind comes from Backstage's own alpha catalog module, and these packages depend on `@backstage/catalog-model@^1.10.0` — first shipped in 1.54.0, along with the `plugin` and `marketplace` subtypes.

![The Dev AI Hub browse page](https://raw.githubusercontent.com/nosportugal/backstage-plugin-dev-ai-hub/main-nos/docs/screenshot.png)

## What it is

Teams accumulate AI assets — a prompt that writes good commit messages, an agent that reviews code, an MCP server config for Grafana — and they end up scattered across repos, wikis and chat threads. Dev AI Hub gives them one page in Backstage, with the catalog as the source of truth.

Six kinds of resource, each with its own install path:

| Type | What it is |
|---|---|
| `skill` | Reusable instructions an AI tool loads on demand |
| `agent` | A specialised assistant with its own system prompt |
| `hook` | Something that runs on a tool event, e.g. lint after an edit |
| `mcp-config` | An MCP server configuration to merge into your tool |
| `plugin` | A bundle of the above, installed from a marketplace |
| `marketplace` | A catalog of plugins you register with your tool once |

## What a user does with it

1. **Browses** — type tiles double as filters; search covers name, description and tags; further filters narrow by AI tool and tag.
2. **Opens a resource** — a drawer shows the metadata plus the body, resolved on demand from wherever it lives in Git. Markdown is rendered; an `mcp-config` is shown as copyable JSON.
3. **Installs it** — the dialog gives per-framework install paths, a copy button, a download where the body *is* the artifact, and one-click launchers where the tool has a URL handler.

Every resource opened or installed is counted, so the cards can show what colleagues actually use.

## Install

```bash
yarn --cwd packages/app add @nospt/plugin-dev-ai-hub
```

This plugin uses the Backstage **New Frontend System**. In `packages/app/src/App.tsx`:

```typescript
import { devAiHubPlugin } from '@nospt/plugin-dev-ai-hub';

export const app = createApp({
  features: [
    // ...existing features
    devAiHubPlugin,
  ],
});
```

The sidebar item and the `/dev-ai-hub` route register themselves.

### You also need

- **[`@nospt/plugin-dev-ai-hub-backend`](https://www.npmjs.com/package/@nospt/plugin-dev-ai-hub-backend)** — the page has nothing to show without it.
- **`@backstage/plugin-catalog-backend-module-ai-model`** — provides the `AiResource` kind.
- **`AiResource` allow-listed** in your `catalog.rules`, and at least one entity registered.

All three are covered in the [repository README](https://github.com/nosportugal/backstage-plugin-dev-ai-hub#readme), which is the single place kept current.

## Troubleshooting

| Symptom | Usually means |
|---|---|
| The page loads but says "Register AiResource entities…" | The catalog has no `AiResource` entities — or they were rejected because the kind is not in `catalog.rules` |
| "Could not load resources" | The backend plugin is not registered, or the request is unauthenticated |
| Components render unstyled | `@backstage/ui/css/styles.css` is not imported in `packages/app/src/index.tsx` — apps scaffolded by a current `create-app` already do this |
| A resource is listed but has no install actions | It publishes no `backstage.io/source-location`, so it is browsable but not installable |

## License

Apache-2.0

# NOS Plugin Marketplace

Curated marketplace of approved NOS plugins for AI coding tools. A marketplace
is a catalog you register with your tool once — after that you can browse and
install any of its plugins.

## 1. Add the marketplace

**Claude Code**

```
/plugin marketplace add nosportugal/backstage-plugin-dev-ai-hub
```

**GitHub Copilot CLI**

```
copilot plugin marketplace add nosportugal/backstage-plugin-dev-ai-hub
```

## 2. Install plugins from it

```
/plugin install secure-dev-bundle@nos-plugin-marketplace
```

Browse everything it offers with `/plugin` (Claude Code, Discover tab) or
`copilot plugin marketplace browse nos-plugin-marketplace` (Copilot CLI).

## For teams

Commit this to your repository's `.claude/settings.json` and collaborators are
prompted to install the marketplace automatically when they trust the folder:

```json
{
  "extraKnownMarketplaces": {
    "nos-plugin-marketplace": {
      "source": {
        "source": "github",
        "repo": "nosportugal/backstage-plugin-dev-ai-hub"
      }
    }
  }
}
```

## Included plugins

- **secure-dev-bundle** — approved GitHub workflows skill, security threat
  modeller agent, post-edit lint hook, and the Grafana MCP config in one
  package.

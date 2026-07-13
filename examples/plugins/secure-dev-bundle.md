# Secure Development Bundle

A Claude Code plugin that bundles the approved-github-workflows skill, the
security-threat-modeller agent, the post-edit-lint hook, and the grafana-mcp
server into one installable package for secure development workflows.

## Install

### Claude Code

```
/plugin marketplace add nosportugal/backstage-plugin-dev-ai-hub
/plugin install secure-dev-bundle
```

### GitHub Copilot

Copilot has no bundle format yet — install the pieces individually from the
DevAI Hub catalog (each bundled resource lists its own Copilot install path).

## Contents

| Resource | Type |
|----------|------|
| approved-github-workflows | skill |
| security-threat-modeller | agent |
| post-edit-lint | hook |
| grafana-mcp | mcp |

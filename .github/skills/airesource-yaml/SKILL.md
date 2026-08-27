---
name: airesource-yaml
description: Writes AiResource catalog YAML that Dev AI Hub renders. Use when the user wants to publish a skill, agent, hook, mcp-config, plugin, or marketplace to the hub, or when a resource they authored never showed up.
---

# AiResource YAML

Dev AI Hub reads exactly one thing: `AiResource` entities in the Backstage catalog. It never scans Git and has no ingestion path (ADR-0004) — a resource appears in the hub because someone hand-wrote its entity and pointed a `Location` at it.

Every mistake here is a **drop**: the entity is discarded with no error in any log, response, or UI. The producer sees an empty grid and no explanation. So the job is not to write plausible YAML — it is to clear each drop gate deliberately.

## 1. Establish the type and the body

Two facts decide everything downstream.

**Type** — exactly one of `skill`, `agent`, `hook`, `mcp-config`, `plugin`, `marketplace`. Any other value is a drop. Note `mcp-config`, not `mcp`.

**Body** — the content a user installs. It lives in Git; the entity only points at it. The body is type-shaped: markdown for `skill` and `agent`; JSON for `hook`, `mcp-config`, `plugin`, and `marketplace` — `hook` and `mcp-config` are settings fragments merged into a host config file, while `plugin` and `marketplace` point at the manifest itself (`plugin.json`, `marketplace.json`), not a doc about it.

Ask the user for the body's URL if you don't have it. Do not invent one — a `source-location` that 404s produces a resource that browses but cannot be installed, which is worse than an absent one.

Done when the type is one of the six and you hold a URL that actually resolves to the body.

## 2. Write the entity

Every type shares this shape:

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: approved-github-workflows
  title: Approved GitHub Workflows
  description: One line; shown on the card and matched by search.
  tags: [security, github]
  annotations:
    github.com/project-slug: org/repo
    backstage.io/source-location: url:https://github.com/org/repo/blob/main/skills/body.md
spec:
  type: skill
  lifecycle: production
  owner: group:ai-platform-team
  agents: [claude-code, github-copilot]
```

`kind`, `apiVersion`, `spec.type` and `metadata.name` are the drop gates on every type. `plugin` and `marketplace` each carry one more — a required list of what they contain (`TYPES.md`). The rest degrades rather than drops:

| Field | Omitted → |
|---|---|
| `metadata.name` | Catalog rejects the entity outright (kebab-case, unique per namespace). |
| `spec.lifecycle` | Empty string on the card. |
| `spec.owner` | Card shows no owner. |
| `backstage.io/source-location` | No body, no install, no download. Browsable only. |
| `metadata.title` | `name` is displayed instead. |
| `metadata.description` | No description, and search cannot match it. |
| `spec.version` | No version chip on the card. Native field on every type — the `devaihub.io/version` annotation it replaced is no longer read, so YAML copied from an older example loses its chip. |
| `devaihub.io/compatible-frameworks` (and no `spec.agents` either) | No framework badges. `skill` falls back to `.agents/skills/<name>/`; `agent` falls back to `.ai/agents/<name>.md`; `hook` and `mcp-config` produce no install rows at all; `plugin` and `marketplace` are unaffected — they never had a filesystem install path. |

### project-slug

Set `github.com/project-slug` to the `owner/repo` the body lives in — it's what turns on the GitHub features (commit history, issues, PRs) on the entity page. It's a separate annotation from `source-location`, not derived from it, so write both. When every resource in the repo points at bodies inside that same repo, it's the same value on every entity.

### source-location

The `url:` prefix is **mandatory** — the resolver strips it and returns nothing without it, so a bare `https://…` yields no body at all.

The trailing slash is load-bearing:

- **ends in `/`** → directory body, read as one subtree.
- **anything else** → single-file body.

### Multi-file bodies

A tree is served two ways, and each fails on its own terms.

**Viewing** resolves an *entry file*, picked only from `.md` files at their tree-relative paths: the tree's single `.md`, else exactly `SKILL.md`, else `<dirname>.md`. Miss all three — several `.md` files under other names, a nested `docs/SKILL.md`, or a tree carrying no markdown — and the body returns `404 Resource body has no entry file`. The card still lists and the zip still downloads; the body simply cannot be read. `SKILL.md` is matched as an exact path, so it must sit at the tree root.

**Downloading** zips the whole tree — except a tree holding exactly one file, which downloads as that bare file.

A tree only truly fits `skill`, the one type whose install target is a directory on every host. Every other type installs to a single file or merges into a settings file, so a directory body produces install instructions that collapse a whole tree into one file. Check the type's section in `TYPES.md` before reaching for a tree.

### compatible-frameworks

Comma-separated. `claude` → `claude-code`, `copilot` → `github-copilot`, `gemini` → `google-gemini`; `cursor` is itself. `all` is a wildcard over every host. Unknown tokens pass through literally and simply match nothing.

The list is a compatibility claim, and the UI believes it: install paths and one-click launchers are generated only for the frameworks named here. Declaring a host the body does not support tells the user something untrue.

**A `spec.agents` array is read before the annotation, on any type — not just `skill`:**

```yaml
spec:
  type: agent   # or any of the six
  agents: [claude-code, github-copilot]
```

When present and non-empty, `spec.agents` wins and `devaihub.io/compatible-frameworks` is ignored entirely; an empty or absent `spec.agents` falls back to the annotation. Prefer `spec.agents` when the producer would rather not depend on the `devaihub.io/*` annotation namespace, since it lives on the entity itself rather than in a namespace the hub could retire. See `TYPES.md` for the per-type detail.

Done when the entity carries all three gates, a `url:`-prefixed `source-location` whose trailing slash matches the body's shape, and a framework list you can defend.

## 3. Register the location

Writing the file is not enough — the catalog only reads entities that a `Location` targets. This repo's entry point is `.backstage.yaml` at the repo root: a `Location` whose `spec.targets` lists every `AiResource` file. Not there, or not on that list, and the entity is dropped before the catalog ever sees it — same failure as a missing `url:` prefix, just one level up.

Check the repo root for `.backstage.yaml`.

- **Missing** → create it. Target every `AiResource` file already in the repo, not just the one you just wrote — a second author's `.backstage.yaml` must not orphan the first author's entities.
- **Present** → add this entity's path to `spec.targets` if it's absent. Leave every other target as-is.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: ai-resources
spec:
  targets:
    - ./.backstage/approved-github-workflows.yaml
    - ./.backstage/incident-response-agent.yaml
```

Do not add a `spec.rules` block here — nothing confirms this org resolves the "allow list of the location" gate 9 mentions that way. In standard Backstage that allow list is set where the host app registers this repo as a location (its own `catalog.locations[].rules`), not inside the Location entity committed here. That config lives outside this repo and outside this skill's reach.

Done when `.backstage.yaml` exists at the repo root and its `targets` list names every `AiResource` file the repo carries, this one included.

## 4. Apply the type's own rules

Each type adds its own fields, install mechanics, and ways to silently lose functionality. Read `TYPES.md` in this skill folder and apply the section for this resource's type.

Done when every rule in that type's section is either satisfied or explicitly reported to the user as knowingly skipped.

## 5. Verify

Walk the entity against each gate and name a verdict for every line — a gate you didn't check is a gate you failed.

1. `kind: AiResource` — the backend filters on this exact string and reads nothing else.
2. `apiVersion: backstage.io/v1alpha1`.
3. `spec.type` is one of the six tokens, spelled exactly.
4. `metadata.name` is kebab-case and unique in its namespace.
5. `github.com/project-slug` is set to the `owner/repo` the body lives in.
6. `source-location` starts with `url:`, and its trailing slash matches the body's shape.
7. The URL resolves, and the thing behind it is the body — not a repo root, not a README about the body.
8. Framework tokens are spelled per the alias table — in `spec.agents` if you wrote one (it wins over the annotation on every type), otherwise in `devaihub.io/compatible-frameworks`.
9. Every rule from the type's `TYPES.md` section is satisfied.
10. `.backstage.yaml` targets this file — step 3 fixes that half. The host Backstage app must separately allow-list `AiResource`, both in its global `catalog.rules` and in the `rules` it applies to this repo's location; that config lives outside this repo and outside what this skill can fix, so if the resource is still missing after step 3, tell the user to check it there. Missing either half is the single most common cause of "I wrote the YAML and nothing appeared" — the entity never enters the catalog, so the hub cannot drop it, it never sees it.

Then state to the user which of the six types you wrote, where the body lives, and which frameworks will show install instructions.

## Containment renders nowhere

`plugin` and `marketplace` must declare what they contain or the catalog rejects them (`TYPES.md`) — but the hub renders none of it. `childCount` is never populated and `devaihub.io/parent` is read by nothing, so a `plugin` shows no child list and a child shows no parent.

Write the required field because omitting it is a drop, never because it will list children in the UI.

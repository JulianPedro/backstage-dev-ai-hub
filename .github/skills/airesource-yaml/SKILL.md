---
name: airesource-yaml
description: Writes AiResource catalog YAML that Dev AI Hub renders. Use when the user wants to publish a skill, agent, hook, mcp-config, plugin, or marketplace to the hub, or when a resource they authored never showed up.
---

# AiResource YAML

Dev AI Hub reads exactly one thing: `AiResource` entities in the Backstage catalog. It never scans Git and has no ingestion path (ADR-0004) — a resource appears in the hub because someone hand-wrote its entity.

Every mistake here is a **drop**: the entity is discarded with no error in any log, response, or UI. The producer sees an empty grid and no explanation. So the job is not to write plausible YAML — it is to clear each drop gate deliberately.

## 1. Establish the type and the body

Two facts decide everything downstream.

**Type** — exactly one of `skill`, `agent`, `hook`, `mcp-config`, `plugin`, `marketplace`. Any other value is a drop. Note `mcp-config`, not `mcp`.

**Body** — the content a user installs. It lives in Git; the entity only points at it. The body is type-shaped: markdown for every type except `mcp-config`, whose body is JSON.

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
    backstage.io/source-location: url:https://github.com/org/repo/blob/main/skills/body.md
    devaihub.io/compatible-frameworks: claude-code,github-copilot
    devaihub.io/version: 1.0.0
spec:
  type: skill
  lifecycle: production
  owner: group:ai-platform-team
```

`kind`, `apiVersion` and `spec.type` are the drop gates. The rest degrades rather than drops:

| Field | Omitted → |
|---|---|
| `metadata.name` | Catalog rejects the entity outright (kebab-case, unique per namespace). |
| `spec.lifecycle` | Empty string on the card. |
| `spec.owner` | Card shows no owner. |
| `backstage.io/source-location` | No body, no install, no download. Browsable only. |
| `metadata.title` | `name` is displayed instead. |
| `metadata.description` | No description, and search cannot match it. |
| `devaihub.io/compatible-frameworks` | No framework badges; install falls back to neutral `.agents/` paths. |

`spec.owner` accepts either the short `group:ai-platform-team` or the full `group:default/ai-platform-team` — both are normalised to the canonical ref, which is what the detail panel displays.

### description and tags carry discovery

Search matches `name`, `title`, `description` and `tags` — and nothing else. Owner, type and framework are invisible to it, so the description is where a resource earns its way into results: write the words a colleague would actually type, not a restatement of the title.

Tags do three jobs at once, which makes over-tagging costly. They populate the filter list, they are combined with **AND** (selecting two tags shows only resources carrying both), and the card renders **only the first three** before collapsing the rest into a `+N`. Lead with the tags that discriminate, and keep the list short.

`lifecycle` renders on the card but cannot be filtered on — it informs a reader who already found the resource, it does not help them find it.

### source-location

The `url:` prefix is **mandatory** — the resolver strips it and returns nothing without it, so a bare `https://…` yields no body at all.

The trailing slash is load-bearing:

- **ends in `/`** → directory body, read as one subtree.
- **anything else** → single-file body.

### Multi-file bodies

A tree is served two ways, and each fails on its own terms.

**Viewing** resolves an *entry file*, picked only from `.md` files at their tree-relative paths: the tree's single `.md`, else exactly `SKILL.md`, else `<dirname>.md`. Miss all three — several `.md` files under other names, a nested `docs/SKILL.md`, or a tree carrying no markdown — and the body returns `404 Resource body has no entry file`. The card still lists and the zip still downloads; the body simply cannot be read. `SKILL.md` is matched as an exact path, so it must sit at the tree root.

**Downloading** zips the whole tree — except a tree holding exactly one file, which downloads as that bare file.

A tree only truly fits `skill`, the one type whose install target is a directory on every host. Every other type installs to a single file or merges into a settings file, so a directory body produces install instructions that save a whole tree into one `.md`. Check the type's section in `TYPES.md` before reaching for a tree.

### compatible-frameworks

Comma-separated. `claude` → `claude-code`, `copilot` → `github-copilot`, `gemini` → `google-gemini`; `cursor` and `opencode` are themselves. `all` is a wildcard over every host. Unknown tokens pass through literally and simply match nothing.

The list is a compatibility claim, and the UI believes it: install paths and one-click launchers are generated only for the frameworks named here. Declaring a host the body does not support tells the user something untrue.

Done when the entity carries all three gates, a `url:`-prefixed `source-location` whose trailing slash matches the body's shape, and a framework list you can defend.

## 3. Apply the type's own rules

Each type adds its own fields, install mechanics, and ways to silently lose functionality. Read `TYPES.md` in this skill folder and apply the section for this resource's type.

Done when every rule in that type's section is either satisfied or explicitly reported to the user as knowingly skipped.

## 4. Land it in the catalog

A valid entity in a Git repo is still invisible. Three things have to be true of the surrounding Backstage app, and none of them are inspectable from the YAML.

**Registered.** Something must point the catalog at the file. The convention in this repo is a `Location` entity listing one file per resource:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: ai-resources
spec:
  targets:
    - ./skill-approved-github-workflows.yaml
    - ./mcp-grafana.yaml
```

The alternative is a `catalog.locations` entry in the app's `app-config.yaml`. Either way the kind must be allow-listed twice: in `catalog.rules`, and in the `allow` list of the location carrying the entity. Miss the allow-list and the entity never enters the catalog at all — the hub cannot drop what it never receives.

**Reachable by the backend, not by you.** Bodies are fetched server-side through the configured integration, which is commonly scoped to one org (`allowedInstallationOwners`). A `source-location` in a personal repo, or in an org the Backstage GitHub app cannot read, gives a perfect entity whose body fails at request time. Confirm the body's repo sits inside the integration's reach.

**Given time.** The catalog re-processes on an interval that defaults to a random 100–150s per entity, so a new or edited entity is not visible immediately.

That interval governs metadata only. Bodies are read live on every request, which produces an asymmetry worth knowing:

- editing the **body** in Git → visible on the next view, immediately;
- editing the **entity** YAML → waits for the next processing cycle.

Done when the entity is registered by a location the app loads, its body repo is inside the integration's reach, and the user knows how long to wait before looking.

## 5. Verify

Walk the entity against each gate and name a verdict for every line — a gate you didn't check is a gate you failed.

1. `kind: AiResource` — the backend filters on this exact string and reads nothing else.
2. `apiVersion: backstage.io/v1alpha1`.
3. `spec.type` is one of the six tokens, spelled exactly.
4. `metadata.name` is kebab-case and unique in its namespace.
5. `source-location` starts with `url:`, and its trailing slash matches the body's shape.
6. If it is a tree, the type is `skill` and an entry file resolves — a root-level `SKILL.md`, the tree's only `.md`, or `<dirname>.md`.
7. The URL resolves, and the thing behind it is the body — not a repo root, not a README about the body.
8. Framework tokens are spelled per the alias table.
9. Every rule from the type's `TYPES.md` section is satisfied.
10. All three landing conditions from step 4 hold: registered, allow-listed, and inside the integration's reach.

Then state to the user which of the six types you wrote, where the body lives, which frameworks will show install instructions, and how long the catalog will take to pick it up.

If a resource still does not appear, work `TROUBLESHOOTING.md` in order rather than guessing — every stage of this pipeline fails silently, so the symptom is identical whichever one broke.

## Containment is inert

`spec.dependsOn` and `devaihub.io/parent` are read by nothing today. The backend never resolves either, and `childCount` is never populated, so a `plugin` renders no child list and a child shows no parent — regardless of what you write.

Author them if you want the YAML ready for when containment ships, but never tell a user their plugin will list its children.

# It isn't showing up

Every stage between a YAML file and a rendered card fails silently, so the symptom — an empty grid, or one card short — is identical whichever stage broke. Guessing therefore costs more than it saves.

Work the stages in order. Each one asks a question that rules out everything above it, so the first failing answer is the cause and the rest of the file does not apply.

## 1. Has enough time passed?

The catalog re-processes on an interval defaulting to a **random 100–150s per entity**. A brand-new or just-edited entity is expected to be absent before then.

Rule this out first — it is the most common cause and the only one that resolves itself. If the user has been waiting less than three minutes, wait.

Remember the asymmetry: **body** edits appear on the next view, **entity** edits wait for the cycle. "I changed the description and nothing happened" is this stage; "I changed the markdown and nothing happened" is not, and jumps to stage 5.

## 2. Is the entity in the catalog at all?

Search the catalog UI for the entity name, or fetch it directly by ref (`airesource:default/<name>`).

**Found** → the entity landed; the hub is dropping or hiding it. Skip to stage 4.

**Not found** → it never arrived, and stage 3 is the cause. The hub is not involved: it can only drop what it receives.

## 3. Why did it never arrive?

Three candidates, cheapest first.

**Not allow-listed.** `AiResource` must appear in `catalog.rules`, *and* in the `allow` list of the location that carries the entity. Both, not either. A location that allows only `Component` discards an `AiResource` without comment.

**Not registered.** Something has to point the catalog at the file — a `Location` entity listing it in `spec.targets`, or a `catalog.locations` entry in `app-config.yaml`. A file committed to a repo nobody registered is invisible. Check that the location's target path actually resolves to this file; a renamed or moved file leaves the old target 404ing.

**Rejected on validation.** A malformed `metadata.name` (not kebab-case, or not unique in its namespace) or absent required fields make the catalog reject the entity outright. Unlike the other failures this one is usually visible — check the catalog's processing errors for the location.

## 4. Why is it in the catalog but not in the hub?

**`spec.type` is not one of the six.** This is the drop. `mcp` instead of `mcp-config`, a typo, a plural, a type someone invented — the entity maps to nothing and is filtered out with no log line. Compare the value character by character against `skill`, `agent`, `hook`, `mcp-config`, `plugin`, `marketplace`.

**`kind` is not exactly `AiResource`.** The backend filters on that string. A `Component` carrying a perfect `spec.type` is never fetched.

**Filters are hiding it.** The page filters on type, framework and tags, and tags combine with **AND**. A resource declaring only `cursor` vanishes under a `claude-code` filter, and two selected tags hide anything missing either. Clear the filters before concluding anything.

**Catalog visibility.** Body and entity reads run as the calling user, so a resource whose entity the user cannot see is genuinely absent for them and present for an admin. If it appears for one person and not another, this is why.

## 5. It appears, but the body fails

The entity is fine; the fetch is not. Distinguish by what the panel says.

**"No content location published"** → no `backstage.io/source-location`, or it lacks the mandatory `url:` prefix. A bare `https://…` reads as no location at all.

**A 404 on the body** → the target does not resolve. Either the URL is wrong, or — for a directory target — no entry file could be picked: entry resolution considers only `.md`, at the tree root, named as the tree's single `.md`, exactly `SKILL.md`, or `<dirname>.md`. A tree of `.json` always 404s on view while still downloading as a zip.

**A 502, or a 404 on a URL that works in your browser** → the backend cannot reach it. Bodies are fetched server-side through the configured integration, commonly scoped to one org via `allowedInstallationOwners`. A body in a personal repo, another org, or a private repo the Backstage app was never installed on fails here. That the author can open the URL proves nothing — the author is not who fetches it.

## 6. It renders, but an install action is missing

Not a bug; the actions are derived, and each has a precondition. Check the resource's section in `TYPES.md` — the usual causes are a framework the resource never declared, an `agent` or `marketplace` whose `source-location` is not a GitHub URL of the right shape, or an `mcp-config` whose body is not a single-server JSON document.

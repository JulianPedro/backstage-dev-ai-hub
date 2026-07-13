---
name: approved-github-workflows
description: Ensures all GitHub Actions workflows are reviewed and approved before execution. Covers CI/CD hardening and security gate patterns. Use when authoring or reviewing GitHub Actions workflows, or when the user mentions workflow approval, CI/CD security, or supply-chain hardening.
---

# Approved GitHub Workflows

Apply these rules whenever you create or modify a GitHub Actions workflow.

## Rules

1. **Pin every action to a full commit SHA** — never a mutable tag or branch.
2. **Set explicit `permissions`** on every workflow and job; default to `contents: read`.
3. **No `pull_request_target` with checkout of untrusted code.** If the trigger is
   needed, gate it behind a label applied by a maintainer.
4. **Secrets never flow to forks.** Guard secret-using jobs with
   `if: github.event.pull_request.head.repo.full_name == github.repository`.
5. **Third-party actions require prior approval.** Check the allowlist in
   `references/workflow-checklist.md` before introducing a new action.

## Review flow

Before proposing a workflow change, walk through the checklist in
[references/workflow-checklist.md](references/workflow-checklist.md) and include
the filled-in checklist in the pull request description.

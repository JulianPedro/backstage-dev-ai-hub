# Workflow approval checklist

Copy this into the pull request description and tick every line.

- [ ] All actions pinned to a full commit SHA
- [ ] `permissions` block present on the workflow and every job
- [ ] No `pull_request_target` + untrusted checkout combination
- [ ] Secret-using jobs guarded against fork PRs
- [ ] Every third-party action is on the approved allowlist below

## Approved third-party actions

| Action | Pinned SHA prefix | Approved by |
|--------|-------------------|-------------|
| `actions/checkout` | any official release SHA | platform team |
| `actions/setup-node` | any official release SHA | platform team |
| `docker/build-push-action` | `4f58ea7` or later | security team |

To add an action to this list, open an issue with the `workflow-approval` label.

# Post-Edit Lint Hook

A `PostToolUse` hook that runs the project linter after any file edit, catching
style and syntax errors before they reach review.

## Configuration

Merge this into the `hooks` section of your `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx lint-staged --quiet || echo 'lint failed — fix before committing'"
          }
        ]
      }
    ]
  }
}
```

## Notes

- The command must exit fast; lint only the files just touched (`lint-staged`
  does this out of the box).
- Adjust the `matcher` if your workflow uses other editing tools.

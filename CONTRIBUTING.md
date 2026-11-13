# Contributing

This is currently a solo project, so there are no outside contributors yet.
Feedback and ideas are still welcome through GitHub issues.

The workflow is:

1. Branch from `main` (one short-lived branch per change).
2. Keep changes small and focused.
3. Run `npm run check` locally before pushing (format, lint, typecheck, tests,
   build, overview and valley map checks).
4. Open a pull request into `main`. CI must pass before merge.

## Setup

Requires Node 22 and npm.

```sh
npm ci        # install dependencies
npm run dev   # run the game locally
npm run check # all checks, as CI runs them
```

## Conventions

- Conventional Commits (for example `feat: ...`, `fix: ...`, `chore: ...`,
  `docs: ...`).
- No em dashes in code, comments, docs, commit messages, or user-facing text.
- See `CLAUDE.md` for the full working rules and `docs/` for design notes and
  decision records.

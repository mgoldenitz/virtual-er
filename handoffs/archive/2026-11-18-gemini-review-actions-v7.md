# Gemini review: GitHub Actions v4 to v7

Model: Gemini Hydrogen 4, High, in a new chat.

## Question

Find problems in this change. Do not confirm it; list each way it can fail.

The project is a Next.js app. `.github/workflows/checks.yml` runs `npm ci`, `npm test`, `npm run lint` and `npm run build` on every push and pull request. GitHub showed this warning on run 44443926798 (2026-11-19 UTC): "Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4."

The change moves both actions to v7 (latest releases: `actions/checkout` v7.0.1, 2026-07-20; `actions/setup-node` v7.1.0, 2026-10-08). The `action.yml` of both at `v7` says `using: node24`. Breaking changes read from the release notes: setup-node v6 limits automatic caching to npm; setup-node v7 moves to ESM and removes the dummy `NODE_AUTH_TOKEN` export; checkout v6 keeps the saved credentials in a separate file.

Questions:
1. Does any of those breaking changes affect this workflow?
2. Is a major tag (`@v7`) enough here, or should it be pinned to a commit SHA? The repo is a student prototype with `permissions: contents: read` and no secrets in the workflow.
3. Anything else in the file that is wrong or out of date?

## Diff (`.github/workflows/checks.yml`, 34 lines after the change)

```diff
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
+      # v7 of both runs on Node.js 24 (v4 ran on Node.js 20, which GitHub deprecated).
+      - uses: actions/checkout@v7
+      - uses: actions/setup-node@v7
```

(The two `@v4` lines are removed.)

## Whole file after the change

```yaml
name: Checks

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      # v7 of both runs on Node.js 24 (v4 ran on Node.js 20, which GitHub deprecated).
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Unit tests
        run: npm test
      - name: Lint
        run: npm run lint
      - name: Build
        run: npm run build
        env:
          # Placeholders, not real values.
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_placeholder
```

## Checked

- Local `npm test`: 72 test files, 417 tests pass. `npm run lint`: passed. `npm run build`: passed (2026-11-18, after commit `958604d`).

## Not checked

- A GitHub Actions run with v7 (needs a push; not pushed yet).

## Response

Skipped by the owner on 2026-11-18 (GitHub run 44445773244 passed with v7).

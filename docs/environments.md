# Environments and Promotion

This project is local-first software, so "environment" means release confidence and GitHub Actions gates rather than a hosted server.

## Branches

- `develop`: active feature work, including the selective-download UI.
- `staging`: release-candidate validation.
- `main`: production-ready public code.

## Release Channels

- `vX.Y.Z-rc.N`: staging prerelease.
- `vX.Y.Z`: production release.

## Required Gates

Every pull request and release candidate should pass:

```bash
npm ci
npm run check
npm test
npm run sanitize:check
npm run compliance:check
npm audit --audit-level=low
```

GitHub Actions also runs CodeQL analysis for JavaScript.

## Recommended GitHub Settings

For `main` and `staging`, enable branch protection with:

- Require pull request before merging.
- Require status checks to pass.
- Require the `CI / Node 20.x`, `CI / Node 22.x`, and `CodeQL` checks.
- Require conversation resolution before merge.
- Restrict direct pushes to maintainers.

For the `production` environment, require manual approval before release publishing.

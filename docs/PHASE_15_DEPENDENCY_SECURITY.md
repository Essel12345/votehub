# Phase 15 Dependency Security Review

**Audit date:** 2026-08-19  
**Scope:** Dependency audit and safe remediation only  
**Deployment:** Not performed  
**Production changes:** None

## Executive Summary

`npm audit` found one vulnerability family reported as three high-severity findings. All findings resolve to the same dependency path:

`prisma@6.19.3` -> `@prisma/config@6.19.3` -> `deepmerge-ts@7.1.5`.

No dependency upgrade was applied. `npm audit fix --force` was not run. No major dependency was upgraded. The prepared Upstash rate-limit integration does not add a package dependency.

## Vulnerabilities Found

| Package | Installed version | Vulnerable range | Severity | Dependency path | Runtime classification |
|---|---:|---|---|---|---|
| `deepmerge-ts` | `7.1.5` | `<8.0.0` | High | `prisma@6.19.3` -> `@prisma/config@6.19.3` -> `deepmerge-ts@7.1.5` | Prisma config/CLI dependency; not imported by observed application request handlers |

NPM reports three high-severity instances for this same vulnerability family. The audit advisory describes recursive object graph stack exhaustion. The report does not identify three distinct package families or three distinct application call paths.

## Direct Use and Production Impact

The application source does not directly import `@prisma/client`, `prisma`, or `PrismaClient`. The repository contains ignored generated Prisma client output, but the installed vulnerable package is pulled through Prisma configuration tooling.

Impact assessment:

- **Voting request handling:** No direct vulnerable-package call path was found.
- **Authentication/authorization:** No direct vulnerable-package call path was found.
- **Rate limiting:** No dependency relationship; the prepared Upstash REST adapter uses built-in `fetch`.
- **Build/development operations:** Prisma configuration and migration tooling load the affected dependency path.
- **Production runtime:** The package remains in the declared installed dependency tree and cannot be treated as resolved solely because the observed request handlers do not import it.

This reduces observed application exposure but does not eliminate the dependency finding.

## Patch Availability and Fix Assessment

`deepmerge-ts@8.x` exists in the registry and is outside the vulnerable range. However, the current Prisma 6.19.3 dependency declaration resolves `deepmerge-ts@7.1.5`, and no supported non-breaking Prisma update or compatibility guarantee for a forced transitive override was established locally.

NPM's suggested remediation is:

```text
npm audit fix --force
```

That proposal would install `prisma@6.12.0` according to the audit output. It is a breaking or otherwise unsafe dependency-graph change for this release and was deliberately not applied.

## Fix Applied

No dependency fix was applied. This is intentional because:

- No safe non-breaking remediation was verified.
- A forced transitive override could break Prisma configuration or migration behavior.
- A Prisma version change was explicitly out of scope for this phase.
- The project has no production database connection available for migration validation.

The only dependency-adjacent implementation change was the rate-limit adapter, which uses the platform's built-in `fetch` and adds no npm package.

## Remaining Vulnerabilities

The three high-severity NPM findings remain present through `deepmerge-ts@7.1.5`. No critical, moderate, or low findings were reported by the executed `npm audit` command.

## Breaking Upgrades Deferred

### Prisma 6.19.3 to the audit-proposed 6.12.0

- **Current:** `prisma@6.19.3`.
- **Target proposed by NPM:** `prisma@6.12.0`.
- **Risk:** Changes the Prisma CLI/configuration and engine dependency graph; it is a downgrade proposed by a force fix, not a validated security upgrade.
- **Required migration work:** Review Prisma release notes, regenerate clients, validate `prisma.config.ts`, run migration status/deploy against a disposable database, then run all quality gates.
- **Decision:** Deferred. Do not apply automatically.

### Forced `deepmerge-ts@8.x` override

- **Current:** `deepmerge-ts@7.1.5`.
- **Target:** `deepmerge-ts@8.x`.
- **Risk:** Prisma 6.19.3 declares and tests against its existing transitive range; an override may create unsupported runtime or CLI behavior.
- **Required migration work:** Confirm Prisma support, test config loading, client generation, migration commands, build, and the complete suite in an isolated branch/database.
- **Decision:** Deferred. No override was added.

## Recommended Future Upgrades

1. Ask the dependency owner to identify a Prisma release that officially resolves the transitive advisory without changing the supported application contract.
2. Evaluate a tested Prisma patch release in a dedicated branch, not through `npm audit fix --force`.
3. Validate Prisma generation and migration commands with a disposable database before accepting any lockfile change.
4. Re-run `npm audit`, lint, typecheck, build, and all tests after the candidate update.
5. Keep the Upstash REST rate-limit architecture package-free unless operational requirements demonstrate a need for a supported client library.

## Lockfile Review

`package-lock.json` is untracked in the current working tree and represents broad generated dependency metadata. It was not manually edited or regenerated during this review. Before commit, confirm it was generated from the intended `package.json`, inspect the Prisma resolution, and verify that it does not silently introduce unrelated upgrades.

## Validation Results

- `npm audit`: **failed with 3 high-severity findings** in the `deepmerge-ts` vulnerability family.
- `npm run lint`: **passed with warnings, 0 errors**.
- `npm run typecheck`: **passed**.
- `npm run build`: **passed**.
- `npm test`: **438 passed, 0 failed, 0 cancelled, 0 skipped**.
- Deployment: **not performed**.
- Production data/database: **not modified**.

## Exact Next Action

Do not deploy or change dependencies yet. Have the dependency owner select a supported Prisma remediation path, then test that candidate in an isolated branch and disposable database. Until that evidence exists, retain the current versions and track the three high-severity findings as an acknowledged release blocker.
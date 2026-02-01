# AI Notes / Prompt Log

This file is intentionally lightweight.

## How AI was used

- Used as a pair-programming assistant to audit boundaries (hexagonal layering), verify requirements, and implement small, gated fixes.
- The workflow was always:
  - propose/confirm a minimal change
  - apply the smallest diff
  - run quality gates (format → lint → typecheck → relevant tests)

## Guardrails

- Avoided feature creep: only fixed concrete FAIL/PARTIAL findings.
- Preserved hex boundaries:
  - domain/application remain framework/DB-agnostic
  - infra contains Drizzle/HTTP clients
  - interfaces contain Nest controllers/modules

## Implemented phases

- Phase 0: Baseline & conventions
- Phase 1: Messaging domain + use cases
- Phase 2: Persistence adapters (Drizzle + SQLite)
- Phase 3: Telegram adapters + DI wiring
- Phase 4: Polling service + manual sync endpoint
- Phase 5: Admin conversations HTTP API + e2e tests

## Revisions during QA

- Hardened JWT verification by restricting allowed algorithms.
- Adjusted CORS configuration to support cookie-based refresh tokens.
- Fixed DB-level pagination for conversations.
- Improved Swagger/OpenAPI completeness (DTO schemas + standard error responses).

## Testing

- `pnpm run validate`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`

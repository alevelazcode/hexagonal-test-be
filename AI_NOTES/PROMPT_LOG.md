# AI Notes / Prompt Log

This file is intentionally lightweight.

## How AI was used

- Used as a pair-programming assistant to audit boundaries (hexagonal layering), verify requirements, and implement small, gated fixes.
- The workflow was always:
  - propose/confirm a minimal change
  - apply the smallest diff
  - run quality gates (format → lint → typecheck → relevant tests)

## Prompting strategy

- Start from explicit constraints (hex boundaries, SOLID, deterministic tests) and treat the repository as already implemented.
- Audit first (read-only), collecting evidence (file paths + line ranges + command outputs).
- When gaps were found:
  - propose a minimal phase
  - implement the smallest possible diff
  - verify via format/lint/typecheck/tests before continuing

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

## Rejected / deferred

- Deferred domain events until there is a concrete need for decoupled side effects (kept the first version simple).
- Avoided adding heavyweight CQRS/event-sourcing infrastructure.
- Avoided adding deployment-specific infrastructure files (Docker/Render/Railway) unless required by the deliverable rubric.

## TDD evidence (methodology)

The approach followed a test-guided workflow:

- Add or adjust unit tests first for pure logic.
  - Example: `test/unit/messaging/use-cases/process-telegram-updates.use-case.spec.ts`
  - Example: `test/unit/messaging/infrastructure/fallback-reply.generator.spec.ts`
- Use integration tests to validate infrastructure adapters against SQLite.
  - Example: `test/integration/messaging/drizzle-messaging.persistence.spec.ts`
- Use e2e tests to validate contracts and error mapping without real network calls.
  - Example: `test/e2e/auth.e2e.spec.ts`
  - Example: `test/e2e/messaging.e2e.spec.ts`

When a gap was identified (FAIL/PARTIAL), the smallest fix was implemented and then validated through the quality gates and relevant tests.

## Testing

- `pnpm run validate`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`

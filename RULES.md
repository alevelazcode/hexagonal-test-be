# Engineering Rules

## Quality gates (mandatory order)

- format → lint → typecheck → tests

## Hexagonal boundaries (hard rules)

- `src/domain/**` and `src/application/**` MUST NOT import NestJS, HTTP frameworks, ORMs, or external SDKs.
- Infrastructure concerns (DB, HTTP clients, token signing) live in `src/infrastructure/**`.
- Driving adapters (controllers, DTOs, guards, modules) live in `src/interfaces/**`.
- Dependency direction is always inward: interfaces/infrastructure -> application -> domain.

## TypeScript rules

- Avoid `any`.
- Use `unknown` only at trust boundaries and narrow immediately.
- Prefer inference; avoid duplicating inline object types.

## Testing rules

- Unit tests are deterministic: fake clocks/IDs, no real network calls.
- Integration tests may use a real SQLite database, isolated per test run.
- E2E tests override external dependencies (e.g. Telegram client) to avoid real network calls.
- Live tests that hit external services MUST be opt-in (gated by env flags) and must not run in CI by default.

## Change policy

- Do not introduce large refactors.
- Only change code/tests/docs when there is a concrete gap against requirements or deliverables.
- Preserve SOLID and keep modules small and single-responsibility.

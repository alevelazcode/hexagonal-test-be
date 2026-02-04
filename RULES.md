# Engineering Rules

## Quality gates (mandatory order)

- format → lint → typecheck → tests

Non-acceptance policy:

- No code is accepted with type errors, lint errors, or failing tests.
- Add or update tests when behavior changes, even if not explicitly requested.

CI workflow:

- Review CI workflows in `.github/workflows/**`.

## Hexagonal boundaries (hard rules)

- `src/domain/**` and `src/application/**` MUST NOT import NestJS, HTTP frameworks, ORMs, or external SDKs.
- Infrastructure concerns (DB, HTTP clients, token signing) live in `src/infrastructure/**`.
- Driving adapters (controllers, DTOs, guards, modules) live in `src/interfaces/**`.
- Dependency direction is always inward: interfaces/infrastructure -> application -> domain.

## Engineering principles

- Small modules with a single responsibility.
- Keep functions small; prefer pure functions in domain/application; isolate side effects in adapters.
- Avoid premature abstractions.
- Prefer composition over complex configuration.
- Avoid magic strings: use constants/enums/value objects for repeated literals (routes, error codes, config keys).
- Keep naming consistent, explicit, and intention-revealing.
- No spaghetti code.
- Prioritize readability and scalability over micro-optimizations.

## TypeScript rules

- Avoid `any`.
- Use `unknown` only at trust boundaries and narrow immediately.
- Prefer inference; avoid duplicating inline object types.
- Prefer reusable exported types/interfaces (single source of truth) over inline object type annotations.

## Module syntax

- Use modern `import`/`export` syntax.
- This repository uses TypeScript with `module`/`moduleResolution` set to `nodenext` (see `tsconfig.json`). Follow the existing tooling constraints; do not force a module-system migration in small changes.

## Testing rules

- Unit tests are deterministic: fake clocks/IDs, no real network calls.
- Integration tests may use a real SQLite database, isolated per test run.
- E2E tests override external dependencies (e.g. Telegram client) to avoid real network calls.
- Live tests that hit external services MUST be opt-in (gated by env flags) and must not run in CI by default.

How to run tests:

- `pnpm run test` (canonical)
- Single test by name (Vitest): `pnpm vitest run -t "<test name>"`

After moving files or changing imports:

- Run `pnpm run lint`.

## HTTP semantics

- POST for creation
- GET for retrieval
- PATCH for partial updates
- PUT only if replacing the whole resource
- DELETE for deletion

Status codes policy (observed in this project):

- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request (validation)
- 401 Unauthorized
- 404 Not Found
- 409 Conflict

## Performance and technical decisions

- Do not guess performance, bundle size, or load times: measure.
- If something seems slow, add instrumentation before optimizing.
- Validate changes on small scope first before scaling across the project.

## Agent behavior

- If a request is unclear, ask concrete questions before executing.
- Simple well-defined tasks are executed directly.
- Complex changes (refactors, new features, architecture decisions) require confirming understanding before acting.
- Do not assume implicit requirements. If information is missing, ask.

## Change policy

- Do not introduce large refactors.
- Only change code/tests/docs when there is a concrete gap against requirements or deliverables.
- Preserve SOLID and keep modules small and single-responsibility.

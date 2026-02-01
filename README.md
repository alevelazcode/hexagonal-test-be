# Hex Test API

NestJS REST API implementing **Auth** + **Messaging (Telegram)** using a **Hexagonal (Ports & Adapters)** architecture.

## Requirements

- Node.js (recent LTS)
- pnpm

## Tooling

Workflow order:

format → lint → type-check

Local commands:

```bash
pnpm run format
pnpm run format:check
pnpm run lint
pnpm run lint:fix
pnpm run typecheck
pnpm run validate
```

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

It runs:

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run swagger:generate` (with `SQLITE_DB_PATH=./.tmp/ci.db`)
- `pnpm run db:migrate` (SQLite)
- `pnpm run test:integration`
- `pnpm run test:e2e`
- `pnpm run test -- --coverage`

## Architecture

Layering conventions:

- `src/domain` contains entities and domain rules (no Nest/DB imports)
- `src/application` contains use-cases and ports (no Nest controllers/DB imports)
- `src/infrastructure` contains driven adapters (e.g. Drizzle repositories)
- `src/interfaces` contains driving adapters (HTTP controllers/modules)

## Setup

```bash
pnpm install
cp .env.example .env
```

Edit `.env` as needed.

## Environment variables

Environment variables are validated at startup.

- **Local dev**: start from `.env.example`
- **Tests**: start from `.env.test.example` (note: tests set defaults in `test/vitest.setup.ts`)

Key variables:

- **`NODE_ENV`**: `development` | `test` | `production`
- **`APP_PORT`**: HTTP port
- **`SQLITE_DB_PATH`**: SQLite file path (preferred for local)
- **`DATABASE_URL`**: derived as `file:${SQLITE_DB_PATH}` if not provided
- **`LOG_LEVEL`**: `fatal` | `error` | `warn` | `log` | `debug` | `verbose`
- **`CORS_ORIGINS`**: `*` or comma-separated origins
- **`RATE_LIMIT_TTL_MS`**, **`RATE_LIMIT_LIMIT`**: global throttling
- **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`**: HS256 secrets
- **`ACCESS_TOKEN_TTL`**, **`REFRESH_TOKEN_TTL`**: TTLs in ms
- **`COOKIE_DOMAIN`**: optional
- **`TELEGRAM_BOT_TOKEN`**: optional

## Security notes

- JWT validation is restricted to an explicit algorithm allowlist.
  - RFC 8725 recommends algorithm verification: [RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)
- For HS256, RFC 7518 states keys of at least the hash output size (256 bits) MUST be used:
  [RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2)

## Run

```bash
pnpm run start:dev
```

The app runs on `http://localhost:3000` by default.

## Swagger

- Swagger UI: `GET /api/docs`
- OpenAPI generation: `pnpm run swagger:generate` (writes `openapi.json`)

## Database

SQLite is used via Drizzle.

- Prefer setting `SQLITE_DB_PATH` locally.
- `DATABASE_URL` is derived as `file:${SQLITE_DB_PATH}`.

Migrations are stored in `drizzle/`.

```bash
pnpm run db:migrate
```

## Auth endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login` (returns bearer access token, sets refresh cookie)
- `POST /api/v1/auth/refresh` (cookie)
- `POST /api/v1/auth/logout` (cookie)
- `GET /api/v1/auth/me` (bearer)

## Messaging endpoints

All messaging endpoints require a bearer access token.

- `POST /api/v1/messaging/telegram/sync`
- `GET /api/v1/messaging/conversations`
- `GET /api/v1/messaging/conversations/:conversationId`
- `POST /api/v1/messaging/conversations/:conversationId/messages`

## Telegram polling

Telegram polling is enabled only when:

- `NODE_ENV` is not `test`
- `TELEGRAM_BOT_TOKEN` is configured

## Tests

```bash
pnpm run validate
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

E2E tests override external dependencies (Telegram client and password hasher) to avoid real network calls and native module issues.

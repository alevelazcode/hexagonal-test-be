# Hex Test API

NestJS REST API implementing **Auth** + **Messaging (Telegram)** using a **Hexagonal (Ports & Adapters)** architecture.

## Requirements

- Node.js (recent LTS)
- pnpm

## Tooling

Workflow order:

format → lint → typecheck → tests

Local commands:

```bash
pnpm run format
pnpm run format:check
pnpm run lint
pnpm run lint:fix
pnpm run typecheck
pnpm run validate
pnpm run test -- --coverage
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

CI guidance:

- Review CI workflows in `.github/workflows/**`.
- No code is accepted with type errors, lint errors, or failing tests.
- Add or update tests when behavior changes, even if not explicitly requested.

## Architecture

Layering conventions:

- `src/domain` contains entities and domain rules (no Nest/DB imports)
- `src/application` contains use-cases and ports (no Nest controllers/DB imports)
- `src/infrastructure` contains driven adapters (e.g. Drizzle repositories)
- `src/interfaces` contains driving adapters (HTTP controllers/modules)

### SOLID principles (what they mean + examples from this repo)

SOLID is mentioned as an engineering constraint in `RULES.md` and is enforced through the hexagonal separation.

#### S — Single Responsibility Principle

Classes focus on one reason to change.

Example (repository adapter is only persistence): `src/infrastructure/messaging/drizzle-message.repository.ts`

```ts
export class DrizzleMessageRepository implements MessageRepositoryPort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(message: Message): Promise<void> {
    await this.db
      .insert(messageTable)
      .values({
        id: message.id,
        conversationId: message.conversationId,
        telegramChatId: message.telegramChatId.value,
        direction: message.direction,
        content: message.content.value,
        createdAt: message.createdAt.toISOString(),
        telegramUpdateId: message.telegramUpdateId,
        telegramMessageId: message.telegramMessageId,
      })
      .run();
  }
}
```

#### O — Open/Closed Principle

The system is open for extension via ports/adapters, but closed for modification in core use cases.

Example (extend reply generation by adding new implementations of a port):

`src/domain/messaging/ports/reply-generator.port.ts`

```ts
export interface ReplyGeneratorPort {
  generate: (input: GenerateReplyInput) => Promise<string>;
}
```

`src/infrastructure/messaging/random-reply.generator.ts`

```ts
export class RandomReplyGenerator implements ReplyGeneratorPort {
  generate(input: GenerateReplyInput): Promise<string> {
    void input;
    const safeReplies = this.replies.length > 0 ? this.replies : DEFAULT_REPLIES;

    const index = Math.floor(this.random() * safeReplies.length);
    const chosen = safeReplies[index];

    return Promise.resolve(typeof chosen === 'string' && chosen.trim().length > 0 ? chosen : 'Ok.');
  }
}
```

#### L — Liskov Substitution Principle

Any implementation of a port can be substituted where that port is required.

Example (a decorator-style implementation still satisfies `ReplyGeneratorPort`): `src/infrastructure/messaging/fallback-reply.generator.ts`

```ts
export class FallbackReplyGenerator implements ReplyGeneratorPort {
  async generate(input: GenerateReplyInput): Promise<string> {
    try {
      const primaryText = await this.primary.generate(input);
      const normalizedPrimary = typeof primaryText === 'string' ? primaryText.trim() : '';
      if (normalizedPrimary.length > 0) {
        return normalizedPrimary;
      }
    } catch (_error) {
      void _error;
    }

    const fallbackText = await this.fallback.generate(input);
    const normalizedFallback = typeof fallbackText === 'string' ? fallbackText.trim() : '';

    return normalizedFallback.length > 0 ? normalizedFallback : 'Ok.';
  }
}
```

#### I — Interface Segregation Principle

Ports are small and focused.

Examples:

`src/domain/common/ports/clock.port.ts`

```ts
export interface ClockPort {
  now: () => Date;
}
```

`src/domain/common/ports/id-generator.port.ts`

```ts
export interface IdGeneratorPort {
  generate: () => string;
}
```

#### D — Dependency Inversion Principle

Application use cases depend on abstractions (ports), not on concrete infrastructure.

Example: `src/application/messaging/use-cases/process-telegram-updates.use-case.ts`

```ts
export class ProcessTelegramUpdatesUseCase {
  constructor(
    private readonly telegramClient: TelegramClientPort,
    private readonly offsetStore: TelegramOffsetStorePort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly messageRepository: MessageRepositoryPort,
    private readonly replyGenerator: ReplyGeneratorPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly domainEventPublisher: DomainEventPublisherPort,
  ) {}
}
```

### Hexagonal Architecture (Ports & Adapters) in code

The hexagonal architecture is demonstrated by concrete examples in each layer:

- **Domain model (entity)**: `src/domain/messaging/message.entity.ts`

```ts
export class Message {
  private constructor(private readonly props: MessageProps) {}

  static create(input: MessageProps): Message {
    return new Message({
      ...input,
    });
  }
}
```

- **Port (domain-facing interface)**: `src/domain/messaging/ports/message-repository.port.ts`

```ts
export interface MessageRepositoryPort {
  create: (message: Message) => Promise<void>;
  listByConversationId: (conversationId: string) => Promise<Message[]>;
  findByTelegramUpdateId: (telegramUpdateId: number) => Promise<Message | null>;
}
```

- **Driven adapter (infrastructure implementation)**: `src/infrastructure/messaging/drizzle-message.repository.ts`

```ts
export class DrizzleMessageRepository implements MessageRepositoryPort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
}
```

- **Driving adapter (HTTP controller)**: `src/interfaces/http/messaging/messaging.controller.ts`

```ts
@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(
    @Inject(LIST_CONVERSATIONS_USE_CASE)
    private readonly listConversations: ListConversationsUseCase,
  ) {}
}
```

- **Composition root (wiring ports to adapters)**: `src/interfaces/http/messaging/messaging.http.module.ts`

```ts
{
  provide: MESSAGING_MESSAGE_REPOSITORY,
  useClass: DrizzleMessageRepository,
}
```

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
- **`PORT`**: HTTP port
- **`SQLITE_DB_PATH`**: SQLite file path (preferred for local)
- **`DATABASE_URL`**: derived as `file:${SQLITE_DB_PATH}` if not provided
- **`LOG_LEVEL`**: `fatal` | `error` | `warn` | `log` | `debug` | `verbose`
- **`CORS_ORIGINS`**: `*` or comma-separated origins
- **`RATE_LIMIT_TTL_MS`**, **`RATE_LIMIT_LIMIT`**: global throttling
- **`JWT_ACCESS_SECRET`**, **`JWT_REFRESH_SECRET`**: HS256 secrets
- **`ACCESS_TOKEN_TTL`**, **`REFRESH_TOKEN_TTL`**: TTLs in ms
- **`COOKIE_DOMAIN`**: optional
- **`TELEGRAM_BOT_TOKEN`**: optional
- **`GEMINI_API_KEY`**: optional (when missing, replies fall back to random)

## Security notes

- JWT validation is restricted to an explicit algorithm allowlist.
  - RFC 8725 recommends algorithm verification: [RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)
- For HS256, RFC 7518 states keys of at least the hash output size (256 bits) MUST be used:
  [RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2)

## Run

```bash
pnpm run start:dev
```

Production build/run:

```bash
pnpm run build
pnpm run start:prod
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

## Deployment (Render)

This service can be deployed as a single Node web service.

Suggested configuration:

- **Build command**: `pnpm install && pnpm run build`
- **Start command**: `pnpm run start:prod`

Required environment variables (production):

- `NODE_ENV=production`
- `JWT_ACCESS_SECRET` (min 32 chars)
- `JWT_REFRESH_SECRET` (min 32 chars)
- `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL`
- `DATABASE_URL` or `SQLITE_DB_PATH`

SQLite note:

- If using `SQLITE_DB_PATH`, mount a persistent disk and set e.g. `SQLITE_DB_PATH=/var/data/app.db`.
- Run migrations on deploy:
  - `SQLITE_DB_PATH=/var/data/app.db pnpm run db:migrate`

Optional:

- `TELEGRAM_BOT_TOKEN` enables Telegram polling.
- `GEMINI_API_KEY` enables AI replies; when missing, the service uses random replies.

## Tests

```bash
pnpm run validate
pnpm run test
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

Run a single Vitest test by name:

```bash
pnpm vitest run -t "<test name>"
```

After moving files or changing imports, re-run:

```bash
pnpm run lint
```

Turbo note:

- This repository does not use Turborepo (`turbo.json` and `turbo` scripts are not present), so commands like `pnpm turbo run ...` do not apply.

E2E tests override external dependencies (Telegram client and password hasher) to avoid real network calls and native module issues.

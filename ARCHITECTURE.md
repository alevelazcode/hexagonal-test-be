# Architecture

## Overview

This service is a NestJS REST API organized using a **Hexagonal (Ports & Adapters)** architecture.

- Domain and application logic live in `src/domain/**` and `src/application/**`.
- Infrastructure concerns (DB/HTTP clients) live in `src/infrastructure/**`.
- HTTP controllers/modules live in `src/interfaces/http/**`.

The goal is to keep domain/application logic framework-agnostic and isolate external concerns behind ports.

## Module layout

- `src/domain/**`
  - Entities/value objects/errors
  - Ports (interfaces) that define what the domain/application needs
- `src/application/**`
  - Use cases that orchestrate domain logic using ports
  - No NestJS decorators / no DB / no network
- `src/infrastructure/**`
  - Implementations of ports (e.g. Drizzle repositories, Telegram HTTP client)
- `src/interfaces/http/**`
  - NestJS controllers, guards, DTOs, modules, and DI wiring

## Messaging subsystem

### Core flow

- **Polling / manual sync** triggers `ProcessTelegramUpdatesUseCase`.
- The use case:
  - Reads the stored Telegram offset (`TelegramOffsetStorePort`).
  - Calls Telegram `getUpdates` (`TelegramClientPort`).
  - Persists inbound messages (`MessageRepositoryPort`).
  - Creates conversations as needed (`ConversationRepositoryPort`).
  - Generates a reply (`ReplyGeneratorPort`).
  - Sends replies (`TelegramClientPort`).
  - Updates the offset (`TelegramOffsetStorePort`).

### Ports and adapters map

Messaging ports live under `src/domain/messaging/ports/**` and are implemented in `src/infrastructure/messaging/**`.

- `TelegramClientPort` -> `TelegramHttpClient` (real Telegram Bot API) and `DisabledTelegramClient` (no-op)
- `TelegramOffsetStorePort` -> `DrizzleTelegramOffsetStore`
- `ConversationRepositoryPort` -> `DrizzleConversationRepository`
- `MessageRepositoryPort` -> `DrizzleMessageRepository`
- `ReplyGeneratorPort` -> `GeminiReplyGenerator`, `RandomReplyGenerator`, `EchoReplyGenerator`, `FallbackReplyGenerator`

Driving adapters (HTTP) live in `src/interfaces/http/messaging/**`:

- `MessagingController` exposes admin endpoints (list/get/send/sync)
- `TelegramPollingService` runs periodic polling when enabled

### Reply generation strategy

Reply generation is selected at wiring time (composition root) based on environment configuration:

- `NODE_ENV=test` -> `EchoReplyGenerator`
- `GEMINI_API_KEY` missing -> `RandomReplyGenerator`
- `GEMINI_API_KEY` present -> `FallbackReplyGenerator(GeminiReplyGenerator, RandomReplyGenerator)`

### Persistence

Messaging persistence is implemented using Drizzle + SQLite:

- `conversation`
- `message` (includes `telegramUpdateId` unique constraint for idempotency)
- `telegram_offset` (stores a single row keyed by `id = default`)

## Dependency injection

Nest modules wire ports to adapters using DI tokens.

- Auth:
  - `src/interfaces/http/auth/auth.http.module.ts`
- Messaging:
  - `src/interfaces/http/messaging/messaging.http.module.ts`

Tokens are defined under `src/interfaces/http/**/**.tokens.ts`.

## CQRS-lite at the application layer

This codebase follows a lightweight CQRS separation by use-case intent:

- Queries (read-only):
  - `ListConversationsUseCase`
  - `GetConversationUseCase`
- Commands (state-changing):
  - `ProcessTelegramUpdatesUseCase`
  - `SendMessageToChatUseCase`

The separation is kept simple: there is no event store, no separate read model, and no extra framework.

## Domain events

This codebase includes a minimal domain event approach:

- Domain event: `MessageReceivedEvent`
- Publisher port: `DomainEventPublisherPort`

The messaging write use case publishes `MessageReceivedEvent` after persisting an inbound Telegram message. The default publisher wiring is a no-op implementation, keeping the behavior unchanged while enabling future event-driven extensions.

## HTTP

- Global prefix: `/api`
- URI versioning: `/v1`
- Swagger UI: `/api/docs`

## Testing strategy

- Unit: pure use cases/adapters with mocks (Vitest)
- Integration: Drizzle adapters against a real SQLite db (Vitest)
- E2E: Nest app boot + HTTP assertions with provider overrides (Vitest + Supertest)

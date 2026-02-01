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

## HTTP

- Global prefix: `/api`
- URI versioning: `/v1`
- Swagger UI: `/api/docs`

## Testing strategy

- Unit: pure use cases/adapters with mocks (Vitest)
- Integration: Drizzle adapters against a real SQLite db (Vitest)
- E2E: Nest app boot + HTTP assertions with provider overrides (Vitest + Supertest)

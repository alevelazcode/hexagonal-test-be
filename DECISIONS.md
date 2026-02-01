# Architecture Decision Records

This document captures key design decisions and their trade-offs.

## 1) Hexagonal architecture (Ports & Adapters)

- **Decision**: Keep domain/application logic isolated from NestJS/DB/network concerns via ports.
- **Why**:
  - Enables unit testing without framework setup.
  - Keeps business rules stable as infrastructure evolves.
- **Trade-offs**:
  - More files and indirection (ports, tokens, adapters).
  - Requires discipline when adding new features.

## 2) Telegram polling + stored offset (instead of webhooks)

- **Decision**: Use `getUpdates` polling with an offset stored in DB (`telegram_offset`).
- **Why**:
  - Simpler to run locally and in environments without public HTTPS.
  - Fits a “single process” demo/service model.
- **Trade-offs**:
  - Polling can be less efficient than webhooks.
  - Requires careful idempotency (handled via unique `telegramUpdateId` + offset store).

## 3) Drizzle + SQLite via libsql client

- **Decision**: Use Drizzle ORM with SQLite (file database) via `@libsql/client`.
- **Why**:
  - Simple, portable, fast for dev/testing.
  - Type-safe schema and migrations.
- **Trade-offs**:
  - SQLite has concurrency limits vs Postgres.
  - Some SQL features differ from production-grade DBs.

## 4) Provider overrides for e2e

- **Decision**: In e2e tests, override providers like Telegram client and password hasher.
- **Why**:
  - Avoid external network calls.
  - Avoid native module dependency issues (bcrypt) in CI/dev setups.
- **Trade-offs**:
  - E2E tests are closer to “contract/integration” tests than fully production-identical.
  - Requires keeping override wiring aligned with DI tokens.

## 5) JWT algorithm allowlist (HS256) + key-size guidance

- **Decision**: Explicitly restrict JWT signing/verifying to `HS256` (instead of relying on library defaults).
- **Why**:
  - RFC 8725 recommends algorithm verification and explicit algorithm allowlisting.
    - [RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)
  - RFC 7518 states that for HMAC algorithms the key must be at least the hash output size (e.g. 256 bits for HS256).
    - [RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518.html#section-3.2)
  - `jsonwebtoken` supports an explicit `algorithms` allowlist when verifying tokens.
    - [node-jsonwebtoken README](https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)
- **Trade-offs**:
  - Reduces algorithm agility unless changed intentionally.
  - Requires consistent secret/key management across environments.

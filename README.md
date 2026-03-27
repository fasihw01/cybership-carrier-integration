# Cybership Carrier Integration Service

A production-ready, extensible shipping carrier integration service built in TypeScript. Currently wraps the UPS Rating API to fetch normalized shipping rates, with an architecture designed to support additional carriers (FedEx, USPS, DHL) and operations (label purchase, tracking, address validation) without modifying existing code.

---

## Table of Contents

- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [How to Test](#how-to-test)
- [Environment Variables](#environment-variables)
- [What I Would Improve Given More Time](#what-i-would-improve-given-more-time)

---

## Design Decisions

### 1. Carrier Adapter Pattern

The core abstraction is the `CarrierAdapter` interface in `src/carriers/base/carrierAdaptor.ts`. Every carrier (UPS, FedEx, DHL) implements this interface. The caller interacts only with the interface — never with any carrier-specific implementation. Adding a new carrier means creating a new folder under `src/carriers/` and registering it in the `CarrierRegistry`.

Carrier functionality is modeled as pluggable operations (e.g. `rates.shop`, `labels.purchase`, `tracking.get`). Adding a new UPS operation means registering a new operation implementation inside the UPS adapter without changing callers.

```ts
interface CarrierAdapter {
  readonly carrierId: string;
  execute<I, O>(operationId: string, input: I): Promise<O>;
}
```

### 2. Domain Isolation via Mappers

There is a strict boundary between internal domain models and external API shapes:

- `src/domain/models.ts` — internal types (`RateRequest`, `RateQuote`, `Address`, `Package`)
- `src/carriers/ups/ups.types.ts` — raw UPS API shapes
- `src/carriers/ups/ups.mapper.ts` — translation layer between the two

The caller never sees UPS-specific fields like `RatedShipment`, `MonetaryValue`, or `TotalCharges`. This means swapping or adding a carrier has zero impact on any code outside that carrier's folder.

### 3. Auth Provider as a Separate Concern

`UpsAuthProvider` implements the `AuthProvider` interface and manages the full OAuth 2.0 client-credentials lifecycle:

- Acquires a token on first call
- Caches it in memory with expiry tracking
- Automatically refreshes with a 60-second buffer before expiry
- All of this is fully transparent to the caller — `getRates()` never manages tokens directly

### 4. Fail-Fast Configuration

`src/config/config.ts` uses a `requireEnv()` helper that throws at startup if any required environment variable is missing. This surfaces misconfiguration immediately rather than at runtime during a live request.

### 5. Zod for Runtime Validation

All domain model inputs are validated with Zod schemas before any external HTTP call is made. TypeScript types alone only protect at compile time — Zod ensures invalid data from any runtime source (CLI, API consumers, tests) is caught early with a structured `INVALID_REQUEST` error.

### 6. Structured Errors

All errors thrown by the service are instances of `CarrierError` with a typed `CarrierErrorCode`. This gives callers a consistent, actionable error shape regardless of which carrier or failure mode triggered it.

```ts
type CarrierErrorCode =
  | "AUTH_FAILED"
  | "RATE_LIMIT"
  | "INVALID_REQUEST"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "PARSE_ERROR";
```

### 7. HTTP Stubbing

Integration tests stub the HTTP layer by intercepting `axios.post` with Jest spies. No real network requests are made. Tests are fed realistic payloads based on UPS documentation, verifying request construction, response normalization, token lifecycle, and error paths end-to-end.

---

## Project Structure

```
cybership-carrier-integration/
├── src/
│   ├── carriers/
│   │   ├── base/
│   │   │   ├── carrierAdaptor.ts        # Carrier interface (operation-based)
│   │   │   ├── operationRegistry.ts     # Pluggable operation registration
│   │   │   └── authProvider.ts          # Auth interface — decoupled per carrier
│   │   └── ups/
│   │       ├── UpsCarrierAdaptor.ts     # UPS carrier adapter (registers operations)
│   │       ├── UpsAuthProvider.ts       # OAuth 2.0 token lifecycle for UPS
│   │       ├── ups.types.ts             # Raw UPS API request/response shapes
│   │       ├── ups.validation.ts        # Zod schemas for UPS responses
│   │       └── ups.mapper.ts            # Maps UPS shapes ↔ domain models
│   ├── domain/
│   │   ├── models.ts                    # Internal domain types
│   │   └── errors.ts                    # CarrierError with typed error codes
│   ├── validation/
│   │   └── schema.ts                    # Zod schemas for all domain models
│   ├── registry/
│   │   └── carrierRegistry.ts           # Maps carrierId → adapter instance
│   ├── config/
│   │   └── config.ts                    # Env var loading with fail-fast validation
│   └── index.ts                         # Public entry point
├── tests/
│   ├── setupEnv.ts                      # Loads defaults from .env.example for tests
│   ├── ups/
│   │   ├── ups-auth.test.ts             # Auth token lifecycle tests
│   │   └── ups-rates.test.ts            # Rate shopping + error handling tests
│   └── fixtures/
│       ├── auth-token.json              # Stubbed UPS token response
│       ├── rate-success.json            # Stubbed UPS successful rate response
│       └── rate-error-400.json          # Stubbed UPS 400 error response
├── .env.example
├── .gitignore
├── jest.config.ts
├── tsconfig.json
└── README.md
```

---

## How to Run

### Prerequisites

- Node.js >= 18
- Yarn >= 1.22

### 1. Clone the repository

```bash
git clone https://github.com/your-username/cybership-carrier-integration.git
cd cybership-carrier-integration
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

No real UPS credentials are needed — all HTTP calls are stubbed in tests.

Note: tests do not require a local `.env`. Jest loads defaults from `.env.example` via `tests/setupEnv.ts`. A local `.env` is useful for running the module in `dev` mode.

### 4. Build the project

```bash
yarn build
```

---

## How to Test

### Run all tests

```bash
yarn test
```

### Run with verbose output

```bash
yarn test --verbose
```

### Run a specific test file

```bash
yarn test tests/ups/ups-auth.test.ts
yarn test tests/ups/ups-rates.test.ts
```

### Run a specific test by name

```bash
yarn test --verbose -t "fetches and returns a new token"
yarn test --verbose -t "returns normalized rate quotes on success"
```

### Run with coverage

```bash
yarn test --coverage
```

### Expected output

```
 PASS  tests/ups/ups-auth.test.ts
  UpsAuthProvider
    ✓ fetches and returns a new token
    ✓ reuses cached token on second call
    ✓ refreshes token after cache is cleared
    ✓ refreshes token after expiry
    ✓ throws PARSE_ERROR on malformed token payload
    ✓ throws CarrierError on auth failure

 PASS  tests/ups/ups-rates.test.ts
  UpsCarrierAdapter - getRates
    ✓ returns normalized rate quotes on success
    ✓ builds a Rate request when serviceCode is provided
    ✓ throws INVALID_REQUEST on 400
    ✓ throws RATE_LIMIT on 429
    ✓ throws UPSTREAM_ERROR on 5xx
    ✓ throws TIMEOUT on network failure
    ✓ throws PARSE_ERROR on malformed success payload
    ✓ throws PARSE_ERROR on unexpected non-axios error
    ✓ throws INVALID_REQUEST on Zod validation failure

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
```

### What the tests verify

| Test                                             | Requirement Covered                                |
| ------------------------------------------------ | -------------------------------------------------- |
| fetches and returns a new token                  | OAuth 2.0 token acquisition                        |
| reuses cached token on second call               | Token caching — only 1 HTTP call for 2 invocations |
| refreshes token after cache is cleared           | Transparent token refresh on expiry                |
| refreshes token after expiry                     | Expiry-based token refresh                         |
| throws PARSE_ERROR on malformed token payload    | Runtime validation of auth response                |
| throws CarrierError on auth failure              | Structured error on 401 from auth endpoint         |
| returns normalized rate quotes on success        | Request construction + response normalization      |
| builds a Rate request when serviceCode is provided | Correct UPS request option selection             |
| throws INVALID_REQUEST on 400                    | HTTP 4xx error handling                            |
| throws RATE_LIMIT on 429                         | Rate limiting handling                             |
| throws UPSTREAM_ERROR on 5xx                     | HTTP 5xx error handling                            |
| throws TIMEOUT on network failure                | Network timeout / ECONNRESET handling              |
| throws PARSE_ERROR on malformed success payload  | Runtime validation of UPS rate response            |
| throws PARSE_ERROR on unexpected non-axios error | Structured unexpected error handling               |
| throws INVALID_REQUEST on Zod validation failure | Input validation before any HTTP call              |

---

## Environment Variables

| Variable             | Description                 | Example                                               |
| -------------------- | --------------------------- | ----------------------------------------------------- |
| `UPS_CLIENT_ID`      | UPS OAuth 2.0 client ID     | `your_client_id`                                      |
| `UPS_CLIENT_SECRET`  | UPS OAuth 2.0 client secret | `your_client_secret`                                  |
| `UPS_BASE_URL`       | UPS API base URL            | `https://onlinetools.ups.com`                         |
| `UPS_AUTH_URL`       | UPS OAuth token endpoint    | `https://onlinetools.ups.com/security/v1/oauth/token` |
| `UPS_ACCOUNT_NUMBER` | UPS shipper account number  | `your_account_number`                                 |
| `NODE_ENV`           | Runtime environment         | `development`                                         |

See `.env.example` for a ready-to-copy template.

---

## What I Would Improve Given More Time

### 1. Add More UPS Operations

The current implementation only covers rate shopping. The architecture is already wired to support additional operations — I would add:

- `labels.purchase` (e.g. `execute("labels.purchase", request)`)
- `tracking.get` (e.g. `execute("tracking.get", trackingNumber)`)
- `address.validate` (e.g. `execute("address.validate", address)`)

### 2. Add a Second Carrier

I would add a FedEx adapter to prove the extensibility pattern works end-to-end. The only change outside `src/carriers/fedex/` would be one `registry.register()` call in `src/index.ts`.

### 3. Persistent Token Storage

The current token cache is in-memory. In a multi-instance deployment, each instance would independently acquire tokens. I would move token caching to Redis with TTL-based expiry so all instances share a single valid token.

### 4. Retry Logic with Exponential Backoff

Transient failures (5xx, network blips) currently surface immediately as errors. I would add a retry layer with exponential backoff and jitter for `UPSTREAM_ERROR` and `TIMEOUT` error codes, making the service more resilient under real network conditions.

### 5. Request ID / Tracing

Each outbound UPS request already sends a `transId` header. I would thread a correlation ID from the incoming caller request through to all outbound calls and log it consistently, making distributed tracing straightforward.

### 6. Rate Limiting Awareness

On `RATE_LIMIT` errors, I would parse the `Retry-After` header from UPS and either queue the retry automatically or surface the retry delay to the caller so they can back off intelligently.

### 7. Structured Logging

Replace `console.log` with a structured logger (e.g., `pino`) that emits JSON logs with consistent fields: `carrierId`, `operation`, `durationMs`, `statusCode`, `errorCode`. This makes log aggregation and alerting in production much more effective.

### 8. Contract Testing

Beyond the current integration tests, I would add contract tests using a tool like Pact to verify that the stubbed UPS payloads we test against actually match the real UPS API schema — catching drift between our stubs and the live API early.

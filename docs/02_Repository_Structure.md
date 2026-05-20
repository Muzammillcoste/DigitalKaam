# Document 02 — Repository Structure
## DigitalKaam AI Service Platform

**Document Type**: Developer Reference  
**Audience**: New Developers, Contributors  
**Related Documents**: [01_System_Architecture](01_System_Architecture.md) | [04_API_Documentation](04_API_Documentation.md) | [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md)

---

## 1. Overview

The repository is a **monorepo** containing two distinct application packages under the `d:\DigitalKaam\` root:

| Package | Path | Runtime |
|---------|------|------|
| **backend** | `backend/` | Node.js / Express |
| **mobile** | `mobile/` | React Native / Expo |

All production business logic lives in `backend/`. The `mobile/` package contains the React Native/Expo scaffold with API client utilities.

---

## 2. Root-Level Files

| File | Purpose |
|------|---------|
| `supabase_schema.sql` | Complete database schema — source of truth for all tables |
| `rls_fix.sql` | Migration helper for RLS (Row Level Security) configuration |
| `implementation_plan.md` | Engineering implementation notes |
| `agent_implementation.md` | AI agent implementation notes |
| `auth_implementation.md` | Auth implementation notes |
| `project_context.md` | High-level project context document |
| `walkthrough.md` | Developer walkthrough |
| `Agent_task.md` | Agent task specification |
| `prevent_double_booking_implementation_plan` | Notes on the double-booking prevention feature |
| `Digital Kaam.postman_collection.json` | Full Postman collection for API testing |
| `skills-lock.json` | VS Code Copilot skills lock file |

---

## 3. Backend Package Structure

```
backend/
├── package.json              # npm manifest, scripts, dependencies
├── tsconfig.json             # TypeScript compiler config
├── api-tests.http            # VS Code REST Client test file
└── src/
    ├── index.ts              # ◀ APPLICATION ENTRY POINT
    ├── scratch.ts            # Ad-hoc dev/test scratch file
    │
    ├── adk/                  # Agent Development Kit (custom framework)
    │   ├── Agent.ts          # Agent class — runs Gemini with tool loop
    │   ├── Memory.ts         # In-process conversation history
    │   ├── Tool.ts           # Tool class — wraps a callable function
    │   ├── agents/
    │   │   ├── OrchestratorAgent.ts   # Main chat orchestrator (all tools)
    │   │   ├── SummarizerAgent.ts     # Conversation summarizer (no tools)
    │   │   ├── BookingAgent.ts        # Specialized booking agent
    │   │   ├── DiscoveryAgent.ts      # Specialized discovery agent
    │   │   ├── DisputeAgent.ts        # Specialized dispute agent
    │   │   ├── PricingAgent.ts        # Specialized pricing agent
    │   │   └── SchedulingAgent.ts     # Specialized scheduling agent
    │   └── tools/
    │       ├── FindProvidersTool.ts       # Tool: find + rank providers
    │       ├── CalculateQuoteTool.ts      # Tool: compute price quote
    │       ├── CheckAvailabilityTool.ts   # Tool: check provider slots
    │       ├── ConfirmBookingTool.ts      # Tool: finalize booking (DB write)
    │       ├── CreateTicketTool.ts        # Tool: open dispute ticket
    │       └── GetBookingsTool.ts         # Tool: retrieve session bookings
    │
    ├── controllers/          # Business logic layer — pure functions
    │   ├── discoveryController.ts     # Provider DB search + area aliasing
    │   ├── matchingController.ts      # 10-factor provider scoring
    │   ├── pricingController.ts       # Dynamic pricing engine
    │   ├── schedulingController.ts    # Availability slot selection
    │   ├── bookingController.ts       # Booking creation + receipt
    │   ├── lifecycleController.ts     # Booking status state machine
    │   ├── reputationController.ts    # Rating update + reputation
    │   └── disputeController.ts       # Dispute logic + refund calculation
    │
    ├── data/
    │   └── seed.ts            # Database seeding script
    │
    ├── lib/
    │   ├── gemini.ts          # Google Gemini SDK wrappers
    │   └── supabase.ts        # Supabase client singleton
    │
    ├── middleware/
    │   └── auth.ts            # JWT verification + auto-refresh
    │
    └── routes/                # HTTP route definitions
        ├── auth.routes.ts         # /api/auth
        ├── chat.routes.ts         # /api/chat  ← most complex route
        ├── booking.routes.ts      # /api/booking
        ├── dispute.routes.ts      # /api/dispute
        ├── provider.routes.ts     # /api/provider
        ├── users.routes.ts        # /api/users
        ├── availability.routes.ts # /api/availability
        ├── reputation.routes.ts   # /api/reputation
        ├── traces.routes.ts       # /api/traces
        ├── feedback.routes.ts     # /api/feedback
        └── admin.routes.ts        # /api/admin
```

---

## 4. Module Ownership & Responsibilities

### 4.1 `src/index.ts` — Application Entry Point

**Responsibilities**:
- Initializes Express application
- Registers global middleware (CORS, JSON body parser, rate limiters)
- Mounts all route groups
- Starts HTTP server on `process.env.PORT` (default: 3000)
- Exposes `/health` endpoint

**Rate limiter configuration** (defined here):
| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|-----------|
| `generalLimiter` | 60s | 100 | `/api/*` |
| `chatLimiter` | 60s | 20 | `/api/chat` |
| `authLimiter` | 15 min | 10 | `/api/auth` |

> **Note**: The `chatLimiter` overrides `generalLimiter` for chat routes because Gemini calls are expensive (latency + cost).

### 4.2 `src/adk/` — Agent Development Kit

A **custom, lightweight agent framework** built on top of the Google GenAI SDK. This is NOT a third-party library — it is proprietary code specific to this project.

**`Agent.ts`**: The core agent class. Implements the Gemini function-calling loop:
1. Send message + history to Gemini
2. If Gemini returns `functionCalls`, execute each tool
3. Append function call + response to memory
4. Loop until Gemini returns a text response (no more function calls)

**`Memory.ts`**: In-memory conversation history. Stores the `Content[]` array required by the Gemini SDK. Cleared on server restart (persistence is handled externally via `chat_messages` DB table).

**`Tool.ts`**: Wrapper class for tool definitions. Exposes `toFunctionDeclaration()` which converts the tool config to Gemini's `FunctionDeclaration` format.

**`agents/OrchestratorAgent.ts`**: The only active agent in the ADK system. Contains:
- Detailed system instructions (English + Roman Urdu + Urdu script formatting templates)
- Language detection and response language rules
- Booking conversation flow (5 steps)
- Edge case rules (provider unavailable, budget issues, disputes)
- Double-booking prevention instructions

**`agents/SummarizerAgent.ts`**: A stateless Gemini call (no tools, no history). Compresses older conversation turns into ≤200-word summaries preserving booking IDs and key facts.

**`agents/BookingAgent.ts`, `DiscoveryAgent.ts`, `DisputeAgent.ts`, `PricingAgent.ts`, `SchedulingAgent.ts`**: Domain-specialized agent modules built on the same `Agent` → `Memory` → `Tool` framework as the `OrchestratorAgent`. Each encapsulates system instructions and tool configuration for its respective domain.

**`tools/`**: Each tool wraps one or more controller functions. The tools:
1. Receive args from the LLM (merged with server-injected `sessionMetadata`)
2. Call the appropriate controller(s)
3. Return structured results back to the LLM

### 4.3 `src/controllers/` — Business Logic Layer

Controllers are **pure async functions** (not classes). Each controller:
- Accepts typed input parameters
- Executes business logic (DB queries, AI calls, calculations)
- Writes a trace record to the `traces` table
- Returns a typed output interface

All controllers use the shared `supabase` singleton for DB access.

**Controller dependency graph**:
```
discoveryController → (DB:providers, DB:traces)
matchingController → (DB:availability, DB:traces)
pricingController → (DB:platform_config, DB:traces)
schedulingController → (DB:availability, DB:traces)
bookingController → (DB:bookings, DB:availability, DB:user_profiles, DB:traces)
lifecycleController → (DB:bookings, DB:traces)
reputationController → (DB:feedback, DB:providers, DB:reputation, DB:traces)
disputeController → (DB:disputes, DB:bookings, DB:reputation, DB:traces)
```

### 4.4 `src/lib/` — Shared Libraries

**`supabase.ts`**: Creates and exports the **single shared Supabase client** using `service_role` key. This client has full database access (bypasses RLS). All controllers use this singleton.

**`gemini.ts`**: Exports:
- `transcribeAudio(base64, mimeType)` — multimodal audio → text using `gemini-2.0-flash`
- `generateSpeech(text, voice)` — TTS using `gemini-2.5-flash-preview-tts`, returns base64 WAV
- `pcmToWav(pcm)` — internal PCM-to-WAV converter (Gemini TTS returns raw PCM)

> **Note**: `lib/gemini.ts` uses the `@google/genai` SDK for audio and TTS operations, with the `Agent` class handling all conversational interactions.

### 4.6 `src/middleware/auth.ts` — Authentication Guard

The `requireAuth` middleware:
1. Extracts Bearer token from `Authorization` header
2. Creates a disposable Supabase auth client (isolated from shared DB client)
3. Verifies token with `authClient.auth.getUser(token)`
4. On expiry: attempts auto-refresh if `X-Refresh-Token` header present
5. Sets `req.user = { id, email }` for downstream handlers
6. On refresh success: sends `X-New-Access-Token`, `X-New-Refresh-Token`, `X-New-Expires-In` response headers

### 4.7 `src/routes/` — HTTP Route Handlers

Routes are thin wrappers around controllers. Most routes:
- Extract body/params
- Call controller function(s)
- Return JSON response

The exception is **`chat.routes.ts`** which contains significant logic:
- Session creation/lookup
- Message window management
- Summarization triggering
- Agent cache management
- Booking facts injection
- Message persistence

### 4.8 `src/data/seed.ts` — Database Seed Script

Generates realistic provider data for all Karachi areas. Creates:
- 5 providers per service type per area (7 service types × 7 areas = up to 245 providers)
- 3–5 availability slots per provider for the next 14 days
- Realistic specializations, skills, certifications, and hourly rates per service category

Run with: `npm run seed`

---

## 5. Mobile Package Structure

```
mobile/
├── package.json     # Expo/React Native manifest
├── app.json         # Expo app config
├── App.tsx          # Application entry component
├── index.ts         # App entry point
├── tsconfig.json    # TypeScript config
├── AGENTS.md        # Agent instructions for Claude
├── CLAUDE.md        # Claude coding instructions
├── assets/          # Image assets
└── utils/
    ├── api.ts       # HTTP API client wrapper
    ├── supabase.ts  # Mobile Supabase client (anon key)
    └── voice.ts     # Voice utilities
```

The `mobile/utils/api.ts` contains a complete API client wrapper (`api.service.request`, `api.booking.*`, `api.dispute.*`, `api.provider.*`) ready for mobile UI integration.

---

## 6. Shared Libraries and Architecture

### Architecture Patterns

1. **`supabase` singleton** (`lib/supabase.ts`): The shared Supabase client used by all controllers for consistent, authenticated database access.

2. **`AREA_COORDS` constant**: Geographic coordinate mapping defined in both `discoveryController.ts` and `matchingController.ts` for Karachi area-based calculations.

3. **Pricing defaults**: Hardcoded in `pricingController.ts` as `const DEFAULTS`, providing resilient fallbacks when DB config is not available.

4. **`agentCache`**: A module-level `Map` in `chat.routes.ts` providing fast in-process access to active `OrchestratorAgent` instances.

---

## 7. Entry Points Summary

| Entry Point | File | Auth | Description |
|-------------|------|------|-------------|
| HTTP Server | `src/index.ts` | — | Starts Express, mounts routes |
| Chat API | `src/routes/chat.routes.ts` | JWT required | Main user-facing chat |

| Auth API | `src/routes/auth.routes.ts` | Mixed | Login, signup, profile |
| Seed Script | `src/data/seed.ts` | — | CLI — seeds DB with test data |

---

## 8. Build & Run

```bash
# Install dependencies
cd backend
npm install

# Development (ts-node with hot reload)
npm run dev

# Build (compile TypeScript to dist/)
npm run build

# Production start
npm start

# Seed database
npm run seed
```

**Required environment variables** (in `backend/.env`):
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_google_gemini_key
PORT=3000   # optional, defaults to 3000
```

---

*See [14_Deployment_Architecture.md](14_Deployment_Architecture.md) for full deployment guide.*

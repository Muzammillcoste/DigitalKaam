# 01 System Walkthrough

This document provides a practical, code-level guide to the **DigitalKaam** conversational booking and agentic services platform. It traces how files, classes, and databases interact to serve multilingual service discovery, dynamic pricing, scheduling, and booking management in Karachi, Pakistan.

---

## What This System Does

DigitalKaam acts as an AI-powered conversational marketplace connecting customers to informal service providers (Electricians, Plumbers, AC Technicians, Mechanics, Tutors, Beauticians, and Drivers).

### Major Capabilities
1. **Multilingual Conversational Booking**: A unified chat endpoint (`/api/chat` and `/api/chat/voice`) that understands and responds in the exact script/language the user writes in: **English**, **Urdu (اردو script)**, and **Roman Urdu** (e.g., *"AC bilkul kaam nahi kar raha"*).
2. **Dynamic Provider Discovery & Radius Search**: Calculates distance between user and provider using the **Haversine formula** and filters based on the provider's active status and travel radius (default: 10-15km).
3. **10-Factor Provider Matching**: Ranks and matches providers using a custom weighted formula (incorporating distance, availability, ratings, recency, reliability, cancellation rates, etc.).
4. **DB-Configurable Pricing**: Dynamic quote calculations utilizing database-stored fee configs to instantly adjust base charges, platform fees, urgency fees, and loyalty discounts without code deployment.
5. **Conflict-Free Scheduling**: Looks up provider availability records, selects the closest slot within a travel buffer window, and marks slots as reserved.
6. **Dispute & Feedback Engine**: Handles no-shows, overcharges, and poor quality with automated refunds, provider flagging, and weighted average reputation recalculation.
7. **Speech Processing**: Provides standalone transcription (Speech-to-Text) and speech synthesis (Text-to-Speech) using Gemini multimodal API capabilities.

---

## How The System Is Structured

The repository is structured as a TypeScript/Node.js monorepo containing backend services and a React Native/Expo mobile scaffold.

### Folder Layout

```
d:/DigitalKaam
├── backend/
│   ├── src/
│   │   ├── adk/               # Agent Development Kit (Gemini model & memory wrapper)
│   │   │   ├── Agent.ts       # Core Agent class (run loop, memory & tool execution)
│   │   │   ├── Memory.ts      # Verbatim turn history manager
│   │   │   ├── Tool.ts        # Declarative schema and wrapper for executable functions
│   │   │   ├── agents/        # Orchestrator & Summarizer agent profiles
│   │   │   └── tools/         # LLM-accessible tools calling controller logic
│   │   ├── controllers/       # Functional business engines called by routes/tools
│   │   ├── data/              # Database seed data
│   │   ├── lib/               # Shared API client singletons (Gemini & Supabase)
│   │   ├── middleware/        # Express request authentication
│   │   ├── routes/            # REST API endpoints & route mounting
│   │   └── index.ts           # Main Express server entry point
└── mobile/                    # React Native / Expo application
    └── utils/                 # Frontend Supabase & API utility clients
```

### Core Technologies & Dependencies
*   **Runtime & Language**: Node.js, TypeScript 6.x, Express.js.
*   **Database**: Supabase (PostgreSQL) client (`@supabase/supabase-js`).
*   **AI Models**: Google Gemini SDKs (`@google/genai` for the ADK and `@google/generative-ai` for internal classifier calls). Models:
    *   `gemini-2.5-flash` (General orchestration & summarization)
    *   `gemini-2.0-flash` (Audio Speech-to-Text transcription)
    *   `gemini-2.5-flash-preview-tts` (Text-to-Speech synthesis)
    *   `gemini-1.5-flash` (Internal complexity & intent classifiers)
*   **JWT Security & Session Refresh**: Middleware extracting Authorization headers, verifying tokens against Supabase Auth, and rotating expired credentials via isolated client handlers.

---

## Runtime Flow

Every conversational interaction follows a structured pipeline passing through validation, intent extraction, agentic orchestration, tool invocation, controller calculation, and trace persistence.

### High-Level Request Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile App User
    participant Router as Express router (chat.routes.ts)
    participant Auth as Auth Middleware (auth.ts)
    participant Agent as Agent Runner (Agent.ts)
    participant Tool as ConfirmBookingTool
    participant Ctrl as Booking Controller (bookingController.ts)
    database DB as Supabase DB

    User->>Router: POST /api/chat { message, sessionId }
    Router->>Auth: Extract headers & verify token
    Auth-->>Router: req.user = { id }
    Router->>DB: Fetch chat_sessions & recent chat_messages
    DB-->>Router: turn_count, summary, messages
    Router->>Agent: Instantiate & call agent.run(message)
    
    loop Function Calling Loop
        Agent->>Agent: LLM calls gemini-2.5-flash
        Agent-->>Agent: Returns Tool Request: confirm_service_booking
        Agent->>Tool: tool.execute(mergedArgs)
        Tool->>Ctrl: processBooking(userId, provider, pricing, ...)
        Ctrl->>DB: INSERT bookings / UPDATE availability
        DB-->>Ctrl: Inserted successfully
        Ctrl-->>Tool: Return BookingOutput
        Tool-->>Agent: Return tool execution results
    end

    Agent->>Router: Final Response Text
    Router->>DB: Save user & assistant messages to chat_messages
    Router->>DB: Increment turn_count in chat_sessions
    Router-->>User: HTTP 200 { response: responseText }
```

### Flow Breakdown with Code References

1.  **Request Entry**: Mobile calls `POST /api/chat` with `{ message: "electrician chahiye DHA mein", sessionId: "session-abc" }`.
2.  **Rate Limiter**: Express Rate Limiter `chatLimiter` limits AI requests to 20 per minute per IP to control model costs ([index.ts:L37](file:///d:/DigitalKaam/backend/src/index.ts#L37)).
3.  **Auth Check**: The `requireAuth` middleware validates the user's JWT ([auth.ts:L26](file:///d:/DigitalKaam/backend/src/middleware/auth.ts#L26)). If the JWT is expired, it uses the client's `X-Refresh-Token` header to run a mid-flight session renewal.
4.  **Session Lookup**: The router queries the `chat_sessions` table in Supabase ([chat.routes.ts:L82](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L82)) to read the current conversation turn count and summary.
5.  **Summarization (Context Compression)**: If `turn_count % 8 === 0`, the router runs a synchronous summarization via `summarizeConversation` using `gemini-2.5-flash` ([chat.routes.ts:L148](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L148)). This compresses history, updates the database summary, and maintains a small context window.
6.  **Agent Initialization**: The router loads the `MainOrchestrator` agent template, appends the latest summary and fresh DB booking facts, and hydrates the agent's memory using the last 6 messages from `chat_messages` ([chat.routes.ts:L193](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L193)).
7.  **Server-Side Metadata Injection**: The server locks `sessionId` and `userId` directly into `agent.sessionMetadata` ([chat.routes.ts:L231](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L231)) before calling `agent.run()`. This prevents the LLM from omitting metadata during tool calls.
8.  **Orchestrator Execution**: `Agent.run()` enters a while loop:
    *   It requests content generation from Gemini.
    *   If the model requests tool calls (e.g., `find_available_providers`), the agent executes the tool with injected session metadata ([Agent.ts:L80](file:///d:/DigitalKaam/backend/src/adk/Agent.ts#L80)).
    *   The tool calls its corresponding controller (e.g., `processDiscovery` + `processMatching`).
    *   The results are fed back into the agent's memory and the loop continues until the agent produces a textual response.
9.  **Write and Response**: The router writes the user message and assistant reply to `chat_messages` in parallel, increments `turn_count` in `chat_sessions`, and sends the final message to the client.

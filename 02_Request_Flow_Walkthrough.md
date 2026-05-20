# 02 Request Flow Walkthrough

This guide details how requests flow through the DigitalKaam API. It traces the code files, functions, database updates, and reasoning for each layer.

---

## 1. User Registration & Sync Flow

### Why This Flow Exists
Supabase Authentication operates in an isolated schema (`auth.users`). To maintain references for bookings, messages, and disputes, the application stores matching metadata in `public.user_profiles`. 
*   **Email Signups**: Handled via `/signup` which registers the user in auth and inserts the profile in a single transaction.
*   **Google/OAuth Signups**: Handled via mobile. Google OAuth logs the user into Supabase directly but does *not* create a public profile. The mobile client must call `/profile/sync` to populate the `user_profiles` table, preventing Foreign Key violations on chat sessions.

### Execution Trace: POST /api/auth/profile/sync

```mermaid
sequenceDiagram
    autonumber
    actor Mobile as Mobile App
    participant Auth as Auth Middleware (auth.ts)
    participant Router as Auth Router (auth.routes.ts)
    database DB as Supabase DB

    Mobile->>Auth: POST /api/auth/profile/sync
    Auth->>DB: auth.getUser(token)
    DB-->>Auth: Verified User details
    Auth->>Router: next() with req.user.id
    Router->>DB: select user_metadata (Google Name)
    DB-->>Router: metadata
    Router->>DB: upsert into user_profiles
    DB-->>Router: Upsert successful
    Router->>DB: select providers where user_id = id
    DB-->>Router: provider record (if registered)
    Router-->>Mobile: HTTP 200 { userId, email, isNewUser, isProvider }
```

1.  **Router Layer**
    *   **File**: [auth.routes.ts](file:///d:/DigitalKaam/backend/src/routes/auth.routes.ts#L105)
    *   **Function**: `router.post('/profile/sync', requireAuth, ...)`
    *   **Code**: Reads `req.user.id` and `req.user.email` set by `requireAuth` middleware.
2.  **User Metadata Resolution**
    *   **File**: [auth.routes.ts](file:///d:/DigitalKaam/backend/src/routes/auth.routes.ts#L113)
    *   **Function**: `supabase.auth.admin.getUserById(userId)`
    *   **Responsibility**: Extracts Google name from `user_metadata` or defaults to the prefix of the email.
3.  **Profile Persistence**
    *   **File**: [auth.routes.ts](file:///d:/DigitalKaam/backend/src/routes/auth.routes.ts#L134)
    *   **Function**: `supabase.from('user_profiles').upsert(...)`
    *   **DB Changes**: Writes to the `user_profiles` table. Overwrites name or area if provided.
4.  **Provider Status Check**
    *   **File**: [auth.routes.ts](file:///d:/DigitalKaam/backend/src/routes/auth.routes.ts#L8)
    *   **Function**: `getProviderStatus(userId)`
    *   **Responsibility**: Scans the `providers` table to see if the user is a registered gig worker, returning their `providerId` and `status` to log them in automatically in provider mode.

---

## 2. Conversational Chat & Orchestration Flow

### Why This Flow Exists
This is the core conversational gateway. It parses raw multilingual inputs, manages context length via summarization, matches context parameters (e.g., locking User ID), and runs the agent loop.

### Execution Trace: POST /api/chat

```mermaid
sequenceDiagram
    autonumber
    actor Mobile as Mobile App
    participant Router as Chat Router (chat.routes.ts)
    participant Summarizer as Summarizer Agent (SummarizerAgent.ts)
    participant Agent as Agent Runner (Agent.ts)
    database DB as Supabase DB

    Mobile->>Router: POST /api/chat { message, sessionId }
    Router->>DB: select chat_sessions where session_id = id
    DB-->>Router: turn_count, summary, booking_ids
    Note over Router, Summarizer: If turn_count > 0 && turn_count % 8 == 0
    Router->>DB: select older chat_messages
    DB-->>Router: older messages
    Router->>Summarizer: summarizeConversation(turns)
    Summarizer-->>Router: 200-word summary text
    Router->>DB: update chat_sessions set summary
    
    Router->>DB: select last 6 chat_messages (verbatim window)
    DB-->>Router: message list
    Router->>Agent: new Agent() & agent.run(message)
    Agent->>DB: insert chat_messages (user turn)
    Agent->>Agent: run loop (executes tools if requested)
    Agent->>DB: insert chat_messages (assistant turn)
    Agent->>DB: update chat_sessions (turn_count++, last_active)
    Router-->>Mobile: HTTP 200 { response }
```

1.  **Session Hydration**
    *   **File**: [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L82)
    *   **Responsibility**: Queries `chat_sessions` table. If the session doesn't exist, it creates a new row with `turn_count: 0`.
2.  **Context Management**
    *   **File**: [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L132)
    *   **Responsibility**: Fetches the last 6 messages (`WINDOW_SIZE`) to serve as verbatim context, preventing memory overflow.
3.  **Active Summarizer Trigger**
    *   **File**: [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L148)
    *   **Function**: `summarizeConversation(olderMessages)` using `gemini-2.5-flash` with custom summarization instructions.
    *   **DB Changes**: Updates the `summary` column in `chat_sessions`.
4.  **Agent Execution Loop**
    *   **File**: [Agent.ts](file:///d:/DigitalKaam/backend/src/adk/Agent.ts#L40)
    *   **Function**: `Agent.run(userInput)`
    *   **Responsibility**: Feeds verbatim messages and system instructions (base prompt + conversation summary + fresh DB booking facts) to Gemini. Processes tool-calling loops sequentially.
5.  **Persistence & Response**
    *   **File**: [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts#L240-L267)
    *   **DB Changes**: 
        *   `chat_messages`: Inserts user message and generated assistant response.
        *   `chat_sessions`: Updates `turn_count` and sets `last_active` timestamp.

---

## 3. Discovery & Matching Flow

### Why This Flow Exists
This flow runs when the Orchestrator invokes the `find_available_providers` tool. It uses geographic radius constraints (Haversine distance) to find candidates, then ranks them based on performance metrics.

### Execution Trace: find_available_providers

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent.ts
    participant Tool as FindProvidersTool
    participant Discovery as Discovery Controller
    participant Matching as Matching Controller
    database DB as Supabase DB

    Agent->>Tool: execute({ serviceType, area, requestedDate, requestedTime })
    Tool->>Discovery: processDiscovery(intent, complexity, sessionId)
    Discovery->>DB: select providers where service_type ilike & status = active
    DB-->>Discovery: candidates
    Discovery->>Discovery: Filter by travel radius (Haversine)
    Discovery->>DB: insert traces (DiscoveryAgent)
    Discovery-->>Tool: candidates
    
    Tool->>Matching: processMatching(discoveryOutput, intent, context, date, time)
    Matching->>DB: select availability where date = requestedDate & is_booked = false
    DB-->>Matching: slots
    Matching->>Matching: Calculate 10-factor weights
    Matching->>DB: insert traces (MatchingAgent)
    Matching-->>Tool: ranked providers, topProvider
    Tool-->>Agent: { success: true, topProviders, reasoning }
```

1.  **Discovery Layer**
    *   **File**: [discoveryController.ts](file:///d:/DigitalKaam/backend/src/controllers/discoveryController.ts#L195)
    *   **Function**: `processDiscovery(intent, complexity, sessionId)`
    *   **DB Queries**: Fetches active providers matching service type aliases (e.g., "ac repair" -> "AC Technician").
    *   **Radius Filtering**: Computes distance from area centroids (e.g. DHA, Gulshan) using the **Haversine formula** and drops providers whose distance exceeds their custom `travel_radius` (default: 10km).
2.  **Availability Matching Layer**
    *   **File**: [matchingController.ts](file:///d:/DigitalKaam/backend/src/controllers/matchingController.ts#L48)
    *   **Function**: `processMatching(discoveryOutput, intent, context, requestedDate, requestedTime, sessionId)`
    *   **DB Queries**: Fetches all availability records for candidate providers on the target `requestedDate`.
3.  **Ranking Score Computation**
    *   **File**: [matchingController.ts](file:///d:/DigitalKaam/backend/src/controllers/matchingController.ts#L99)
    *   **Responsibility**: Scores candidates out of 1.0 using the 10-factor weighted algorithm (Distance, Availability, Rating, Recency, Reliability, Certs, Price, Capacity, Cancellation, and User Preference).
4.  **Trace Logging**
    *   **DB Changes**: Inserts a trace record in `traces` table for auditing the matching reasoning and confidence scores.

---

## 4. Price & Slot Verification Flow

### Why This Flow Exists
Calculates the exact breakdown of service fees and verifies that the provider is free to accept the job, adjusting for urgency and loyalty points.

### Execution Trace: calculate_dynamic_pricing + check_time_slots

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent.ts
    participant PriceTool as CalculateQuoteTool
    participant Pricing as Pricing Controller
    participant SchedTool as CheckAvailabilityTool
    participant Sched as Scheduling Controller
    database DB as Supabase DB

    Agent->>PriceTool: execute({ providerId, complexity, estimatedHours })
    PriceTool->>DB: select hourly_rate from providers
    DB-->>PriceTool: rate
    PriceTool->>Pricing: processPricing(provider, intent, complexity, context, sessionId)
    Pricing->>DB: select configs from platform_config
    DB-->>Pricing: configurations
    Pricing->>DB: insert traces (PricingAgent)
    PriceTool-->>Agent: { success: true, quote }

    Agent->>SchedTool: execute({ providerId, requestedDate, requestedTime, estimatedHours })
    SchedTool->>Sched: processScheduling(provider, date, time, duration, sessionId)
    Sched->>DB: select availability where provider_id & date
    DB-->>Sched: slots
    Sched->>Sched: Check conflict or pick closest slot
    Sched->>DB: insert traces (SchedulingAgent)
    SchedTool-->>Agent: { success: true, result }
```

1.  **Pricing Calculation**
    *   **File**: [pricingController.ts](file:///d:/DigitalKaam/backend/src/controllers/pricingController.ts#L61)
    *   **Function**: `processPricing(...)`
    *   **DB Queries**: Loads config keys from the `platform_config` table (falls back to hardcoded defaults: `visit_fee: 500`, `loyalty_discount_cap: 200`, etc.).
    *   **Logic**: Computes:
        $$\text{laborFee} = \text{hourlyRate} \times \text{estimatedHours}$$
        $$\text{serviceSubtotal} = \text{visitFee} + \text{laborFee} + \text{urgencySurcharge} - \text{loyaltyDiscount}$$
        $$\text{platformFee} = \text{platformFeeFixed} + (\text{serviceSubtotal} \times \text{platformFeePercent} / 100)$$
        $$\text{total} = \max(\text{visitFee}, \text{serviceSubtotal} + \text{platformFee})$$
2.  **Scheduling & Conflict Checking**
    *   **File**: [schedulingController.ts](file:///d:/DigitalKaam/backend/src/controllers/schedulingController.ts#L16)
    *   **Function**: `processScheduling(...)`
    *   **DB Queries**: Fetches available slots from the `availability` table.
    *   **Logic**: Matches the slot within $\pm 1$ hour. If the requested slot is unavailable, it selects the first alternative slot and sets `conflictDetected: true` with a suggested slot.
3.  **Trace Recording**
    *   **DB Changes**: Writes detailed calculation and conflict traces to `traces`.

---

## 5. Booking Confirmation Flow

### Why This Flow Exists
Creates the booking record, reserves the availability slot, increments the user profile booking count, and tracks the booking reference on the chat session. Includes a session guard to prevent duplicate bookings.

### Execution Trace: confirm_service_booking

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent.ts
    participant Tool as ConfirmBookingTool
    participant Ctrl as Booking Controller
    database DB as Supabase DB

    Agent->>Tool: execute({ providerId, userId, userRequest, finalPrice, requestedDate, requestedTime })
    Tool->>DB: select bookings where session_id = sessionId & status = 'confirmed'
    DB-->>Tool: existing bookings
    Note over Tool: Guard Check: If booking exists, reject
    Tool->>DB: select provider details
    DB-->>Tool: provider name, phone, area
    Tool->>Ctrl: processBooking(userId, provider, pricing, scheduling, ...)
    Ctrl->>DB: insert into bookings (confirmed status)
    DB-->>Ctrl: Insert success
    
    par Async Background Jobs (Non-blocking)
        Ctrl->>DB: select booking_count from user_profiles
        DB-->>Ctrl: count
        Ctrl->>DB: update user_profiles set booking_count
    end
    
    Ctrl->>DB: update availability set is_booked = true
    Ctrl->>DB: insert traces (BookingAgent)
    Ctrl-->>Tool: BookingOutput
    Tool->>DB: select booking_ids from chat_sessions
    DB-->>Tool: booking_ids array
    Tool->>DB: update chat_sessions set booking_ids (append new ID)
    Tool-->>Agent: { success: true, result }
```

1.  **Duplicate Session Guard**
    *   **File**: [ConfirmBookingTool.ts](file:///d:/DigitalKaam/backend/src/adk/tools/ConfirmBookingTool.ts#L63)
    *   **Function**: Scans `bookings` table for records matching `session_id` and `status: 'confirmed'`.
    *   **Constraint**: If a confirmed booking is found, it blocks execution and returns `alreadyBooked: true` to prevent double-bookings.
2.  **Booking Placement**
    *   **File**: [bookingController.ts](file:///d:/DigitalKaam/backend/src/controllers/bookingController.ts#L54)
    *   **Function**: `processBooking(...)`
    *   **DB Changes**: Inserts a new row in the `bookings` table with status `confirmed`, a generated human-readable `booking_ref` (e.g. `DK-260520-X8J3`), and the JSON price breakdown.
3.  **Availability Slot Reservation**
    *   **File**: [bookingController.ts](file:///d:/DigitalKaam/backend/src/controllers/bookingController.ts#L113)
    *   **DB Changes**: Updates the `availability` table setting `is_booked = true` for the chosen slot ID.
4.  **Async User Profile Update**
    *   **File**: [bookingController.ts](file:///d:/DigitalKaam/backend/src/controllers/bookingController.ts#L97)
    *   **Responsibility**: Launches a fire-and-forget IIFE thread to load user profile `booking_count` and increment it by 1 in Supabase.
5.  **Session Tracking**
    *   **File**: [ConfirmBookingTool.ts](file:///d:/DigitalKaam/backend/src/adk/tools/ConfirmBookingTool.ts#L144)
    *   **DB Changes**: Appends the booking UUID to the `booking_ids` array column on `chat_sessions`.

---

## 6. Dispute Resolution Flow

### Why This Flow Exists
Creates a dispute ticket when a customer complains about quality, a no-show, or overcharging. Automatically flags providers and recalculates refund recommendations.

### Execution Trace: open_dispute_ticket

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent.ts
    participant Tool as CreateTicketTool
    participant Ctrl as Dispute Controller
    database DB as Supabase DB

    Agent->>Tool: execute({ bookingId, userId, providerId, disputeType, description })
    Tool->>Ctrl: createDisputeTicket(bookingId, userId, providerId, type, desc, sessionId)
    Ctrl->>DB: select price from bookings where id = bookingId
    DB-->>Ctrl: price
    Ctrl->>Ctrl: Calculate refund based on type
    Ctrl->>DB: insert into disputes
    Ctrl->>DB: update bookings set status = 'disputed'
    Note over Ctrl, DB: If providerFlagged = true
    Ctrl->>DB: select complaints, disputes from reputation
    DB-->>Ctrl: counts
    Ctrl->>DB: update reputation set complaints++, disputes++
    Ctrl->>DB: insert traces (DisputeAgent)
    Ctrl-->>Tool: DisputeOutput
    Tool-->>Agent: { success: true, result }
```

1.  **Booking Price Check**
    *   **File**: [disputeController.ts](file:///d:/DigitalKaam/backend/src/controllers/disputeController.ts#L27)
    *   **Function**: Fetches the price from the related booking record.
2.  **Refund Calculation**
    *   **File**: [disputeController.ts](file:///d:/DigitalKaam/backend/src/controllers/disputeController.ts#L37)
    *   **Logic**:
        *   `no_show`: 100% refund recommended, provider flagged.
        *   `price`: 20% refund recommended (overcharge buffer), provider flagged.
        *   `quality`: 30% refund recommended (re-service credit), provider flagged.
        *   `cancellation`: 100% refund, provider not flagged (handled as scheduling issue).
        *   `overrun`: 15% refund recommended, provider flagged.
3.  **Dispute Logging & Status Transitions**
    *   **DB Changes**:
        *   `disputes`: Inserts a new row with status `under_review`, recommendation resolution, and refund amount.
        *   `bookings`: Updates status to `disputed`.
4.  **Reputation Flagging**
    *   **File**: [disputeController.ts](file:///d:/DigitalKaam/backend/src/controllers/disputeController.ts#L87)
    *   **DB Changes**: If flagged, queries `reputation` and increments `complaints` and `disputes` counters by 1.

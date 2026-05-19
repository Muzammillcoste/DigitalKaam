# Document 08 — Business Workflows
## DigitalKaam Antigravity AI Service Platform

**Document Type**: Process Reference  
**Audience**: Product Managers, QA Engineers, Operations, Developers  
**Related Documents**: [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md) | [06_Pricing_Engine](06_Pricing_Engine.md) | [04_API_Documentation](04_API_Documentation.md)

---

## 1. Overview

This document describes the end-to-end business processes in DigitalKaam. There are five primary workflows:
1. User Registration
2. Provider Onboarding
3. Service Booking (AI Chat)
4. Service Booking (Direct Pipeline)
5. Dispute Resolution

---

## 2. Booking Lifecycle States

```mermaid
stateDiagram-v2
    [*] --> confirmed : Booking created by AI
    confirmed --> en_route : Provider sets status
    en_route --> arrived : Provider sets status
    arrived --> in_progress : Provider sets status
    in_progress --> completed : Provider sets status
    in_progress --> disputed : User opens dispute
    completed --> feedback_pending : Automatic transition
    feedback_pending --> completed : User submits feedback
    confirmed --> cancelled : User or provider cancels
    confirmed --> disputed : User opens dispute
    feedback_pending --> disputed : User opens dispute
```

### Status Messages

When a booking status changes via `PATCH /api/booking/:id/status`, human-readable messages are generated from status maps in `lifecycleController.ts`:

**User-facing messages**:
| Status | Message |
|--------|---------|
| `en_route` | "Your provider is on the way to you!" |
| `arrived` | "Your provider has arrived at your location." |
| `in_progress` | "Your service is now in progress." |
| `completed` | "Your service has been completed successfully." |
| `cancelled` | "Your booking has been cancelled." |
| `disputed` | "Your dispute has been opened. We'll review and respond within 24 hours." |

**Provider-facing messages**:
| Status | Message |
|--------|---------|
| `en_route` | "Start heading to the customer's location." |
| `arrived` | "You've marked arrival. Begin the service." |
| `in_progress` | "Service is in progress. Document your work." |
| `completed` | "Job marked complete. Awaiting customer confirmation." |

---

## 3. Booking Reference Format

Every booking is assigned a human-readable reference: **`DK-YYMMDD-XXXX`**

- `DK` — DigitalKaam prefix
- `YYMMDD` — date of booking (e.g., `260520` = May 20, 2026)
- `XXXX` — 4 characters randomly selected from ambiguity-filtered alphabet

**Ambiguity-filtered alphabet** (removes characters that look similar):
```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```
Excluded characters: `I`, `O`, `0`, `1` — to prevent customer misreading over the phone.

**Examples**: `DK-260520-K7M2`, `DK-260521-AXBR`

---

## 4. Workflow 1: User Registration

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Backend
    participant SupabaseAuth
    participant DB

    User->>App: Enter email, password, full_name
    App->>Backend: POST /api/auth/signup
    Backend->>SupabaseAuth: admin.createUser(email, password, email_confirm: true)
    SupabaseAuth-->>Backend: userId
    Backend->>DB: INSERT user_profiles (id, email, full_name, phone, home_area)

    alt Profile insert fails
        Backend->>SupabaseAuth: admin.deleteUser(userId)  [rollback]
        Backend-->>App: 500 error
    end

    Backend->>SupabaseAuth: signInWithPassword(email, password)
    SupabaseAuth-->>Backend: {access_token, refresh_token}
    Backend-->>App: 201 {access_token, refresh_token, userId, ...}
    App->>App: Store tokens securely
```

**Completion Criteria**:
- `auth.users` row created with `email_confirmed = true`
- `user_profiles` row created with `loyalty_points = 0`, `booking_count = 0`
- Active session returned immediately

---

## 5. Workflow 2: Google OAuth Registration

```mermaid
sequenceDiagram
    participant User
    participant App
    participant SupabaseOAuth
    participant Backend
    participant DB

    User->>App: Tap "Sign in with Google"
    App->>SupabaseOAuth: supabase.auth.signInWithOAuth({provider: 'google'})
    SupabaseOAuth-->>App: access_token (Google OAuth session)
    App->>Backend: POST /api/auth/profile/sync {full_name, phone, home_area}
    Backend->>DB: UPSERT user_profiles (on_conflict: user_id)
    DB-->>Backend: Profile row
    Backend-->>App: 200 {userId, email, isNewUser: true}
```

**Critical**: Without `profile/sync`, the user cannot open chat sessions (FK constraint on `chat_sessions.user_id`).

---

## 6. Workflow 3: Provider Onboarding

```mermaid
sequenceDiagram
    participant Provider
    participant App
    participant Backend
    participant DB

    Provider->>App: Fill provider form (service_type, hourly_rate, area, ...)
    App->>Backend: POST /api/provider/onboard (JWT required)
    Backend->>Backend: Validate service_type (one of 7 valid types)
    Backend->>Backend: Validate hourly_rate (100 ≤ rate ≤ 50000)
    Backend->>DB: SELECT providers WHERE user_id = userId
    
    alt Already a provider
        Backend-->>App: 409 "User already has a provider profile"
    end

    Backend->>DB: INSERT providers {status: 'active', hourly_rate, area, ...}
    Backend->>DB: INSERT reputation {provider_id, positive_reviews: 0, ...}
    Backend-->>App: 201 {providerId, provider: {...}}
```

### Valid Service Types
The backend validates service_type against exactly these 7 values:
1. `Electrician`
2. `Plumber`
3. `AC Technician`
4. `Carpenter`
5. `Painter`
6. `Cleaner`
7. `Home Appliance Technician`

Any other value returns a 400 error.

Providers are onboarded with their service `area` as text. The `providers` table also supports `latitude` and `longitude` columns for coordinate-based distance calculations, which are populated for seeded providers.

---

## 7. Workflow 4: Service Booking via AI Chat

This is the primary user journey.

```mermaid
flowchart TD
    A["User sends message\n'Need AC repair in Gulshan'"] --> B{"Session exists?"}
    B -->|No| C["Create chat_session record"]
    B -->|Yes| D["Load existing session"]
    C --> D
    D --> E["Load last 6 messages\n(sliding window)"]
    E --> F{"Turn count % 8 == 0?"}
    F -->|Yes| G["Run SummarizerAgent\n(compress history)"]
    F -->|No| H["Skip summarization"]
    G --> H
    H --> I["Get/Create OrchestratorAgent\n(from cache or rebuild)"]
    I --> J["Inject sessionId + userId\ninto sessionMetadata"]
    J --> K["Inject confirmed booking facts\ninto system instructions"]
    K --> L["Persist user message to DB"]
    L --> M["agent.run(userMessage)"]
    M --> N{"Gemini response type?"}
    N -->|"Tool call"| O["Execute tool\n(FindProviders, Quote, Availability, Booking)"]
    O --> P["Return result to Gemini"]
    P --> M
    N -->|"Text response"| Q["Persist AI response to DB"]
    Q --> R["Increment turn_count\nUpdate last_active"]
    R --> S["Return response to user"]
```

### 5-Step OrchestratorAgent Conversation Flow

The OrchestratorAgent follows a deterministic 5-step process:

| Step | Name | Actions |
|------|------|---------|
| 1 | Gather Information | Collect service type, problem description, location |
| 2 | Find Provider | Call `find_available_providers` tool |
| 3 | Quote and Availability | Call `calculate_dynamic_pricing` and `check_time_slots` |
| 4 | Confirm with User | Present summary, await explicit confirmation |
| 5 | Book | Call `confirm_service_booking` on user confirmation |

**Confirmation Triggers**: User must use confirmation language — "yes", "confirm", "book it", "theek hai" (Urdu: okay/agreed). The AI checks for these before proceeding to booking.

**One Session, One Booking Rule**: Once a booking is confirmed in a session, the `ConfirmBookingTool` blocks any further booking attempts for that session. This prevents duplicate bookings from repeated "yes" or message retries.

---

## 8. Workflow 5: Service Booking via Direct Pipeline

The Antigravity pipeline (`POST /api/service/request`) runs all 8 agents sequentially in a single API call.

```mermaid
flowchart LR
    subgraph "8-Agent Pipeline"
        A1["1. Intent\nNLP: service, severity,\nlocation, budget"] 
        --> A2["2. Context\nUser history,\nloyalty points"]
        --> A3["3. Complexity\nDuration estimate,\ncomplexity class"]
        --> A4["4. Discovery\nProvider search by\nservice + area"]
        --> A5["5. Matching\nScore all providers\n10-factor algorithm"]
        --> A6["6. Pricing\nDynamic quote\ncalculation"]
        --> A7["7. Scheduling\nFind available slot\nfor requested time"]
        --> A8["8. Booking\nCreate booking record\nmark slot booked"]
    end

    REQ["POST\n/api/service/request"] --> A1
    A8 --> RESP["Response:\nbookingRef, receipt,\nfull session result"]
```

**Early Exits**:
1. After Agent 1 (Intent): If Gemini returns `clarificationNeeded = true` → stop, return clarification question
2. After Agent 5 (Matching): If no providers found → stop, return `noProvidersAvailable`

---

## 9. Workflow 6: Booking Status Lifecycle

```mermaid
sequenceDiagram
    participant Provider App
    participant Backend
    participant DB

    Note over Provider App: Provider picks up the job

    Provider App->>Backend: PATCH /api/booking/{id}/status {status: "en_route"}
    Backend->>DB: UPDATE bookings SET status = 'en_route'
    Backend-->>Provider App: {newStatus: "en_route", message: "Start heading..."}
    Note over Backend: Push notification → User

    Provider App->>Backend: PATCH /api/booking/{id}/status {status: "arrived"}
    Backend->>DB: UPDATE bookings SET status = 'arrived'

    Provider App->>Backend: PATCH /api/booking/{id}/status {status: "in_progress"}
    Backend->>DB: UPDATE bookings SET status = 'in_progress'

    Provider App->>Backend: PATCH /api/booking/{id}/status {status: "completed", completionPhotoUrl: "..."}
    Backend->>DB: UPDATE bookings SET status = 'completed', completed_at = NOW()
    Note over Backend: Push notification → User

    Note over Provider App: Booking moves to feedback_pending automatically
```

**Push Notifications**: The `lifecycleController.ts` sends push notifications at each lifecycle transition, covering all 6 status events.

---

## 10. Workflow 7: Dispute Resolution

```mermaid
flowchart TD
    U["User opens dispute\nPOST /api/dispute\n{bookingId, disputeType, description}"] --> B["Save dispute record\nstatus: under_review"]
    B --> C["Dispute agent runs AI analysis\n(disputeController)"]
    C --> D{Dispute Type}
    D -->|no_show| E["100% refund\nproviderFlagged = true"]
    D -->|quality| F["30% refund\nproviderFlagged = true"]
    D -->|price| G["20% refund\nproviderFlagged = true"]
    D -->|overrun| H["15% refund\nproviderFlagged = true"]
    D -->|cancellation| I["100% refund\nproviderFlagged = false"]

    E & F & G & H & I --> J["Update booking status → 'disputed'"]
    J --> K{providerFlagged?}
    K -->|Yes| L["INCREMENT reputation.complaints\nINCREMENT reputation.disputes"]
    K -->|No| M["No reputation impact"]
    L & M --> N["Return disputeId, refundAmount, recommendation"]
```

### Refund Policy Table

| Dispute Type | Refund % | Provider Flagged | Notes |
|-------------|---------|-----------------|-------|
| `no_show` | 100% | Yes | Provider never arrived |
| `cancellation` | 100% | No | Mutual cancellation |
| `quality` | 30% | Yes | Poor workmanship |
| `price` | 20% | Yes | Unexpected charges |
| `overrun` | 15% | Yes | Job took too long |

**refundAmount calculation**:
```typescript
const refundAmount = Math.round(booking.price * refundPercent)
```

**Payment Gateway**: No actual refund is processed. The `refundAmount` is recorded in the `disputes` table but no payment API is called. Physical refund processing is a future capability.

---

## 11. Workflow 8: Post-Service Feedback

```mermaid
sequenceDiagram
    participant User App
    participant Backend
    participant DB

    User App->>Backend: POST /api/booking/{id}/feedback {rating: 4, reviewText: "..."}
    Backend->>DB: INSERT feedback {booking_id, provider_id, user_id, rating, review_text}
    Backend->>DB: UPDATE bookings SET status = 'completed'
    Backend->>DB: SELECT providers {rating, review_count}
    Backend->>Backend: newRating = round(((prevRating × count + rating) / (count + 1)) × 10) / 10
    Backend->>DB: UPDATE providers {rating: newRating, review_recency_score: 0.95}

    alt rating >= 4 (positive)
        Backend->>DB: UPDATE reputation SET positive_reviews += 1
    else rating < 4 (negative)
        Backend->>DB: UPDATE reputation SET negative_reviews += 1
    end

    Backend-->>User App: {newRating: 4.2, matchingImpact: "Positive: provider ranks higher"}
```

**Review Recency Score Reset**: On every new review, `review_recency_score` is reset to 0.95 regardless of previous value. This decays over time (mechanism: the score is compared against a time-based decay threshold in the matching algorithm).

---

## 12. Session Summary Trigger

After every 8 conversation turns, the chat route triggers automatic summarization:

```
turnCount % SUMMARIZE_EVERY === 0   (SUMMARIZE_EVERY = 8)
```

**SummarizerAgent** compresses the conversation into a single summary string stored in `chat_sessions.summary`. On the next session load, this summary is prepended to the context window instead of full message history.

This prevents the Gemini context window from overflowing on long conversations.

---

*See [09_Agent_Flow_Documentation.md](09_Agent_Flow_Documentation.md) for detailed agent behavior.*  
*See [06_Pricing_Engine.md](06_Pricing_Engine.md) for pricing formulas.*  
*See [11_Security_Review.md](11_Security_Review.md) for the security architecture of dispute and user endpoints.*

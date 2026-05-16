# DigitalKaam — Implementation Plan
# AI-Powered Informal Service Economy Platform
# Multi-Agent Architecture using Google Antigravity

---

## Goal Description

Build an end-to-end agentic system that automates the informal service lifecycle
(AC technicians, electricians, tutors, beauticians, mechanics, drivers, plumbers).

The system will:
- Handle multilingual input (English, Urdu, Roman Urdu, code-switched)
- Use a **Google Antigravity** multi-agent orchestrator
- Provide full transparency via reasoning traces and confidence scores
- Simulate the complete service lifecycle: request → booking → completion → feedback → dispute

---

## Tech Stack

| Layer             | Technology                              |
|-------------------|-----------------------------------------|
| Mobile App        | React Native (Expo)                     |
| Push Notifications| Expo Push Notifications                 |
| API Gateway       | Node.js + Express + TypeScript          |
| AI Orchestrator   | Google Antigravity (Gemini API)         |
| Database & Auth   | Supabase (PostgreSQL + Auth + Realtime) |
| Maps/Location     | Google Maps/Places API + local fallback |

> All booking, reminder, completion, and schedule notifications are
> **mobile push notifications via Expo Push Notifications** — no WhatsApp/SMS dependency.

---

## High-Level Architecture

```
Mobile App (React Native Expo)
            ↓
API Gateway (Node.js + TypeScript + Express)
            ↓
Google Antigravity Orchestrator
            ↓
 ┌──────────────────────────────────────────────────────────┐
 │  Intent Agent → Context Agent → Complexity Agent         │
 │  → Provider Discovery Agent → Matching Agent             │
 │  → Pricing Agent → Scheduling Agent → Booking Agent      │
 │  → Service Lifecycle Agent → Feedback/Reputation Agent   │
 │  → Dispute Agent → Trace Agent                           │
 └──────────────────────────────────────────────────────────┘
            ↓
Supabase (PostgreSQL + Auth + Realtime)
```

Each agent contains:
- **Input** — structured data passed from previous agent
- **Tool calls** — Maps API, DB queries, push notifications
- **Output** — structured result for next agent
- **Confidence score** — reliability indicator for decisions
- **Logs** — full execution trace
- **Reasoning traces** — human-readable explanation of decisions

---

## Open Questions

> [!IMPORTANT]
> **Google Gemini API Key**: Required for the Antigravity orchestrator in backend `.env`.

> [!IMPORTANT]
> **Google Maps API Key**: Required for distance/travel time. Falls back to local cache if unavailable.

> [!IMPORTANT]
> **Supabase Project**: Need `SUPABASE_URL` and `SUPABASE_ANON_KEY`. New or existing project?

---

## Registration & Authentication

### User Registration (Customer)
1. User opens app → taps **Sign Up**
2. Enters: **Full Name**, **Phone Number**, **Email**, **Password**, **Home Area** (Gulshan, DHA, etc.)
3. Supabase Auth creates the account (email/phone verification)
4. A `user_profiles` row is created automatically in the DB
5. User is directed to the Home (chat) screen

### Provider Registration
1. Provider taps **Register as Provider**
2. Enters: **Full Name**, **Phone**, **Email**, **Password**
3. Then fills **Provider Profile**:
   - Service Type (AC Technician, Electrician, etc.)
   - Specialization, Skills, Certifications
   - Experience Years
   - Hourly Rate
   - Travel Radius (km)
   - Operating Area(s)
   - CNIC / ID (for trust verification — stored, not verified in prototype)
4. Supabase Auth creates the account
5. A `providers` row is created in the DB with `status: pending_review`
6. For prototype: auto-approved to `status: active`
7. Provider lands on the **Provider Dashboard**

---

## Database Design (Supabase / PostgreSQL)

### `user_profiles` Table
> Extends Supabase Auth (`auth.users`). Needed for storing app-specific user data.
```ts
UserProfile {
  id: string (uuid)             // matches auth.users.id
  fullName: string
  phone: string
  email: string
  homeArea: string              // "Gulshan", "DHA", etc.
  loyaltyPoints: number         // for discount calculation
  preferredProviders: string[]  // provider ids user has used before
  blacklistedProviders: string[]
  expoPushToken: string         // for push notifications
  createdAt: timestamp
}
```

### `providers` Table
```ts
Provider {
  id: string (uuid)
  userId: string                // FK → auth.users (provider's own auth account)
  name: string
  phone: string
  email: string
  serviceType: string           // "AC Technician", "Electrician", etc.
  specialization: string        // "Inverter AC Repair", "3-Phase Wiring", etc.
  experienceYears: number
  rating: number                // 0–5 (weighted moving average, updated after each job)
  reviewCount: number
  reviewRecencyScore: number
  // reviewRecencyScore explanation:
  // A provider with 4.8 rating but last review 2 years ago is risky.
  // This score (0–1) decays over time:
  //   Review last week   → 0.95
  //   Review 3 months ago → 0.75
  //   Review 6 months ago → 0.55
  //   Review 1 year ago  → 0.30
  //   Review 2+ years ago → 0.10
  // Prevents ranking stale good reputation over active recent providers.
  onTimeScore: number           // 0–100 (% of jobs started on time)
  reliabilityScore: number      // 0–100 (composite: on-time + completion + no cancellation)
  cancellationRate: number      // 0–1 (fraction of accepted jobs cancelled)
  hourlyRate: number            // PKR per hour
  capacity: number              // max jobs per day
  skills: string[]
  certifications: string[]
  travelRadius: number          // km
  lat: number
  lng: number
  area: string
  status: string                // active | pending_review | suspended
  expoPushToken: string         // for push notifications to provider
  createdAt: timestamp
}
```

### `availability` Table
```ts
Availability {
  id: string
  providerId: string            // FK → providers
  date: string                  // YYYY-MM-DD
  startTime: string             // HH:MM
  endTime: string               // HH:MM
  isBooked: boolean
  travelBuffer: number          // minutes reserved after this slot for travel
}
```

### `bookings` Table
```ts
Booking {
  id: string
  providerId: string            // FK → providers
  userId: string                // FK → user_profiles
  userRequest: string           // raw user input (original text)
  status: string
  // Status flow:
  //   confirmed → en_route → arrived → in_progress → completed → feedback_pending
  //   OR: cancelled | disputed
  scheduledTime: string
  price: number
  priceBreakdown: jsonb         // itemized: visit fee, distance, urgency, etc.
  serviceComplexity: string     // basic | intermediate | complex
  receiptUrl: string            // generated receipt after confirmation
  completionPhotoUrl: string    // uploaded by provider on completion
  createdAt: timestamp
}
```

### `reputation` Table
```ts
Reputation {
  id: string
  providerId: string            // FK → providers
  positiveReviews: number
  negativeReviews: number
  complaints: number
  disputes: number
  lastUpdated: timestamp
}
```

### `traces` Table (Agent Trace Log)
```ts
Trace {
  id: string
  sessionId: string
  agent: string                 // "IntentAgent", "MatchingAgent", etc.
  input: jsonb
  output: jsonb
  reasoning: string
  toolCalls: jsonb
  confidenceScore: number       // 0–1
  timestamp: timestamp
}
```

### `disputes` Table
```ts
Dispute {
  id: string
  bookingId: string             // FK → bookings
  userId: string
  providerId: string
  type: string                  // no_show | quality | price | cancellation | overrun
  status: string                // open | under_review | resolved | escalated
  description: string
  resolution: string
  refundAmount: number
  createdAt: timestamp
}
```

### `feedback` Table
```ts
Feedback {
  id: string
  bookingId: string             // FK → bookings
  userId: string
  providerId: string
  rating: number                // 1–5
  reviewText: string
  createdAt: timestamp
}
```

---

## Notification System (Expo Push Notifications)

All notifications are mobile push notifications. No SMS or WhatsApp dependency.

### Notifications Sent to User (Customer)
| Trigger | Message |
|---|---|
| Booking confirmed | "Your booking is confirmed! [Provider] arrives at [time]" |
| Provider en route | "[Provider] is on the way to you" |
| Provider arrived | "[Provider] has arrived at your location" |
| Service completed | "Your service is complete. Was everything satisfactory?" |
| Booking reminder | "Reminder: Your [service] is scheduled tomorrow at [time]" |
| Provider cancelled | "Your provider cancelled. We're finding you a new one." |
| Dispute update | "Update on your dispute: [status]" |

### Notifications Sent to Provider
| Trigger | Message |
|---|---|
| New booking assigned | "New job assigned: [service] at [location] at [time]" |
| Upcoming job reminder | "Your next job is in 30 minutes: [location]" |
| Job cancelled by user | "Booking at [time] was cancelled by the user" |
| Dispute raised against them | "A dispute has been raised for booking #[id]" |

---

## Service Completion & Feedback Flow

```
Provider marks job as "Complete"
    ↓
Provider uploads at least 1 completion photo (evidence)
    ↓
System updates booking status → "completed"
    ↓
Push notification sent to USER:
"Your [service] is complete. Was everything satisfactory?"
    ↓
    ├── User taps YES
    │       ↓
    │   Show FEEDBACK screen
    │   User gives 1–5 star rating + optional review text
    │       ↓
    │   Reputation Agent updates provider rating
    │       ↓
    │   Booking closed ✅
    │
    └── User taps NO
            ↓
        Show DISPUTE screen
        User selects issue type:
        (quality / price / incomplete work / other)
            ↓
        Dispute Agent opens a dispute record
            ↓
        Provider and user notified
            ↓
        Dispute resolution workflow begins
```

---

## Booking Receipt

After a booking is confirmed, the app immediately shows a **Receipt Screen** containing:

```
═══════════════════════════════
       DIGITALKAAM RECEIPT
═══════════════════════════════
Booking ID:     #DK-20240517-001
Provider:       Ali AC Services
Service:        AC Repair (Inverter)
Complexity:     Complex
Scheduled:      Tomorrow, 10:00 AM
Location:       Gulshan-e-Iqbal

──────────── PRICING ────────────
Visit Fee:          PKR 500
Distance (4km):     PKR 150
Urgency Surcharge:  PKR 200
Complexity:         PKR 300
Loyalty Discount:  -PKR 100
─────────────────────────────────
Total:              PKR 1,050
═══════════════════════════════
Status: CONFIRMED ✅
```

Receipt is stored in the `bookings` table and viewable any time from Booking History.

---

## Multi-Agent Pipeline Detail

### Agent 1 — Intent Agent
**Input:** Raw user text (any language)
**Tools:** Gemini API (multilingual NLP)
**Output:**
```json
{
  "service": "AC Repair",
  "severity": "high",
  "location": "Gulshan",
  "time": "Tomorrow Morning",
  "budgetSensitivity": "high",
  "language": "Roman Urdu",
  "confidence": 0.88
}
```
**Fallback:** If `confidence < 0.7` → return clarification question to user instead of proceeding.

---

### Agent 2 — Context Agent
**Input:** Intent output + user profile from Supabase
**Output:** Enriched context (past preferences, loyalty points, blacklisted providers, area history)

---

### Agent 3 — Complexity Agent
**Input:** Service type + issue description
**Output:**
```json
{
  "complexity": "complex",
  "reason": "Compressor-level AC issue requires specialized tools and certification"
}
```
Categories: `basic` | `intermediate` | `complex`

Complex jobs only match providers with relevant specialization and certifications.

---

### Agent 4 — Provider Discovery Agent
**Tools:** Google Maps API, local provider cache (Supabase)
**Output:** List of candidate providers within travel radius and area match

**Fallback:** If Maps API fails → use local Supabase cache + log warning in trace

---

### Agent 5 — Matching Agent

**How the weighted score works:**

Each factor is normalized to a value between **0 and 1**. The weight (e.g., ×0.20) represents **how important** that factor is relative to others. All weights add up to **1.0 (= 100%)**.

The final score is one number per provider. Providers are ranked by this score (highest = best match).

```
score =
  distance_score       × 0.10 +   // closer = higher score (10% importance)
  availability_score   × 0.20 +   // available at requested time (20% — most critical)
  rating_score         × 0.10 +   // 0–5 stars normalized (10%)
  reviewRecency_score  × 0.10 +   // how recent the reviews are (10%)
  reliability_score    × 0.15 +   // on-time + low cancellation composite (15%)
  specialization_score × 0.10 +   // skill match to job complexity (10%)
  price_score          × 0.10 +   // lower rate = higher score (10%)
  capacity_score       × 0.05 +   // can they take more jobs today? (5%)
  cancelRate_score     × 0.05 +   // lower cancel rate = higher score (5%)
  userPreference_score × 0.05     // has user booked/liked this provider before? (5%)
```

**Why these weights?**
- **Availability (0.20)** is the highest — a provider who isn't free at your requested time is useless regardless of other scores
- **Reliability (0.15)** is second — showing up on time matters most for trust
- **Distance, rating, recency, specialization, price** all equally important at 0.10 each
- **Capacity, cancel rate, preference** are tie-breakers at 0.05

**Example Decision:**
> Provider A is 4km away, reliability=92, AC inverter specialist → score: 0.84
> Provider B is 2km away, reliability=67, general AC technician → score: 0.71
> **Provider A wins** despite being farther — higher reliability + specialization outweigh distance

---

### Agent 6 — Pricing Agent
**Dynamic pricing formula:**
```
Total = Base Fee
      + (Urgency Multiplier × Base Fee)
      + Travel Fee (per km × distance)
      + Complexity Surcharge
      + Demand Surge (if high demand period)
      - Loyalty Discount (based on loyalty points)
```

**Output:**
```
Visit Fee:          PKR 500
Distance (4km):     PKR 150
Urgency Surcharge:  PKR 200
Complexity:         PKR 300
Demand Surge:       PKR  50
Loyalty Discount:  -PKR 100
──────────────────────────
Total:              PKR 1,100
```

---

### Agent 7 — Scheduling Agent
**Responsibilities:**
- Prevent double booking
- Add travel-time buffer between consecutive provider jobs
- Detect conflicts → suggest next available slot
- Manage waitlists
- Auto-reschedule if provider cancels → notify user via push

**Example conflict resolution:**
```
Requested: 10:00 AM
Provider's existing booking: 9:00–10:30 AM (DHA)
Travel from DHA to Gulshan: ~30 mins

Conflict detected!
Suggested alternate slot: 11:30 AM
```

---

### Agent 8 — Booking Agent
**Actions:**
- Write booking record to Supabase `bookings` table
- Update `availability` slot to `isBooked: true`
- Generate receipt (stored in booking record)
- Send push notification to **user**: "Booking confirmed"
- Send push notification to **provider**: "New job assigned"
- Schedule reminder push notifications (24h before, 1h before)

---

### Agent 9 — Service Lifecycle Agent
**Manages status transitions via Supabase Realtime (live updates in app):**
```
confirmed
    ↓ (provider taps "En Route")
en_route          → Push to user: "Provider is on the way"
    ↓ (provider taps "Arrived")
arrived           → Push to user: "Provider has arrived"
    ↓ (provider taps "Start Service")
in_progress
    ↓ (provider uploads photo + taps "Complete")
completed         → Push to user: "Was your service satisfactory?"
    ↓
feedback_pending
```

Also: Push notification to provider **30 mins before next scheduled job**.

---

### Agent 10 — Feedback & Reputation Agent
**Input:** User rating (1–5) + optional review text
**Actions:**
- Write to `feedback` table
- Update provider `rating` (weighted moving average)
- Recalculate `reviewRecencyScore` (fresh review → score resets high)
- Update `reputation` table (positive/negative review counts)
- Recalculate future matching impact

---

### Agent 11 — Dispute Agent
**Triggered when user taps "NO" on service completion confirmation.**

**Handles:**
- No-show
- Quality complaint
- Price disagreement
- Cancellation after confirmation
- Service overrun / incomplete work

**Workflow:**
```
User selects dispute type
    ↓
Dispute record created in Supabase
    ↓
Both user and provider notified via push
    ↓
Agent compares quoted price vs charged (for price disputes)
    ↓
Recommends: refund / partial refund / re-do service
    ↓
If unresolved in 24h → escalate (flag for human review)
    ↓
Provider reputation flagged in Reputation table
```

---

### Agent 12 — Trace Agent
**Aggregates all agent logs per session:**
- Agent name, input, output, reasoning, tool calls, confidence score, timestamp
- Stored in Supabase `traces` table
- Surfaced in mobile app **Agent Trace Screen**

---

## Mock Dataset

**100–200 providers** across Karachi:

| Area            | Provider Categories                          |
|-----------------|----------------------------------------------|
| Gulshan         | AC Technician, Electrician, Plumber          |
| DHA             | AC Technician, Mechanic, Beautician          |
| Malir           | Electrician, Plumber, Tutor                  |
| Saddar          | Mechanic, Electrician, AC Technician         |
| North Nazimabad | Tutor, Beautician, Plumber                   |

**Sample provider record:**
```json
{
  "name": "Ali AC Services",
  "serviceType": "AC Technician",
  "specialization": "Inverter AC Repair",
  "experienceYears": 6,
  "rating": 4.7,
  "reviewCount": 142,
  "reviewRecencyScore": 0.91,
  "onTimeScore": 88,
  "reliabilityScore": 92,
  "cancellationRate": 0.03,
  "hourlyRate": 800,
  "capacity": 4,
  "skills": ["Inverter repair", "Gas refill", "PCB diagnosis"],
  "certifications": ["HVAC Level 2"],
  "area": "Gulshan",
  "lat": 24.9217,
  "lng": 67.0991
}
```

---

## Mobile App Screens

| Screen                  | Description                                               |
|-------------------------|-----------------------------------------------------------|
| Onboarding              | App intro slides                                          |
| Register (User)         | Name, phone, email, password, home area                  |
| Register (Provider)     | Name + service details + skills + hourly rate + area     |
| Login                   | Email/phone + password (Supabase Auth)                   |
| Home                    | Chat interface for service requests                       |
| Processing              | Live animated agent workflow steps                        |
| Provider Cards          | Ranked providers with score + reasoning                  |
| Pricing Breakdown       | Transparent itemized quote                               |
| Booking Confirmation    | Confirm booking → triggers all agents                    |
| Receipt                 | Booking receipt shown immediately after confirmation     |
| Service Lifecycle       | Live status updates (Supabase Realtime)                  |
| Agent Trace             | Step-by-step agent reasoning logs                        |
| Dispute Screen          | Create and track disputes                                |
| Feedback Screen         | 1–5 star rating + review after service                   |
| Booking History         | Past bookings + receipts                                 |
| Provider Dashboard      | Demand forecasting + availability suggestions            |
| Notifications           | Notification history                                     |

---

## Stress-Test Scenarios (Demo)

| Scenario | Expected Behavior |
|---|---|
| No providers in time window | Agent returns next available slot + waitlist option |
| Provider cancels after confirmation | Scheduling agent auto-reassigns → push to user |
| Mixed/noisy language input | Intent Agent returns clarification question if confidence < 0.7 |
| Two users book same provider simultaneously | Scheduling agent detects conflict, assigns second user to next-best match |
| Price dispute after service | User taps NO → Dispute Agent: compare → refund → escalate |
| Maps API failure | Fallback to local provider cache + warning in trace log |
| Misspelled/Roman Urdu input | Intent Agent corrects via LLM, shows parsed result with confidence score |

---

## Implementation Phases

### Phase 1 — Setup & Foundation
- [ ] Initialize Expo React Native project (`mobile/`)
- [ ] Initialize Node.js + Express + TypeScript project (`backend/`)
- [ ] Connect Supabase (auth, DB, realtime)
- [ ] Run DB migrations (all 7 tables)
- [ ] Seed mock dataset (100–200 providers)
- [ ] Setup Expo Push Notification infrastructure

### Phase 2 — Core Orchestrator (Backend)
- [ ] Gemini API integration and prompt templates
- [ ] Build all 12 agent modules
- [ ] Build Antigravity pipeline orchestrator
- [ ] REST API routes: service request, booking, dispute, provider, lifecycle

### Phase 3 — Auth & Mobile App Core
- [ ] Onboarding screens
- [ ] User registration + login (Supabase Auth)
- [ ] Provider registration flow
- [ ] Home chat interface
- [ ] Processing screen (live animated agent steps)
- [ ] Provider recommendation cards with scoring explanation

### Phase 4 — Booking, Receipt & Lifecycle
- [ ] Pricing breakdown screen
- [ ] Booking confirmation screen
- [ ] Receipt screen (generated immediately on confirmation)
- [ ] Service lifecycle status (Supabase Realtime)
- [ ] Push notifications (user + provider)

### Phase 5 — Completion, Feedback & Disputes
- [ ] Provider completion flow (upload photo → mark complete)
- [ ] User completion prompt (YES → feedback / NO → dispute)
- [ ] Feedback/rating screen
- [ ] Dispute screen + dispute agent workflow
- [ ] Agent trace screen

### Phase 6 — Provider Dashboard & Innovation
- [ ] Provider dashboard (demand forecasting, upcoming jobs)
- [ ] Availability suggestion engine
- [ ] Notification history screen
- [ ] Stress-test scenario triggers (demo mode)

### Phase 7 — Polish & Demo Prep
- [ ] Error handling and fallbacks across all agents
- [ ] Full end-to-end demo walkthrough
- [ ] README documentation (architecture, APIs, assumptions, limitations)

---

## Verification Plan

- **Language parsing**: Test `"AC bilkul kaam nahi kar raha, kal subah G-13 mein technician chahiye, budget zyada nahi hai"` → verify structured output + confidence score
- **Matching**: Verify closer-but-less-reliable provider is outranked by specialized provider with explanation shown in UI
- **Scheduling conflicts**: Trigger overlapping booking → verify auto-slot suggestion
- **Completion flow**: Provider marks complete → push to user → YES path (feedback) + NO path (dispute)
- **Receipt**: Confirm receipt appears immediately after booking confirmation
- **Provider notifications**: Verify 30-min-before push notification for upcoming job
- **Dispute flow**: Trigger price dispute → verify refund recommendation + escalation
- **Fallbacks**: Disable Maps API → verify local cache fallback logged in trace
- **Auth**: Register as user, register as provider, login with both roles

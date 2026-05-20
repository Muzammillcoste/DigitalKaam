# Document 16 — Platform Capabilities Reference
## DigitalKaam AI Service Platform

**Document Type**: Capabilities Reference  
**Audience**: Engineering Team, CTO, Product Managers, Stakeholders  
**Related Documents**: [01_System_Architecture](01_System_Architecture.md) | [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md) | [06_Pricing_Engine](06_Pricing_Engine.md) | [08_Business_Workflows](08_Business_Workflows.md)

---

## 1. Platform Capabilities Overview

DigitalKaam is a full-stack AI-powered service marketplace. This document provides a comprehensive reference of all implemented capabilities across every functional domain of the platform.

| Domain | Capabilities |
|--------|-------------|
| AI Orchestration | ADK conversational agent |
| Service Discovery | Geographic provider search, area canonicalization, service aliasing |
| Provider Matching | 10-factor weighted scoring algorithm |
| Pricing Engine | Dynamic DB-driven pricing with loyalty integration |
| Booking Lifecycle | 6-state machine with full transition management |
| Loyalty Program | Points earning, redemption, cap enforcement |
| Dispute Resolution | Type-based dispute handling with refund calculation |
| Reputation System | Weighted moving average with recency scoring |
| Authentication | Supabase JWT with token auto-refresh |
| Observability | Full AI decision trace logging per agent per session |
| Communication | Multi-language NLP (English, Urdu, Roman Urdu) |
| Voice Interface | Speech-to-text transcription + text-to-speech synthesis |

---

## 2. AI Orchestration Capabilities

### 2.1 ADK Conversational Agent

The ADK (Agent Development Kit) provides a persistent conversational interface powered by a Gemini orchestrator that drives the same booking capabilities through natural language interaction.

**Conversational capabilities**:
- Multi-turn conversation with persistent session memory
- Context-aware responses using full booking history
- Tool-calling for real-time data retrieval and booking actions
- Automatic conversation summarization every 8 turns
- Anti-hallucination booking data injection into system instructions
- Session metadata enforcement (user ID, location, timestamps)

**Available tools in the ADK**:

| Tool | Function |
|------|---------|
| `FindProvidersTool` | Geographic provider discovery with service type filtering |
| `CheckAvailabilityTool` | Provider schedule retrieval |
| `CalculateQuoteTool` | Real-time price estimation |
| `ConfirmBookingTool` | Booking creation with duplicate prevention |
| `GetBookingsTool` | User booking history retrieval |
| `CreateTicketTool` | Dispute and support ticket creation |

---

## 3. Service Discovery Capabilities

### 3.1 Provider Search

The discovery system queries the provider database with geographic and service-type filters, returning all active providers matching the request criteria.

**Service categories supported**:
Electrician, Plumber, AC Technician, Mechanic, Tutor, Beautician, Driver — with synonym aliasing that maps common colloquial terms to canonical service types.

### 3.2 Area Canonicalization

The system normalizes area name variations to canonical Karachi geographic identifiers. User input like "DHA" or "Clifton Block 5" maps to standard area codes used for provider matching.

**Supported areas (15+)**: DHA, Clifton, Gulshan, PECHS, Bahria Town, North Nazimabad, Korangi, Landhi, Orangi, Malir, Saddar, Nazimabad, FB Area, Johar, and others.

---

## 4. Provider Matching Algorithm

The matching engine scores each discovered provider across 10 factors to produce a ranked list. The highest-scoring available provider is selected for booking.

| Factor | Weight | Description |
|--------|--------|-------------|
| Rating score | 20% | Provider star rating (0–5) normalized to 0–1 |
| Availability | 15% | Open slots matching requested timeframe |
| Area match | 10% | Provider's primary service area alignment |
| Experience | 10% | Booking count normalized to experience level |
| Response rate | 10% | Historical responsiveness |
| Price match | 10% | Rate alignment with job complexity |
| Recency score | 10% | Review recency weighting |
| Preference score | 10% | User's preferred/blacklisted provider history |
| Repeat bonus | 5% | Prior successful bookings with this user |
| Complexity fit | 5% | Provider's suitability for job complexity level |

**Score formula**:

$$\text{matchScore} = \sum_{i=1}^{10} w_i \times s_i$$

Where $w_i$ is the weight and $s_i$ is the normalized score (0–1) for each factor.

---

## 5. Pricing Engine Capabilities

### 5.1 Dynamic Fee Configuration

All pricing parameters are stored in the `platform_config` table and loaded directly from the database, enabling real-time fee updates without code deployment.

| Config Key | Default Value | Description |
|-----------|--------------|-------------|
| `base_visit_fee` | 500 PKR | Fixed visit charge |
| `platform_fee_percent` | 15% | Platform commission |
| `urgency_fee_low` | 0 PKR | No urgency surcharge |
| `urgency_fee_medium` | 150 PKR | Medium urgency fee |
| `urgency_fee_high` | 250 PKR | High urgency fee |
| `loyalty_discount_cap` | 200 PKR | Maximum loyalty redemption |

### 5.2 Price Calculation

$$\text{Total} = \text{visitFee} + \text{laborFee} + \text{urgencySurcharge} - \text{loyaltyDiscount} + \text{platformFee}$$

Where:
- $\text{laborFee} = \text{hourlyRate} \times \text{estimatedHours}$
- $\text{urgencySurcharge}$ = config value for the job severity tier
- $\text{loyaltyDiscount} = \lfloor\text{loyaltyPoints} / 100\rfloor \times 50$ (capped at `loyalty_discount_cap`)
- $\text{platformFee} = \text{subtotal} \times \text{platform\_fee\_percent}$

The complete `price_breakdown` object is stored as JSONB in the booking record, providing a full audit trail of every fee component.

---

## 6. Booking Lifecycle Management

### 6.1 Booking State Machine

Every booking progresses through a defined state sequence managed by the lifecycle controller:

```
confirmed → en_route → arrived → in_progress → completed → feedback
                                              ↓
                                          disputed
```

**State transition capabilities**:

| Transition | Trigger | Side Effects |
|-----------|---------|-------------|
| confirmed | Booking creation | Reference generated, availability marked reserved |
| en_route | Provider departs | Notifications dispatched to user and provider |
| arrived | Provider on site | Status logged, notifications dispatched |
| in_progress | Work begins | Active job tracking |
| completed | Work finished | Feedback collection enabled, notifications dispatched |
| disputed | Issue raised | Dispute record created, refund amount calculated |

### 6.2 Booking Reference System

Every booking receives a unique reference in the format `DK-YYMMDD-XXXX` using an ambiguity-filtered alphabet that excludes visually similar characters (no I, O, 0, 1), ensuring reliable verbal communication in customer support contexts.

---

## 7. Loyalty Program

### 7.1 Point Earning

Customers earn loyalty points on every completed booking:

$$\text{pointsEarned} = \lfloor\text{finalTotal} / 100\rfloor \times 10$$

### 7.2 Point Redemption

Points are redeemed at a rate of 100 points = PKR 50, with a maximum redemption of PKR 200 per booking (configurable via `loyalty_discount_cap`):

$$\text{loyaltyDiscount} = \min\left(\lfloor\text{points} / 100\rfloor \times 50,\ \text{loyalty\_discount\_cap}\right)$$

Points are integrated into the pricing calculation and reflected in the full price breakdown stored with each booking.

---

## 8. Dispute Resolution

The dispute system handles four categories of service issues, each with a defined refund calculation method:

| Dispute Type | Refund Calculation |
|-------------|-------------------|
| `no_show` | 100% of visit fee |
| `overcharge` | Difference between charged and quoted price |
| `quality` | 50% of labor fee |
| `damage` | Assessment-based (documented in dispute record) |

Every dispute links to the source booking, records the amount charged, and calculates the `refundAmount`. The associated booking status transitions to `disputed` and the provider's dispute count is incremented in the reputation record.

---

## 9. Reputation System

### 9.1 Rating Calculation

Provider ratings use a weighted moving average across all reviews:

$$\text{newRating} = \frac{(\text{currentRating} \times \text{reviewCount}) + \text{newRating}}{\text{reviewCount} + 1}$$

### 9.2 Recency Scoring

A recency decay factor ensures recent reviews carry more weight in provider discovery:

$$\text{recencyScore} = 0.95^{n}$$

Where $n$ is the number of reviews since the most recent one. The score is reset to `0.95` on each new review.

### 9.3 Reputation Record

Each provider has a `provider_reputation` record tracking:
- Total bookings, completed bookings, disputes, complaints, compliments
- Average rating and recency score
- All metrics are updated in real-time on feedback submission

---

## 10. Authentication & Session Management

### 10.1 Authentication Model

The platform uses Supabase Auth providing RS256-signed JWT tokens, email/password authentication, and Google OAuth support.

**Authentication flow**:
1. User submits credentials to `POST /api/auth/login`
2. Supabase Auth validates and issues access token + refresh token
3. Client includes `Authorization: Bearer <token>` on all subsequent requests
4. Middleware verifies token and attaches user context to request

### 10.2 Token Auto-Refresh

The authentication middleware supports seamless token renewal: when a client provides a refresh token via the `X-Refresh-Token` header, the middleware automatically issues a new token pair, returning the new access token in the `X-New-Access-Token` response header.

### 10.3 Isolated Auth Client

Token verification uses a dedicated disposable Supabase client instance per request, maintaining clean separation between verification context and the shared database client used for business operations.

### 10.4 Rate Limiting

Three-tier rate limiting protects all endpoints:

| Tier | Limit | Scope |
|------|-------|-------|
| General | 100/min | All routes |
| Chat | 20/min | `/api/chat` |
| Auth | 10/15min | `/api/auth/*` |

---

## 11. Observability & Trace Logging

Every AI agent decision is logged to the `traces` table with full input context and output:

```typescript
{
  session_id: string,
  agent: string,        // e.g., "IntentAgent", "MatchingAgent"
  input: JSONB,         // Agent's full input context
  output: JSONB,        // Agent's structured output
  timestamp: timestamptz
}
```

This creates a complete audit trail of every AI decision made for every service request, supporting debugging, quality monitoring, and business analytics.

---

## 12. Voice Interface

### 12.1 Speech-to-Text Transcription

`POST /api/chat/transcribe` accepts audio file upload and returns transcribed text using Gemini 2.0 Flash's multimodal capabilities. Supports Urdu, English, and Roman Urdu speech.

### 12.2 Text-to-Speech Synthesis

`POST /api/chat/speak` accepts text input and returns audio in WAV format using Gemini 2.5 Flash TTS with PCM-to-WAV conversion applied server-side.

---

## 13. Multi-Language Support

The platform natively processes input in three languages without any third-party translation service:

| Language | Input Support | Notes |
|----------|--------------|-------|
| English | Full | Primary API language |
| Urdu script | Full | Native Gemini multilingual support |
| Roman Urdu | Full | Transliterated Urdu in Latin script |

All AI agents maintain language consistency — responses are generated in the same language as the user's input.

---

## 14. API Surface

The platform exposes 12 route groups with 40+ endpoints:

| Route Group | Endpoints | Purpose |
|------------|-----------|---------|
| `/api/auth` | 4 | Login, register, logout, refresh |
| `/api/users` | 5 | User profile management |
| `/api/provider` | 5 | Provider profile and search |
| `/api/booking` | 7 | Booking CRUD and lifecycle |
| `/api/chat` | 5 | ADK conversational interface + voice |
| `/api/availability` | 4 | Provider schedule management |
| `/api/feedback` | 3 | Review submission |
| `/api/dispute` | 4 | Dispute management |
| `/api/reputation` | 4 | Provider reputation |
| `/api/admin` | 3 | Platform configuration management |
| `/api/traces` | 2 | AI audit log access |

---

*See [01_System_Architecture](01_System_Architecture.md) for system design overview.*  
*See [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md) for detailed agent analysis.*  
*See [06_Pricing_Engine](06_Pricing_Engine.md) for complete pricing documentation.*


| Priority | Items | Focus Area |

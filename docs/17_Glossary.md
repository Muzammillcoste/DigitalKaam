# Document 17 — Glossary
## DigitalKaam AI Service Platform

**Document Type**: Reference  
**Audience**: All team members, new joiners, stakeholders  
**Related Documents**: All documents in this collection

---

## A

**ADK (Agent Development Kit)**  
The internal framework in `backend/src/adk/` that provides the `Agent`, `Memory`, and `Tool` base classes for building conversational AI agents. The OrchestratorAgent is the only ADK agent actively used in production routes.

**Agent**  
A software component that invokes an AI model (Gemini) to process inputs and produce structured outputs. DigitalKaam has two types: pipeline agents (one-shot, stateless) and conversational agents (multi-turn, stateful via history).

**agentCache**  
An in-memory `Map<sessionId, Agent>` in `chat.routes.ts` that stores active `OrchestratorAgent` instances. Lost on server restart; rebuilt from DB on cache miss.

**availScore**  
A matching factor (weight: 0.20, highest weight) that is 1.0 if a provider has an unbooked availability slot for the requested date, 0.0 otherwise. Binary — no partial availability.

**AREA_COORDS**  
An object mapping Karachi area names (strings) to `{ lat, lng }` coordinates. Used by the Discovery and Matching agents for geographic distance calculation. Defined in both `discoveryController.ts` and `matchingController.ts`.

---

## B

**BookingAgent**  
ADK specialized agent module (`adk/agents/BookingAgent.ts`) that handles booking-related conversations. Creates booking records, marks availability slots as booked, and generates receipts. Source: `bookingController.ts`.

**booking_count**  
A field on `user_profiles` tracking total number of bookings made by a user. Incremented as a fire-and-forget async operation after booking creation. Used to determine `isReturningUser`.

**booking_ref**  
Human-readable booking identifier. Format: `DK-YYMMDD-XXXX` where `XXXX` is 4 characters from an ambiguity-filtered alphabet (no I, O, 0, 1). Example: `DK-260520-K7M2`.

**budgetSensitivity**  
A field in `IntentOutput` classifying whether the user appears to be price-conscious based on their request phrasing. Values: `low`, `medium`, `high`. Used to set `isBudgetFriendly` flag in pricing output.

---

## C

**callGemini(prompt)**  
A helper function in `lib/gemini.ts` that sends a text prompt to Gemini and returns the raw text response.

**cancelScore**  
A matching factor (weight: 0.05) based on a provider's complaint-to-interaction ratio. Higher cancellations/complaints → lower score.

**capacityScore**  
A matching factor (weight: 0.05) based on how many upcoming bookings a provider has. Providers with lower current load score higher.

**chat_messages**  
Database table storing all conversation messages. Columns: `id`, `session_id`, `role` (user/assistant), `content`, `created_at`. Indexed on `(session_id, created_at)`.

**chat_sessions**  
Database table tracking conversation session metadata. Columns: `session_id`, `user_id`, `summary`, `turn_count`, `booking_ids[]`, `last_active`.

**ComplexityAgent**  
Removed — was part of the deprecated sequential pipeline.

**ConfirmBookingTool**  
An ADK tool (`adk/tools/ConfirmBookingTool.ts`) that creates a booking in the database. Contains the double-booking guard: checks for existing confirmed bookings in the session before creating a new one.

**confidence_score**  
A 0.0–1.0 float stored in every `traces` record indicating how confident the AI was in its output. High values (≥ 0.9) indicate deterministic or highly certain outputs. Low values (< 0.6) suggest ambiguous or fallback outputs.

**ContextAgent**  
Removed — was part of the deprecated sequential pipeline.

---

## D

**DigitalKaam**  
The platform name. Urdu for "Digital Work". An AI-powered home services marketplace connecting customers in Pakistan's informal economy with skilled service providers.

**Discovery**  
The process of finding candidate service providers based on service type and location. Implementation: `discoveryController.ts` and `FindProvidersTool.ts`.

**DiscoveryAgent**  
ADK specialized agent module (`adk/agents/DiscoveryAgent.ts`) that handles provider discovery conversations. Searches the `providers` table for active providers matching service type and area. Source: `discoveryController.ts`.

**distScore**  
A matching factor (weight: 0.10) based on Haversine distance between the provider's area and the user's area. Normalized 0–1 (closer = higher score). Only calculated when `AREA_COORDS` has entries for both areas.

**double-booking prevention**  
The mechanism in `ConfirmBookingTool` that queries for existing confirmed bookings in a session before creating a new one, returning `{ alreadyBooked: true }` if any exist.

---

## E

**email_confirm: true**  
A parameter passed to `admin.createUser()` during signup. Marks the new user's email as already confirmed, bypassing Supabase's email verification flow. Deliberate choice for mobile-first UX.

**estimatedDurationHours**  
A float representing the expected job duration. Input to `laborFee` calculation: `laborFee = round(hourlyRate × estimatedDurationHours)`.

---

## F

**feedback_pending**  
A booking status that follows `completed`, indicating the user hasn't yet submitted a review. The status enables a feedback prompt to be shown in the UI.

**FindProvidersTool**  
An ADK tool (`adk/tools/FindProvidersTool.ts`) that queries the `providers` table for active providers by service type and area. Returns top 5 by rating.

**fire-and-forget**  
An async pattern where a side-effect operation (e.g., incrementing booking_count) is launched in the background without awaiting its completion. Used in `bookingController.ts`. Failures are logged but do not affect the main operation.

---

## G

**Gemini**  
Google's large language model family. DigitalKaam uses 3 models:
- `gemini-2.5-flash` — OrchestratorAgent and SummarizerAgent
- `gemini-2.0-flash` — audio transcription
- `gemini-2.5-flash-preview-tts` — text-to-speech

**generateSpeech(text, voice)**  
A function in `lib/gemini.ts` that calls Gemini TTS to convert text to audio. Returns base64-encoded WAV. Gemini returns raw PCM which is wrapped via `pcmToWav()`.

---

## H

**Haversine distance**  
The formula used to calculate the great-circle distance between two lat/lng coordinate pairs. Used in the Matching agent to compute `distScore`. Named after the haversine trigonometric function.

**hourly_rate**  
A provider's charge per hour in PKR. Stored in `providers.hourly_rate`. Range: 100–50,000 PKR (validated at onboarding). Input to `laborFee = round(hourlyRate × estimatedHours)`.

---

## I

**IntentAgent**  
Removed — was part of the deprecated sequential pipeline.

**isReturningUser**  
A boolean in `ContextOutput`. True if `user_profiles.booking_count > 0`. Used by the orchestrator to customize messaging and potentially apply loyalty benefits.

---

## J

**JWT (JSON Web Token)**  
The token format issued by Supabase Auth after login. Contains user ID (`sub`), email, and expiry. Passed in `Authorization: Bearer <token>` header. Verified by `requireAuth` middleware via `getUser()`.

---

## L

**laborFee**  
A component of the service price. Calculated as `round(hourly_rate × estimatedDurationHours)`. Represents the provider's time cost.

**languageDetected**  
A field in `IntentOutput`. Values: `english`, `urdu`, `roman_urdu`. The OrchestratorAgent uses this to respond in the same language as the user.

**lifecycleController**  
The controller (`lifecycleController.ts`) that handles booking status transitions. Contains `STATUS_USER_MESSAGES` and `STATUS_PROVIDER_MESSAGES` maps for human-readable status text. Handles push notification dispatch for all lifecycle events.

**loyalty_discount_cap**  
The maximum loyalty discount per booking (default PKR 200). Configurable via `platform_config` table. Formula: `min(loyalty_discount_cap, floor(points/100) × 50)`.

**loyalty_points**  
An integer field on `user_profiles` storing the user's loyalty balance. The discount is calculated from this balance at pricing time and applied to the booking subtotal.

---

## M

**matchScore**  
The combined weighted score for a provider candidate (0.0–1.0). Calculated from 10 normalized sub-scores. Determines provider ranking. Higher = better match.

**MatchingAgent**  
ADK specialized agent module (`adk/agents/MatchingAgent.ts`). Scores and ranks all candidate providers using a 10-factor algorithm. Source: `matchingController.ts`.

**min-max normalization**  
The technique used to normalize provider scores to 0–1 range: `(value - min) / (max - min)`. Applied to rating, price, and other numerical factors.

---

## O

**OrchestratorAgent**  
The main conversational AI agent for the chat interface. Uses Gemini 2.5 Flash with function-calling. Implements a 5-step booking flow. Source: `adk/agents/OrchestratorAgent.ts`. Active in `POST /api/chat`.

---

## P

**pcmToWav(pcm)**  
A utility function in `lib/gemini.ts` that wraps raw PCM audio bytes in a WAV file container. Required because Gemini TTS returns raw PCM without headers. Output: 24000 Hz, mono, 16-bit PCM WAV.

**platform_config**  
A database table storing configurable fee parameters. 6 rows, hot-reloadable. Keys: `platform_fee_fixed`, `platform_fee_percent`, `visit_fee`, `urgency_fee_high`, `urgency_fee_medium`, `loyalty_discount_cap`.

**platformFee**  
A component of the service price representing the platform's revenue per booking. Calculated as `round(platform_fee_fixed + (serviceSubtotal × platform_fee_percent / 100))`.

**prefScore**  
A matching factor (weight: 0.05). 1.0 if provider is in user's `preferred_providers`, 0.0 if in `blacklisted_providers`, 0.5 otherwise.

**PricingAgent**  
ADK specialized agent module (`adk/agents/PricingAgent.ts`) that handles pricing conversations. Calculates the dynamic price quote. Source: `pricingController.ts`.

---

## R

**ratingScore**  
A matching factor (weight: 0.10) based on the provider's average star rating. Min-max normalized across all candidates.

**recencyScore**  
A matching factor (weight: 0.10) using `providers.review_recency_score`. Resets to 0.95 on any new review and decays over time. Rewards recently active providers.

**reliabilityScore**  
A matching factor (weight: 0.15) using `providers.reliability_score`. Manually set during seeding or via reputation tracking.

**reputation**  
Database table tracking provider reliability counters: `positive_reviews`, `negative_reviews`, `complaints`, `disputes`. Separate from the `rating` field on the `providers` table.

**requireAuth**  
Express middleware (`middleware/auth.ts`) that validates JWT tokens and sets `req.user`. Uses an isolated Supabase client to prevent JWT state from affecting the shared service_role client.

**review_recency_score**  
A float on `providers` that decays between reviews. Resets to 0.95 on every feedback submission. Represents how recently the provider received reviews. Used as `recencyScore` in matching.

**RLS (Row Level Security)**  
A PostgreSQL security feature providing row-level access control policies. The DigitalKaam backend uses the service-role client, which operates with full administrative database access.

**Roman Urdu**  
Urdu written in Latin (Roman) script — commonly used in Pakistan for informal text communication. The OrchestratorAgent detects and responds in Roman Urdu when users write in this style.

---

## S

**SchedulingAgent**  
ADK specialized agent module (`adk/agents/SchedulingAgent.ts`) that handles scheduling conversations. Finds an available time slot for the top-matched provider on the requested date. Source: `schedulingController.ts`.

**service_role key**  
The Supabase admin API key stored in `SUPABASE_SERVICE_KEY`. Bypasses all RLS policies. Used by the backend for all database operations. Must never be exposed client-side.

**serviceSubtotal**  
An intermediate pricing variable: `visitFee + laborFee + urgencySurcharge - loyaltyDiscount`. The basis for platform fee calculation.

**session_id**  
UUID identifying a chat conversation. Stored in `chat_sessions`, `chat_messages`, `bookings`, and `traces`. Acts as the primary correlation ID for all operations in a conversation.

**sessionMetadata**  
A field on the `Agent` class (`{ sessionId, userId }`) injected into every tool call by the chat route. Ensures tools always receive session context even if Gemini omits it from function arguments.

**severity**  
Classification of request urgency. Values: `low` (routine), `medium` (inconvenient), `high` (emergency). Affects urgency surcharge in pricing.

**specializationScore**  
A matching factor (weight: 0.10). 1.0 if provider's `skills` array contains keywords from the user's problem description, 0.5 otherwise.

**SummarizerAgent**  
An ADK agent (`adk/agents/SummarizerAgent.ts`) that compresses conversation history into a single summary string. Triggered every 8 turns. Stored in `chat_sessions.summary`.

---

## T

**traces**  
Database table storing AI decision audit records. One row per agent invocation per session. Columns: `agent`, `input` (JSONB), `output` (JSONB), `reasoning`, `confidence_score`. Queryable via `GET /api/traces?sessionId=xxx`.

**transcribeAudio(base64, mimeType)**  
A function in `lib/gemini.ts` using `gemini-2.0-flash` multimodal to transcribe voice audio to text. Supports m4a, mp4, wav, webm, ogg.

**travel_buffer**  
A field on `availability` slots representing the provider's travel time buffer (in minutes) before and after a job. Part of scheduling considerations.

**turn_count**  
A counter on `chat_sessions` tracking the total number of conversation turns. Incremented after each assistant response. Used to trigger summarization (every 8 turns).

---

## U

**urgencySurcharge**  
A pricing component added for medium/high severity requests. Values: `0` (low), `urgency_fee_medium` (default PKR 100), `urgency_fee_high` (default PKR 250). Configurable via `platform_config`.

**user_profiles**  
Database table extending Supabase's `auth.users`. Stores application-level user data: `full_name`, `phone`, `home_area`, `loyalty_points`, `booking_count`, `preferred_providers[]`, `blacklisted_providers[]`.

---

## V

**visitFee**  
The provider callout/diagnostic fee. Applied on every booking regardless of job complexity. Default: PKR 500. Configurable via `platform_config.visit_fee`. Also serves as the minimum total price (via `MAX(visitFee, total)` guarantee).

---

## W

**WINDOW_SIZE**  
The number of recent messages loaded from the database when rebuilding an agent's context. Value: 6 (3 conversation turns). Defined as a constant in `chat.routes.ts`.

---

## X

**X-New-Access-Token** / **X-New-Refresh-Token** / **X-New-Expires-In**  
Response headers set by `requireAuth` middleware when a token is auto-refreshed. Clients must read these headers and update their stored tokens.

**X-Refresh-Token**  
Request header sent by clients alongside expired access tokens. Triggers auto-refresh in `requireAuth` middleware.

---

*This glossary covers all domain terms, architectural concepts, and technical acronyms used across the DigitalKaam documentation suite.*

# Fix: Double Booking, Stale Summary, and Post-Restart Memory Loss

## Root Cause Analysis

Looking at the conversation log, there are **3 distinct bugs** all stemming from how context is rebuilt after a server restart:

### Bug 1: Stale Summary → Ghost Booking
The summary says *"conversation is in initial stage"* even though a booking was already confirmed. When the user said "صحیح ہے" (correct), the AI had lost context about the existing booking and interpreted it as a new confirmation — creating a **second booking** (`c92bb15a...`) for Sana Electric Works, even though the user only confirmed the first one (`d5eb022d...` for Ahmed Wiring Experts).

**Why?** Summarization triggers at turn 8, but the summarizer only gets the *older* messages via a `range(0, turnCount - WINDOW_SIZE - 1)` query. This range calculation is wrong — it can miss the booking confirmation messages entirely, producing a summary that says the conversation is "in initial stage."

### Bug 2: Agent Rebuilt Without Booking State
After server restart, the `agentCache` is empty. The agent is rebuilt with only:
- A stale/bad summary (which doesn't mention the booking)
- The last 6 messages (WINDOW_SIZE) — which may not include the booking confirmation

This means the rebuilt agent has **no knowledge** that a booking already happened, so it's susceptible to confirming again.

### Bug 3: "You didn't book" — Memory Loss
When the user asks for their booking number, the agent says "booking hasn't been confirmed yet." This is because:
1. The summary doesn't mention the booking
2. The 6 most recent messages in the window may not contain the booking confirmation
3. The agent literally has no record of the booking in its context

## Proposed Changes

### 1. Booking State Tracking on `chat_sessions`

#### [MODIFY] [supabase_schema.sql](file:///d:/DigitalKaam/supabase_schema.sql)

Add a `booking_ids` column to `chat_sessions` to act as a **source of truth** for what bookings exist in this session. This is *not* AI-generated context — it's a hard fact from the database.

```sql
ALTER TABLE public.chat_sessions ADD COLUMN booking_ids UUID[] DEFAULT '{}';
```

---

### 2. Inject Booking Facts Into Agent Context (Restart-Proof)

#### [MODIFY] [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts)

When rebuilding the agent (cache miss = after restart), **query the `bookings` table** for this session and inject hard booking facts into the system instructions. This is immune to summarization failures.

Key changes:
- Query `bookings` table for this `sessionId` to get confirmed bookings
- Build a "booking facts" block and inject it into agent instructions
- This ensures the agent **always knows** about confirmed bookings regardless of summary quality

---

### 3. Duplicate Booking Guard in ConfirmBookingTool

#### [MODIFY] [ConfirmBookingTool.ts](file:///d:/DigitalKaam/backend/src/adk/tools/ConfirmBookingTool.ts)

Add a **database-level guard** before inserting a booking:
- Check if a `confirmed` booking already exists for this `(session_id, provider_id, requested_date)` combination
- If yes, return the existing booking ID instead of creating a duplicate
- This is the **last line of defense** — even if the AI hallucinates a confirmation, no duplicate row is created

---

### 4. Fix Summary Range Bug

#### [MODIFY] [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts)

The current range query is:
```ts
.range(0, Math.max(0, currentTurnCount - WINDOW_SIZE - 1))
```

This is incorrect. `turn_count` counts *turns* (pairs), but messages are individual rows. The range should be based on actual message count. Fix: summarize **all messages except the last WINDOW_SIZE** instead of using a fragile range calculation.

---

### 5. Improve Summarizer to Preserve Booking IDs

#### [MODIFY] [SummarizerAgent.ts](file:///d:/DigitalKaam/backend/src/adk/agents/SummarizerAgent.ts)

Update the summarizer prompt to **explicitly extract and preserve booking IDs** in the summary. Add a structured output requirement:
```
CRITICAL: If any booking was confirmed, you MUST include the booking ID in the summary.
Format: "BOOKING CONFIRMED: [booking_id] for [provider] on [date] at [time]"
```

---

### 6. Fix WINDOW_SIZE Query Direction

#### [MODIFY] [chat.routes.ts](file:///d:/DigitalKaam/backend/src/routes/chat.routes.ts)

The current "recent messages" query uses `.limit(WINDOW_SIZE)` with ascending order — this fetches the **first** N messages, not the **last** N. Need to query descending then reverse, or use a subquery approach.

---

## Summary of Defense Layers

| Layer | What It Prevents | Survives Restart? |
|-------|-----------------|-------------------|
| DB booking_ids on session | Summary losing booking info | ✅ |
| Booking facts injection | Agent not knowing about bookings | ✅ |
| Duplicate booking guard | Double booking at DB level | ✅ |
| Fixed summary range | Bad/stale summaries | ✅ |
| Improved summarizer prompt | Summary forgetting bookings | ✅ |
| Fixed WINDOW_SIZE query | Loading wrong messages into context | ✅ |

## Verification Plan

### Automated Tests
1. Restart the server and send a message — verify the agent knows about existing bookings
2. Try to confirm a booking that already exists — verify it returns existing ID, not a duplicate
3. Check that summarization captures booking details

### Manual Verification
- Reproduce the exact conversation flow from the bug report
- Verify no double booking occurs
- Verify booking number is correctly recalled after restart

# Document 12 — Observability & Logging
## DigitalKaam AI Service Platform

**Document Type**: Operations Reference  
**Audience**: DevOps Engineers, Backend Developers, Operations Team  
**Related Documents**: [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md) | [03_Database_Architecture](03_Database_Architecture.md) | [14_Deployment_Architecture](14_Deployment_Architecture.md)

---

## 1. Overview

DigitalKaam's observability architecture is built on three integrated primitives:

1. **DB Trace System** — Every AI agent decision is recorded in the `traces` table with full input, output, reasoning, and confidence score
2. **Named Console Logging** — Prefixed log format throughout for clear operational visibility
3. **Graceful Error Handling** — Safe fallback patterns in all agent controllers

---

## 2. Agent Trace System

### 2.1 Trace Structure

Every ADK tool writes a trace record to the `traces` table upon completion:

```typescript
await supabase.from('traces').insert({
  id: uuid(),
  session_id: sessionId,
  agent: 'OrchestratorAgent',
  input: JSON.stringify(input),
  output: JSON.stringify(output),
  reasoning: 'Human readable explanation of the AI decision',
  confidence_score: 0.85,
  created_at: new Date().toISOString()
})
```

### 2.2 Agents That Write Traces

| Agent | Trace Agent Name | Confidence Behavior |
|-------|-----------------|---------------------|
| Discovery | `DiscoveryAgent` | `providers.length > 0 ? 0.9 : 0.3` |
| Matching | `MatchingAgent` | `topProvider.matchScore` |
| Pricing | `PricingAgent` | 0.9 (deterministic) |
| Scheduling | `SchedulingAgent` | `slot ? 0.9 : 0.4` |
| Booking | `BookingAgent` | 0.95 (confirmed) |

### 2.3 Querying Traces

```bash
# All traces for a session (full session replay)
GET /api/traces?sessionId=<uuid>

# Single trace
GET /api/traces/<trace-id>
```

**Response example**:
```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "agent": "OrchestratorAgent",
    "input": "{\"userInput\":\"Need AC repair in Gulshan\"}",
    "output": "{\"service\":\"AC Technician\",\"severity\":\"high\",...}",
    "reasoning": "Detected high-urgency AC repair request in Gulshan area",
    "confidence_score": 0.9,
    "created_at": "2026-05-20T10:00:00Z"
  },
  { "agent": "FindProvidersTool", ... },
  { "agent": "MatchingAgent", ... }
]
```

**Use cases**:
- Replay a full chat session to understand every AI decision
- Audit pricing decisions for a booking
- Analyze confidence patterns across agent types
- Understand provider selection rationale

---

## 3. Console Logging Conventions

All modules use named-prefix logging for clear, searchable output.

### 3.1 Naming Convention

```
[AgentName] Message
```

### 3.2 Log Patterns by Module

| Module | Log Prefix | Example |
|--------|-----------|---------|
| OrchestratorAgent | `[OrchestratorAgent]` | `[OrchestratorAgent] Tool call: find_available_providers` |
| BookingAgent | `[BookingAgent]` | `[BookingAgent] Booking created: DK-260520-K7M2` |
| MatchingAgent | `[MatchingAgent]` | `[MatchingAgent] Scored 5 providers, top: Ahmed (0.78)` |
| PricingAgent | `[PricingAgent]` | `[PricingAgent] Total: PKR 2258` |
| Auth Middleware | `[Auth]` | `[Auth] Token verified: user-uuid` |
| Lifecycle | `[Lifecycle]` | `[Lifecycle] Status updated: confirmed → en_route` |
| Push Notifications | `[Push Notification]` | `[Push Notification] TO: user-uuid TITLE: Provider en route` |

### 3.3 Log Levels

| Level | Usage |
|-------|-------|
| `console.log` | Normal operation, debug information |
| `console.error` | Caught exceptions, failed operations |
| `console.warn` | Unexpected but non-fatal conditions |

---

## 4. Error Handling Architecture

### 4.1 AI Agent Fallback Pattern

The ADK agent loop catches errors and returns safe defaults, ensuring conversations continue processing:

```typescript
// Pattern applied consistently across tool handlers
try {
  const raw = await callGemini(prompt)
  const parsed = JSON.parse(raw)
  return parsed
} catch (error) {
  console.error('[OrchestratorAgent] Failed to parse Gemini response:', error)
  return {
    service: 'General Service',
    severity: 'medium',
    clarificationNeeded: false,
    // ... safe defaults
  }
}
```

This pattern ensures the ADK agent completes gracefully in all conditions, including partial Gemini API responses.

### 4.2 Route-Level Error Handling

All Express route handlers have top-level try/catch for consistent error responses:

```typescript
router.post('/chat', async (req, res) => {
  try {
    // handler logic
  } catch (error) {
    console.error('[Chat] Unhandled error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

---

## 5. Session Correlation

Session ID serves as the primary correlation identifier for chat flows. All database operations reference `session_id` as a foreign key, enabling complete reconstruction of a session's operations:

- `chat_sessions` — session metadata and summary
- `chat_messages` — full conversation history
- `traces` — all AI decisions in session order
- `bookings` — any bookings created during the session

**Chat sessions** generate a `sessionId` for each `/api/chat` conversation, stored in `bookings.session_id` and all trace records.

---

## 6. Health Endpoint

```bash
GET /health

Response:
{
  "status": "ok",
  "service": "DigitalKaam Antigravity API",
  "timestamp": "2026-05-20T10:00:00.000Z"
}
```

---

## 7. Database Observability

### Available via Supabase Dashboard

- Query performance insights
- Row counts per table
- Active connections

### Available via API

| Endpoint | Data |
|---------|------|
| `GET /api/traces?sessionId=xxx` | Full AI decision audit log for a session |
| `GET /api/chat/history?sessionId=xxx` | Complete conversation replay |
| `GET /api/booking/user/me` | User booking history |

---

## 8. Confidence Score Analysis

The `confidence_score` field enables quantitative AI reliability analysis:

| Score Range | Interpretation |
|------------|----------------|
| 0.9–1.0 | High confidence decision |
| 0.7–0.9 | Moderate confidence |
| 0.5–0.7 | Lower confidence — review recommended |
| < 0.5 | Very low confidence — investigate |

**Query to surface low-confidence decisions**:
```sql
SELECT session_id, agent, reasoning, confidence_score
FROM traces
WHERE confidence_score < 0.6
ORDER BY created_at DESC
LIMIT 100;
```

---

*See [14_Deployment_Architecture](14_Deployment_Architecture.md) for infrastructure context.*  
*See [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md) for agent logic details.*


## 2. Agent Trace System

### Trace Structure

Every ADK tool writes a trace record to the `traces` table upon completion:

```typescript
await supabase.from('traces').insert({
  id: uuid(),
  session_id: sessionId,
  agent: 'OrchestratorAgent',           // agent identifier
  input: JSON.stringify(input),   // full input object
  output: JSON.stringify(output), // full output object
  reasoning: 'Human readable explanation of the AI decision',
  confidence_score: 0.85,         // 0.0–1.0 float
  created_at: new Date().toISOString()
})
```

### Agents That Write Traces

| Agent | Trace Agent Name | Confidence Source |
|-------|-----------------|------------------|
| Discovery | `DiscoveryAgent` | `providers.length > 0 ? 0.9 : 0.3` |
| Matching | `MatchingAgent` | `topProvider.matchScore` |
| Pricing | `PricingAgent` | 0.9 (deterministic) |
| Scheduling | `SchedulingAgent` | `slot ? 0.9 : 0.4` |
| Booking | `BookingAgent` | 0.95 (confirmed) |

### Querying Traces

```bash
# All traces for a session (full session replay)
GET /api/traces?sessionId=<uuid>

# Single trace
GET /api/traces/<trace-id>
```

**Response example**:
```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "agent": "OrchestratorAgent",
    "input": "{\"userInput\":\"Need AC repair in Gulshan\"}",
    "output": "{\"service\":\"AC Technician\",\"severity\":\"high\",...}",
    "reasoning": "Detected high-urgency AC repair request in Gulshan area",
    "confidence_score": 0.9,
    "created_at": "2026-05-20T10:00:00Z"
  },
  { "agent": "FindProvidersTool", ... },
  { "agent": "MatchingAgent", ... },
  ...
]
```

**Use cases**:
- Debug why a wrong provider was selected
- Audit pricing decisions
- Understand why a booking failed
- Analyze AI confidence patterns

---

## 3. Console Logging Conventions

The codebase uses `console.log`, `console.error`, and `console.warn` with named prefixes.

### Naming Convention

```
[AgentName] Message
```

### Log Patterns by Module

| Module | Log Prefix | Example |
|--------|-----------|---------|
| OrchestratorAgent | `[OrchestratorAgent]` | `[OrchestratorAgent] Tool call: find_available_providers` |
| BookingAgent | `[BookingAgent]` | `[BookingAgent] Booking created: DK-260520-K7M2` |
| MatchingAgent | `[MatchingAgent]` | `[MatchingAgent] Scored 5 providers, top: Ahmed (0.78)` |
| PricingAgent | `[PricingAgent]` | `[PricingAgent] Total: PKR 2258` |
| Auth Middleware | `[Auth]` | `[Auth] Token verified: user-uuid` |
| Lifecycle | `[Lifecycle]` | `[Lifecycle] Status updated: confirmed → en_route` |
| Push Notifications | `[Push Notification]` | `[Push Notification] TO: user-uuid TITLE: Provider en route` |

### Log Levels

| Level | When Used |
|-------|---------|
| `console.log` | Normal operation, debug info |
| `console.error` | Caught exceptions, failed operations |
| `console.warn` | Unexpected but non-fatal conditions |

There is **no structured logging** (no JSON format, no log levels enumeration, no log IDs). All logs go to stdout and are only accessible via server process logs.

---

## 4. Error Handling Strategy

### Pattern: AI Agent Fallbacks

All ADK tool handlers catch errors and return safe defaults rather than throwing:

```typescript
// Pattern applied across ADK tool handlers
try {
  const raw = await callGemini(prompt)
  const parsed = JSON.parse(raw)
  return parsed
} catch (error) {
  console.error('[OrchestratorAgent] Failed to parse Gemini response:', error)
  return {
    service: 'General Service',
    severity: 'medium',
    clarificationNeeded: false,
    // ... safe defaults
  }
}
```

**Implication**: Tool failures are silent. If Gemini returns malformed JSON, the request proceeds with default values that may produce incorrect results. There is no alerting when fallback defaults are used.

### Pattern: Route-Level Try/Catch

All Express route handlers have top-level try/catch:

```typescript
router.post('/chat', async (req, res) => {
  try {
    // ... handler logic
  } catch (error) {
    console.error('[Chat] Unhandled error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

---

## 5. Request Tracing

There is **no distributed request tracing** (no trace IDs in headers, no correlation IDs). Each request is independent.

**Session ID** serves as a loose correlation ID for chat flows — all DB operations use `session_id` as a foreign key, enabling post-hoc reconstruction of a session's operations.

**Chat sessions** generate a `sessionId` for each `/api/chat` conversation (stored in `bookings.session_id`).

---

## 6. Health Endpoint

```bash
GET /health

Response:
{
  "status": "ok",
  "service": "DigitalKaam Antigravity API",
  "timestamp": "2026-05-20T10:00:00.000Z"
}
```

The health endpoint does **not** check:
- Database connectivity
- Gemini API availability
- Redis/cache connectivity (none exists)

For production, the health check should probe dependencies:

```typescript
// Recommended enhancement
GET /health

Response:
{
  "status": "ok",
  "checks": {
    "database": "ok",       // test Supabase connection
    "gemini": "ok",         // test API key validity
    "memory": "ok"          // check heap usage
  }
}
```

---

## 7. Database Observability

### Available via Supabase Dashboard

- Query performance insights (requires Supabase Pro plan)
- Row counts per table
- Active connections
- Slow query log

### Available via API

- `GET /api/traces` — AI decision audit log
- `GET /api/chat/history?sessionId=xxx` — Full conversation replay
- `GET /api/booking/user/me` — User booking history

---

## 8. Confidence Score Analysis

The `confidence_score` field in traces allows analysis of AI reliability:

| Score Range | Meaning | Action |
|------------|---------|--------|
| 0.9–1.0 | High confidence | Normal operation |
| 0.7–0.9 | Moderate confidence | Monitor |
| 0.5–0.7 | Low confidence | Flag for review |
| < 0.5 | Very low confidence | Alert / investigate |

**Query to find low-confidence decisions**:
```sql
SELECT session_id, agent, reasoning, confidence_score
FROM traces
WHERE confidence_score < 0.6
ORDER BY created_at DESC
LIMIT 100;
```

---

*See [14_Deployment_Architecture](14_Deployment_Architecture.md) for infrastructure context.*  
*See [09_Agent_Flow_Documentation](09_Agent_Flow_Documentation.md) for agent logic details.*

*See [09_Agent_Flow_Documentation.md](09_Agent_Flow_Documentation.md) for agent trace details.*

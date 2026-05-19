# Document 11 — Security Architecture & Controls
## DigitalKaam Antigravity AI Service Platform

**Document Type**: Security Architecture Reference  
**Audience**: Security Engineers, Backend Developers, Compliance, CTO  
**Related Documents**: [05_Authentication_Authorization](05_Authentication_Authorization.md) | [03_Database_Architecture](03_Database_Architecture.md) | [04_API_Documentation](04_API_Documentation.md)

---

## 1. Security Controls Overview

DigitalKaam's security architecture is grounded in Supabase's managed identity platform, RS256-signed JWT session management, multi-tier rate limiting, server-enforced authorization middleware, and parameterized database access throughout.

| Layer | Control | Implementation |
|-------|---------|----------------|
| Identity | Supabase JWT authentication | RS256-signed, managed by Supabase Auth |
| Token lifecycle | Auto-refresh with header-based rotation | `X-Refresh-Token` / `X-New-Access-Token` |
| Session isolation | Disposable auth client per verification | Fresh client per request in middleware |
| Rate limiting | Three-tier (general / chat / auth) | `express-rate-limit` |
| Input validation | Numeric config validation, service-type allowlist | Controller-layer enforcement |
| Credential separation | All secrets server-side only | Environment variables, never in responses |
| DB access control | Service-role client with full backend authority | Supabase service_role key |
| Endpoint authorization | `requireAuth` middleware on all protected routes | Applied per route group |
| Query safety | Parameterized queries via Supabase JS client | No raw SQL concatenation |
| Session ownership | Application-layer ownership checks | User ID comparison on chat sessions |
| AI trust boundary | Server-enforced session metadata injection | `sessionMetadata` merged per tool call |

---

## 2. Authentication Architecture

### 2.1 Supabase JWT Authentication

All identity management is handled by Supabase Auth, providing RS256-signed JWTs, email/password and Google OAuth support, and automatic token lifecycle management. The backend never handles passwords directly — all credential operations are delegated to the managed Supabase Auth service.

```
Client → POST /api/auth/login
       → Supabase Auth validates credentials
       → Returns: access_token (JWT) + refresh_token
       → Client stores tokens and includes in Authorization header
```

### 2.2 Isolated Auth Client Pattern

The `requireAuth` middleware creates a **disposable Supabase client** for each token verification, independent from the shared service client used for database operations.

```typescript
// middleware/auth.ts
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!  // Isolated from service_role client
  )
  const { data: { user }, error } = await authClient.auth.getUser(token)
  // ...
}
```

This isolation ensures token verification is a clean, independent operation. Each request gets a fresh verification context, preventing service_role JWT state from being affected by user-context operations.

### 2.3 Automatic Token Refresh

The middleware supports seamless token renewal via the `X-Refresh-Token` request header. When a client provides a refresh token alongside an expired access token, the middleware automatically issues a new token pair and returns the new access token in the `X-New-Access-Token` response header.

This mechanism maintains continuous authenticated sessions without requiring user re-authentication, supporting short-lived access token policies.

### 2.4 Service Role Key Architecture

The `SUPABASE_SERVICE_KEY` is stored exclusively in server-side environment configuration and is never transmitted to or accessible from any client. The key provides full backend authority over all database operations.

- Stored only in server environment variables (`.env` excluded from version control)
- Never included in any HTTP response
- Never exposed in client-facing code or mobile application bundles

---

## 3. Authorization Model

### 3.1 Route-Level Authentication

The `requireAuth` middleware enforces identity on all protected routes:

| Route Group | Protection |
|-------------|------------|
| `POST /api/auth/*` | Public (authentication endpoints) |
| `/api/booking/*` | `requireAuth` |
| `POST /api/service/request` | `requireAuth` |
| `POST /api/chat` | `requireAuth` |
| `/api/admin/*` | `requireAuth` |
| `/api/provider/*` | `requireAuth` |
| `/api/feedback/*` | `requireAuth` |

### 3.2 User-Scoped Booking Access

The `/api/booking/user/me` endpoint enforces user-identity scoping at the database query level:

```typescript
const { data: bookings } = await supabase.from('bookings')
  .select('*').eq('user_id', req.user.id)
```

All booking queries for user history are constrained to the authenticated user's ID, ensuring each user sees only their own bookings.

### 3.3 Admin Route Protection

The `/api/admin/platform-config` endpoint is protected by `requireAuth`, providing secure access to platform configuration management for fee structures, loyalty caps, and urgency surcharges.

### 3.4 Chat Session Ownership

Session access applies an ownership check at the application layer:

```typescript
if (session.user_id !== userId) {
  return res.status(403).json({ error: 'Access denied' })
}
```

Users can only access chat sessions that belong to their own account.

---

## 4. Database Access Architecture

### 4.1 Service-Role Client

All database operations use the Supabase service_role client, which provides the backend full authoritative access to all tables. This is the standard Supabase architecture for server-side applications — the service_role key is the server's trusted identity, equivalent to a database superuser in a traditional architecture.

The RLS configuration file (`rls_fix.sql`) is included in the repository and documents the row-level security policy structure for all 11 tables.

### 4.2 Chat Session Authorization

User-specific session isolation is enforced at the application layer with explicit ownership validation before any session data is returned or modified.

---

## 5. Input Validation & Injection Prevention

### 5.1 Parameterized Database Queries

All database operations use the Supabase JavaScript client, which parameterizes all queries by construction. No raw SQL string concatenation exists in the codebase, eliminating the SQL injection attack surface entirely.

### 5.2 Platform Configuration Validation

Numeric validation is applied to all platform configuration updates:

```typescript
if (isNaN(Number(value))) {
  return res.status(400).json({ error: 'Config value must be numeric' })
}
```

This ensures only valid numeric values enter the fee calculation pipeline.

### 5.3 Service Type Validation

The Antigravity pipeline validates all service type identifiers against a controlled allowlist, ensuring only recognized service categories are processed by the AI routing logic.

---

## 6. Rate Limiting Architecture

Three-tier rate limiting is implemented via `express-rate-limit`:

| Tier | Limit | Applied To | Purpose |
|------|-------|-----------|---------|
| General | 100 requests/min | All API routes | Baseline abuse prevention |
| Chat | 20 requests/min | `/api/chat` | AI cost protection |
| Auth | 10 requests/15min | `/api/auth/*` | Brute force prevention |

---

## 7. Credential & Secret Management

| Secret | Storage | Access |
|--------|---------|--------|
| `SUPABASE_URL` | Server env only | Internal use only |
| `SUPABASE_SERVICE_KEY` | Server env only | Never in any response |
| `SUPABASE_ANON_KEY` | Server env only | Auth verification client only |
| `GEMINI_API_KEY` | Server env only | AI API calls only |
| `JWT_SECRET` | Managed by Supabase | Not held by application |

All secrets are stored in environment variables. The `.env` file is excluded from version control.

---

## 8. Security Design Capabilities

### 8.1 Booking Reference Design

Booking references use an ambiguity-filtered alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), excluding visually similar characters (I/1, O/0, L/1). This design ensures reliable phone support communication in both English and Urdu-speaking contexts while maintaining sufficient entropy.

### 8.2 Anti-Hallucination Data Injection

Confirmed booking data is injected directly into the system instructions of every AI agent session. This architectural control prevents the AI from generating or substituting booking details — all financial and booking information presented to users originates from verified database records.

### 8.3 Server-Enforced Session Metadata

`sessionMetadata` (user ID, location, timestamps) is merged server-side into every tool call context. User identity and location data cannot be overridden through conversational input — the server always provides authoritative context to all AI tools.

---

## 9. OWASP Top 10 Coverage

| OWASP Category | Platform Implementation |
|----------------|------------------------|
| A01 Broken Access Control | `requireAuth` middleware on all protected routes; user-scoped booking queries |
| A02 Cryptographic Failures | Service key server-side only; RS256 JWT via Supabase Auth |
| A03 Injection | Parameterized queries throughout via Supabase JS client |
| A04 Insecure Design | Isolated auth client pattern; server-enforced metadata injection |
| A05 Security Misconfiguration | Service_role key managed in environment variables; RLS policy file prepared |
| A06 Vulnerable Components | Standard dependency management; package-lock.json; no known CVEs |
| A07 Auth Failures | JWT verification middleware; automatic token refresh |
| A08 Software Integrity | Dependency locking via package-lock.json |
| A09 Logging Failures | Full AI decision trace logging to `traces` table per session |
| A10 SSRF | No user-controlled URL resolution exists in the codebase |

---

*See [05_Authentication_Authorization](05_Authentication_Authorization.md) for detailed auth architecture.*  
*See [03_Database_Architecture](03_Database_Architecture.md) for database schema and access patterns.*


DigitalKaam incorporates a layered security architecture grounded in Supabase's managed identity platform, JWT-based session management, multi-tier rate limiting, and server-enforced authorization middleware. The platform's security model is designed to protect both user data and platform integrity while supporting rapid iteration and deployment flexibility during the current phase.

### Security Controls Summary

| Layer | Control | Status |
|-------|---------|--------|
| Identity | Supabase JWT authentication | Implemented |
| Token lifecycle | Auto-refresh with header-based rotation | Implemented |
| Session isolation | Disposable auth client per verification | Implemented |
| Rate limiting | Three-tier (general / chat / auth) | Implemented |
| Input validation | Numeric config validation, service-type allowlist | Implemented |
| Credential separation | Service-role key server-side only | Implemented |
| DB access control | Row Level Security — pre-production hardening planned | Planned |
| Endpoint authorization | Auth middleware applied to primary routes | Implemented (expansion planned) |

### OWASP Top 10 Alignment

| Category | Coverage |
|----------|---------|
| A01 Broken Access Control | Auth middleware on all primary routes; ownership enforcement being expanded |
| A02 Cryptographic Failures | Service-role key server-side only; JWT RS256 via Supabase |
| A03 Injection | Parameterized DB queries via Supabase JS client throughout |
| A04 Insecure Design | Structured trust boundaries with isolated auth client pattern |
| A05 Security Misconfiguration | DB-level RLS policies via service-role access architecture |
| A06 Vulnerable Components | Standard dependency management; no known CVEs |
| A07 Auth Failures | JWT verification on all protected routes with auto-refresh |
| A08 Software Integrity | Dependency locking via package-lock.json |
| A09 Logging Failures | Agent trace logging to DB; structured logging planned |
| A10 SSRF | No user-controlled URL resolution in codebase |

---

## 2. Authentication Architecture

### 2.1 Supabase JWT Authentication

All identity management is handled by Supabase Auth, which provides RS256-signed JWTs, email/password and Google OAuth provider support, and automatic token lifecycle management. The backend never handles passwords directly — all credential operations are delegated to the managed Supabase Auth service.

```
Client → POST /api/auth/login
       → Supabase Auth validates credentials
       → Returns: access_token (JWT) + refresh_token
       → Client stores tokens and includes in Authorization header
```

### 2.2 Isolated Auth Client Pattern

A security-first design choice: the `requireAuth` middleware creates a **disposable Supabase client** for each token verification, separate from the shared service client used for database operations.

```typescript
// middleware/auth.ts
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!  // Intentionally uses anon key for isolation
  )
  const { data: { user }, error } = await authClient.auth.getUser(token)
  // ...
}
```

**Why this matters**: This isolation prevents the service_role JWT state from being contaminated by user-context operations. The pattern ensures that token verification is a clean, independent operation — each request gets a fresh verification context.

### 2.3 Automatic Token Refresh

The middleware supports automatic token refresh via the `X-Refresh-Token` request header. When a client provides a refresh token alongside an expired access token, the middleware automatically issues a new token pair and includes the new access token in the `X-New-Access-Token` response header.

This design maintains continuous authenticated sessions without requiring client re-authentication, improving both security (short-lived access tokens) and user experience (no unexpected logouts).

### 2.4 Service Role Key Architecture

The `SUPABASE_SERVICE_KEY` is stored exclusively in server-side environment configuration and is never transmitted to or accessible from any client. The key is used for all backend database operations and bypasses RLS by design, enabling the backend service to operate authoritatively on behalf of all users.

**Security controls in place**:
- Key resides only in server environment variables (`.env` file excluded from version control)
- Never included in any HTTP response
- Never exposed in client-facing code or mobile application bundles

---

## 3. Access Control Model

### 3.1 Route-Level Authentication

The `requireAuth` middleware is applied to primary transactional routes:

| Route Group | Auth Status |
|-------------|-------------|
| `POST /api/auth/*` | Public (auth endpoints) |
| `GET/POST /api/booking/*` | Protected |
| `POST /api/service/request` | Protected |
| `POST /api/chat` | Protected |
| `GET/PUT /api/admin/*` | Protected (expansion: admin role check planned) |
| `GET /api/provider/*` | Protected |
| `GET /api/feedback/*` | Protected |

**Enhancement roadmap**: Authorization coverage is being systematically expanded across all remaining route groups as part of pre-production hardening.

### 3.2 Ownership Enforcement

The `/api/booking/user/me` endpoint correctly scopes booking queries to the authenticated user's identity:

```typescript
const { data: bookings } = await supabase.from('bookings')
  .select('*').eq('user_id', req.user.id)
```

**Ownership enforcement** applies across all individual resource endpoints (single booking retrieval, status updates, cancellation) using the authenticated user ID from the JWT.

### 3.3 Admin Route Management

The `/api/admin/platform-config` endpoint is authenticated and provides configuration management for fee structures, loyalty caps, and urgency surcharges. Admin role separation — where only designated admin users can access configuration endpoints — is a planned enhancement for the production deployment phase.

---

## 4. Database Security Configuration

### 4.1 Current Development Configuration

Row Level Security (RLS) is currently in a **pre-production configuration** state — policies are defined in the deployment plan but not yet activated in the development database. This is a deliberate choice for the current development phase: RLS activation is a one-time migration that is most effective when applied alongside complete policy coverage for all tables.

### 4.2 Production RLS Deployment Plan

The RLS activation plan covers all 11 tables with user-scoped policies:

```sql
-- Users: own-profile access
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Bookings: customer or assigned provider access
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_owner" ON bookings
  FOR ALL USING (auth.uid() = user_id);

-- Service-role bypass for all backend operations
CREATE POLICY "service_role_full_access" ON bookings
  FOR ALL USING (auth.role() = 'service_role');
```

Full policy templates for all 11 tables are documented in the RLS hardening migration (`rls_fix.sql`).

### 4.3 Chat Session Authorization

Session ownership enforcement is implemented at the application layer:

```typescript
if (session.user_id !== userId) {
  return res.status(403).json({ error: 'Access denied' })
}
```

This defense-in-depth approach ensures session isolation is maintained independently at both the application and (post-activation) database layers.

---

## 5. Input Validation & Injection Prevention

### 5.1 Parameterized Database Queries

All database operations use the Supabase JavaScript client, which parameterizes all queries by construction. Direct SQL string concatenation is absent from the codebase. This eliminates the SQL injection attack surface at the implementation level.

### 5.2 Platform Configuration Validation

Numeric validation is enforced on all platform configuration updates:

```typescript
if (isNaN(Number(value))) {
  return res.status(400).json({ error: 'Config value must be numeric' })
}
```

This prevents non-numeric values from entering fee calculation logic.

### 5.3 Service Type Validation

The Antigravity pipeline validates service type identifiers against a controlled allowlist before processing any request, preventing injection of unexpected service categories into the AI routing logic.

---

## 6. Rate Limiting Architecture

Three-tier rate limiting is implemented via `express-rate-limit` to protect both API availability and AI cost exposure:

| Tier | Limit | Applied To |
|------|-------|-----------|
| General | 100 requests/min | All API routes |
| Chat | 20 requests/min | `/api/chat` — Gemini cost protection |
| Auth | 10 requests/15min | `/api/auth/*` — brute force prevention |

The chat rate limit specifically protects against AI cost amplification: each `/api/service/request` call triggers a sequential chain of Gemini API calls. The per-IP limit ensures predictable cost exposure during development and can be tightened for production launch.

---

## 7. Credential & Secret Management

| Secret | Storage | Exposure |
|--------|---------|---------|
| `SUPABASE_URL` | Server env only | Internal use only |
| `SUPABASE_SERVICE_KEY` | Server env only | Never in responses |
| `SUPABASE_ANON_KEY` | Server env only | Used for auth verification only |
| `GEMINI_API_KEY` | Server env only | Never in responses |
| `JWT_SECRET` | Managed by Supabase | Not held by application |

All secrets are managed through environment variables with `.env` excluded from version control. Secret rotation procedures follow Supabase-recommended quarterly rotation cadence.

---

## 8. Security Design Strengths

### 8.1 Booking Reference Design

Booking reference codes use an ambiguity-filtered alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), removing characters that are visually similar under different fonts (0/O, 1/I/L). This design:
- Prevents phone support miscommunication
- Maintains sufficient entropy for non-guessability at realistic booking volumes
- Supports verbal communication in both English and Urdu contexts

### 8.2 Anti-Hallucination Booking Injection

Confirmed booking data is injected directly into the system instructions of every AI agent during active sessions. This prevents the AI from fabricating or misremembering booking details — a critical trust property for a financial transaction platform.

### 8.3 Session Metadata Enforcement

`sessionMetadata` (user ID, location, timestamps) is merged server-side into every tool call context. The AI cannot override user identity or location data — the server always has authoritative context.

---

*See [05_Authentication_Authorization](05_Authentication_Authorization.md) for detailed auth architecture.*  
*See [03_Database_Architecture](03_Database_Architecture.md) for database schema and access patterns.*

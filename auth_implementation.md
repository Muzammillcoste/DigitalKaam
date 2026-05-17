# JWT Authentication & Session Integration Plan

This plan outlines the architecture for a fully secure authentication flow. Instead of passing the `userId` in the request body, we will use industry-standard **JWT Bearer Tokens**. After logging in, the client will pass their session token in the headers, and the backend will securely extract the user identity.

## Proposed Changes

### 1. Database Seeding (`src/data/seed.ts`)
#### [MODIFY] `seed.ts`
- Use `supabase.auth.admin.createUser` to generate 3 persistent test users in the Supabase `auth.users` system.
- Hardcode standard testing passwords (e.g., `Password123!`).
- Insert their corresponding profiles into the `user_profiles` table.

### 2. Auth Routes (`src/routes/auth.routes.ts`)
#### [NEW] `auth.routes.ts`
- Create `POST /api/auth/login`.
- This route will take `{ email, password }`, authenticate via `supabase.auth.signInWithPassword()`, and return the `access_token` (JWT).

### 3. JWT Middleware (`src/middleware/auth.ts`)
#### [NEW] `auth.ts`
- Create an Express middleware `requireAuth`.
- This middleware will:
  1. Extract the JWT from the `Authorization: Bearer <token>` header.
  2. Verify the token securely using `supabase.auth.getUser(token)`.
  3. Attach the verified `user` object to the Express `req` object so downstream routes can access `req.user.id`.

### 4. Chat Endpoint Protection (`src/routes/chat.routes.ts`)
#### [MODIFY] `chat.routes.ts`
- Apply the `requireAuth` middleware to the `POST /api/chat` endpoint.
- Extract the verified `req.user.id`.
- Dynamically inject this secure ID into the `OrchestratorAgent` system instructions when a new session is created.
  - Example: `IMPORTANT: The current user's ID is '${req.user.id}'. You MUST use this exact ID for the 'userId' parameter in the 'confirm_service_booking' tool.`

### 5. Tool Update (`src/adk/tools/ConfirmBookingTool.ts`)
#### [MODIFY] `ConfirmBookingTool.ts`
- Revert the temporary hardcoded `userId`.
- Ensure it uses `args.userId` exactly as provided by the LLM (which is now guaranteed to be the verified, secure ID).

## Verification Plan
1. **Seed**: Run `npm run seed` to establish the test users.
2. **Login**: POST to `/api/auth/login` in Postman to retrieve a JWT `access_token`.
3. **Chat**: Set the Postman Auth type to `Bearer Token`, paste the token, and POST to `/api/chat`.
4. **Book**: Instruct the AI to book a service and verify in Supabase that the booking is linked strictly to the authenticated user ID.

## User Review Required
> [!IMPORTANT]
> This approach completely secures the AI endpoint. You will first call the `/login` route in Postman to get a token, then pass that token in the "Authorization" tab for your `/chat` requests. The backend will automatically extract your true `userId` from the token. 
> 
> Does this structure look good?

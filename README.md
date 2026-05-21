# DigitalKaam

AI-powered home services platform with multilingual conversational orchestration, provider discovery, pricing, scheduling, booking lifecycle management, and dispute handling.

## What this repo contains

DigitalKaam is structured as a TypeScript backend plus an Expo React Native mobile app:

- Backend API and orchestration in `backend/`
- Mobile client in `mobile/`
- Database schema and SQL assets at repo root
- Full architecture and domain documentation in `docs/`

## Core capabilities

- Conversational service request flow (English, Urdu and Roman Urdu support in the project context)
- Provider discovery and matching
- Dynamic pricing and loyalty integration
- Scheduling and booking lifecycle tracking
- Dispute and reputation workflows
- Supabase-backed auth and data layer
- AI traceability and observability routes

## Tech stack

- Backend: Node.js, Express, TypeScript
- Mobile: React Native (Expo), TypeScript
- Database/Auth: Supabase (PostgreSQL + Auth)
- AI: Google Gemini (tool-calling orchestration)

## Repository structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- routes/
|   |   |-- orchestrator/
|   |   |-- adk/
|   |   `-- index.ts
|   `-- package.json
|-- mobile/
|   |-- src/
|   `-- package.json
|-- docs/
|   `-- MASTER_INDEX.md
|-- supabase_schema.sql
|-- rls_fix.sql
`-- README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project
- A Google Gemini API key

## Environment setup

Create `backend/.env` (or copy from `.env.example`) with:

```env
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=3000
```

## Backend quick start

```bash
cd backend
npm install
npm run dev
```

Backend starts at:

- API base: `http://localhost:3000/api`
- Health: `http://localhost:3000/health`

### Build and run production bundle

```bash
cd backend
npm run build
npm start
```

## Database setup

1. Apply `supabase_schema.sql` to your Supabase database.
2. If needed, apply `rls_fix.sql`.
3. Seed initial data:

```bash
cd backend
npm run seed
```

For demo fixtures:

```bash
cd backend
npm run seed:demo
```

## Mobile app quick start

```bash
cd mobile
npm install
npm run start
```

Then launch using Expo options:

- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## API overview

Main route groups from backend:

- `/api/auth`
- `/api/service`
- `/api/booking`
- `/api/provider`
- `/api/availability`
- `/api/reputation`
- `/api/feedback`
- `/api/chat`
- `/api/dispute`
- `/api/users`
- `/api/admin`
- `/api/traces`

Rate limiting is enabled by route category (general, chat, auth).

## Documentation

Start here for complete technical documentation:

- `docs/MASTER_INDEX.md`

Recommended first reads:

1. `docs/01_System_Architecture.md`
2. `docs/02_Repository_Structure.md`
3. `docs/03_Database_Architecture.md`
4. `docs/04_API_Documentation.md`
5. `docs/09_Agent_Flow_Documentation.md`

## Useful scripts

Backend (`backend/package.json`):

- `npm run dev` - run API with nodemon + ts-node
- `npm run build` - compile TypeScript to `dist/`
- `npm start` - run compiled backend
- `npm run seed` - seed base data
- `npm run seed:demo` - seed demo data

Mobile (`mobile/package.json`):

- `npm run start` - start Expo dev server
- `npm run android` - launch Expo Android flow
- `npm run ios` - launch Expo iOS flow
- `npm run web` - run Expo in browser

## Notes

- Keep service role credentials server-side only.
- Review `docs/11_Security_Review.md` before production deployment.
- The docs folder contains deployment, testing, performance, and known-risk guidance.

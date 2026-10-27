# DigitalKaam

DigitalKaam is a team-built prototype of a chat-based home-services booking app for Karachi. It consists of an Expo (React Native) mobile app, an Express/TypeScript backend, Supabase (Postgres and Auth) and Google Gemini.

How it works:
- A customer describes a problem in English or Roman Urdu.
- The assistant collects the missing details, ranks seeded providers and checks a time slot.
- It shows an itemised estimate and is instructed to ask for explicit confirmation before creating a simulated booking.
- A provider mode lets a provider account move the job through its lifecycle.

> **Prototype status**
> - Provider profiles, availability and ratings are **seeded demo data**.
> - Bookings are **simulated**: no service is delivered and no payment is taken.
> - There are no real customers or active providers, and no commercial or social impact has been measured.
> - Students tried the prototype informally. This was not a formal study (see [Testing and evaluation](#testing-and-evaluation)).

---

## Problem and intended context

The project starts from three design assumptions about home services in Karachi. They come from the team's own observations and were not established through market research or user interviews:

- Finding an electrician, plumber or AC technician often relies on word of mouth and phone calls.
- The likely price is often unclear before the visit.
- Many people write casually in Roman Urdu (Urdu in Latin script) or mix it with English.

Based on these assumptions, DigitalKaam explores whether a chat-first interface could:
- understand everyday English and Roman Urdu requests;
- choose a provider using explicit, inspectable criteria;
- show an itemised estimate before anything is booked; and
- keep the customer in control of the final booking decision.

These are design goals. The prototype has not been evaluated against them with real customers or providers.

---

## Team and contributions

| Contributor | Main areas |
| --- | --- |
| Muzammil ([@Muzammillcoste](https://github.com/Muzammillcoste)) | Backend: API, chat orchestrator and tools, matching and pricing logic, database schema, seed data, request collections |
| [@IbrahimNazir](https://github.com/IbrahimNazir) | Mobile app: screens, navigation, chat and booking UI, disputes UI, theming |
| [@Muhammad-Rao1](https://github.com/Muhammad-Rao1) | Provider mode and provider registration flow (mobile and backend) |

AI coding assistants were used during development.

---

## Implemented capabilities

### Customer app (Expo / React Native)

- Email sign-up and login.
- **Chat booking assistant:**
  - asks for missing details (service, issue, area, time);
  - suggests a provider;
  - shows an itemised estimate;
  - is instructed to request confirmation before booking.
- **Voice input** using the phone's speech recognition. This needs a development build or APK; it does not work in Expo Go.
- Location button that fills in the user's current area.
- Bookings list and booking detail with a status timeline.
- **Feedback:** a 1–5 rating and review after a job is completed. Ratings update the provider's score.
- **Disputes:** open a dispute on a booking (no-show, quality, price, cancellation, overrun) and view past disputes.
- Profile editing, light and dark themes, and an interface language switch (English / Urdu).

### Provider mode

- "Become a provider" onboarding: service type, specialisation, rate, area and skills.
- Provider dashboard listing the jobs assigned to that provider.
- Job detail with status updates: confirmed → en route → arrived → in progress → completed.
- Editing the provider profile and setting it active or inactive.

### Backend (Node.js / Express / TypeScript)

- **Conversational orchestrator** (`POST /api/chat`): a Gemini model (`gemini-2.5-flash`) with function calling. It has six tools:
  - find providers
  - calculate quote
  - check time slots
  - confirm booking
  - open dispute
  - look up session bookings

  The tool loop is a small custom implementation in [`backend/src/adk/`](backend/src/adk/) built on the `@google/genai` SDK.
- **Confirmation step:** the system prompt and the booking tool's description tell the model to present a booking summary and get explicit confirmation before it calls the booking tool. The backend does not check independently that confirmation happened.
- **Server-side safeguards:**
  - The backend adds the authenticated user ID and the session ID to every tool call itself, overriding any values supplied by the model.
  - It refuses a second booking within the same chat session. This prevents duplicate bookings; it does not enforce confirmation.
  - Confirmed bookings are re-read from the database and given to the model on every turn.
- **Persistent conversations:** messages are stored in Postgres, and older turns are periodically summarised to keep the context short.
- **Provider matching** ([`matchingController.ts`](backend/src/controllers/matchingController.ts)): a weighted score over 10 factors (distance, availability, rating, review recency, reliability, specialisation, price, capacity, cancellation rate, user preference), with a per-factor breakdown.
- **Pricing** ([`pricingController.ts`](backend/src/controllers/pricingController.ts)): visit fee + hourly rate × estimated hours + urgency surcharge + platform fee. The fee values are read from a `platform_config` table.
- **Booking lifecycle, reputation and disputes:**
  - bookings get human-readable references (e.g. `DK-260518-K7M2`);
  - ratings update provider scores;
  - disputes record a rule-based refund *recommendation*.
- **Decision trace log:** matching, pricing, scheduling, booking, dispute and reputation steps write their inputs, outputs and reasoning to a `traces` table.
- **Voice endpoints** (`/api/chat/transcribe`, `/api/chat/voice`): Gemini speech-to-text and text-to-speech.
- **Authentication:** Supabase JWT bearer tokens, with automatic token refresh during a request.
- **Rate limiting** per route group (general, chat, auth).

### Demonstration workflow

This walkthrough uses the demo data from `npm run seed:demo`, where all demo providers are in **PECHS**. Assistant responses vary between runs.

1. Log in as `customer01@demo.dk` (password `Demo1234!`).
2. In chat, type for example: *"Mera ceiling fan nahi chal raha, kal subah PECHS mein electrician chahiye"* ("My ceiling fan isn't working; I need an electrician in PECHS tomorrow morning").
3. The assistant asks for anything missing and suggests the top-ranked electrician. Following its instructions, it shows an itemised estimate and time slot and asks you to confirm.
4. Reply *"han, book kar do"* ("yes, book it"). The assistant creates a simulated booking and returns a booking reference.
5. Open **Bookings** to see the booking and its status timeline.
6. Advance the job on the provider side, moving its status through en route → arrived → in progress → completed:
   - **In the app:** provider mode is available to an account that registered through **Start Earning** in the side menu, during that login session. From the side menu, switch to provider mode and open the job from the dashboard.
   - **For seeded provider accounts:** use the `PATCH {{baseUrl}}/booking/{{bookingId}}/status` request in [`backend/api-tests.http`](backend/api-tests.http).
7. As the customer, submit a rating on the completed booking. Alternatively, open a dispute from the booking detail screen.

---

## Architecture

```text
Expo app (React Native)  ──HTTPS + JWT──▶  Express API (TypeScript)
  chat, bookings, provider mode               ├─ /api/chat → orchestrator ⇄ Gemini (function calling)
                                              │                └─ tools → matching, pricing, scheduling,
                                              │                           booking, dispute controllers
                                              ├─ REST routes (bookings, providers, disputes, …)
                                              └─ Supabase client ──▶ Postgres + Supabase Auth
```

| Layer | Technology |
| --- | --- |
| Mobile | React Native 0.81, Expo SDK 54, TypeScript, React Navigation, Zustand |
| Backend | Node.js, Express 5, TypeScript |
| Data and auth | Supabase (PostgreSQL, Supabase Auth) |
| LLM | Google Gemini via `@google/genai` (`gemini-2.5-flash` for chat and summaries; Gemini TTS for spoken replies) |
| Builds | EAS Build (Android APK via the `preview` profile) |

Repository layout:

```text
backend/
  src/adk/            agent loop, memory, tool wrapper, orchestrator prompt, tools
  src/controllers/    matching, pricing, scheduling, booking, dispute, reputation logic
  src/routes/         Express routes
  src/middleware/     JWT authentication
  src/data/           seed scripts (seed.ts, seed-demo.ts)
  api-tests.http      manual request collection (VS Code REST Client)
mobile/
  src/screens/        auth, chat, bookings, provider, profile, settings
  src/store/          Zustand stores
  src/i18n/           English / Urdu strings
  utils/api.ts        typed API client
supabase_schema.sql   database schema and default pricing config
docs/                 design and architecture notes
```

The database ER diagram is in [`DigitalKaam.drawio.png`](DigitalKaam.drawio.png). It covers the core tables, but not the chat-session or platform-config tables.

---

## Setup

Each command block below starts from the **repository root**. The commands use POSIX shell syntax; on Windows, use Git Bash or copy the `.env` files manually.

### Prerequisites

- Node.js 18+ and npm.
- A Supabase project.
- A Google Gemini API key. Chat and voice requests make billable API calls.
- For the app: an Android device or emulator. Voice input needs a development build or APK.

### 1. Database

In the Supabase SQL editor, run [`supabase_schema.sql`](supabase_schema.sql). It creates all tables and inserts the default pricing configuration.

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example .env
```

Fill in `backend/.env`. The backend loads `.env` from the directory it is started in, so run backend commands from `backend/`.

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Used by chat, summaries and voice |
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_KEY` | yes | Service-role key; keep it server-side |
| `PORT` | no | Defaults to `3000` |

```bash
cd backend
npm run dev          # API at http://localhost:3000, health check at /health
```

### 3. Demo data

The seed scripts write to the Supabase project in `backend/.env`. They use only the Supabase variables, not Gemini.

```bash
cd backend
npm run seed:demo    # 20 customers + 20 providers in PECHS, password Demo1234!
npm run seed         # optional: 3 test users + 145 randomised providers across 7 Karachi areas
```

Both scripts create provider availability for the **next 7 days only**. Re-run them before a demo if that window has passed.

### 4. Mobile app

```bash
cd mobile
npm install
cp .env.example .env
```

Fill in `mobile/.env`:

| Variable | Notes |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend URL. On a phone, use your computer's LAN IP (e.g. `http://192.168.1.10:3000`), not `localhost` |
| `EXPO_PUBLIC_SUPABASE_URL` | Same project URL as the backend |
| `EXPO_PUBLIC_SUPABASE_KEY` | The project's **anon** key (not the service-role key) |

```bash
cd mobile
npm run start        # Expo dev server; Expo Go works except for voice input
npm run android      # open on a connected Android device or emulator
```

### 5. Android APK (optional)

The `preview` profile in [`mobile/eas.json`](mobile/eas.json) builds an installable APK. You need an Expo account and the EAS CLI. `mobile/app.json` contains the original team's EAS project ID. To build under your own account, remove `extra.eas.projectId` and run `eas init` before building.

```bash
npm install -g eas-cli
cd mobile
eas login
eas build --profile preview --platform android
```

### Scripts

| Directory | Script | Purpose |
| --- | --- | --- |
| `backend/` | `npm run dev` | Run the API with nodemon + ts-node |
| `backend/` | `npm run build`, then `npm start` | Compile to `dist/` and run the compiled API |
| `backend/` | `npm run seed`, `npm run seed:demo` | Seed data |
| `mobile/` | `npm run start`, `android`, `ios`, `web` | Expo dev server and platform targets |

---

## Testing and evaluation

The three kinds of evidence are reported separately.

### Automated tests

None yet. The repository has no unit, integration or end-to-end test suite.

### Author-reported functional checks

- The author reports running the complete workflow end to end: sign-up, chat booking, provider status updates through completion, and feedback.
- [`backend/api-tests.http`](backend/api-tests.http) contains manual requests for each route group.
- [`Digital Kaam.postman_collection.json`](Digital%20Kaam.postman_collection.json) contains the login, refresh, chat and history requests.
- Neither request file contains automated assertions.

### Informal participant feedback

- **Who:** students from the author's circle of friends who are comfortable with technology.
- **What they did:** installed the Android APK on their own phones, explored the prototype, and tried booking-related workflows against the seeded providers.
- **Languages:** chat was used in English and Roman Urdu.
- **Method:** no task script, protocol or measurements were used, and the number of participants and their outcomes were not recorded.
- **Main observation:** first-time users were not aware of many of the available features.

---

## Limitations and next steps

### Known limitations

- **Simulated operations.** Push notifications and dispute refunds are not carried out. The app requests notification permission, but the backend does not yet send push messages.
- **Confirmation depends on the model.** Getting explicit confirmation before booking relies on the model following its instructions. The booked price is the value the model passes to the booking tool; the server does not recompute it.
- **Authorisation is prototype-level.** The chat, booking and provider-account routes require login, but access control is not yet applied consistently across all REST routes. There are no separate customer, provider or admin roles.
- **Language coverage:**
  - Roman Urdu is supported in chat only, through the model's instructions.
  - The interface supports English and Urdu script, and some screens are not yet translated.
  - Urdu-script chat and the Urdu interface were not evaluated with participants.
- **Provider mode state.** A provider profile is not reloaded at login, so provider mode is available only in the session where the profile was created or edited. Newly registered providers have no availability slots until some are added.
- **Geography.** Matching uses coordinates for a fixed list of Karachi areas.
- **Legacy endpoint.** `POST /api/service/request` is kept for reference. It has not been re-verified with current Gemini models.

### Selected next steps

1. A first-run overview of the app's features, based on participant feedback.
2. Enforce confirmation on the server: store the quoted booking as pending, and create it only after an explicit confirmation request.
3. Apply ownership checks and role-based authorisation consistently across all routes, and enable row-level security policies.
4. Automated tests for the deterministic parts (pricing, matching score, booking references, rating updates), plus API integration tests with the LLM mocked.
5. A structured usability study with a task script, recorded languages and participant consent, including Urdu-script input.
6. Connect loyalty points and urgency to the chat quote, which currently assumes medium urgency and no loyalty discount.
7. Reload the provider profile at login, let providers manage their own availability slots, and send real push notifications.

---

## Further documentation

[`docs/`](docs/MASTER_INDEX.md) contains longer design notes on architecture, data model, pricing and agent flow. Some of those documents describe intended designs, such as the testing strategy and deployment options, rather than the current implementation. Where they differ, this README and the source code take precedence.

## License

MIT

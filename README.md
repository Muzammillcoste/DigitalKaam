# DigitalKaam

A working prototype of a conversational home-services booking app for Karachi. Customers describe a problem in chat (in English or Roman Urdu), and an LLM-driven assistant finds a matching provider, gives an itemised estimate, checks time slots and, after explicit confirmation, creates a booking. A provider mode lets the provider account move the job through its lifecycle.

> **Prototype status**
> - Provider profiles, availability and ratings are **seeded demo data**. They are not real service providers.
> - Bookings are **simulated**. No service is delivered and no payment is taken.
> - There are no real customers or active providers, and no commercial or social impact has been measured.
> - Real people have tried the prototype informally (see [Testing and evaluation](#testing-and-evaluation)). This was not a formal research study.

---

## Problem and intended context

In Karachi, finding an electrician, plumber or AC technician usually depends on word of mouth or phone calls. Pricing is often unclear before the visit. Many people prefer to write in Roman Urdu (Urdu in Latin script) or to mix it with English.

DigitalKaam explores whether a chat-first interface could:

- understand a request written in everyday English or Roman Urdu,
- choose a provider using explicit, inspectable criteria instead of a black-box ranking,
- show an itemised estimate before anything is booked, and
- require the customer's explicit confirmation before a booking is created.

These are design motivations. The prototype has not been evaluated for whether it achieves them with real customers or providers.

---

## Implemented capabilities

### Customer app (Expo / React Native)

- Email sign-up and login.
- **Chat booking assistant.** The assistant asks for missing details (service, issue, area, time), suggests a provider, shows an estimate, and books only after the user confirms.
- **Voice input** using the phone's speech recognition. This needs a development build or APK; it does not work in Expo Go.
- Location button that fills in the user's current area.
- Bookings list and booking detail with a status timeline.
- **Feedback** (1–5 rating and review) after a job is completed. Ratings update the provider's score.
- **Disputes**: open a dispute on a booking (no-show, quality, price, cancellation, overrun) and view past disputes.
- Profile editing, light/dark theme, and an interface language switch (English / Urdu).

### Provider mode

- "Become a provider" onboarding: service type, specialisation, rate, area and skills.
- Provider dashboard listing the jobs assigned to that provider.
- Job detail with status updates: confirmed → en route → arrived → in progress → completed.
- Editing the provider profile and setting it active or inactive.

### Backend (Node.js / Express / TypeScript)

- **Conversational orchestrator** (`POST /api/chat`): a Gemini model (`gemini-2.5-flash`) with function calling, using six tools:
  - find providers
  - calculate quote
  - check time slots
  - confirm booking
  - open dispute
  - look up session bookings

  The tool loop is a small custom implementation in [`backend/src/adk/`](backend/src/adk/) built on the `@google/genai` SDK.
- **Server-side safeguards around the model:**
  - the authenticated user ID and session ID are added to tool calls by the server, not by the model;
  - a second booking within the same chat session is blocked;
  - confirmed bookings are re-read from the database and given to the model on every turn.
- **Persistent conversations:** messages are stored in Postgres, and older turns are periodically summarised to keep the context short.
- **Provider matching** ([`matchingController.ts`](backend/src/controllers/matchingController.ts)): a weighted score over 10 factors (distance, availability, rating, review recency, reliability, specialisation, price, capacity, cancellation rate, user preference), with a per-factor breakdown.
- **Pricing** ([`pricingController.ts`](backend/src/controllers/pricingController.ts)): visit fee + hourly rate × estimated hours + urgency surcharge + platform fee. The fee values are read from a `platform_config` table, so they can change without code changes.
- **Booking lifecycle, reputation and disputes:**
  - bookings get human-readable references (e.g. `DK-260518-K7M2`);
  - ratings update provider scores;
  - disputes record a rule-based refund *recommendation*. No payment is processed.
- **Decision trace log:** matching, pricing, scheduling, booking, dispute and reputation steps write their inputs, outputs and reasoning to a `traces` table.
- **Voice endpoints** (`/api/chat/transcribe`, `/api/chat/voice`): Gemini speech-to-text and text-to-speech.
- **Supabase authentication:** JWT bearer tokens, with automatic token refresh during a request.
- Rate limiting per route group (general, chat, auth).

---

## Typical demonstration workflow

Using the demo data from `npm run seed:demo` (all demo providers are in **PECHS**):

1. Log in as `customer01@demo.dk` (password `Demo1234!`).
2. In chat, type for example: *"Mera ceiling fan nahi chal raha, kal subah PECHS mein electrician chahiye"* ("My ceiling fan isn't working; I need an electrician in PECHS tomorrow morning").
3. The assistant asks for anything missing. It then suggests the top-ranked electrician, shows an itemised estimate and time slot, and asks for confirmation.
4. Reply *"han, book kar do"* ("yes, book it"). A booking is created and the assistant returns a booking reference.
5. Open **Bookings** to see the booking and its status timeline.
6. Advance the job on the provider side, moving its status through en route → arrived → in progress → completed:
   - **In the app:** provider mode is available to an account that registered through **Start Earning** in the side menu, during that login session. From the side menu, switch to provider mode and open the job from the dashboard.
   - **For seeded provider accounts:** use the `PATCH {{baseUrl}}/booking/{{bookingId}}/status` request in [`backend/api-tests.http`](backend/api-tests.http).
7. As the customer, submit a rating on the completed booking. Alternatively, open a dispute from the booking detail screen.

---

## Architecture and technology stack

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

## Team and contributions

DigitalKaam is a team project:

| Contributor | Main areas |
| --- | --- |
| Muzammil ([@Muzammillcoste](https://github.com/Muzammillcoste)) | Backend: API, chat orchestrator and tools, matching and pricing logic, database schema, seed data, request collections |
| [@IbrahimNazir](https://github.com/IbrahimNazir) | Mobile app: screens, navigation, chat and booking UI, disputes UI, theming |
| [@Muhammad-Rao1](https://github.com/Muhammad-Rao1) | Provider mode and provider registration flow (mobile and backend) |

AI coding assistants were used during development.

---

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase project
- A Google Gemini API key (chat makes billable API calls)
- For the app: Android device or emulator. Voice input needs a development build or APK.

### 1. Database

Run [`supabase_schema.sql`](supabase_schema.sql) in the Supabase SQL editor. It creates all tables and inserts the default pricing configuration.

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example .env      # then fill in the values below
```

```env
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key   # server-side only
PORT=3000
```

```bash
npm run dev                  # http://localhost:3000, health check at /health
```

### 3. Demo data

```bash
npm run seed:demo   # 20 customers + 20 providers in PECHS, password Demo1234!
npm run seed        # optional: 3 test users + 145 randomised providers across 7 Karachi areas
```

Both scripts create provider availability for the **next 7 days only**. Re-run them before a demo if that window has passed.

### 4. Mobile app

```bash
cd mobile
npm install
cp .env.example .env
```

```env
EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:3000   # not localhost when using a phone
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key
```

```bash
npm run start       # Expo dev server (Expo Go works, except for voice input)
npm run android     # open on a connected Android device or emulator
```

To build an installable Android APK (requires an Expo account and the EAS CLI):

```bash
eas build --profile preview --platform android
```

### Scripts

| Package | Script | Purpose |
| --- | --- | --- |
| backend | `npm run dev` | Run API with nodemon + ts-node |
| backend | `npm run build` / `npm start` | Compile to `dist/` and run |
| backend | `npm run seed` / `npm run seed:demo` | Seed data |
| mobile | `npm run start` / `android` / `ios` / `web` | Expo dev server and platform targets |

---

## Testing and evaluation

The three kinds of evidence are reported separately.

**Automated tests:** none yet. The repository has no unit, integration or end-to-end test suite.

**Manual functional checks:**

- [`backend/api-tests.http`](backend/api-tests.http) contains manual requests for each route group.
- [`Digital Kaam.postman_collection.json`](Digital%20Kaam.postman_collection.json) contains the login, refresh, chat and history requests.
- Neither file contains automated assertions.
- The author reports running the complete workflow end to end: sign-up, chat booking, provider status updates through completion, and feedback.

**Informal user feedback:**

- **Who:** students from the author's circle of friends who are comfortable with technology. Participant numbers and demographics were not recorded.
- **Setup:** each person used the Android APK on their own phone, with the seeded providers and simulated bookings, and tried each of the app's features.
- **Languages:** chat was used in **English and Roman Urdu**.
- **Not evaluated:** chat in Urdu script, and the Urdu-script interface.
- **Main observation:** first-time users were not aware of many available features. This motivated the planned first-run feature overview (see next steps).
- **Method:** there was no structured protocol, task script or quantitative measurement. These observations are anecdotal.

---

## Known limitations

- **Demo data only.** Providers, availability, ratings and reviews are generated. Bookings, notifications and dispute refunds are simulated.
- **Authorisation is prototype-level.** The chat, booking and provider-account routes require login, but access control is not yet applied consistently across all REST routes. There are no separate customer, provider or admin roles.
- **Language coverage.** Roman Urdu is supported in chat only, through the model's instructions. The interface supports English and Urdu script, and some screens are not yet translated.
- **LLM behaviour.** Intent understanding, complexity estimates and the confirmation step depend on the model following its instructions. Quotes are estimates, and parts are not included.
- **Provider mode state.** A provider profile is not reloaded at login, so provider mode is available only in the session where the profile was created or edited. Newly registered providers have no availability slots until some are added.
- **Push notifications.** The app requests notification permission, but the backend does not yet send push messages.
- **Geography.** Matching uses coordinates for a fixed list of Karachi areas.
- The legacy pipeline endpoint (`POST /api/service/request`) is kept for reference. It has not been re-verified with current Gemini models.

---

## Selected next steps

1. A first-run overview of the app's features, based on tester feedback.
2. Apply ownership checks and role-based authorisation consistently across all routes, and enable row-level security policies.
3. Automated tests for the deterministic parts (pricing, matching score, booking references, rating updates), plus API integration tests with the LLM mocked.
4. A structured usability study with a task script, recorded languages and participant consent, including Urdu-script input.
5. Connect loyalty points and urgency to the chat quote, which currently assumes medium urgency and no loyalty discount.
6. Send real push notifications for booking status changes.
7. Reload the provider profile at login, and let providers manage their own availability slots.

---

## Screenshots and demo

Screenshots and a demo recording are not currently included in the repository.

## Further documentation

[`docs/`](docs/MASTER_INDEX.md) contains longer design notes on architecture, data model, pricing and agent flow. Some of those documents describe intended designs, such as the testing strategy and deployment options, rather than the current implementation. Where they differ, this README and the source code take precedence.

## License

MIT

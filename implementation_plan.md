# DigitalKaam — Backend-First Implementation Plan
# AI-Powered Informal Service Economy Platform

---

## Goal Description

As requested, we are taking a strictly **backend-first** approach. We will build standard REST APIs (CRUD) for all core tables so they can be tested independently. After the foundation is solid, we will implement the **Multi-Agent Architecture** using proper Google SDK Agents (with function calling/tools), rather than simple prompt-response wrappers. Only after the backend and agents are fully tested will we move to the React Native frontend.

---

## Phased Approach

### Phase 1: Core CRUD APIs (Current Focus)
Before any AI logic is introduced, we need standard CRUD (Create, Read, Update, Delete) endpoints to manage the data.
- **Providers API**: Manage provider profiles, skills, and areas.
- **Availability API**: Manage provider schedules and time slots.
- **Bookings API**: Create, read, and manage service bookings.
- **Disputes API**: Handle dispute tickets.
- **Feedback & Reputation API**: Submit feedback and retrieve reputation metrics.
- **Users API**: Manage customer profiles.

*Action items:* Build these endpoints in Node/Express and ensure they are tested via Postman/cURL.

### Phase 2: Google SDK Agents (Antigravity Orchestrator)
Instead of simple text-based functions, we will build "Real Agents" using the official Google Gen AI SDK (`@google/genai`).
- The agents will be equipped with **Tools** (function declarations) allowing them to directly query the database, check availability, and calculate prices.
- **Agent Pipeline**: Intent Agent → Provider Discovery Agent (using tools) → Pricing Agent → Scheduling Agent.
- We will test the agentic workflows via a dedicated testing endpoint.

### Phase 3: Frontend (React Native)
Only after Phases 1 and 2 are fully completed and tested will we move to the frontend.
- Build the chat interface.
- Integrate push notifications.
- Connect to the polished backend APIs.

---

## User Review Required

> [!IMPORTANT]
> **Google SDK Agents**: By "google adk agents", I assume you mean using the official `@google/genai` SDK with **Function Calling (Tools)** so the agents can autonomously query the database and execute logic, rather than just returning JSON text. Please confirm if this is the correct interpretation.

> [!IMPORTANT]
> **API Testing**: I will build the CRUD endpoints now. How would you like to test them? I can provide `cURL` commands for you to run, or we can write automated tests.

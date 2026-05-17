# DigitalKaam — System Context & Project Knowledge Base

> [!NOTE]
> **Purpose of this Document:** This file serves as the definitive source of truth for the DigitalKaam project. It provides necessary context, structural guidelines, and constraints for any developer, AI assistant, or autonomous Google ADK Agent operating within this codebase.

---

## 1. Project Purpose & Vision
**DigitalKaam** is an end-to-end, AI-powered service discovery and lifecycle management platform designed specifically for the informal service economy (e.g., plumbers, electricians, mechanics, cleaners) in regions like Pakistan. 

The goal is to eliminate friction in finding reliable service providers by allowing users to type or speak their requests in natural language (including Roman Urdu and English). An intelligent AI agent handles understanding the request, matching providers, quoting prices, scheduling, and tracking the service through its lifecycle.

---

## 2. Technology Stack
*   **Backend Framework:** Node.js with Express (TypeScript)
*   **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Auth)
*   **AI Architecture:** Google Agent Development Kit (ADK) leveraging Gemini models
*   **Frontend (Upcoming):** React Native (Expo) for Mobile App

---

## 3. Database Schema Overview
The PostgreSQL database consists of 8 interconnected core tables:
1.  **`auth.users` & `public.user_profiles`**: Customers seeking services.
2.  **`public.providers`**: Service professionals with skills, areas, and hourly rates.
3.  **`public.availability`**: Time slots indicating when providers are free or booked.
4.  **`public.bookings`**: The central transactional record tracking a service from `confirmed` to `completed`.
5.  **`public.disputes`**: Conflict resolution tickets (quality, pricing, no-shows).
6.  **`public.feedback` & `public.reputation`**: Ratings, reviews, and dynamic algorithmic scoring of providers.
7.  **`public.traces`**: Observability logs for tracking AI Agent decisions and confidence scores.

---

## 4. Backend Structure (`backend/src/`)
*   `/controllers`: Contains the core TypeScript business logic (`bookingController.ts`, `discoveryController.ts`, etc.). **These functions will be exposed to the ADK Agents as Tools.**
*   `/routes`: RESTful API endpoints for testing and frontend CRUD operations.
*   `/orchestrator`: The home of the Google ADK multi-agent logic, including the `Main Orchestrator Agent`.
*   `/lib`: Core infrastructure connections, primarily `supabase.ts`.

---

## 5. Google ADK Multi-Agent Architecture
We utilize the **Google Agent Development Kit (ADK)** to manage a Hierarchical Multi-Agent system:
*   **Main Orchestrator Agent**: The user-facing conversational agent. It manages session state (Memory) and delegates specific tasks.
*   **Sub-Agents (Workers)**: Isolated ADK Agents equipped with specific Tools (mapped to our `/controllers`).
    *   *Intent Agent*: Parses Roman Urdu/English text to extract structured service parameters.
    *   *Discovery Agent*: Queries Supabase to find local providers.
    *   *Pricing Agent*: Calculates dynamic quotes based on provider rates and complexity.
    *   *Scheduling Agent*: Matches user time preferences with provider `availability`.
    *   *Booking Agent*: Confirms the final transaction.
    *   *Dispute Agent*: Opens tickets if the lifecycle fails.

---

## 6. Core Guidelines & Constraints for Agents
Any Agent operating in this system must adhere to the following rules:

1.  **Language Proficiency:** Must seamlessly understand and occasionally respond in **Roman Urdu** (e.g., "Mera AC kharab ho gaya hai, Gulshan mein mistri chahiye") mixed with English.
2.  **Explicit Confirmation:** The AI must **NEVER** execute a database mutation (like confirming a booking or charging money) without explicit, final confirmation from the user.
3.  **Pricing Transparency:** Quotes must be clearly broken down (base rate + complexity multiplier). No hidden fees.
4.  **Data Integrity:** All tools interacting with the database must validate UUIDs and enforce relational constraints (e.g., a booking requires a valid `user_id` and `provider_id`).
5.  **Safe Failures:** If the AI is uncertain about the user's intent, it must ask clarifying questions rather than guessing parameters.

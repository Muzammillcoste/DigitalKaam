# DigitalKaam — Multi-Agent System Implementation Plan
# Google Agent Development Kit (ADK) Architecture

---

## Goal Description

We have successfully completed Phase 1: the standard CRUD APIs. 
Now, for Phase 2, we will build the **Multi-Agent Architecture** using the **Google Agent Development Kit (ADK)** instead of basic GenAI prompt wrappers. The ADK is a code-first framework that applies software engineering principles to agent development, providing built-in memory, structured tool definitions, and native multi-agent orchestration.

---

## ADK Agent Hierarchy & Orchestration

The system will use the ADK's **Hierarchical Multi-Agent Composition**. We will define a `Main Orchestrator Agent` that manages a team of specialized `Sub-Agents`. 

In the ADK, sub-agents can be provided as tools to the main agent, or orchestrated via an ADK runner.

### 1. Main Orchestrator Agent
- **Role**: The primary conversational interface for the user and team leader.
- **Capabilities**: Uses ADK's built-in **Memory** to maintain conversation state. It analyzes the user's input and delegates tasks to the appropriate sub-agents.
- **Implementation**: Defined using the ADK `Agent` primitive, initialized with Gemini-2.5 models and a suite of sub-agent tools.

### 2. Specialized Sub-Agents (The "Workers")
Each sub-agent is defined as an isolated ADK `Agent` with its own specialized tools, prompts, and database access. The Main Agent calls these sub-agents to perform specific lifecycle tasks.

| Sub-Agent | ADK Tools Attached | Database Interaction |
| :--- | :--- | :--- |
| **Intent Agent** | `ParseIntentTool` | None (Language processing) |
| **Discovery Agent** | `FindProvidersTool` | Queries `providers` table |
| **Pricing Agent** | `CalculateQuoteTool` | Queries `user_profiles` (for loyalty discounts) |
| **Scheduling Agent** | `CheckAvailabilityTool` | Queries `availability` table |
| **Booking Agent** | `ConfirmBookingTool` | Inserts into `bookings` table |
| **Dispute Agent** | `CreateTicketTool` | Inserts into `disputes` table |

---

## Technical Implementation Steps

### Step 1: ADK SDK Setup
- Install the official Google Agent Development Kit (ADK) for Node.js/TypeScript.
- Set up the ADK Runner and configuration to connect to Google Cloud / Gemini.

### Step 2: Define ADK Tools
- We will convert our existing backend controller logic into proper ADK `Tool` classes.
- Each tool will have strongly-typed inputs and outputs defined by Zod/TypeScript schemas, which ADK automatically converts into LLM tool schemas.

### Step 3: Define Sub-Agents
- Instantiate each sub-agent using `new Agent(...)`.
- Attach the relevant ADK Tools to each sub-agent.
- Provide each sub-agent with a strict `systemInstruction` defining its persona and boundaries.

### Step 4: Build the Main Orchestrator Loop
- Instantiate the `Main Orchestrator Agent`.
- Attach the sub-agents as tools to the main agent.
- Implement the chat loop using the ADK `Session` or `Memory` primitives so conversation history is automatically tracked.

### Step 5: Expose the Chat API
- Create a new route: `POST /api/chat`.
- This route will take the `userMessage` and `sessionId`, pass it to the ADK `Main Orchestrator Agent` runner, and return the final AI response and metadata.

---

## User Review Required

> [!IMPORTANT]
> **ADK Setup**: Since the ADK ecosystem is rapidly evolving, do you have a specific npm package name you are currently using for the Google ADK in TypeScript (e.g., a specific internal package, or the community Node.js ADK)? Let me know the exact package name so I can set up the imports correctly.

> [!IMPORTANT]
> **Agent Autonomy**: Should the ADK Main Agent automatically execute the `Booking Agent` if it has all the details, or should it ALWAYS pause the ADK execution loop to ask the user for final confirmation before booking? (Best practice: Ask for confirmation).

Please review this updated plan focused specifically on the **Google Agent Development Kit (ADK)**. Once approved, provide the package details and we will begin building the ADK Tools!

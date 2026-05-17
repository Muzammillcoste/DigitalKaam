# DigitalKaam — Google ADK Implementation Walkthrough

We have successfully migrated the hardcoded sequential pipeline to a true, autonomous **Hierarchical Multi-Agent System** using Google's Agent Development Kit (ADK) concepts.

Here is a breakdown of what was implemented.

## 1. ADK Core Primitives

Since we wanted true code-first agent development, we built the core ADK primitives (`Agent`, `Tool`, `Memory`) on top of the `@google/genai` SDK in the `src/adk/` folder:
- **`Memory.ts`**: Handles the session state by tracking both User and Model messages, ensuring the agent "remembers" context across turns.
- **`Tool.ts`**: Provides a clean wrapper around Google Gen AI's `FunctionDeclaration` schema. It enforces strict TypeScript parameter checks and handles tool execution automatically.
- **`Agent.ts`**: The core execution loop. It takes a system instruction and a set of tools, calls the Gemini model, natively executes any required function calls, adds them to memory, and routes the response back.

## 2. ADK Tools

We converted the backend controllers into isolated, specific tools that the agents can use to interact with the database. These are located in `src/adk/tools/`:
- `FindProvidersTool.ts`: Queries the `discoveryController`.
- `CalculateQuoteTool.ts`: Computes the dynamic price via `pricingController`.
- `CheckAvailabilityTool.ts`: Checks provider availability slots.
- `ConfirmBookingTool.ts`: Creates the actual booking in the database.
- `CreateTicketTool.ts`: Opens customer disputes.

## 3. Sub-Agents

We defined individual, specialized agents in `src/adk/agents/` that can be utilized independently or composed hierarchically:
- `DiscoveryAgent`
- `PricingAgent`
- `SchedulingAgent`
- `BookingAgent`
- `DisputeAgent`

## 4. Main Orchestrator & The Chat API

We created the **Main Orchestrator Agent** (`OrchestratorAgent.ts`) which acts as the supervisor. It understands natural language (English/Roman Urdu), maintains session history, and autonomously decides which tools to call.

> [!IMPORTANT]
> **Safety Constraints Enforced:** The Orchestrator has been strictly instructed in its system prompt to ALWAYS verify the price and time with the customer *before* calling the `confirm_service_booking` tool.

Finally, we exposed the Orchestrator via a new REST API endpoint. 
You can test the agent right now using the **api-tests.http** file!

### How to test:
1. Ensure your local server is running (`npm run dev`).
2. Open `api-tests.http`.
3. Under the **CHAT WITH AI ORCHESTRATOR** section, click `Send Request` on the POST request. 

The Orchestrator will remember your `sessionId` and carry on a fluid conversation, discovering providers and booking services automatically!

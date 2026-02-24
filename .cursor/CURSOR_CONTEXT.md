TennisFinder – System Architecture & AI Context Document
1. Project Overview
TennisFinder is a smart, cross-platform ecosystem designed to connect racket sports players (Tennis, Padel) and bridge the gap between players and court facility owners.

The project operates on a "Split Brain" architecture:

B2C Mobile Application (Players): A social and utility platform for finding opponents of similar skill levels, creating/joining matches, and booking courts.

B2B Web Application (Court Owners): A "Command Center" dashboard for facility managers to oversee court utilization, approve bookings, and leverage AI for dynamic pricing and demand forecasting.

Both applications share a single, real-time serverless database, ensuring that an action taken by a player on mobile instantly reflects on the owner's web dashboard without manual refresh.

2. Technical Stack
The project utilizes the FHTC (Fast, High-performance, TypeScript, Convex) stack within a strict Monorepo environment, supplemented by Python for Machine Learning.

Monorepo Tooling:

Package Manager: pnpm (v10+)

Workspace Manager: Turborepo

Backend & Data Layer (packages/backend):

BaaS / Database: Convex (Serverless functions, NoSQL document store, real-time sync)

Authentication: @convex-dev/auth (Official Convex Auth)

Schema Validation: Zod & Convex v values.

Web Frontend - Court Owner Dashboard (apps/web):

Framework: React 19 + Vite

Routing & SSR: TanStack Start & TanStack Router

Styling: Tailwind CSS 4 + Shadcn/UI (Base-Lyra style)

Data Fetching: Convex React Client (useQuery, useMutation)

Mobile Frontend - Player App (apps/mobile):

Framework: React Native + Expo

Routing: Expo Router (File-based)

Styling: NativeWind (Tailwind for React Native)

AI Microservice (microservices/ai or standalone):

Language: Python 3.11

API Framework: FastAPI

ML Libraries: scikit-learn, pandas, joblib

Deployment: Dockerized container exposing port 8000

3. Project Goals
Rapid MVP Delivery: Achieve 70% feature completion within a 14-day sprint.

Eliminate Friction: Overcome the "cold start" problem of sports marketplaces by using AI to intelligently recommend fair prices and compatible match partners.

Real-time Synchronization: Ensure zero-latency state updates between the B2C mobile app and B2B web dashboard using Convex's native reactivity.

4. Architecture and Logic
The system relies on a heavily decoupled frontend layer synchronized by a centralized backend.

Core Modules & Data Flow:
Shared Schema (packages/backend/convex/schema.ts): Acts as the absolute source of truth. Defines users, courts, bookings, matches, and items.

Role-Based Access Control (RBAC): Users are strictly segregated by role (PLAYER, COURT_OWNER, ADMIN). Mutations explicitly verify ctx.auth.getUserIdentity() to ensure, for example, that only a court owner can approve a booking for their specific court.

The AI Integration Bridge: Convex cannot run Python. Therefore, Convex actions (which can perform external HTTP requests) act as the bridge.

Flow: Frontend calls a Convex Action -> Action fetches data from DB -> Action POSTs data to the Python FastAPI URL (/predict or /label) -> Action returns the ML prediction to the client.

5. Setup and Installation
Prerequisites
Node.js (v18+)

pnpm installed globally (npm install -g pnpm)

Docker (for running the AI service locally)

Step-by-Step Initialization
Clone & Install Dependencies:

Bash
git clone <repository-url>
cd tennisfinder
pnpm install
Start the AI Microservice:

Bash
cd path/to/ai/folder
docker build -t fair-price-api .
docker run -p 8000:8000 fair-price-api
Configure Environment Variables:

In packages/backend/.env.local, add: AI_API_URL=http://localhost:8000

Initialize Convex (Backend):

Bash
cd packages/backend
npx convex dev
Run the Monorepo (Web & Mobile):
Open a new terminal at the project root and run:

Bash
pnpm dev
6. Usage Instructions & Workflows
Workflow A: Court Owner Flow (Web)
A Court Owner navigates to the Web app (localhost:5173) and authenticates.

They navigate to "My Courts" and click "Add Court".

They view the Action Required queue. When a mobile player requests a booking, it appears here instantly. The owner clicks "Approve", triggering a Convex mutation that updates the booking status to "Confirmed".

Workflow B: AI Price Prediction (Marketplace)
A user creates a listing for a used Tennis Racket.

They fill out the form (Category, Brand, Flaw, Age).

Before submitting, the UI calls the Convex Action predictPrice, which queries the Python /predict endpoint.

The UI displays the Fair Market Value. The user sets their price, and the system calls /label to tag the listing as "fair", "overpriced", or "underpriced".

7. Contribution Guidelines (The "Lane" Strategy)
To avoid merge conflicts and breakages during the rapid 14-day sprint, all AI agents and human contributors must follow these rules:

Package Management Rule: NEVER run npm install. Always use pnpm add <package> --filter <workspace>. (e.g., pnpm add recharts --filter web).

The Lane Rule: * If working on Web UI, restrict file edits to apps/web/*.

If working on Mobile UI, restrict file edits to apps/mobile/*.

If working on Database/API, restrict file edits to packages/backend/*.

Schema Authority: Only modify packages/backend/convex/schema.ts if explicitly requested. Any changes here require running npx convex dev to regenerate TypeScript types across the monorepo.

Branching: Prefix all branches with the target lane (e.g., web/dashboard-ui, backend/booking-logic).

8. Additional Context & Design Decisions
Why Convex instead of Prisma/Postgres? The project pivoted to Convex to eliminate the need for manual WebSocket (Socket.io) management. In Convex, all useQuery calls are automatically reactive, allowing the team to hit the 70% MVP target in 14 days.

Timezones: All datetime fields are strictly stored as Unix timestamps (v.number()) in Convex to avoid cross-platform timezone parsing errors between the Python backend, React Web, and React Native.
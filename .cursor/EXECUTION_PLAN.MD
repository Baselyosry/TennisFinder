TASK STATUS DEFINITIONS

[ ] = Not Started

[~] = In Progress

[x] = Completed

[!] = Blocked

PRIORITY DEFINITIONS

[P0] = Critical (Blocks launch)

[P1] = Important (Core functionality)

[P2] = Enhancement (Post-launch / optimization)

TASK EXECUTION RULES

Always complete all [P0] tasks before [P1] or [P2]

Do not start a blocked task

Resolve blockers immediately when encountered

Do not skip testing tasks for completed features

Ensure "Done When" conditions are satisfied before marking tasks complete

---

**Housekeeping (last reviewed: 2026-04-01)** — Backend batch: typed `auth.ts` callback; `users.updateRole` + `users.syncProfile`; `items.listAvailableFiltered` + item indexes; `courts` CRUD mutations; `owners.getOwnerStats`; `listAll` admin-only; `seed.resetAndSeed` internal-only; AI actions require auth; Vitest coverage (`items`, `courts`, `owners`, shared `helpers`); `convexTestModules` moved to [`packages/backend/convexTestModules.ts`](../packages/backend/convexTestModules.ts) (Convex bundler disallows `import.meta` under `convex/`).

---

1. SYSTEM COMPLETION TASKS
Marketplace
[x] [P0] Feature: Item editing and deletion (Est: S) — backend: `items/mutations` update/remove

[x] [P0] Feature: "Mark as Sold" status toggle (Est: XS) — backend: `toggleStatus`

[~] [P0] Feature: Multi-image support via Convex File Storage (Est: M) ⚠ Risk: File storage integration — backend upload + validation done; mobile picker pending

[x] [P1] Feature: Categorical and price-range filtering (Est: M) — backend: `items/queries.listAvailableFiltered` + indexes; clients must call it

[x] [P0] Backend: update and delete mutations in items/mutations.ts (Est: S) → Depends on: Item editing and deletion

[x] [P0] Backend: toggleSold mutation in items/mutations.ts (Est: XS) — implemented as `toggleStatus`

[x] [P0] Backend: Update items schema to use v.array(v.id("_storage")) (Est: XS) ⚠ Risk: File storage integration

[ ] [P1] Frontend: Image picker integration in Mobile B2C (Est: M)

[ ] [P1] Frontend: "My Listings" management screen in Mobile B2C (Est: M)

Blockers:

[x] [P0] Image storage logic must be completed before multi-image support can proceed — `images.generateUploadUrl` + post-upload MIME check in item mutations

Done When:

[ ] Items can be listed with multiple images and status can be toggled to "Sold" with real-time UI updates

[x] Users can only edit or delete items they own

[x] Search filters return correct subsets from the items table — backend query + Vitest; wire-up in apps still pending

Booking
[ ] [P1] Feature: Court availability calendar (Est: M)

[~] [P1] Feature: Reservation request and approval flow (Est: M) — backend create + status; UI pending

[x] [P0] Feature: Conflict detection (prevent double-booking) (Est: M) ⚠ Risk: Booking overlap logic

[x] [P0] Backend: Define courts and bookings tables in schema.ts (Est: S)

[x] [P1] Backend: Create listAvailability query with time-slot logic (Est: M) — `bookings/queries.listAvailability`

[x] [P0] Backend: Create createBooking mutation with atomic overlap validation (Est: M) ⚠ Risk: Booking overlap logic → Depends on: Define courts and bookings tables

[x] [P1] Backend: Create updateBookingStatus (Confirm/Cancel) mutation (Est: S)

[ ] [P1] Frontend: Booking request modal in Mobile B2C (Est: M)

[ ] [P1] Frontend: Reservation management board in Web B2B (Est: M)

Blockers:

[x] [P0] Schema definition for courts and bookings must be active before mutation development

Done When:

[x] Two users cannot book the same court at the same time (enforced by backend)

[ ] Facility owners can approve/cancel bookings from the Web Dashboard

[x] Availability query correctly filters out slots that have existing "Confirmed" bookings — also treats `Pending` as blocking

AI Integration
[ ] [P1] Feature: Price suggestion "Live Preview" during form entry (Est: M)

[ ] [P1] Feature: "Fairness Badge" visual indicators in Marketplace gallery (Est: S)

[x] [P0] Backend: Implement 5-second timeout for fetch calls to Python service (Est: S) ⚠ Risk: AI integration

[x] [P0] Backend: Standardize ai_label strings across marketplaceAI.ts and app.py (Est: XS)

[ ] [P1] Frontend: Real-time price estimation hook in Mobile B2C (Est: M)

Blockers:

[x] [P0] Standardized labeling API must be confirmed between Python and Convex before badge logic

Done When:

[ ] Every marketplace item displays an AI-calculated fairness label

[x] System handles Python service timeouts without crashing the listing flow

[ ] Live preview updates price estimates as the user adjusts form fields

Authentication & RBAC
[ ] [P1] Feature: Role-based redirect (Player vs. Owner) (Est: S)

[x] [P0] Backend: Add role field (player | owner) to users table (Est: XS) ⚠ Risk: Auth / RBAC — `PLAYER` | `COURT_OWNER` | `ADMIN` in schema

[x] [P0] Backend: Create users:updateRole mutation (Est: XS) — `users.updateRole` (+ `users.syncProfile`)

[x] [P0] Backend: Middleware-style identity checks on all items and bookings mutations (Est: S) ⚠ Risk: Auth / RBAC — items + bookings enforce auth/ownership

[ ] [P1] Frontend: Role selection screen post-signup (Est: S)

Blockers:

[x] [P0] users table schema update is required for all role-based logic

Done When:

[ ] Unauthorized users are blocked from B2B Web Dashboard routes

[ ] All data-modifying mutations verify identity.subject against resource ownership

[ ] New users are forced to select a role before accessing the main application

Web Dashboard (B2B)
[ ] [P2] Feature: Court utilization analytics charts (Est: L)

[ ] [P2] Feature: Pricing optimization tool based on AI demand data (Est: L)

[x] [P1] Backend: Create getOwnerStats aggregate query (Est: M) — `owners/queries.getOwnerStats`

[ ] [P1] Frontend: Implementation of TanStack Table for booking management (Est: M)

[ ] [P2] Frontend: Integration of Recharts for demand visualization (Est: L)

Blockers:

[x] [P1] Booking data must exist to populate analytics and tables — backend can aggregate; UI tables/charts still open

Done When:

[ ] Facility owners can view a chronological list of bookings for their courts

[ ] Analytics charts correctly aggregate revenue and occupancy data

Mobile App (B2C)
[ ] [P2] Feature: Player profile with "Match History" (Est: M)

[ ] [P2] Feature: Push notifications for booking confirmations (Est: L)

[ ] [P1] Frontend: Global state management for user role and session (Est: M)

[ ] [P2] Frontend: Deep linking for specific marketplace items (Est: S)

Blockers:

[x] [P1] Backend profile mutations must be ready before match history implementation — `users.syncProfile` (+ role via `updateRole`)

Done When:

[ ] User session persists across app restarts

[ ] Players can navigate from a booking request to a confirmation state seamlessly

2. GLOBAL BACKEND TASKS (Convex)
[x] [P1] Query: items:listByCategory with pagination support (Est: S) — implemented as `items/queries.listAvailableFiltered` (category + optional price/label + pagination)

[x] [P1] Query: bookings:listByCourt filtered by date range (Est: S) — `bookings/queries.listByCourt`

[x] [P0] Mutation: images:generateUploadUrl for frontend file ingestion (Est: S) ⚠ Risk: File storage — `images.generateUploadUrl`

[x] [P1] Mutation: users:syncProfile to update avatars and bios (Est: S) — `users.syncProfile` (schema-aligned fields; no separate avatar field in schema yet)

[x] [P0] Validation: Replace as any type casts with strict Id<"table"> checks (Est: S) — `auth.ts` callback fully typed; narrow `GenericMutationCtx`→`DataModel` cast at `upsertUserRecord` boundary only

[x] [P0] Index: items table by status and createdAt (Est: XS)

[x] [P1] Index: items table by category and price (Est: XS) — `by_status_and_category_and_createdAt`, `by_status_and_user_price`, `by_status_and_category_and_user_price`

[x] [P0] Index: bookings table by courtId and startTime (Est: XS)

[x] [P0] Security: Verify identity.subject === doc.ownerId in all update/delete handlers (Est: S) ⚠ Risk: Auth / RBAC — items owner checks; bookings court owner / player rules

3. AI SYSTEM TASKS
[~] [P0] Standardize Python FastAPI response headers for Convex compatibility (Est: S) ⚠ Risk: AI integration — JSON body fields aligned (`status`/`label`/`recommendedPriceRange`)

[ ] [P1] Implement request logging in app.py for model performance auditing (Est: S)

[x] [P0] Define "Safety Thresholds" for price labels (e.g., +/- 15% for "Fair") (Est: S) — `THRESHOLD = 0.15` in `app.py`

[x] [P0] Implement try-catch blocks in all Convex actions calling the AI service (Est: S) ⚠ Risk: AI integration — all three actions wrap `fetch` in try/catch (failures surface as errors or degraded listing path)

[ ] [P1] Create a "Mock AI" toggle in environment variables for local development without Python (Est: S)

4. FAILURE & EDGE CASE HANDLING
[x] [P0] Scenario: Python AI service is unreachable (Return AI Offline status) (Est: S) ⚠ Risk: AI integration — listing path degrades via `autoListWithAI`

[x] [P0] Scenario: User uploads non-image file (Add MIME type validation in generateUploadUrl) (Est: XS) ⚠ Risk: File storage — declared type at URL + `_storage` metadata on item write

[x] [P0] Scenario: Attempt to book an already reserved slot (Return clear Conflict error code) (Est: XS) ⚠ Risk: Booking overlap logic — `ConvexError` code `BOOKING_CONFLICT`

[x] [P0] Scenario: Unauthorized user edits listing (Enforce ownerId check at database level) (Est: S) ⚠ Risk: Auth / RBAC

[ ] [P1] Scenario: AI returns invalid data type (Add Zod parsing to fetch response) (Est: S)

5. INTEGRATION TASKS
[ ] [P1] Connect AI fairness label outputs to marketplace item badges in UI (Est: S)

[ ] [P1] Sync court availability state between owner dashboard (Web) and player view (Mobile) (Est: M)

[ ] [P0] Ensure real-time reactive updates for booking status changes via Convex useQuery (Est: S)

[ ] [P0] Validate cross-system data consistency between user roles and available dashboard features (Est: M) ⚠ Risk: Auth / RBAC

[ ] [P1] Map storage IDs from Convex File Storage to frontend <Image /> components (Est: S) ⚠ Risk: File storage

6. TESTING TASKS
[x] [P0] Test critical backend mutations for double-booking prevention (Est: S) ⚠ Risk: Booking overlap logic — `convex/tests/bookings.test.ts`

[ ] [P1] Test AI edge cases (extremely high/low prices, missing fields) (Est: S) ⚠ Risk: AI integration

[x] [P0] Test authorization boundaries (Owner vs. Player vs. Public access) (Est: S) ⚠ Risk: Auth / RBAC — `courts.test.ts`, `items.test.ts` (incl. `listAll` admin), `owners.test.ts`; booking auth in `bookings.test.ts`

[ ] [P1] Test real-time subscription performance with 50+ concurrent items (Est: M)

[ ] [P0] End-to-end flow validation: Item creation -> AI labeling -> Marketplace display (Est: M)

[ ] [P0] End-to-end flow validation: Booking request -> Owner approval -> Player notification (Est: M)

7. PRODUCTION PREPARATION
[ ] [P0] Environment variables setup (Clerk/Auth keys, AI URL) (Est: XS)

[ ] [P0] Deployment setup: Convex Production Environment (Est: S)

[ ] [P0] Deployment setup: Python AI Service (Cloud deployment) (Est: M) ⚠ Risk: AI integration

[ ] [P1] Logging and monitoring configuration (Convex Log Streams) (Est: S)

[ ] [P1] Performance checks: Query execution times and index usage (Est: S)

[~] [P0] Security checks: Final audit of ctx.auth.getUserIdentity() on all mutations (Est: S) ⚠ Risk: Auth / RBAC — dev pass done (items/bookings/images/courts/users profile+role, AI actions, `listAll` admin gate; `seed` internal-only); production sign-off still open

LAUNCH BLOCKERS (Must be 100% complete before release)
[ ] All [P0] tasks completed

[ ] All authentication and authorization checks verified

[ ] All critical mutations (Booking, Marketplace) tested successfully

[ ] AI fallback logic working correctly

[ ] No blocking bugs in booking or marketplace flows

[ ] Production environment variables configured

CRITICAL PATH
[x] [P0] Update schema.ts with courts, bookings, and storage IDs (Est: S)

[x] [P0] Complete Convex File Storage generateUploadUrl and ingestion (Est: S) ⚠ Risk: File storage

[x] [P0] Implement atomic booking overlap validation (Est: M) ⚠ Risk: Booking overlap logic

[x] [P0] Standardize ai_label API between FastAPI and Convex (Est: S) ⚠ Risk: AI integration

[x] [P0] Audit and enforce ctx.auth.getUserIdentity() on all mutations (Est: S) ⚠ Risk: Auth / RBAC — public mutations/actions covered; destructive seed is `internalMutation` only

PARALLELIZATION GUIDELINES
Backend tasks can run in parallel with frontend if schema is stable

Mobile and Web development can proceed in parallel after API completion

AI integration depends on stable backend actions

Avoid parallel work on dependent tasks

DAILY EXECUTION MODE
Always start with P0 tasks

Pick 1–3 tasks maximum at a time

Move task to [~] when started

Mark [!] immediately if blocked

Do not context-switch between domains (Backend/Mobile/Web)

End each session by marking completed tasks [x]

8. FINAL EXECUTION PHASES
Rule: Phase N must be 100% complete before moving to Phase N+1

Phase 1: Core Foundation & Storage
Phase Owner:

Backend

[x] [P0] Update schema.ts with courts, bookings, and image IDs (Est: S)

[x] [P0] Implement Convex File Storage upload flow (Est: S) ⚠ Risk: File storage

[x] [P0] Add RBAC role field to users (Est: XS) ⚠ Risk: Auth / RBAC

[x] [P0] Create database indexes for marketplace search (Est: XS) — `by_status_and_createdAt` plus category/price composite indexes (see schema)

Phase 2: Booking Engine & B2B Basics
Phase Owner:

Backend

Mobile

Web

[x] [P0] Implement booking overlap validation logic (Est: M) ⚠ Risk: Booking overlap logic

[x] [P1] Create court management mutations for owners (Est: S) — `courts/mutations` create/update/delete

[ ] [P1] Build mobile booking request UI (Est: M)

[ ] [P1] Connect TanStack Router in Web for owner navigation (Est: S)

Phase 3: AI Hardening & Marketplace Finalization
Phase Owner:

Backend

Mobile

Web

[~] [P0] Add timeout and retry logic to AI actions (Est: S) ⚠ Risk: AI integration — 5s timeout; retry not implemented

[x] [P1] Implement marketplace search and filtering queries (Est: S) — `listAvailableFiltered`

[ ] [P1] Add "Fairness Badges" to mobile/web item cards (Est: S)

[x] [P1] Finalize "Mark as Sold" and item management flows (Est: S) — backend complete; mobile UI pending

Phase 4: Analytics & Production Launch
Phase Owner:

Backend

Mobile

Web

[ ] [P2] Build B2B analytics dashboard with Recharts (Est: L)

[ ] [P0] Conduct end-to-end security audit of mutations (Est: S) ⚠ Risk: Auth / RBAC

[ ] [P0] Deploy Python AI service to production environment (Est: M) ⚠ Risk: AI integration

[ ] [P0] Perform cross-platform smoke testing (iOS/Android/Web) (Est: M)

FINAL VALIDATION CHECKLIST
[ ] All P0 tasks completed

[ ] All blockers resolved

[ ] No [!] tasks remaining

[ ] End-to-end flows verified (Marketplace + Booking)

[ ] AI system stable with fallback

[ ] Auth and RBAC fully enforced

[ ] Real-time updates working correctly

[ ] Production deployment successful
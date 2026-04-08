# Aaroneq Field Services — Full Architecture & Implementation Reference

> **Audience:** Developers and integrators working on this project.  
> **Source of truth for:** Monday.com board structure, board-to-board linking, required manual setup steps, API data flow, feature implementation status, and the full phase roadmap.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monday.com Boards — Full Inventory](#2-mondaycom-boards--full-inventory)
3. [Board Relationship Map](#3-board-relationship-map)
4. [Board Column Reference](#4-board-column-reference)
   - [4.1 Customers Board](#41-customers-board-id-18400951947)
   - [4.2 Locations Board](#42-locations-board-id-18400965227)
   - [4.3 Work Orders Board](#43-work-orders-board-id-18402613691)
   - [4.4 Equipment Board](#44-equipment-board-id-18403226725)
   - [4.5 Technicians Board](#45-technicians-board-id-18401479312)
   - [4.6 Time Entries Board](#46-time-entries-board-id-18406939306)
   - [4.7 Expenses Board](#47-expenses-board-id-18406939432)
   - [4.8 Invoice Line Items Board](#48-invoice-line-items-board-id-18403393439)
   - [4.9 Master Costs Board](#49-master-costs-board-id-18407330739)
5. [Data Flow — Clock In](#5-data-flow--clock-in)
6. [Data Flow — Clock Out](#6-data-flow--clock-out)
7. [Data Flow — Real-time Socket Events](#7-data-flow--real-time-socket-events)
8. [Backend — Database Schema (Prisma)](#8-backend--database-schema-prisma)
9. [Frontend — Redux Store Structure](#9-frontend--redux-store-structure)
10. [Work Order Status System](#10-work-order-status-system)
11. [Feature Implementation Status](#11-feature-implementation-status)
12. [Manual Monday.com Setup Tasks](#12-manual-mondaycom-setup-tasks)
13. [Phase Roadmap](#13-phase-roadmap)
14. [API Reference](#14-api-reference)
15. [Environment Variables](#15-environment-variables)

---

## 1. System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  React Frontend (Vite + MUI)                                       │
│  d:\Workspace\monday-linker                                        │
│                                                                    │
│  ┌──────────────┐   REST/JWT    ┌──────────────────────────────┐  │
│  │  Auth (JWT)  │──────────────▶│  Express Backend (Node.js)   │  │
│  └──────────────┘               │  d:\Workspace\monday-linker- │  │
│                                 │  backend                     │  │
│  ┌──────────────┐   Socket.io   │                              │  │
│  │  Socket      │◀─────────────▶│  Prisma ORM (PostgreSQL)     │  │
│  │  Provider    │               │  Monday.com GraphQL API      │  │
│  └──────────────┘               └──────────────────────────────┘  │
│                                          │                         │
│  ┌──────────────────────────────┐        │ GraphQL mutations        │
│  │  Apollo Client               │        ▼                         │
│  │  → Monday.com GraphQL API    │  monday.com workspace            │
│  │  (read-heavy operations)     │  (9 boards, automated)           │
│  └──────────────────────────────┘                                  │
└────────────────────────────────────────────────────────────────────┘
```

### Key Technologies
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, MUI v6, Redux Toolkit, Apollo Client, Socket.io-client |
| Backend | Node.js, Express, Prisma ORM, Socket.io |
| Database | PostgreSQL (via Supabase) |
| External API | Monday.com GraphQL API v2024-01 |
| Auth | JWT (Monday.com identity — user ID + name extracted from token) |
| Timezone | All day-bound queries use CST/CDT (`America/Chicago`) |

---

## 2. Monday.com Boards — Full Inventory

| # | Board Name | Board ID | Purpose |
|---|---|---|---|
| 1 | Customers | `18400951947` | Customer contact records |
| 2 | Locations | `18400965227` | Service sites / job locations |
| 3 | Work Orders | `18402613691` | Primary job tracking board |
| 4 | Equipment | `18403226725` | Equipment at each location |
| 5 | Technicians | `18401479312` | Technician profiles and rates |
| 6 | Time Entries | `18406939306` | Per-session clock-in/out records |
| 7 | Expenses | `18406939432` | Expense line items |
| 8 | Invoice Line Items | `18403393439` | Billable line items for invoicing |
| 9 | Master Costs Board | `18407330739` | Aggregated cost view for Xero |

---

## 3. Board Relationship Map

The diagram below shows every `board_relation` link between boards.  
**Solid arrows** = implemented.  **Dashed arrows** = planned / not yet built.

```
                   ┌──────────────┐
                   │  Customers   │◀──── CUSTOMERS_REL
                   │ 18400951947  │
                   └──────┬───────┘
                          │ (mirror reflected in Equipment, Locations)
                          ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Locations   │◀───│  Work Orders │───▶│  Equipment   │
│ 18400965227  │    │ 18402613691  │    │ 18403226725  │
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │ WORK_ORDERS_REL (board_relation_mm21aenv)
                           ▼
                   ┌──────────────┐
                   │ Time Entries │
                   │ 18406939306  │
                   └──────────────┘
                           │ (via timeEntryId FK in Postgres)
                           ▼
                   ┌──────────────┐
                   │   Expenses   │
                   │ 18406939432  │
                   └──────────────┘

─ ─ ─ ─  PLANNED (not yet built) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

Work Orders ──── board_relation ──▶ Invoice Line Items (18403393439)
                                    (INVOICE_ITEMS_REL already defined:
                                     board_relation_mm1ae4as on Invoice Items side)

Work Orders ──── board_relation ──▶ Master Costs Board (18407330739)
                                    (column does not exist yet — must be added manually)
```

### Relation Summary Table

| Source Board | Column ID | Column Type | Target Board |
|---|---|---|---|
| Work Orders | `board_relation_mm14ngb2` | board_relation | Customers |
| Work Orders | `board_relation_mm14fdpt` | board_relation | Locations |
| Work Orders | `board_relation_mm19cxzv` | board_relation | Equipment |
| Work Orders | `board_relation_mm1ady0r` | board_relation | Invoice Line Items |
| Locations | `board_relation_mm14vzq7` | board_relation | Work Orders |
| Locations | `board_relation_mm18fk7h` | board_relation | Customers |
| Locations | `board_relation_mm19zxd8` | board_relation | Equipment |
| Equipment | `board_relation_mm19trhn` | board_relation | Locations |
| Equipment | `board_relation_mm19qvrd` | board_relation | Work Orders |
| Time Entries | `board_relation_mm21aenv` | board_relation | Work Orders |
| Time Entries | `board_relation_mm21vtd1` | board_relation | Locations |
| Invoice Line Items | `board_relation_mm1ae4as` | board_relation | Work Orders |
| **Master Costs** | *(not yet created)* | board_relation | **Work Orders** |

---

## 4. Board Column Reference

### 4.1 Customers Board (id: `18400951947`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Email | `email_mm0rhasv` | email | |
| Phone | `phone_mm0rpam7` | phone | |
| Account Number | `text_mm0ryhr9` | text | |
| Status | `color_mm0rjkns` | status | |
| Billing Address | `long_text_mm0r9ndz` | long_text | |
| Billing Terms | `dropdown_mm0r9ywe` | dropdown | |
| Xero Contact ID | `text_mm0rdxmk` | text | Phase 7 — Xero |
| Xero Sync Status | `color_mm0rxh2b` | status | Phase 7 — Xero |
| Notes | `long_text_mm0rppk5` | long_text | |

---

### 4.2 Locations Board (id: `18400965227`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Street Address | `text_mm0r64n` | text | |
| City | `text_mm0rv9zr` | text | |
| State | `dropdown_mm0r9ajj` | dropdown | |
| ZIP | `text_mm0rrexv` | text | |
| Status | `color_mm0rrea` | status | |
| Notes | `long_text_mm0rns1x` | long_text | |
| Work Orders (rel) | `board_relation_mm14vzq7` | board_relation | → Work Orders |
| Customers (rel) | `board_relation_mm18fk7h` | board_relation | → Customers |
| Equipment (rel) | `board_relation_mm19zxd8` | board_relation | → Equipment |

---

### 4.3 Work Orders Board (id: `18402613691`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Customer | `board_relation_mm14ngb2` | board_relation | → Customers board |
| Location | `board_relation_mm14fdpt` | board_relation | → Locations board |
| Description | `long_text_mm14ee7h` | long_text | |
| Scheduling Status | `color_mm14pf0q` | status | See §10 for all options |
| Technician | `multiple_person_mm14sesj` | people | Assigned technician(s) |
| Scheduled Date | `date_mm14sjdg` | date | |
| Multi-Day Job | `boolean_mm14act2` | checkbox | |
| Service History | `long_text_mm15p7rk` | long_text | |
| Work Performed | `long_text_mm15kfzp` | long_text | |
| Execution Status | `color_mm1s7ak1` | status | Auto-set by app on clock-in |
| Parts Ordered | `color_mm1bs0w7` | status | |
| Work Order # | `text_mm1s82bz` | text | **Auto-numbering not yet implemented** |
| Equipment (rel) | `board_relation_mm19cxzv` | board_relation | → Equipment board |
| Invoice Items (rel) | `board_relation_mm1ady0r` | board_relation | → Invoice Line Items |
| **Master Costs (rel)** | *(not yet created)* | board_relation | **→ Master Costs Board — add manually** |

> **Missing status options** — see §12 for the full list of statuses that need to be added in Monday.com manually.

---

### 4.4 Equipment Board (id: `18403226725`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Location | `board_relation_mm19trhn` | board_relation | → Locations |
| Customer (mirror) | `lookup_mm19dq9a` | mirror | Reflects customer via Location |
| Manufacturer | `text_mm19e8jk` | text | |
| Model Number | `text_mm19j9gf` | text | |
| Serial Number | `text_mm19epvj` | text | |
| Install Date | `date_mm19k1md` | date | |
| Status | `color_mm19my9y` | status | |
| Notes | `long_text_mm1915x3` | long_text | |
| Work Orders (rel) | `board_relation_mm19qvrd` | board_relation | → Work Orders |
| Service History (mirror) | `lookup_mm19r6xz` | mirror | Reflects WO work history |
| Last Service Date (mirror) | `lookup_mm19zknx` | mirror | Reflects latest WO date |

---

### 4.5 Technicians Board (id: `18401479312`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Hourly Rate | `numeric_mm0wgqn1` | number | Used for labor cost calculation |
| *(other columns)* | | | Sourced from Monday.com identity |

> Technicians are identified by their Monday.com account. The app reads the logged-in user's Monday ID from the JWT and cross-references the Technicians board for rate data.

---

### 4.6 Time Entries Board (id: `18406939306`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Total Hours | `numeric_mm21p49k` | number | Computed on clock-out |
| Clock In | `date_mm21zkpj` | date | datetime |
| Clock Out | `date_mm2155gg` | date | datetime |
| Task Type | `dropdown_mm21wscp` | dropdown | `1`=Job, `2`=Non-Job |
| Work Orders (rel) | `board_relation_mm21aenv` | board_relation | → Work Orders |
| Technician | `multiple_person_mm21m56s` | people | Monday.com user ID |
| Locations (rel) | `board_relation_mm21vtd1` | board_relation | → Locations |
| Expenses Added | `boolean_mm212dcy` | checkbox | Set to true if expenses exist |

> Items are created on clock-in (partial) and updated on clock-out (adds Clock Out, Total Hours, Expenses Added flag).  
> On clock-out the item is moved to the "Completed" group automatically by the backend.

---

### 4.7 Expenses Board (id: `18406939432`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Technician | `multiple_person_mm212yhb` | people | |
| Receipt | `file_mm21j7d7` | file | CompanyCam Phase 7 |
| Description | `text_mm213m15` | text | Short label |
| Expense Type | `dropdown_mm215jhc` | dropdown | `1`=Fuel, `2`=Lodging, `3`=Meals, `4`=Supplies |
| Work Order | `text_mm218mcp` | text | Denormalized WO label |
| Amount | `numeric_mm21a0kv` | number | Dollars |

> **Gap:** This board currently stores denormalized text for Work Order (`text_mm218mcp`) rather than a `board_relation`. A board_relation to Work Orders would enable proper linking. Fix manually in Monday.com if desired.

---

### 4.8 Invoice Line Items Board (id: `18403393439`)

| Column Name | Column ID | Type | Notes |
|---|---|---|---|
| Work Orders (rel) | `board_relation_mm1ae4as` | board_relation | → Work Orders |
| Customer (mirror) | `lookup_mm1ag56m` | mirror | Reflects via WO → Customer |
| Location (mirror) | `lookup_mm1ac07c` | mirror | Reflects via WO → Location |
| Item Type | `dropdown_mm1ae5fd` | dropdown | Labor / Parts / Expense |
| Quantity | `numeric_mm1ab4nj` | number | |
| Unit Price | `numeric_mm1a6h84` | number | |
| Total | `formula_mm1astxs` | formula | Quantity × Unit Price |
| Billing Status | `color_mm1ae7q7` | status | Pending / Sent to Xero / Paid |
| Invoice ID | `text_mm1ay1cy` | text | Set by Xero (Phase 7) |
| Description | `long_text_mm1cdk36` | long_text | |
| Revenue Account | `color_mm1csz5m` | status | Account code for Xero |

> **Status: Not yet written to.** Column IDs are defined in `mondayMutations.js` (COL.INVOICE_ITEMS) but no code calls them. Writing to this board is a Phase 7 Xero integration task.

---

### 4.9 Master Costs Board (id: `18407330739`)

> **This board requires manual corrections in Monday.com before code integration can proceed.**  
> See §12 for the full list of actions required.

| Column Name | Column ID | Type | Status | Notes |
|---|---|---|---|---|
| Type | `color_mm25xk4h` | status | ✅ exists | Labor / Parts / Expense |
| Quantity / Hours | `numeric_mm256yw2` | number | ✅ exists | Hours for labor; count for parts |
| Rate | `numeric_mm25xvx0` | number | ✅ exists | $/hr for labor; unit price for parts |
| Description | `text_mm25nhbc` | text | ✅ exists | |
| Work Order Link | `dropdown_mm25yw28` | **dropdown** | ❌ wrong type | Must be replaced with `board_relation` → Work Orders |
| Total Cost | `numeric_mm25953b` | **number** | ❌ wrong type | Must be replaced with `formula` (`{Qty/Hours} × {Rate}`) |
| Date | *(not created)* | date | ❌ missing | Add manually |
| Technician | *(not created)* | people | ❌ missing | Add manually |
| Customer | *(not created)* | mirror | ❌ missing | Mirror via Work Order relation |
| Location | *(not created)* | mirror | ❌ missing | Mirror via Work Order relation |
| Invoice Status | *(not created)* | status | ❌ missing | Options: Pending / Sent to Xero / Paid |

---

## 5. Data Flow — Clock In

```
User clicks [Clock In] → ClockInModal opens
        │
        ├── entryType = "Job"    →  workOrder selected from list (fetched from WO board)
        └── entryType = "NonJob" →  taskDescription typed/chosen

Frontend: optimistic active entry stored in localStorage (useActiveEntry hook)
        │
        ▼
POST /api/time-entries/clock-in    (JWT required)
  Body: { entryType, workOrderRef, workOrderLabel, taskDescription }
        │
        ▼
Backend — Prisma:
  1. Check for open entry (409 if already clocked in)
  2. Upsert Technician record
  3. Create TimeEntry { status: Open, clockIn: now(), ... }
  4. Return entry id immediately (fast response)
        │
        ▼
Backend — setImmediate (non-blocking side effects):
  1. monday.setWorkOrderInProgress(workOrderRef)
     → change_multiple_column_values on WO board
     → EXECUTION_STATUS = "In Progress" (color_mm1s7ak1)
  2. monday.createTimeEntryItem(...)
     → create_item on Time Entries board (partial: no clock-out yet)
     → assign Technician people column separately (isolated failure)
     → store monday item ID back in Prisma (mondayItemId field)
        │
        ▼
Socket.io broadcast: "clock_in" event
  { technicianId, technicianName, entryId, entryType, workOrderRef, workOrderLabel, taskDescription, clockIn }
```

**Frontend receives backendEntryId** → stored in active entry. Required for clock-out.

---

## 6. Data Flow — Clock Out

```
User clicks [Clock Out] → ClockOutModal opens
  Required: narrative (text), location (text)
  Optional: expenses[] { type, amount, details }
        │
        ▼
Frontend: optimistic entry added to Today's Log immediately
          active entry cleared from localStorage
        │
        ▼
PATCH /api/time-entries/:id/clock-out    (JWT required)
  Body: { narrative, jobLocation, expenses[], markComplete }
        │
        ▼
Backend — Prisma transaction:
  1. Compute hoursWorked = (now - clockIn) in decimal hours
  2. Update TimeEntry { clockOut, hoursWorked, narrative, jobLocation, status: Complete }
  3. Create Expense records for each expense in payload
        │
        ▼
Backend — setImmediate (non-blocking side effects):
  1. monday.updateTimeEntryItem(mondayItemId, { clockOut, hoursWorked, hasExpenses })
     → Updates Clock Out date, Total Hours, Expenses Added flag on Time Entries board
     → Moves item to "Completed" group on Time Entries board
  2. monday.setWorkOrderComplete(workOrderRef)   [only if markComplete === true]
     → EXECUTION_STATUS = "Completed" on WO board
  3. For each expense: monday.createExpenseItem(...)
     → Creates item on Expenses board
        │
        ▼
Socket.io broadcast: "clock_out" event
  { technicianId, entryId, entryType, workOrderRef, workOrderLabel,
    taskDescription, clockIn, clockOut, hoursWorked, status, expenses }
```

**Frontend socket handler** (`onClockOut`):
- Guards: `payload.technicianId === auth.technician.id` AND `isToday(payload.clockIn)`
- Replaces the optimistic temp entry with the real confirmed entry

---

## 7. Data Flow — Real-time Socket Events

| Event Name | Direction | Payload | Purpose |
|---|---|---|---|
| `today:request` | Client → Server | *(none)* | Request today's entries on page load / reconnect |
| `today:data` | Server → Client | `{ data: TimeEntry[] }` | Full list of today's entries + any stale open session |
| `clock_in` | Server → All clients | See §5 | Broadcast when any technician clocks in |
| `clock_out` | Server → All clients | See §6 | Broadcast when any technician clocks out |
| `board:request` | Client → Server | `{ boardId, date? }` | Request board data for Time Board page |
| `board:data` | Server → Client | `{ data: EntryRange[] }` | Weekly range entries for Time Board |

> **Stale session recovery:** `today:request` response includes both today's entries AND any `staleOpenEntry` (an entry with `clockOut: null` and `clockIn` before today). The frontend uses the stale entry to restore the active clock-in banner after a page reload. It is excluded from Today's Log display via the `isToday(e.clockIn)` filter.

---

## 8. Backend — Database Schema (Prisma)

Located at: `d:\Workspace\monday-linker-backend\prisma\schema.prisma`

### Technician
```
id          String    (Monday.com user ID — primary key)
name        String
email       String?   (unique)
isAdmin     Boolean   (default: false)
timeEntries TimeEntry[]
```

### TimeEntry
```
id              String    (CUID)
technicianId    String    (FK → Technician)
entryType       Enum      Job | NonJob
status          Enum      Open | Complete | Approved
workOrderRef    String?   (Monday.com item ID for Work Order)
workOrderLabel  String?   (display string, e.g. "WO-1354 · Ice Machine Repair")
taskCategory    String?   (for NonJob: "Training", "Shop / Warehouse", etc.)
taskDescription String?
mondayItemId    String?   (set after createTimeEntryItem succeeds)
clockIn         DateTime
clockOut        DateTime?
hoursWorked     Decimal?  (6,2) — computed on clock-out
narrative       String?   (required at clock-out)
jobLocation     String?   (required at clock-out)
expenses        Expense[]
```

### Expense
```
id          String    (CUID)
timeEntryId String    (FK → TimeEntry, cascade delete)
type        Enum      Fuel | Lodging | Meals | Supplies
amount      Decimal   (10,2) — dollars
details     String?
receiptUrl  String?   (Phase 7 — CompanyCam)
```

### Notes
- All timestamps are stored as UTC in PostgreSQL.
- Day boundary queries use `getCSTDayBounds()` from `src/lib/cstTime.js` which converts `America/Chicago` to UTC offsets before querying.
- `mondayItemId` is nullable — clock-in creates the Prisma record immediately and the Monday.com item ID is backfilled asynchronously via `setImmediate`.

---

## 9. Frontend — Redux Store Structure

| Slice | File | State Shape |
|---|---|---|
| `authSlice` | `store/authSlice.js` | `{ auth: { token, technician: { id, name, isAdmin } } }` |
| `activeEntrySlice` | `store/activeEntrySlice.js` | `{ activeEntry: { entryType, workOrder, taskDescription, clockInTime, backendEntryId } \| null }` — persisted to localStorage |
| `workOrderSlice` | `store/workOrderSlice.js` | `{ board: { id, name, groups, items_page }, loading, error, creating }` |
| `customersSlice` | `store/customersSlice.js` | Same shape as workOrderSlice |
| `locationsSlice` | `store/locationsSlice.js` | Same shape |
| `equipmentslice` | `store/equipmentslice.js` | Same shape |

### Key Hooks

| Hook | File | Purpose |
|---|---|---|
| `useActiveEntry` | `hooks/useActiveEntry.js` | Read/write the active clock-in entry (persisted to localStorage) |
| `useAuth` | `hooks/useAuth.js` | Access auth state; login/logout actions |
| `useSocket` | `hooks/useSocket.js` | Access the connected Socket.io instance |

---

## 10. Work Order Status System

Every Work Order has **two separate status columns**.

### Scheduling Status (`color_mm14pf0q`)

Managed by office staff. Tracks planning/scheduling lifecycle.

| Status Label | Color | App Support |
|---|---|---|
| Incomplete | Red `#ef4444` | ❌ Not in frontend status options yet |
| Unscheduled | Amber `#f59e0b` | ✅ |
| Scheduled | Blue `#4f8ef7` | ✅ |
| Pre-scheduled | Purple `#a855f7` | ❌ Not in frontend status options yet |
| Return Trip Unscheduled | Orange `#f97316` | ❌ Not in frontend status options yet |
| Return Trip Scheduled | Cyan `#06b6d4` | ❌ Not in frontend status options yet |

> **Action required:** Add the 4 missing options in the `STATUS_OPTIONS` / `STATUS_HEX` constants in `constants.js` AND in the `WorkOrderDrawer`/`WorkOrdersBoard` status dropdowns.

### Execution / Progress Status (`color_mm1s7ak1`)

Managed by field technicians and the app.

| Status Label | Color | Set By |
|---|---|---|
| In Progress | Blue `#4f8ef7` | **Auto** — set by backend on clock-in |
| Additional Trip Needed (Parts Ordered) | Amber `#f59e0b` | Manual — technician in app |
| Additional Trip Needed (Need Parts) | Red `#ef4444` | Manual — technician in app |
| Additional Trip Needed (Time Only) | Purple `#a855f7` | Manual — technician in app |
| Complete | Green `#22c55e` | Manual — technician clicks "Mark Complete" at clock-out |

> "In Progress" is the only status set automatically. All others require the technician to consciously choose them.  
> When "Complete" is set, a Monday.com native automation fires and moves the WO to the "Ready for Billing" group.

---

## 11. Feature Implementation Status

### ✅ Fully Implemented

| Feature | Where |
|---|---|
| Clock In to Job (select WO) | `ClockInModal.jsx`, `timeEntries.js` POST `/clock-in` |
| Clock In to Non-Job (task description) | `ClockInModal.jsx`, `timeEntries.js` POST `/clock-in` |
| Clock-in sets WO Execution Status → "In Progress" | `mondayClient.js` → `setWorkOrderInProgress()` |
| Clock Out requires narrative + location | `ClockOutModal.jsx` validation |
| Clock Out expense checkboxes (gated) | `ClockOutModal.jsx` — Fuel, Lodging, Other |
| Expenses saved to Monday.com Expenses board on clock-out | `mondayClient.js` → `createExpenseItem()` |
| Today's Log table | `TimeTrackingPage.jsx` |
| Active banner (green/gray) + elapsed timer | `TimingPanel` in `TimeTrackingPage.jsx` |
| Multiple sessions per day | Supported in Prisma + frontend |
| Time Board weekly view | `TimeBoard.jsx` |
| Time Board week navigation + group by technician | `TimeBoard.jsx` |
| Real-time clock-in/out events via Socket.io | `SocketProvider.jsx`, `useSocket.js` |
| Stale session recovery on page reload | `activeEntrySlice` (localStorage) + `today:request` |

---

### ⚠️ Partially Implemented

| Feature | Gap | Where to Fix |
|---|---|---|
| Time Board — drilldown from entry to WO | Rows render but no click handler to open WO drawer | `TimeBoard.jsx` |
| Hours on WO as billable expense | WO linked to Invoice Line Items board via `board_relation_mm1ady0r` but no code writes to Invoice Items board | `mondayClient.js` + `timeEntries.js` |
| Standalone expenses from WO drawer | `ExpenseEntryModal.jsx` exists and UI is built, but uses `MOCK_WOS` hardcoded data; not wired to Redux or `/api/expenses` endpoint | `ExpenseEntryModal.jsx`, create `/api/expenses` route |
| WO Auto-numbering | Column `text_mm1s82bz` exists and is displayed, but no logic assigns a sequential number on creation | `WorkOrderDrawer.jsx`, backend `/api/work-orders` route |
| Scheduling statuses — missing options | Incomplete, Pre-scheduled, Return Trip Unscheduled, Return Trip Scheduled not in the app | `constants.js`, `WorkOrderDrawer.jsx`, `WorkOrdersBoard.jsx` |
| Execution statuses — missing options | All 3 "Additional Trip Needed" variants not in the app | Same as above |
| Billing toast on WO Complete | Clock-out has `markComplete` flag but no success toast/message shown after setting Complete | `TimeTrackingPage.jsx` / `ClockOutModal.jsx` |

---

### ❌ Not Yet Implemented

| Feature | Phase | Notes |
|---|---|---|
| 8 PM daily narrative report (Monday.com notification) | Phase 7 | Needs backend cron job; no scheduler exists |
| Xero: WO creates Xero project | Phase 7 | No Xero API client |
| Xero: expenses pushed to Xero | Phase 7 | No Xero API client |
| Xero: invoice push status (Pending / Pushed / Error) | Phase 7 | Needs Xero + Invoice Items board write |
| CompanyCam: new location → CompanyCam location | Phase 7 | No CompanyCam API client |
| CompanyCam: new WO → CompanyCam report | Phase 7 | No CompanyCam API client |
| Master Costs Board — write labor entries on clock-out | Phase 5 | Needs board fix first (see §12) |
| Master Costs Board — write expense entries on clock-out | Phase 5 | Same |
| Monday.com OAuth authentication | Phase 8 | Currently uses hardcoded JWT approach |

---

## 12. Manual Monday.com Setup Tasks

These tasks **cannot** be done via API and must be completed in the Monday.com interface.

### 12.1 Work Orders Board — Scheduling Status Options

Add the following status labels to column `color_mm14pf0q` in Monday.com:

| Label | Color |
|---|---|
| Incomplete | Red |
| Pre-scheduled | Purple |
| Return Trip Unscheduled | Orange |
| Return Trip Scheduled | Cyan |

> "Unscheduled" and "Scheduled" should already exist.

### 12.2 Work Orders Board — Execution Status Options

Add the following labels to column `color_mm1s7ak1`:

| Label | Color |
|---|---|
| Additional Trip Needed (Parts Ordered) | Amber |
| Additional Trip Needed (Need Parts) | Red |
| Additional Trip Needed (Time Only) | Purple |

> "In Progress" and "Complete" / "Completed" should already exist.

### 12.3 Work Orders Board — Master Costs Relation Column

Add a new `board_relation` column on the Work Orders board:
- **Column name:** Master Costs
- **Links to board:** Master Costs Board (`18407330739`)
- Note the generated column ID — it will be needed in `mondayMutations.js`

### 12.4 Master Costs Board — Fix Work Order Link

The existing "Work Order Link" column (`dropdown_mm25yw28`) is a **dropdown** type.  
This must be **deleted and recreated** as a `board_relation` pointing to Work Orders (`18402613691`).

Steps:
1. Delete column `dropdown_mm25yw28`
2. Add new column: name "Work Order", type `board_relation`, links to Work Orders board
3. Note the new column ID

### 12.5 Master Costs Board — Fix Total Cost Column

The existing "Total Cost" column (`numeric_mm25953b`) is a **number** type.  
Replace with a **formula** column: `{Quantity / Hours} * {Rate}`

Steps:
1. Delete column `numeric_mm25953b`
2. Add new column: name "Total Cost", type `formula`, expression: `{Quantity / Hours} * {Rate}`
3. Note the new column ID

### 12.6 Master Costs Board — Add Missing Columns

Add the following columns to the Master Costs Board:

| Column Name | Type | Notes |
|---|---|---|
| Date | date | Date the work/expense occurred |
| Technician | people | Monday.com people column |
| Customer | mirror | Mirror Customer from Work Order relation |
| Location | mirror | Mirror Location from Work Order relation |
| Invoice Status | status | Options: Pending, Sent to Xero, Paid |

### 12.7 Update `mondayMutations.js` After Board Fixes

Once all manual column changes are done, update `BOARD_IDS` and `COL` in  
`d:\Workspace\monday-linker\src\services\mondayMutations.js`  
and `BOARD` / `COL` in  
`d:\Workspace\monday-linker-backend\src\lib\mondayClient.js`  
with all new column IDs.

---

## 13. Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Create Time Entries + Expenses boards; configure initial WO status columns | ✅ Done |
| **Phase 1** | Add missing Scheduling + Execution status options in Monday.com AND in app constants | 🔲 Not Started |
| **Phase 2** | Auto-generate sequential WO numbers on creation | 🔲 Not Started |
| **Phase 3** | Time Tracking core clock-in/out wired to Monday.com API | ✅ Done |
| **Phase 3b** | Fix standalone ExpenseEntryModal — wire to real Redux WO data + `/api/expenses` endpoint | 🔲 Not Started |
| **Phase 4** | Time Board wired to backend `/api/time-entries/range` | ✅ Done (needs drilldown) |
| **Phase 5** | Master Costs Board integration — write labor + expense rows on clock-out | 🔲 Blocked (needs §12 manual fixes first) |
| **Phase 5b** | Billing workflow — Complete toast + billing status reinforcement | 🔲 Not Started |
| **Phase 6** | Invoice Line Items board writes (billable line items per WO) | 🔲 Not Started |
| **Phase 7** | CompanyCam + Xero + 8 PM daily report | 🔲 Deferred (requires backend cron + external API clients) |
| **Phase 8** | Monday.com OAuth — replace JWT with proper OAuth flow per technician | 🔲 Deferred |

---

## 14. API Reference

### Base URL
`http://localhost:3001` (dev) — set by `VITE_API_URL` environment variable.

### Authentication
All routes except `/api/auth/login` require:
```
Authorization: Bearer <jwt_token>
```
The JWT encodes `{ id, name, isAdmin }` from Monday.com identity.

### Endpoints

#### Auth
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{ token: string }` | Validate Monday.com token, return signed JWT |

#### Time Entries
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/time-entries` | User | Today's entries (CST day bounds). Query: `?date=`, `?status=`, `?technicianId=` |
| GET | `/api/time-entries/range` | Admin | Date range entries. Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD&technicianId=` |
| GET | `/api/time-entries/:id` | User | Single entry |
| POST | `/api/time-entries/clock-in` | User | Start a new session |
| PATCH | `/api/time-entries/:id/clock-out` | User | End a session, attach expenses |

#### Clock-In Body
```json
{
  "entryType": "Job" | "NonJob",
  "workOrderRef": "18402613691_item_id",   // required if Job
  "workOrderLabel": "WO-1354 · Ice Repair", // optional
  "taskCategory": "Training",               // optional NonJob
  "taskDescription": "Safety Meeting"       // required if NonJob
}
```

#### Clock-Out Body
```json
{
  "narrative": "Replaced compressor, tested pressures.",
  "jobLocation": "123 Main St customer site",
  "markComplete": false,
  "expenses": [
    { "type": "Fuel", "amount": 45.00, "details": "Gas for van" },
    { "type": "Lodging", "amount": 129.00, "details": "Hotel overnight" }
  ]
}
```

#### Socket Events (client → server)
| Event | Payload | Description |
|---|---|---|
| `today:request` | *(none)* | Request today's full entry list |
| `board:request` | `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }` | Request weekly board data |

#### Socket Events (server → client)
| Event | Payload |
|---|---|
| `today:data` | `{ data: TimeEntry[] }` |
| `clock_in` | `{ technicianId, technicianName, entryId, entryType, workOrderRef, workOrderLabel, taskDescription, clockIn }` |
| `clock_out` | `{ technicianId, entryId, entryType, workOrderRef, workOrderLabel, taskDescription, clockIn, clockOut, hoursWorked, status, expenses[] }` |
| `board:data` | `{ data: TimeEntry[] }` |

---

## 15. End-to-End Flow: Clock In → Monday.com

This section describes exactly what happens in every system — in sequence — from the moment a technician taps Clock In to the moment all boards are updated.

---

### Step 1 — Technician Opens Clock In Modal

The technician navigates to the **Time Tracker** page and clicks **[Clock In]**.

A modal opens with a toggle: **Job** or **Non-Job**.

---

### Step 2A — Job Entry: Select a Work Order

The technician picks **Job** and searches for a Work Order from the dropdown list. Work Orders are fetched live from the Monday.com Work Orders board (id: `18402613691`) via Apollo Client. Each item shows its Work Order number and name (e.g. "WO-1354 · Ice Machine Repair at Johnson's Restaurant").

The technician selects the Work Order and clicks **Confirm**.

---

### Step 2B — Non-Job Entry: Select a Task

The technician picks **Non-Job** and types or selects what they are doing:
- Shop / Warehouse
- Training
- Safety Meeting
- Vehicle Maintenance
- Administrative
- Other (custom text)

---

### Step 3 — Frontend Records the Clock-In Locally

Immediately — before the server even responds — the app:
- Stores the active clock-in in `localStorage` under key `ml_active_entry_v1`
- The top panel on the page turns **green** and shows: "Clocked in to [WO/Task Name] since [HH:MM]"
- A live elapsed timer starts counting up

This optimistic approach means the UI responds instantly even on slow connections.

---

### Step 4 — Backend Creates the Database Record

The app sends a request to the backend with the entry type, Work Order reference, and task description. The backend:

1. Checks if the technician already has an open (unclosed) entry — if so, returns the existing entry ID so the UI can recover
2. Creates or updates the Technician record in the database (name, ID from Monday identity)
3. Creates a new **TimeEntry** row in PostgreSQL:
   - Status: **Open**
   - Clock In: current timestamp (UTC)
   - Entry type: Job or NonJob
   - Work Order reference and label (for Job entries)
   - Task description (for Non-Job entries)
4. Returns the new entry's database ID to the frontend — called `backendEntryId`

The frontend stores `backendEntryId` with the active entry so clock-out can reference it.

---

### Step 5 — Monday.com Boards Are Updated (Clock In)

After the database record is created, the backend fires these Monday.com updates in the background (they do not block the API response):

#### 5A — Work Orders Board (Job entries only)

**Board:** Work Orders (`18402613691`)  
**Item:** The selected Work Order item  
**Column updated:** Execution Status (`color_mm1s7ak1`)  
**New value:** `"In Progress"`

This is visible immediately in Monday.com to office staff. Anyone viewing the Work Orders board will see the job is now active in the field.

#### 5B — Time Entries Board

**Board:** Time Entries (`18406939306`)  
**Action:** Creates a new item with:

| Column | Value |
|---|---|
| Item Name | Work Order label or task description |
| Clock In (`date_mm21zkpj`) | Clock-in date and time |
| Task Type (`dropdown_mm21wscp`) | "Job" (value 1) or "Non-Job" (value 2) |
| Work Orders relation (`board_relation_mm21aenv`) | Linked to the Work Order item (Job entries only) |
| Technician (`multiple_person_mm21m56s`) | The logged-in technician (Monday.com people column) |

At this point the item on the Time Entries board is **partial** — it has no Clock Out time yet. It sits in the "Open" group on the board. The database ID of this newly created Monday.com item is saved back to the TimeEntry record in PostgreSQL as `mondayItemId`. This ID is needed to update the item later at clock-out.

---

### Step 6 — Real-Time Broadcast

The backend broadcasts a `clock_in` socket event to all connected clients. Any other browser tab open on the Time Board or Time Tracker will receive this event and can update their view.

---

## 16. End-to-End Flow: Clock Out → Monday.com

### Step 1 — Technician Opens Clock Out Modal

The technician clicks **[Clock Out]**. A modal opens with three sections.

---

### Step 2 — Required Fields

The technician must fill in:

**Work Narrative** — a free-text description of what was done during this session. Examples:
- "Replaced evaporator fan motor, tested unit, confirmed proper temp recovery"
- "Shop time: prepped parts and tools for tomorrow's service call"

**Location / Site** — where they were physically working. Examples:
- "Johnson's Restaurant — 123 Main St"
- "Shop / Warehouse"

The **Clock Out** button remains disabled until both fields are filled.

---

### Step 3 — Optional Expenses

Three checkboxes appear: **Fuel**, **Lodging**, **Other**.

If any checkbox is ticked, two additional fields appear for that expense: **Amount ($)** and **Details** (short description). These become required before Clock Out can be submitted.

---

### Step 4 — Frontend Optimistic Update

When the technician clicks **Confirm Clock Out**, the app immediately:
- Calculates session duration (Clock Out time − Clock In time)
- Adds a new completed row to Today's Log with the hours and a status of "Open" (pending server confirmation)
- Clears the active clock-in from the green banner and localStorage
- The banner returns to gray "Not clocked in" state

---

### Step 5 — Backend Updates the Database

The backend:
1. Computes the final `hoursWorked` in decimal hours (e.g. 3.75 for 3h 45m)
2. Inside a single database transaction:
   - Updates the TimeEntry: adds `clockOut`, `hoursWorked`, `narrative`, `jobLocation`, sets status to **Complete**
   - Creates individual **Expense** rows for each expense submitted (type, amount, details)
3. Returns success

---

### Step 6 — Monday.com Boards Are Updated (Clock Out)

After the database transaction, the backend fires these Monday.com updates in the background:

#### 6A — Time Entries Board (Update Existing Item)

**Board:** Time Entries (`18406939306`)  
**Item:** The item created at clock-in (referenced by `mondayItemId`)  
**Columns updated:**

| Column | Value |
|---|---|
| Clock Out (`date_mm2155gg`) | Clock-out date and time |
| Total Hours (`numeric_mm21p49k`) | Decimal hours worked (e.g. `3.75`) |
| Expenses Added (`boolean_mm212dcy`) | Checked (true) if any expenses were submitted |

**Group move:** The item is automatically moved from the "Open" group to the "Completed" group on the Time Entries board.

After this update, the item on the Time Entries board is **complete** — it has both Clock In and Clock Out times, total hours, and is linked to the Work Order.

#### 6B — Work Orders Board (if "Mark Complete" was checked)

**Board:** Work Orders (`18402613691`)  
**Item:** The Work Order the technician was clocked in to  
**Column updated:** Execution Status (`color_mm1s7ak1`)  
**New value:** `"Completed"`

When this status is set to "Completed", a **native Monday.com automation** fires automatically (configured directly in Monday.com, not in code) and moves the Work Order item to the **"Ready for Billing"** group. No extra code is needed for this move.

#### 6C — Expenses Board (one item per expense submitted)

**Board:** Expenses (`18406939432`)  
**Action:** Creates one new item per expense checked:

| Column | Value |
|---|---|
| Item Name | Expense type + technician name (e.g. "Fuel — Edgar Pendley") |
| Technician (`multiple_person_mm212yhb`) | The logged-in technician |
| Expense Type (`dropdown_mm215jhc`) | Fuel (1), Lodging (2), Meals (3), or Supplies (4) |
| Amount (`numeric_mm21a0kv`) | Dollar amount entered |
| Description (`text_mm213m15`) | Free-text details entered by technician |
| Work Order (`text_mm218mcp`) | Work Order label text (e.g. "WO-1354 · Ice Machine Repair") |

Each expense is a separate item on the Expenses board, all linked to the same clock-out session.

#### 6D — Master Costs Board (Phase 5 — not yet active)

When implemented, two types of entries will be written here automatically at clock-out:

**Labor row:**

| Column | Value |
|---|---|
| Type | Labor |
| Description | Work Order label or task name |
| Quantity / Hours | Hours worked (decimal) |
| Rate | Technician's hourly rate from Technicians board |
| Total Cost | Calculated: Hours × Rate (formula column) |
| Date | Date of clock-out |
| Work Order (relation) | Linked to the Work Order item |
| Technician | People column |
| Invoice Status | Pending |

**Expense rows (one per expense):**

| Column | Value |
|---|---|
| Type | Expense |
| Description | Expense details entered by technician |
| Quantity / Hours | 1 |
| Rate | Dollar amount of the expense |
| Total Cost | Same as Rate (formula: 1 × amount) |
| Date | Date of clock-out |
| Work Order (relation) | Linked to the Work Order item |
| Technician | People column |
| Invoice Status | Pending |

The Master Costs Board becomes the single source of truth for all billable costs per Work Order — labor and expenses combined — ready to be reviewed and pushed to Xero.

---

### Step 7 — Real-Time Broadcast

The backend broadcasts a `clock_out` socket event to all connected clients. The Today's Log replaces the optimistic "Open" entry with the confirmed "Complete" entry showing exact times and hours.

---

## 17. Full Board Update Summary Table

This table shows at a glance which Monday.com board gets touched and when.

| Trigger | Board | What Gets Written |
|---|---|---|
| Clock In (Job) | Work Orders (`18402613691`) | Execution Status → "In Progress" |
| Clock In (any) | Time Entries (`18406939306`) | New item: name, Clock In date/time, Task Type, WO relation, Technician |
| Clock Out (any) | Time Entries (`18406939306`) | Updates existing item: Clock Out time, Total Hours, Expenses Added flag; moves to Completed group |
| Clock Out (Mark Complete checked) | Work Orders (`18402613691`) | Execution Status → "Completed" |
| Clock Out with expenses | Expenses (`18406939432`) | New item per expense: type, amount, details, technician, WO label |
| Clock Out (Phase 5) | Master Costs Board (`18407330739`) | New labor row + new expense row(s) with cost details |
| WO Complete automation | Work Orders (`18402613691`) | Item moved to "Ready for Billing" group (native Monday.com automation) |
| New Location created (Phase 7) | *(CompanyCam, not Monday)* | New location created in CompanyCam |
| New Work Order created (Phase 7) | *(CompanyCam + Xero)* | CompanyCam report created; Xero project created |
| Billing approved (Phase 7) | Invoice Line Items (`18403393439`) | Billable line items written; pushed to Xero |

---

## 18. Xero Integration — Full Conceptual Flow

> **Status: Phase 7 — Deferred. No Xero API client exists yet.**  
> This section describes how Xero integration will work when implemented. No code changes needed to understand this flow.

---

### 18.1 What Xero Is Used For

Xero is the accounting system. Every job (Work Order) maps to a **Xero Project**. All labor hours and expenses flow into that project as **line items** so the office can generate invoices without re-entering data.

---

### 18.2 Trigger 1 — New Work Order → Xero Project

```
Office staff creates a new Work Order in the app
        │
        ▼
Backend auto-assigns the next sequential Work Order number
(e.g. WO-1355 — reads highest existing number from Monday.com + increments)
        │
        ▼
Backend calls Xero API:
  Create Project:
    - Project Name: "WO-1355 · Walk-in Freezer Repair"
    - Customer: linked customer name from Monday.com Customers board
    - Deadline: scheduled date (if set)
        │
        ▼
Xero returns a Project ID
        │
        ▼
Backend stores Xero Project ID on the Work Order item in Monday.com
  → Work Orders board, column: (new column to be added) "Xero Project ID"
```

From this point, every cost associated with WO-1355 is pushed to this Xero project.

---

### 18.3 Trigger 2 — Clock Out → Costs Pushed to Xero

```
Technician clocks out of a Job entry
        │
        ▼
Backend creates Master Costs Board rows (labor + expenses)
        │
        ▼
Backend reads the Xero Project ID from the Work Order
        │
        ▼
For Each Cost Row on Master Costs Board:
        │
        ├── Labor row:
        │     Backend calls Xero API:
        │       Create Time Entry on Project:
        │         - Task: "Field Labor"
        │         - Staff: mapped technician name
        │         - Hours: hoursWorked
        │         - Unit Rate: technician's hourly rate
        │         - Description: work narrative
        │
        └── Expense row (per expense):
              Backend calls Xero API:
                Create Expense on Project:
                  - Category: Fuel / Lodging / Meals / Supplies
                  - Amount: expense amount
                  - Description: expense details
        │
        ▼
Xero returns confirmation for each item
        │
        ▼
Backend updates Invoice Status on Master Costs Board:
  "Pending" → "Sent to Xero"
        │
        ▼
If any push fails:
  Invoice Status → "Error"
  Office staff can review and retry
```

---

### 18.4 Trigger 3 — Billing Approval → Invoice Generated in Xero

```
Work Order is in "Ready for Billing" group (set by Monday.com automation when status = Complete)
        │
        ▼
Office staff reviews all costs on Master Costs Board for this Work Order
        │
        ▼
Office staff clicks "Generate Invoice" (future UI button in app or Monday.com)
        │
        ▼
Backend calls Xero API:
  Create Invoice:
    - Contact: Customer from Work Orders board
    - Line Items: all Master Costs Board rows for this WO
      (labor hours × rate, each expense as a separate line)
    - Due Date: per customer billing terms
        │
        ▼
Xero returns Invoice ID and Invoice Number
        │
        ▼
Backend stores Invoice ID on Invoice Line Items board:
  Invoice ID column (text_mm1ay1cy)
        │
        ▼
Backend updates Billing Status on Work Order:
  "Ready for Billing" → "Billed"
        │
        ▼
Master Costs Board: Invoice Status for all rows → "Paid" (once payment recorded in Xero)
```

---

### 18.5 What Data Each Xero Object Contains

**Xero Project (one per Work Order):**
- Name: Work Order number + job name
- Customer: from Customers board
- Estimated hours (optional): from schedule
- Status: In Progress → Complete when WO is done

**Xero Time Entry (one per clock-out session):**
- Task: "Field Labor"
- Staff member: technician name
- Hours worked
- Billable rate
- Date
- Description: technician's work narrative from clock-out

**Xero Expense (one per expense item):**
- Category: matches expense type (Fuel, Lodging, etc.)
- Amount
- Date
- Description
- Linked to the Xero Project

**Xero Invoice (one per billing cycle):**
- Customer
- All time entries and expenses as line items
- Total amount due
- Due date per billing terms

---

## 19. CompanyCam Integration — Full Conceptual Flow

> **Status: Phase 7 — Deferred. No CompanyCam API client exists yet.**  
> This section describes how CompanyCam integration will work when implemented.

---

### 19.1 What CompanyCam Is Used For

CompanyCam is a photo documentation platform for field service teams. It organizes job photos by location and work order so nothing gets lost or mixed up. Every location the company services gets a CompanyCam location, and every Work Order gets a dedicated photo report under that location.

---

### 19.2 Trigger 1 — New Location Created → CompanyCam Location

```
Office staff creates a new Location in the app
  (e.g. "Johnson's Restaurant — 123 Main St, Austin TX")
        │
        ▼
App saves location to Monday.com Locations board
  (name, address, city, state, ZIP — all populated)
        │
        ▼
Backend calls CompanyCam API:
  Create Location:
    - Name: location name from app
    - Address: street, city, state, ZIP from Locations board
    - Phone: optional (from linked Customer record)
        │
        ▼
CompanyCam returns a Location ID
        │
        ▼
Backend stores CompanyCam Location ID on the Locations board item
  → Locations board, column: (new column to be added) "CompanyCam Location ID"
```

From this point, all Work Orders at this location will have their photos filed under this CompanyCam location.

---

### 19.3 Trigger 2 — New Work Order Created → CompanyCam Report

```
Office staff creates a new Work Order in the app
        │
        ▼
App saves WO to Monday.com Work Orders board
        │
        ▼
Backend reads the linked Location's CompanyCam Location ID
        │
        ▼
Backend calls CompanyCam API:
  Create Report (under that Location):
    - Report Name: Work Order number + job name
      (e.g. "WO-1355 — Walk-in Freezer Repair")
    - Location: CompanyCam Location ID
    - Notes: Work Order description from app
        │
        ▼
CompanyCam returns a Report ID
        │
        ▼
Backend stores CompanyCam Report ID on the Work Order item
  → Work Orders board, column: (new column to be added) "CompanyCam Report ID"
```

---

### 19.4 How Technicians Use CompanyCam in the Field

```
Technician opens the CompanyCam app on their phone
        │
        ▼
Navigates to the Location (e.g. "Johnson's Restaurant")
        │
        ▼
Opens the Report for the active Work Order (e.g. "WO-1355")
        │
        ▼
Takes photos: before, during, after
  - Photos auto-stamped with date, time, and GPS location
  - Photos organized under the Work Order report
        │
        ▼
Photos are accessible to office staff immediately
  - Visible in CompanyCam by address or WO number
  - Can be attached to invoices in Xero via CompanyCam's Xero integration
```

---

### 19.5 Future: Receipt Photos at Clock-Out

In the Expense section of the Clock Out modal, there is a placeholder:
```
┌────────────────────────┐
│  📎 Attach receipt     │
│     photo              │
└────────────────────────┘
```

When implemented:
```
Technician takes receipt photo during clock-out
        │
        ▼
App uploads photo to CompanyCam
  - Filed under the Work Order's CompanyCam Report
  - Tagged as "Receipt"
        │
        ▼
CompanyCam returns photo URL
        │
        ▼
Backend stores receipt URL on the Expense record in PostgreSQL
  → Expense.receiptUrl field
        │
        ▼
Receipt URL stored on Expenses board in Monday.com
  → Expenses board, file column (file_mm21j7d7)
        │
        ▼
Receipt is available when reviewing expenses for invoicing
```

---

### 19.6 What Each CompanyCam Object Contains

**CompanyCam Location:**
- Name (e.g. "Johnson's Restaurant")
- Full street address
- Linked to the Monday.com Locations board item via stored ID

**CompanyCam Report (one per Work Order):**
- Name: Work Order number + job description
- Parent: the CompanyCam Location
- All field photos taken during service visits
- Notes synced from Work Order description

**CompanyCam Photo:**
- Auto-stamped: date, time, GPS coordinates, technician name
- Organized under the Work Order report
- Can be flagged: Before / During / After / Receipt

---

## 20. 8 PM Daily Report — Full Flow

> **Status: Phase 7 — Deferred. No cron scheduler exists yet.**

Every weekday at 8:00 PM Central Time, the backend automatically compiles and posts a summary of all field activity for that day. No manual action is needed from anyone.

```
8:00 PM CST — Backend cron job fires
        │
        ▼
Backend queries PostgreSQL:
  - All TimeEntry records with clockIn on today's date (CST bounds)
  - Includes: technician name, entry type, WO label, task description,
              clock-in time, clock-out time, hours worked, narrative
        │
        ▼
Backend groups entries by Technician
        │
        ▼
For each Technician who worked today:
  Backend builds a summary text like:

  "Daily Report — April 7, 2026
   Edgar Pendley — 8.35 hrs total

   7:48 AM – 11:30 AM (3.72 hrs)
   Job: WO-1354 · Ice Machine Repair at Johnson's Restaurant
   Narrative: Replaced evaporator fan motor. Unit cooling properly at
   departure. Customer notified.

   12:00 PM – 12:45 PM (0.75 hrs)
   Non-Job: Safety Meeting
   Narrative: Weekly tailgate safety review — discussed ladder safety
   and PPE requirements.

   1:00 PM – 5:00 PM (4.00 hrs)
   Job: WO-1355 · Walk-in Freezer Repair
   Narrative: Diagnosed compressor failure. Parts ordered. Will return
   when parts arrive."
        │
        ▼
For each Work Order referenced in today's entries:
  Backend calls Monday.com API:
    Post an Update (comment) on the Work Order item:
      - Update text: the summary for that entry
      - This appears in the Work Order's activity feed in Monday.com
        │
        ▼
All relevant team members who are subscribed to updates
on those Work Order items receive a Monday.com notification
```

**What this means for the team:**
- Office staff open Monday.com after 8 PM and see all field notes posted automatically on each Work Order
- No chasing technicians for end-of-day reports
- All work narratives are permanently attached to the Work Order in Monday.com
- Managers see a full picture of what happened on each job that day

---

## 15. Environment Variables

### Frontend (`d:\Workspace\monday-linker\.env`)
```env
VITE_API_URL=http://localhost:3001
VITE_MONDAY_CLIENT_ID=<monday_oauth_client_id>   # Phase 8
```

### Backend (`d:\Workspace\monday-linker-backend\.env`)
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...      # Supabase pooler workaround
MONDAY_API_TOKEN=<api_token>     # Service account token for board mutations
JWT_SECRET=<strong_random_secret>
PORT=3001
```

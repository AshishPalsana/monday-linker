# Monday Linker — UI & Feature Flow

## Table of Contents
1. [Sidebar Navigation](#1-sidebar-navigation)
2. [Daily Technician Flow](#2-daily-technician-flow)
3. [Clock In](#3-clock-in)
4. [Clock Out](#4-clock-out)
5. [Time Tracker Page](#5-time-tracker-page)
6. [Time Board Page](#6-time-board-page)
7. [Expense Flow](#7-expense-flow)
8. [Work Order Status Flow](#8-work-order-status-flow)
9. [Billing Flow](#9-billing-flow)
10. [Integration Flow](#10-integration-flow-phase-7)
11. [Validation Rules](#11-validation-rules)
12. [Phase Roadmap](#12-phase-roadmap)

---

## 1. Sidebar Navigation

The sidebar has two sections:

| Section | Items |
|---|---|
| **Main** | Work Orders, Customers, Equipment, Locations |
| **Time & Labor** | Time Tracker, Time Board |

---

## 2. Daily Technician Flow

A technician's typical workday follows this sequence:

```
Open App
    │
    ▼
Time Tracker Page
    │
    ▼
Select your name (Technician dropdown)
    │
    ├─── Clock In → work → Clock Out  (repeat as needed throughout the day)
    │
    └─── Today's Log table shows all entries for the day
```

A technician can clock in and out **multiple times per day** — for different work orders or non-job tasks — and each session is logged as a separate row in Today's Log.

---

## 3. Clock In

**Trigger:** Technician clicks the **[Clock In]** button on the Time Tracker page.

### Step 1 — Choose Entry Type

Two options via toggle:

| Option | When to Use |
|---|---|
| **Job** | Working on a specific Work Order |
| **Non-Job** | Work not tied to a WO (shop time, meetings, training, etc.) |

### Step 2 — Provide Entry Detail

**If Job selected:**
- Search and select a Work Order from the list
- On confirm → WO Execution Status is automatically set to **"In Progress"**

**If Non-Job selected:**
- Type or pick a task description:
  - Shop / Warehouse
  - Training
  - Safety Meeting
  - Vehicle Maintenance
  - Administrative
  - Other

### Step 3 — Confirm

- Clock-in time is recorded as the current time
- Status banner on the page turns **green**: *"Clocked in to [WO Name] since HH:MM"*

---

## 4. Clock Out

**Trigger:** Technician clicks the **[Clock Out]** button while clocked in.

The Clock Out modal enforces all required fields before allowing submission.

### Required Fields

#### Work Narrative (required)
- A description of the work performed during this session
- Free-text, multi-line
- **Submit is blocked until this is filled**

#### Location / Site (required)
- Where the technician was during this session (customer site, shop, warehouse, etc.)
- **Submit is blocked until this is filled**

### Optional — Job Expenses

Three checkboxes appear at the bottom of the modal:

| Checkbox | When Checked |
|---|---|
| **Fuel** | Amount field + Expense Details field appear |
| **Lodging** | Amount field + Expense Details field appear |
| **Other** | Amount field + Expense Details field appear |

> If **any** checkbox is checked, the Amount and Expense Details fields become **required** and block submit until filled.

### Submission

When all required fields are satisfied:
- **[Clock Out]** button enables
- On confirm: entry duration is calculated (Clock Out − Clock In)
- Entry appears in Today's Log table
- Any checked expenses are also saved to the Expenses board

---

## 5. Time Tracker Page

**Route:** `/time-tracker`

**Purpose:** A technician's personal daily view for clocking in/out and reviewing today's log.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Time Tracker                 [Technician name ▼]    │
│  Thursday, April 2                                   │
├──────────────────────────────────────────────────────┤
│  ○  Not clocked in                  [Clock In ▶]     │  ← gray banner
│  ●  Clocked in to WO-1354           [Clock Out ▶]    │  ← green banner
│     since 07:48 AM                                   │
├──────────────────────────────────────────────────────┤
│  Today's Log                              4.45 hrs   │
│  ┌────────────┬──────────────────┬──────┬──────┬─────┬──────────┐
│  │ Type       │ Description      │  In  │ Out  │ Hrs │ Status   │
│  ├────────────┼──────────────────┼──────┼──────┼─────┼──────────┤
│  │ [Job]      │ WO-1354 ·Ice...  │ 7:48 │11:30 │ 3.7 │ Complete │
│  │ [Non-Job]  │ Safety Meeting   │12:00 │12:45 │ 0.75│ Complete │
│  ├────────────┴──────────────────┴──────┴──────┴─────┴──────────┤
│  │ Total                                             │  4.45    │
│  └───────────────────────────────────────────────────┴──────────┘
└──────────────────────────────────────────────────────┘
```

### Status Chips

| Entry Type | Color |
|---|---|
| Job | Blue `#4f8ef7` |
| Non-Job | Purple `#a855f7` |

| Entry Status | Color |
|---|---|
| Open | Amber `#f59e0b` |
| Complete | Green `#22c55e` |
| Approved | Blue `#4f8ef7` |

---

## 6. Time Board Page

**Route:** `/time-board`

**Purpose:** Manager/admin weekly overview of all technician hours.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Time Board                       Group by: [Technician ▼]      │
│                 ‹  Mar 30 – Apr 5, 2026  ›                      │
├─────────────────────────────────────────────────────────────────┤
│  ▼  Edgar Pendley                                    24.5 hrs   │
│  ┌──────────┬──────────────────┬─────────┬──────┬──────┬──────┐ │
│  │ Date     │ WO / Task        │ Type    │  In  │ Out  │ Hrs  │ │
│  ├──────────┼──────────────────┼─────────┼──────┼──────┼──────┤ │
│  │ Mon 3/30 │ WO-1354 Ice...   │ Job     │ 7:48 │11:30 │  3.5 │ │
│  │ Mon 3/30 │ Safety Meeting   │ Non-Job │12:00 │12:45 │ 0.75 │ │
│  │ Tue 3/31 │ Walk-in Freezer  │ Job     │ 7:30 │15:30 │  8.0 │ │
│  ├──────────┴──────────────────┴─────────┴──────┴──────┴──────┤ │
│  │                                               Week Total  24.5│
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ▶  Tanvi Sachar                                     19.5 hrs   │
└─────────────────────────────────────────────────────────────────┘
```

### Features

- **Week Navigator** — `< Prev` and `Next >` buttons change the week
- **Group By** — toggle between grouping rows by Technician or by Work Order
- **Collapsible groups** — each technician's entries can be collapsed/expanded
- **Week total badge** — shown on every group header row
- **Totals footer row** — per-group total hours at the bottom of each group

---

## 7. Expense Flow

Expenses can be recorded in two ways:

### Option A — During Clock Out
1. Check **Fuel**, **Lodging**, or **Other** in the Clock Out modal
2. Enter amount and expense details
3. Expense is saved with the time entry on clock-out

### Option B — Standalone from Work Order Drawer
1. Open a Work Order → scroll to **Expenses** section
2. Click **[+ Add Expense]**
3. `ExpenseEntryModal` opens:

```
┌──────────────────────────────┐
│  Add Expense                 │
│                              │
│  Type        [Fuel       ▼]  │
│  Date        [Apr 2, 2026]   │
│  Amount      [$   45.00  ]   │
│  Description [Gas for van]   │
│  Work Order  [WO-1354    ▼]  │
│                              │
│  ┌────────────────────────┐  │
│  │  📎 Attach receipt     │  │  ← CompanyCam (Phase 7)
│  │     photo              │  │
│  └────────────────────────┘  │
│                              │
│          [Cancel]  [Save]    │
└──────────────────────────────┘
```

4. On save → item created on the **Expenses board** in Monday.com linked to the WO and Technician

### Expense Types
- Fuel
- Lodging
- Materials / Parts
- Meals
- Tools
- Other

---

## 8. Work Order Status Flow

Every Work Order has **two separate status columns**:

### 8A. Scheduling Status

Tracks where the WO is in the planning/scheduling lifecycle:

```
Incomplete (needs details)
        │
        ▼
Unscheduled
        │
        ▼
   ┌────┴─────────────┐
   │                  │
   ▼                  ▼
Scheduled        Pre-scheduled
                      │
                      ▼
           Return Trip Unscheduled
                      │
                      ▼
           Return Trip Scheduled
```

| Status | Color |
|---|---|
| Incomplete | Red `#ef4444` |
| Unscheduled | Amber `#f59e0b` |
| Scheduled | Blue `#4f8ef7` |
| Pre-scheduled | Purple `#a855f7` |
| Return Trip Unscheduled | Orange `#f97316` |
| Return Trip Scheduled | Cyan `#06b6d4` |

### 8B. Execution / Progress Status

Tracks the field team's actual progress on the job:

```
[Clock In to WO]
        │
        ▼ (auto)
In Progress
        │
   ┌────┴──────────────────────────────────────────┐
   │                   │                           │
   ▼                   ▼                           ▼
Additional Trip    Additional Trip           Additional Trip
Needed             Needed                    Needed
(parts ordered)    (need parts)              (time only)
        │
        ▼
Complete
        │ (Monday.com automation fires)
        ▼
WO moved → "Ready for Billing" group
```

| Status | Color |
|---|---|
| In Progress | Blue `#4f8ef7` |
| Additional Trip Needed (parts ordered) | Amber `#f59e0b` |
| Additional Trip Needed (need parts) | Red `#ef4444` |
| Additional Trip Needed (time only) | Purple `#a855f7` |
| Complete | Green `#22c55e` |

---

## 9. Billing Flow

```
Tech sets Execution Status → "Complete"
        │
        ▼
App shows toast:
"Work Order moved to Ready for Billing"
        │
        ▼
Monday.com automation moves WO item
to "Ready for Billing" group
        │
        ▼
(Future — Phase 7)
Backend pushes Invoice Line Items to Xero
```

No manual step required after setting Complete — the Monday.com automation handles the group move.

---

## 10. Integration Flow (Phase 7)

These features require a backend server and are deferred.

### CompanyCam

| Trigger | Action |
|---|---|
| New Location created | Backend → CompanyCam: create Location |
| New Work Order created | Backend → CompanyCam: create Report linked to that Location using WO number |

### Xero

| Trigger | Action |
|---|---|
| New Work Order created | Auto-generate sequential WO number; Backend → Xero: create Project |
| Expense saved | Backend reads Expenses board; pushes line item to Xero project |
| Push result | Xero Push Status on expense updates: Pending → Pushed / Error |

### 8 PM Daily Report (Monday.com Notification)

```
8:00 PM CST — backend cron job fires
        │
        ▼
Fetch all Time Entries for today (all technicians)
        │
        ▼
Compile narrative summary per employee
        │
        ▼
Post Monday.com update/notification
on each linked Work Order item
```

No technician action required — fully automatic.

---

## 11. Validation Rules

| Action | Rule |
|---|---|
| Clock In — Job | Work Order must be selected |
| Clock In — Non-Job | Task description must not be empty |
| Clock Out | Work Narrative is required |
| Clock Out | Location / Site is required |
| Clock Out — any expense checked | Amount is required |
| Clock Out — any expense checked | Expense Details is required |
| Save Expense | Type must be selected |
| Save Expense | Amount must be greater than $0 |
| Save Expense | Description must not be empty |

All submit buttons are **disabled** until their validation conditions are met.

---

## 12. Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 0** | Create Time Entries and Expenses boards in Monday.com; update WO status columns | Manual config |
| **Phase 1** | Update Scheduling & Execution status options in the app (WorkOrdersBoard, WorkOrderDrawer) | Not started |
| **Phase 2** | Auto-generate sequential WO numbers on creation | Not started |
| **Phase 3** | Time Tracking core — clock in/out wired to Monday.com API | UI done, API pending |
| **Phase 4** | Time Board wired to Monday.com API | UI done, API pending |
| **Phase 5** | Expenses wired to Monday.com API + Expenses section in WO drawer | UI done, API pending |
| **Phase 6** | Billing workflow — "Complete" toast + billing status reinforcement | Not started |
| **Phase 7** | CompanyCam, Xero, and 8 PM daily report (requires backend) | Deferred |
| **Phase 8** | Monday.com OAuth authentication to identify individual technicians | Deferred |

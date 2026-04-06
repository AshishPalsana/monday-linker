# Aaroneq Field Services — App Flow Confirmation

Hello,

Below is a summary of everything we have planned for the app. Please review each section and confirm this matches exactly what you need. If anything needs to be added, changed, or removed, just let us know.

---

## 1. Navigation

The app sidebar will have two sections.

The first section is called **Main** and contains the existing pages: Work Orders, Customers, Equipment, and Locations.

The second section is called **Time & Labor** and contains two new pages: Time Tracker and Time Board.

---

## 2. Time Tracker — Daily Clock-In / Clock-Out

The Time Tracker page is where technicians start and end their work sessions each day.

When a technician opens the app, they log in with their Monday.com account. The app reads their identity from Monday.com automatically and shows their name at the top of the page. There is no manual name selection — the app always knows who is logged in and all clock-in and clock-out entries are recorded under their account.

### Starting Work (Clock In)

The technician clicks the **Clock In** button. A small window opens and asks them to choose one of two options:

**Job** — they are about to work on a specific customer Work Order. They search for and select the Work Order from a list. Once they clock in, the Work Order's progress status automatically changes to "In Progress" in Monday.com.

**Non-Job** — they are doing work that is not tied to a specific Work Order, such as time in the shop, a safety meeting, training, vehicle maintenance, or administrative work. They type or pick a description for what they are doing.

Once they confirm, the page banner turns green and shows: "Clocked in to [Work Order or Task Name] since [time]."

### Ending Work (Clock Out)

The technician clicks the **Clock Out** button. A window opens with the following required steps before they can submit:

**Work Narrative** — they must type a description of the work they performed during that session. This field is required. The Clock Out button will not activate until it is filled in.

**Location / Site** — they must enter where they were working (for example, customer site name, the shop, or the warehouse). This field is also required.

**Expenses** — at the bottom of the window there are three optional checkboxes: Fuel, Lodging, and Other. If the technician checks any of these boxes, an amount field and an expense details field will appear for each one checked. These fields become required before the technician can clock out.

Once all required fields are filled, the Clock Out button activates. On confirmation, the system calculates the duration of the session and it appears as a new row in Today's Log on the page.

### Multiple Sessions Per Day

A technician can clock in and out as many times as needed throughout the day. Each session — whether for a different Work Order, the same Work Order again, or a non-job task — is logged as a separate row in Today's Log with its type, description, clock-in time, clock-out time, hours, and status.

---

## 3. Time Board — Weekly Manager View

The Time Board page is for managers and office staff to see all technician hours across the entire week in one place.

The page shows a week at a time, Monday through Saturday. There are navigation buttons to go to the previous week or the next week.

Each technician is shown as a collapsible section. Their name and total hours for the week are shown on the section header. When expanded, each of their time entries for the week is shown as a row with the date, work order or task name, entry type, clock-in time, clock-out time, and total hours. A totals row at the bottom of each section shows their weekly total.

There is also a Group By option to switch between viewing entries grouped by Technician or grouped by Work Order.

---

## 4. Expenses

Expenses can be recorded in two ways.

**During Clock Out** — when a technician clocks out, they can check the Fuel, Lodging, or Other checkboxes in the Clock Out window. They enter the amount and a short description for each. These are saved along with the time entry.

**From a Work Order** — when a Work Order is open in the app, there will be an Expenses section at the bottom. Clicking the Add Expense button opens a small window where the technician fills in the expense type (Fuel, Lodging, Materials/Parts, Meals, Tools, or Other), the date, the amount in dollars, and a description. There will also be a placeholder to attach a receipt photo, which will connect to CompanyCam in a later phase. The expense is saved to Monday.com linked to both the Work Order and the Technician.

---

## 5. Work Order Statuses

Every Work Order will have two separate status fields.

### Scheduling Status

This status is managed by the office and tracks where the job is in the planning process. The options are:

- **Incomplete** — the work order is missing required details before it can be scheduled.
- **Unscheduled** — the work order is complete but has not been scheduled yet.
- **Scheduled** — a date and technician have been assigned.
- **Pre-scheduled** — the job is tentatively planned but not fully confirmed.
- **Return Trip Unscheduled** — a return visit is needed but has not been scheduled yet.
- **Return Trip Scheduled** — the return visit has been scheduled.

### Execution / Progress Status

This status reflects what is happening in the field. The options are:

- **In Progress** — automatically set when a technician clocks in to this Work Order.
- **Additional Trip Needed (Parts Ordered)** — the job cannot be completed yet because parts have been ordered.
- **Additional Trip Needed (Need Parts)** — the job cannot be completed yet and parts have not been ordered yet.
- **Additional Trip Needed (Time Only)** — the job cannot be completed in one trip due to time constraints.
- **Complete** — the work is finished. When this is set, a Monday.com automation will automatically move the Work Order to the "Ready for Billing" group and the app will show a confirmation message.

---

## 6. Billing Flow

When the Execution Status of a Work Order is set to Complete, the Work Order is automatically moved to the "Ready for Billing" group in Monday.com. This is handled by a native Monday.com automation, so no manual step is needed. The app will display a confirmation message when this happens.

In a future phase, the billing information will be pushed automatically to Xero.

---

## 7. 8 PM Daily Report

Every day at 8:00 PM Central Time, the system will automatically send a notification through Monday.com. The notification will summarize all time entries logged that day, organized by technician, and will be posted as an update on each related Work Order. No manual action is needed from the team for this to happen. This feature will be available once the backend server is set up.

---

## 8. Future Integrations (Planned — Requires Backend)

The following features are planned for a later phase once a backend server is in place.

**CompanyCam** — when a new Location is created, a corresponding location will be created in CompanyCam. When a new Work Order is created, a report will be created in CompanyCam under that location, labeled with the Work Order number.

**Xero** — when a new Work Order is created, a project will be created in Xero using the sequential Work Order number. When expenses are saved in the app, they will be pushed to the corresponding Xero project automatically. Each expense will show a push status of Pending, Pushed, or Error.

**Work Order Auto-Numbering** — when a new Work Order is created, the system will automatically assign the next sequential Work Order number, continuing from the highest existing number.

---

## Summary Checklist

Please confirm each item below is correct:

- [ ] The sidebar shows a "Time & Labor" section with Time Tracker and Time Board
- [ ] Technicians log in with their Monday.com account — the app identifies them automatically, no manual name selection needed
- [ ] Clock In requires choosing Job (select a WO) or Non-Job (enter a task description)
- [ ] Clocking in to a Job WO automatically sets the WO progress status to "In Progress"
- [ ] Clock Out requires a Work Narrative and a Location before submitting
- [ ] Fuel, Lodging, and Other expense checkboxes appear at clock-out (optional, but gated if checked)
- [ ] Technicians can clock in and out multiple times per day
- [ ] The Time Board shows all technicians' hours for the week, grouped and collapsible
- [ ] Expenses can also be added directly from a Work Order drawer
- [ ] Work Orders have two status columns: Scheduling Status and Execution/Progress Status
- [ ] Setting Execution Status to "Complete" triggers an automation to move the WO to "Ready for Billing"
- [ ] Daily 8 PM report via Monday.com notification — automatic, no manual action needed
- [ ] CompanyCam, Xero, and auto-numbering are planned for a later phase (requires backend)

---

Please reply with any corrections or confirmations. Thank you.

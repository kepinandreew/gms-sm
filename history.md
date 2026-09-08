# GMS SERVICE TEAM SCHEDULER — AI HANDOFF / CONTEXT EXPORT
Version: 2026-09-08

## IMPORTANT
This is a project handoff based on the information available from prior work and the current conversation. It is NOT a replacement for the actual source code or the current Supabase schema.

The original SQL schema supplied earlier is preserved below because it is useful historical context, but later debugging proved that the production schema has evolved. Therefore the next AI MUST inspect the actual current source code and database before changing anything.

The project owner strongly prefers MINIMAL, TARGETED FIXES. Do not refactor unrelated code, redesign the database, change working UI, change the scheduling algorithm, or modify unrelated modules unless explicitly requested.

---

# 1. PROJECT OVERVIEW

Project: GMS Service Team Scheduler

Purpose:
A web application for scheduling GMS church service teams and Service Directors (SD) across monthly service weekends.

Main concepts:
- 20 service teams (Team 1–20)
- Team is the permanent scheduling/history identity
- Team leaders and members can change over time
- Historical schedules must remain historically correct
- Scheduler assigns teams, not individuals
- Service Directors are a separate scheduling/master-data domain
- Regular weekly service slots are organized by weekend, location, and shift
- English Service is a separate Saturday service
- Special Services are separate from regular weekly scheduling
- Availability/cuti is an input to scheduling
- Automated scheduling uses constraint-based / heuristic logic
- Manual assignment/editing exists
- PDF official export exists
- Supabase is the cloud persistence layer
- local/in-memory state and localStorage are fallback/cache
- cloud synchronization status is shown in UI
- CRUD logging exists

Known navigation/modules:
1. Dashboard
2. Jadwal Bulanan
3. Jadwal SD
4. Data Service Director
5. Generate Schedule
6. Tim & Members
7. Special Service
8. Import PDF Historis
9. Availability Tim
10. Analytics & History
11. Detail Weekend
12. Backup & Restore
13. Pengaturan Engine
14. Uji Simulator

---

# 2. CORE BUSINESS RULES

## Team identity
- Team numbers 1–20 are permanent scheduling/history identities.
- Leader/member composition may change.
- Changing a leader/member must NOT rewrite historical schedule identity.
- Scheduler assigns TEAMS, not individual members.

## Scheduling
- Monthly schedule contains regular service weekend assignments.
- Fairness/quota distribution matters.
- In a 4-weekend month the target shown was 2 assignments per team.
- Consecutive weekend service should normally be avoided.
- A one-week mandatory rest rule exists in normal circumstances.
- Cross-month rest is considered.
- Location and shift diversity are considered.
- English Service has a same-weekend exclusion rule from Sunday service.

## Availability / cuti
The user's final operational requirement is important:

Availability should normally be respected, but it must NOT be so rigid that the algorithm hangs or becomes unusable when a planned major activity makes one team unavailable.

If necessary:
- another available team should cover the slot
- consecutive service may happen
- rest/fairness/location preferences may be relaxed
- the system should prefer a practical valid schedule over refusing to schedule

The engine should distinguish:
- true hard constraints
- soft preferences

The user explicitly considers it acceptable for teams to serve consecutively in exceptional cases when required operationally.

The engine must never become "Not Responding" simply because one team is unavailable.

---

# 3. SCHEDULER TEST RESULTS

Previously reported simulation tests:

TEST 1 — Fair Quota Distribution (4 Weekend Month)
PASSED
- 20 teams received exactly 2 assignments each
- zero consecutive weekend violations

TEST 2 — Wajib OFF 1 Minggu Rule
PASSED
- teams serving on one weekend were off the next weekend

TEST 3 — Cross-Month OFF Rule
PASSED
- teams serving August's final weekend were properly rested on September's first weekend

TEST 4 — Unique Location & Unique Shift Type in Month
PASSED
- each team receives unique location and shift assignments

TEST 5 — English Service & Sunday Service Exclusion
PASSED
- teams serving English Service Saturday never serve Sunday in same weekend

TEST 6 — Infeasibility Detection & Constraint Conflict Reporting
PASSED
- correctly detects mathematical infeasibility when 18 teams are unavailable
- reports Schedule Constraint Conflict
- does not illegally violate hard constraints

Later production behavior showed that normal unavailability could cause the scheduler to hang. Therefore the engine was requested to relax soft rules and use fallback teams when necessary.

---

# 4. MONTHLY WEEKEND EXAMPLES

September 2026:
- Weekend 1: Sep 5–6
- Weekend 2: Sep 12–13
- Weekend 3: Sep 19–20
- Weekend 4: Sep 26–27

October 2026:
- Weekend 1: Oct 3–4
- Weekend 2: Oct 10–11
- Weekend 3: Oct 17–18
- Weekend 4: Oct 24–25
- Weekend 5: Oct 31–Nov 1

---

# 5. REGULAR SERVICE LOCATIONS / SLOTS

Observed PDF layout:

BARAT ROOFTOP
- U1
- U2-3
- U4-5

TIMUR PCM
- U1
- U2-3
- U4-5

SELATAN MCC
- U1-2
- U3-4

PUSAT GC
- U1-2

ENGLISH SERVICE
- Saturday 18:30

The exact current slot configuration must be read from the current source code/configuration.

---

# 6. TEAM & MEMBER MANAGEMENT

UI:
"Manajemen Tim & Anggota"

Capabilities observed:
- view 20 teams
- edit team info
- add member
- edit member
- member role
- join date
- active / cuti / inactive
- activate member
- move/change team
- delete member
- leader history
- rotation history
- team composition history

Important production issue:
The current `team_members` table had:

team_members_status_check
CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))

The UI attempted to save:
status = 'cuti'

This produced:
new row for relation "team_members" violates check constraint "team_members_status_check"

The UI requires three states:
- active
- cuti
- inactive

Do not simply remove constraints to hide the problem. Inspect the current model and schema and make the smallest consistent fix.

A diagnostic query:
SELECT DISTINCT status FROM team_members;

returned only:
active

---

# 7. AVAILABILITY

UI:
"KETERSEDIAAN TIM PELAYANAN"
"Availability Matrix — September 2026"

Each team is displayed against each weekend:
- AVAILABLE
- UNAVAILABLE

Example:
Team 3:
- Weekend 1: AVAILABLE
- Weekend 2: UNAVAILABLE
- Weekend 3: AVAILABLE
- Weekend 4: AVAILABLE

Error encountered:
Gagal menyimpan Ketersediaan Tim ke Supabase:
null value in column "created_at" of relation "team_availability" violates not-null constraint

This proves the current production table is `team_availability` and `created_at` is NOT NULL.

Expected minimal fix:
- INSERT must provide created_at, unless an actual DB DEFAULT already handles it
- preserve existing behavior
- do not redesign availability

---

# 8. SERVICE DIRECTOR DOMAIN

Separate master-data domain.

UI:
"Data Service Director (SD)"
"Master Data Service Director independen aturan khusus (special rules), status cuti, riwayat pelayanan, dan arsitektur request"

Observed:
- 7 SD registered
- SD Aktif
- Sedang Cuti
- Non-Aktif
- search
- status filters
- Tambah SD Baru
- Jadwal SD

SD data can include:
- name
- code
- phone
- email
- preferred slots
- unavailable dates
- requests
- active state
- min assignments/month
- max assignments/month
- special rules
- allowed locations
- day restrictions
- service history

Example observed special rules:
AA:
- Senior Service Director
- Hari: Minggu
- allowed locations: BARAT, TIMUR, SELATAN, PUSURA

Merlyn:
- Service Director Timur
- Hari: Minggu
- allowed location: TIMUR

Jane:
- General SD
- no special restriction

Latest error:
Gagal menyimpan Service Director ke Supabase:
null value in column "updated_at" of relation "sd_directors" violates not-null constraint

This means current production `sd_directors.updated_at` is NOT NULL.

User explicitly requested a MINIMAL FIX:
New SD:
- created_at = current timestamp
- updated_at = current timestamp

Existing SD update:
- preserve created_at
- update updated_at

DO NOT change the database schema.
DO NOT refactor unrelated persistence.
DO NOT modify scheduling/PDF/UI/etc.

---

# 9. SD SCHEDULE

Separate:
- sd_schedules = monthly SD schedule metadata
- sd_assignments = actual SD assignments
- sd_directors = master SD data

Do not confuse these tables.

---

# 10. SPECIAL SERVICES

Special Services are independent of regular weekly schedules.

Fields in original schema included:
- id
- event_name
- title
- service_date
- date
- time_slot
- month
- year
- assigned_team_id
- location_id
- notes
- assignment_mode
- is_locked
- countsAsServiceAssignment
- offImpact
- slots
- created_at

Important bug:
Deleting Special Service previously changed only local state/cache. It did not delete from Supabase.

Result:
After page reload/cloud sync, deleted Special Services came back.

Root cause:
`deleteSpecialService` and `deleteSpecialServiceSlot` did not correctly call:
deleteFromSupabase('special_services', 'id', id)
and associated assignment deletion.

Reported fix:
- update in-memory state
- purge local cache
- notify subscribers
- await cloud deletion
- delete associated assignments
- Sync Cloud button added to SpecialServicesView

Cloud should be source of truth; localStorage is fallback/cache.

---

# 11. SUPABASE PERSISTENCE

Known helper functions:
- pushTableToSupabase()
- fetchTableFromSupabase()
- deleteFromSupabase()
- deleteMonthAssignmentsInSupabase()
- deleteSDMonthAssignmentsInSupabase()
- deleteImportBatchFromSupabase()
- syncFromCloud()
- logCrudOperation()

Known schedule functions:
- generateSchedule()
- regenerateSchedule()
- clearSchedule()
- clearMonthSchedule()
- saveSchedule()

Known Special Service functions:
- deleteSpecialService()
- deleteSpecialServiceSlot()

CRUD logger:
`logCrudOperation` in `/src/services/supabase.ts`

Log fields:
- TABLE
- ACTION
- ROWS
- SUCCESS
- ERROR

Actions:
- CREATE
- READ
- UPDATE
- DELETE

Important persistence principle:
- Supabase is cloud source of truth.
- localStorage is offline fallback/cache.
- all mutations must be awaited.
- do not update UI as successful before cloud mutation succeeds.
- do not silently swallow Supabase errors.
- avoid fire-and-forget INSERT/UPDATE/DELETE.

---

# 12. MONTHLY SCHEDULE DUPLICATE BUG

Error:
duplicate key value violates unique constraint "unique_schedule_month_year"

Interpretation:
A schedule row for the same month/year already existed.

User suspected:
Clear Schedule appeared to clear UI/assignments but did not delete the schedule row in Supabase.

Required behavior:

CLEAR:
1. delete assignments
2. delete related special-service assignments if applicable
3. delete schedule row
4. clear in-memory cache
5. clear localStorage cache
6. verify schedule no longer exists in Supabase
7. refresh UI only after successful deletion

REGENERATE:
1. check whether month/year schedule exists
2. safely replace/update/delete old schedule according to intended workflow
3. never blindly insert duplicate month/year
4. await deletion
5. verify cloud state
6. create new schedule
7. create assignments
8. sync UI

Do not remove the unique constraint as a shortcut.

---

# 13. MANUAL ASSIGNMENT

The monthly schedule previously supported:
- clicking slot
- "Why This Team?"
- manual adjustment
- locking assignment
- manual assignment

A later update caused the manual assignment feature/menu to disappear.

Required behavior:
- restore manual assignment
- user can replace a team for a specific slot
- preserve other assignments
- persist manual change to Supabase
- respect lock/manual_override
- do not regenerate the entire schedule accidentally

Original assignment fields included:
- is_locked
- manual_override

Inspect current source for exact names.

---

# 14. PDF EXPORT

UI:
"Print & Export PDF Official — September 2026"

Modes:
1. Gabungan (SD + Tim)
2. Hanya Tim (Tanpa SD)
3. Hanya SD

Buttons:
- Download PDF
- Print Schedule

PDF:
- A4 Landscape
- multi-page
- official schedule
- month/year
- generated/finalized status
- regular service slots
- team assignments
- SD assignments
- English Service

Requested Team display:

Tim 5
Hana / Kevin

NOT:
Tim 5
Leader: Hana / Kevin

Reason:
- save horizontal space
- some teams have two leaders
- e.g. Team 5 has Hana / Kevin

This applies to:
- Gabungan (SD + Tim)
- Hanya Tim (Tanpa SD)

Leader names must be read dynamically from current data.
Do not hardcode.
Preserve existing PDF layout.

---

# 15. HISTORICAL IMPORT

Historical PDFs cover roughly March–August 2026.

Known special historical events:
- Good Friday / Paskah
- Ascension Day / Kenaikan Yesus, May 14

Required import behavior:
- PDF/CSV/XLSX
- multi-file
- per-file month-aware
- parse -> preview -> review/correct -> confirm
- no fake/demo history
- no auto-commit
- duplicate detection
- delete/re-import batches
- source/audit metadata
- uncertain OCR flagged

Known parser issues:
- multiple files collapsed dates/months to August
- leader/member names mixed across columns
- Saturday English Service dates misread
- spatial/team-column parsing required
- assignment and team-composition parsing should be separate pipelines
- confidence warnings required

Historical rule:
Team number is permanent identity.
Composition changes must not rewrite history.

---

# 16. DATABASE EVOLUTION WARNING

This is CRITICAL.

The original SQL schema and current production/application schema are NOT guaranteed to match.

Original table names:
- members
- availability
- settings
- sd_directors
- composition_history

Later/current application persistence names reported:
- team_members
- team_availability
- engine_settings
- sd_directors
- leader_history
- composition_history

Current production has proven additional schema constraints/columns:
- team_members.status CHECK active/inactive
- team_availability.created_at NOT NULL
- sd_directors.updated_at NOT NULL
- schedules unique_schedule_month_year

Therefore:
DO NOT blindly run the original SQL again.
DO NOT recreate the database.
DO NOT overwrite current production schema.

The actual authoritative schema must be obtained from current Supabase.

---

# 17. ORIGINAL SQL SCHEMA — HISTORICAL REFERENCE ONLY

The earlier AI supplied:

CREATE TABLE IF NOT EXISTS public.schedules (
  id TEXT PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ NULL,
  quality_score NUMERIC DEFAULT 0,
  fairness_metrics JSONB NULL
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  weekend_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  service_date TEXT NOT NULL,
  location_id TEXT DEFAULT 'barat',
  is_locked BOOLEAN DEFAULT FALSE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  manual_override BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_assignments_schedule_id ON public.assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_assignments_weekend_id ON public.assignments(weekend_id);
CREATE INDEX IF NOT EXISTS idx_assignments_team_id ON public.assignments(team_id);

CREATE TABLE IF NOT EXISTS public.sd_schedules (
  id TEXT PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS public.sd_assignments (
  id TEXT PRIMARY KEY,
  sd_schedule_id TEXT NOT NULL,
  weekend_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  director_id TEXT NULL,
  sd_id TEXT NULL,
  location_id TEXT DEFAULT 'barat',
  service_date TEXT NOT NULL,
  director_name TEXT NULL,
  director_code TEXT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  manually_assigned BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sd_assignments_sched_id ON public.sd_assignments(sd_schedule_id);

CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  team_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  leader_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT NULL,
  preferred_slots JSONB NULL,
  color_theme TEXT NULL,
  last_scheduled_date TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  phone TEXT NULL,
  email TEXT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT NULL,
  joined_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_team_id ON public.members(team_id);

CREATE TABLE IF NOT EXISTS public.availability (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  weekend_date TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_availability_team ON public.availability(team_id);

CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  max_consecutive_weekends INTEGER DEFAULT 2,
  min_rest_weeks INTEGER DEFAULT 1,
  allow_back_to_back BOOLEAN DEFAULT FALSE,
  strict_leader_presence BOOLEAN DEFAULT TRUE,
  auto_balance_slots BOOLEAN DEFAULT TRUE,
  enable_sd_scheduling BOOLEAN DEFAULT TRUE,
  sd_max_per_month INTEGER DEFAULT 3,
  sd_rest_weeks INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.sd_directors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  preferred_slots JSONB NULL,
  unavailable_dates JSONB NULL,
  requests JSONB NULL,
  is_active BOOLEAN DEFAULT TRUE,
  min_assignments_per_month INTEGER DEFAULT 1,
  max_assignments_per_month INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  imported_file TEXT NOT NULL,
  import_date TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  number_of_assignments INTEGER DEFAULT 0,
  number_of_teams INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'SUCCESS',
  month INTEGER NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.composition_history (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  leader_name TEXT NOT NULL,
  members JSONB NULL
);

CREATE TABLE IF NOT EXISTS public.special_services (
  id TEXT PRIMARY KEY,
  event_name TEXT NULL,
  title TEXT NULL,
  service_date TEXT NOT NULL,
  date TEXT NULL,
  time_slot TEXT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  assigned_team_id TEXT NULL,
  location_id TEXT NULL,
  notes TEXT NULL,
  assignment_mode TEXT DEFAULT 'auto',
  is_locked BOOLEAN DEFAULT FALSE,
  countsAsServiceAssignment BOOLEAN DEFAULT FALSE,
  offImpact TEXT DEFAULT 'NONE',
  slots JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

The original SQL also enabled RLS on all tables and created permissive policies.

Again: HISTORICAL REFERENCE ONLY.

---

# 18. RELATIONAL DESIGN INTENT

Conceptual relationships:
- schedules -> assignments.schedule_id
- teams -> team_members.team_id
- teams -> team_availability.team_id
- teams -> assignments.team_id
- teams -> composition/leader history
- teams -> special_services.assigned_team_id if applicable
- sd_schedules -> sd_assignments.sd_schedule_id
- sd_directors -> SD assignment director reference
- special_services -> related assignments if represented

Do not add/change foreign keys blindly.
Before doing so:
- inspect orphan rows
- inspect existing IDs
- inspect historical integrity
- decide ON DELETE behavior carefully

Historical Team identity must remain stable.

---

# 19. RLS / SUPABASE PROJECT

Supabase setup observed:
- project: gms-sm-scheduler
- region: Asia-Pacific
- Data API enabled
- Automatically expose new tables enabled
- automatic RLS enabled

Do not alter RLS casually.
Do not disable RLS as a shortcut for application errors.

---

# 20. DATABASE AUDIT QUERIES

Read-only queries useful for diagnosis:

Inspect columns:
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

Inspect constraints:
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

Inspect CHECK constraints:
SELECT
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype = 'c'
ORDER BY conname;

Inspect schedules:
SELECT
  id, month, year, status
FROM public.schedules
ORDER BY year DESC, month DESC;

Inspect schedule constraints:
SELECT
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.schedules'::regclass;

Inspect team member statuses:
SELECT DISTINCT status
FROM public.team_members;

---

# 21. DATA PERSISTENCE TESTING

For every persistence fix:
- create
- save
- refresh
- read
- update
- refresh
- delete
- refresh
- cloud resync
- logout/login if applicable

Specific Team Member tests:
- edit name
- edit role
- edit join date
- active
- cuti
- inactive
- reactivate
- refresh

Availability:
- mark unavailable
- save
- refresh
- verify
- generate schedule
- ensure scheduler respects availability unless fallback is necessary

SD:
- add
- save
- refresh
- edit
- cuti
- reactivate
- inactive
- delete
- refresh

Special Service:
- create
- edit
- assign
- delete
- refresh
- cloud resync
- verify deleted event does not return

Schedule:
- generate
- regenerate unlocked
- regenerate all
- finalize
- clear
- generate again
- refresh
- verify no duplicate month/year

PDF:
- combined
- team-only
- SD-only
- leader names
- multiple leaders
- layout remains readable

---

# 22. CHANGE MANAGEMENT RULE

The user repeatedly emphasizes:
"jangan ubah apa-apa"
"minimal fix"

Therefore every change should follow:

1. Find exact root cause.
2. Identify exact file/function.
3. Change only what is required.
4. Preserve existing behavior.
5. Do not modify unrelated modules.
6. Do not change schema unless explicitly approved.
7. Do not refactor working architecture.
8. Do not redesign UI for a backend bug.
9. Do not change scheduler for a PDF bug.
10. Do not change PDF for a Supabase bug.

After a fix, report:
- exact files changed
- exact functions changed
- exact code behavior changed
- what was intentionally NOT changed
- test procedure

---

# 23. MOST RECENT KNOWN STATUS

Core scheduling:
- working again after availability handling was made less rigid
- fairness scores observed around 89–94%
- September 2026 scheduling tested
- October 2026 UI observed

Cloud synchronization:
- generally working
- Special Service deletion was audited/fixed
- CRUD logging exists

Team/Member:
- editing exists
- cuti/inactive UI exists
- production schema had status mismatch that needs careful alignment

Availability:
- UI works
- persistence encountered created_at NOT NULL mismatch

Schedule lifecycle:
- duplicate schedule month/year error occurred
- Clear Schedule likely failed to delete schedule row completely
- regeneration needs to await deletion and verify cloud state

PDF:
- official export exists
- leader names requested below Team numbers
- do not show literal "Leader:"
- multi-leader display needed, e.g. "Hana / Kevin"

Manual assignment:
- previously existed
- later disappeared after an update
- must be restored without unrelated changes

Service Director:
- master-data UI works
- latest known bug is `updated_at` NOT NULL on insert
- user wants minimal source-code fix only

---

# 24. CURRENT PRIORITY FOR THE NEXT AI

When working on this project:

FIRST:
Inspect actual current code and actual Supabase schema.

SECOND:
Never assume the historical SQL is current.

THIRD:
For any bug, isolate exact mismatch.

FOURTH:
Apply the smallest patch possible.

FIFTH:
Do not touch unrelated functionality.

For the latest known SD bug:
ONLY add/fix `updated_at` in the SD save payload.
Do not modify database schema.
Do not refactor the project.

---

# 25. FINAL HANDOFF INSTRUCTION

You are taking over an existing GMS Service Team Scheduler application.

Treat it as an existing production-like system, not a blank project.

Preserve:
- historical schedule identity
- Team 1–20 identity
- existing working scheduler behavior
- cloud persistence
- PDF layout
- manual assignment
- SD scheduling
- Team/member management
- availability
- special services
- audit/history
- existing Supabase structure

When uncertain:
inspect actual source/database instead of guessing.

When fixing:
make the smallest safe change.

When proposing a schema change:
explain it first and do not execute destructive changes automatically.

END OF PROJECT HANDOFF

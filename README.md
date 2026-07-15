# Welcome to your Lovable project

TODO: Document your project here
# CampusHub – Project Architecture

## Project Overview

CampusHub is a modern Campus Event Management System built for colleges.

The platform connects Students, Club Managers, and Administrators into one centralized event management system.

Primary goals:

- Simplify event creation
- Improve event promotion
- Centralize registrations
- Reduce manual work
- Allow admin approval workflow
- Provide modern startup-style UI


--------------------------------------------------
TECH STACK
--------------------------------------------------

Frontend
- React
- TypeScript
- TailwindCSS
- Shadcn UI
- React Router

Backend
- Supabase

Authentication
- Supabase Auth

Database
- PostgreSQL (Supabase)

Storage
- Supabase Storage
(Event posters)

Deployment
- Vercel / Netlify (Frontend)


--------------------------------------------------
DATABASE TABLES
--------------------------------------------------

1. profiles

Stores every user.

Roles:
- student
- club_manager
- admin

Columns

- id
- email
- full_name
- role
- usn
- semester
- department
- phone_number
- club_id
- created_at


---------------------------------------

2. clubs

Stores clubs.

Columns

- id
- club_name
- description
- created_at


---------------------------------------

3. events

Stores every event.

Columns

- id
- club_id
- event_name
- description
- venue
- date
- time
- budget
- event_type
- min_team_size
- max_team_size
- status
- rejection_reason
- rejected_by
- poster_url
- created_at


Status values

Pending
Approved
Rejected


---------------------------------------

4. event_registrations

Stores registrations.

Columns

- id
- event_id
- student_id
- team_details (JSONB)
- registered_at


---------------------------------------

5. club_manager_access

Stores club signup access codes.

Columns

- id
- club_name
- access_code
- created_at

IMPORTANT

Access codes are reusable.

One access code may be used by multiple club managers.

Never invalidate access codes after signup.


--------------------------------------------------
USER ROLES
--------------------------------------------------

1. Student

Can

- Register
- Login
- Browse approved events
- Register individual events
- Register team events
- View registered events
- Edit profile

Cannot

- Create events
- Approve events
- Access admin pages


---------------------------------------

2. Club Manager

Can

- Register using access code
- Login
- Create events
- Upload posters
- Edit own events
- Delete own events
- View registrations
- Export registrations CSV

Cannot

- Approve events
- View other clubs' registrations
- Access admin dashboard


---------------------------------------

3. Admin

Created manually inside Supabase Auth.

Cannot register from UI.

Can

- Login
- View every event
- Approve events
- Reject events
- Search clubs
- View all registrations
- View analytics


--------------------------------------------------
AUTHENTICATION FLOW
--------------------------------------------------

Student Signup

Signup

↓

Supabase Auth

↓

Create profile

↓

Role = student

↓

Student Dashboard


---------------------------------------

Club Manager Signup

Enter

- Name
- Email
- Password
- Club Name
- Manager Access Code

↓

Validate

club_manager_access

↓

Create Auth User

↓

Create profile

role = club_manager

↓

Create club if needed

OR

Attach existing club

↓

Manager Dashboard


IMPORTANT

Never invalidate access codes.

Multiple managers may use same code.


---------------------------------------

Admin Login

Admin exists only inside Supabase Auth.

No signup page.

After login

↓

Role = admin

↓

Admin Dashboard


--------------------------------------------------
EVENT WORKFLOW
--------------------------------------------------

Club Manager

↓

Create Event

↓

Status

Pending

↓

Admin Review

↓

Approved

↓

Visible on

Student Dashboard

Landing Page

Trending Events

Analytics


OR


Rejected

↓

Visible only to manager

Shows rejection reason


--------------------------------------------------
TEAM REGISTRATION WORKFLOW
--------------------------------------------------

Event Type

Individual

↓

One registration

Stored inside event_registrations


---------------------------------------

Event Type

Team

↓

Student chooses team size

Allowed

min_team_size

↓

max_team_size

↓

Registration form dynamically generates member fields.

↓

Store entire team inside

team_details JSONB


IMPORTANT

Do NOT ask team size separately if member count is already inferred.

The number of generated member forms MUST depend on

min_team_size

max_team_size.


--------------------------------------------------
LANDING PAGE
--------------------------------------------------

Public

No login required.

Contains

Hero

Features

Roles

Trending Events

Statistics

Footer


Trending Events

Top approved events

Ordered by

Highest registrations.


Statistics

Real-time data.

Animated counters.

Includes

- Clubs
- Events
- Registrations
- Venues


--------------------------------------------------
DASHBOARDS
--------------------------------------------------

Student Dashboard

- Upcoming events
- Trending events
- Register
- My registrations


---------------------------------------

Club Manager Dashboard

- Overview
- Create Event
- My Events
- Registrations
- Export CSV


---------------------------------------

Admin Dashboard

- Pending Events
- Approved Events
- Rejected Events
- Search Clubs
- Approve
- Reject
- Analytics


--------------------------------------------------
IMPORTANT PROJECT RULES
--------------------------------------------------

Never modify authentication flow.

Never modify routing.

Never modify Supabase schema.

Never rename database columns.

Never change JSON structure.

Never modify registration workflow.

Never remove existing features.

Never break approval logic.

Never change access control.

Never refactor working code unnecessarily.

Preserve existing functionality.


--------------------------------------------------
CODING RULES
--------------------------------------------------

Before modifying any feature

Understand dependencies.

Only change requested UI or logic.

If modifying one component

Ensure

Student

Club Manager

Admin

continue working exactly as before.

Do not rewrite working components.

Avoid unnecessary refactoring.

Backward compatibility is mandatory.


--------------------------------------------------
PROJECT GOAL
--------------------------------------------------

CampusHub should feel like a modern SaaS product while providing a complete college event management platform with secure role-based access, scalable architecture, and a polished user experience.
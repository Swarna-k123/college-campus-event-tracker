# CampusHub- Centralized college event management system

> A full-stack campus event management platform that streamlines event discovery, registration, attendance, and certificate generation for students and club managers.

## 🚀 Overviews

CampusHub is a role-based campus event management system designed to replace fragmented event registration and attendance processes with a centralized platform.

Students can discover and register for events, access their registrations, mark attendance through QR-based or manual verification, and receive certificates after successfully attending an event.

Club managers can create and manage events, monitor registrations, conduct attendance sessions, and manage certificates through a dedicated dashboard.

The system uses **React, TypeScript, Supabase, PostgreSQL, and Tailwind CSS** with role-based access control and database-level security.

---

## ✨ Key Features

### 👨‍🎓 Student

* Browse and search campus events
* View event details, venue, date, and capacity
* Register for events
* Manage registered events
* Access event entry passes
* QR-based attendance
* View attendance status
* Download certificates for eligible events
* Receive event and certificate notifications
* Manage profile and account settings

### 🧑‍💼 Club Manager

* Create and manage club events
* Track event registrations
* View registered students
* Conduct **manual attendance**
* Start **dynamic QR attendance sessions**
* Display a session QR code for event participants
* Automatically validate QR attendance
* Monitor live attendance statistics
* End attendance sessions manually
* Manage event certificates
* Upload certificate templates
* Generate personalized certificates using student information

### 🔐 Authentication & Authorization

* Supabase Authentication
* Role-based access control
* Separate Student, Club Manager, and Admin workflows
* Protected dashboard routes
* Database-level Row Level Security (RLS)

---

## 📱 QR Attendance System

CampusHub uses a **session-based QR attendance workflow** rather than generating a permanent QR code for every student.

When a club manager starts attendance:

```text
Manager
   ↓
Start Attendance
   ↓
Create Attendance Session
   ↓
Generate Secure Session Token
   ↓
Display Dynamic QR Code
```

The QR code contains only a randomly generated attendance session token.

When a student scans the QR code:

```text
Scan QR
   ↓
Open CampusHub Attendance URL
   ↓
Authentication Check
   ↓
Session Validation
   ↓
Event Validation
   ↓
Registration Validation
   ↓
Duplicate Attendance Check
   ↓
Mark Student Present
```

The system validates:

* Student authentication
* Attendance session existence
* Session expiration
* Session activity status
* Event ownership
* Student event registration
* Duplicate attendance

Attendance records store the relevant student, event, session, and timestamp information.

### Manual Attendance

QR attendance does not replace manual attendance.

Club managers can still manually mark students as:

* Present
* Absent

This provides a fallback when a student's device or camera is unavailable.

---

## 📜 Automated Certificate Generation

After attendance is recorded, eligible students can generate their event certificate.

Club managers upload a certificate template during event setup.

CampusHub uses the student's registered information to populate the appropriate placeholder in the template and generate a personalized certificate.

```text
Event
  ↓
Student Registration
  ↓
Attendance Confirmed
  ↓
Certificate Eligibility
  ↓
Personalized Certificate
  ↓
Student Download
```

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      CampusHub       │
                    │    React + TS UI     │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          Authentication                Application
                 │                           │
                 ▼                           ▼
        ┌────────────────┐        ┌────────────────────┐
        │ Supabase Auth  │        │ React Query / API  │
        └────────────────┘        └──────────┬─────────┘
                                             │
                                             ▼
                                  ┌────────────────────┐
                                  │ Supabase/Postgres  │
                                  │                    │
                                  │ Profiles           │
                                  │ Clubs              │
                                  │ Events             │
                                  │ Registrations      │
                                  │ Attendance         │
                                  │ Sessions           │
                                  │ Certificates       │
                                  └────────────────────┘
```

---

## 🗄️ Data Model

The application uses PostgreSQL through Supabase.

Core entities include:

```text
Profiles
   │
   ├── Student
   ├── Club Manager
   └── Admin

Clubs
   │
   └── Events
          │
          ├── Registrations
          ├── Attendance
          ├── Attendance Sessions
          └── Certificates
```

The database uses relationships, constraints, triggers, and Row Level Security policies to protect application data.

---

## 🔒 Security

CampusHub implements security at both the application and database layers.

### Application-level

* Protected routes
* Role-based authorization
* Authenticated attendance
* Attendance session validation
* Duplicate attendance prevention

### Database-level

* PostgreSQL foreign-key relationships
* Row Level Security (RLS)
* Restricted access based on user roles
* Controlled access to event and registration data

Sensitive credentials such as Supabase service-role keys are kept outside the client application.

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* React Query
* React Router
* shadcn/ui
* Lucide Icons

### Backend / Database

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Storage
* Row Level Security

### Additional Technologies

* QR code generation and scanning
* PDF/certificate processing
* Git/GitHub
* Vercel

---

## 📂 Project Structure

```text
src/
├── components/
│   ├── layout/
│   ├── manager/
│   └── ui/
│
├── context/
│   └── AuthContext.tsx
│
├── data/
│
├── lib/
│   ├── attendance.ts
│   ├── notifications.ts
│   ├── supabase.ts
│   └── ...
│
├── pages/
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── StudentDashboardPage.tsx
│   ├── ManagerDashboardPage.tsx
│   ├── AdminDashboardPage.tsx
│   └── AttendanceCapturePage.tsx
│
└── App.tsx
```

---

## ⚙️ Getting Started

### Prerequisites

* Node.js 18+
* npm
* Supabase project

### Installation

```bash
git clone https://github.com/Swarna-k123/college-campus-event-tracker.git

cd college-campus-event-tracker

npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit private or service-role credentials to GitHub.

### Run Locally

```bash
npm run dev
```

The application will start on the local development server.

---

## 🧪 Testing

The project includes component-level tests using:

* Vitest
* React Testing Library
* Testing Library Jest DOM

Example:

```bash
npm run test
```

---

## 🌐 Deployment

The frontend can be deployed using Vercel.

The application uses client-side routing, so production deployments should be configured to redirect application routes to the main `index.html` entry point.

---

## 🎯 Engineering Highlights

CampusHub demonstrates practical full-stack engineering concepts including:

* Role-based application architecture
* Relational database design
* PostgreSQL foreign-key relationships
* Row Level Security
* Authentication and protected routes
* QR-based event attendance
* Time-limited attendance sessions
* Duplicate attendance prevention
* Real-time attendance tracking
* Automated certificate generation
* File storage
* Responsive dashboard design
* API and external-service integration
* Component-based React architecture

---

## 🔮 Future Improvements

Potential future enhancements include:

* Google Calendar integration
* Email reminders
* Advanced event analytics
* Attendance reports and exports
* Improved certificate template editor
* Push notifications
* Event recommendation system
* Mobile application

---

## 👨‍💻 Project

**CampusHub — Campus Event Management Platform**

Built with React, TypeScript, Supabase, PostgreSQL, and Tailwind CSS.

[GitHub Repository](https://github.com/Swarna-k123/college-campus-event-tracker.git)

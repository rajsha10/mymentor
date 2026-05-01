# MyMentor — Intelligent Classroom Management Platform

**MyMentor** is a comprehensive, real-time Learning Management System (LMS) designed for schools and educational institutions. It connects administrators, teachers, and students under a single unified platform — enabling seamless classroom management, live teaching, assignment tracking, and academic collaboration.

Built on a modern reactive architecture, every action in MyMentor propagates instantly across all connected devices. When a teacher posts an announcement, uploads study material, or starts a live class — students see it in real time, with zero page reloads.

---

## Platform Architecture

MyMentor operates on a **three-tier role-based hierarchy**, where each role has its own dedicated dashboard, permissions, and feature set:

```
┌──────────────────────────────────────────────────┐
│                  ADMINISTRATOR                   │
│      Full platform authority & oversight          │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌──────────────┐        ┌──────────────┐       │
│   │   TEACHER    │◄──────►│   STUDENT    │       │
│   │  (+ Roles)   │        │              │       │
│   └──────────────┘        └──────────────┘       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### User Roles

| Role | Access Level | Description |
|------|-------------|-------------|
| **Administrator** | Global | Full platform authority. Can approve teachers, manage all users, assign roles, view analytics, and access every classroom. |
| **Teacher** | Classroom Owner | Creates and manages classrooms. Uploads materials, assigns homework, grades submissions, hosts live meetings, and manages enrolled students. |
| **Subject Coordinator** | Supervisor | Elevated teacher role with read-only access to all classrooms within their subject domain for oversight and quality assurance. |
| **Headmaster** | Supervisor | Elevated teacher role with institution-wide read-only access to all classrooms for administrative oversight. |
| **Student** | Classroom Member | Joins classrooms via invite code, accesses study materials, submits homework and assignments, participates in group chats, and joins live classes. |

---

## Core Features

### 1. Authentication & Onboarding

- **Role-Based Signup** — Users register as either a Student or Teacher, with role-specific fields:
  - *Students* provide: Name, Email, Class, Section, and Roll Number.
  - *Teachers* provide: Name, Email, and Subject specialization.
- **Teacher Approval Workflow** — Teacher accounts require explicit administrator approval before gaining platform access. Pending teachers see a "Waiting for Approval" screen until approved.
- **Google Account Linking** — Users can link their Google account to their profile for Google Meet integration and enhanced authentication.
- **Automatic Role Routing** — Upon login, users are automatically redirected to their role-specific dashboard (Admin, Teacher, or Student).
- **Protected Routes** — All dashboard routes are guarded by role-based access control. Unauthorized users are redirected to the login page.

### 2. Administrator Dashboard

The Admin Dashboard provides a centralized command center with a sidebar navigation panel offering the following modules:

- **Overview** — A high-level summary of platform health with real-time statistics.
- **Pending Teachers** — Queue of teacher registrations awaiting approval. Admins can approve or reject each request. Approved teachers receive an instant notification.
- **Teachers Panel** — Complete directory of all registered teachers with their subject, email, designation, and approval status.
- **Students Panel** — Complete directory of all registered students with their name, class, section, roll number, and email.
- **Classrooms Panel** — Global view of all classrooms across the platform with teacher assignments and student counts.
- **Role Assignment** — Promote teachers to elevated roles (Subject Coordinator or Headmaster) for supervisory access.
- **System Analytics** — Real-time platform-wide metrics:
  - Total registered users
  - Active teachers count
  - Total students count
  - Number of classrooms
  - Currently live meetings
- **Profile Settings** — Admin's own profile management.

### 3. Teacher Dashboard

Teachers land on a clean dashboard showing:

- **My Classrooms** — Grid of all classrooms created by the teacher, each showing:
  - Classroom name and subject
  - Unique classroom code (for student enrollment)
  - Student count
  - Pending join requests badge
  - Live meeting indicator (pulsing red badge when a meeting is active)
- **Create Classroom** — Form to create a new virtual classroom with name, subject, and auto-generated classroom code.
- **System Activity Feed** — Real-time notification panel showing recent platform events.
- **My Profile** — Edit personal information and manage Google account linking.

### 4. Student Dashboard

Students land on a personalized dashboard showing:

- **Enrolled Classrooms** — Grid of all classrooms the student has joined, each showing:
  - Classroom name and teacher name
  - Subject
  - Classroom code
  - Live meeting indicator (pulsing red badge when teacher is hosting)
- **Join Classroom** — Enter a classroom code to send a join request to the teacher.
- **Recent Updates** — Real-time notification feed for homework, assignments, meetings, and announcements.
- **My Profile** — View and edit personal information.

### 5. Virtual Classroom

Each classroom is a fully-featured learning environment with **7 tabbed modules**, accessible by both teachers and students (with role-appropriate permissions):

#### 5.1 Announcements
- Teachers can post free-text announcements to the entire class.
- Announcements display with the author's name, avatar initial, and timestamp.
- All announcements are ordered newest-first and update in real time.

#### 5.2 Course Materials
- **Teacher Upload** — Upload PDF documents or share external study links. Files are stored on Cloudinary with permanent, direct-access URLs.
- **Student Access** — Browse a card-based gallery of all uploaded materials with:
  - Material title and type badge (PDF or Link)
  - Upload date and instructor name
  - **View** button — Opens the PDF directly in a new browser tab for in-browser reading
  - **Download** button — Downloads the PDF file to the student's local machine with a meaningful filename
- **Legacy URL Handling** — The system automatically detects and repairs older Cloudinary URLs that used the incorrect `/image/upload/` path, rewriting them to the correct `/raw/upload/` format on the fly.

#### 5.3 Homework
- **Teacher Actions:**
  - Create homework with title, description, optional due date, and an optional PDF brief/instruction file.
  - View all student submissions with student name and roll number.
  - View and download each student's submitted PDF.
  - Delete homework assignments.
- **Student Actions:**
  - View assigned homework with descriptions, due dates, and instruction PDFs.
  - Submit homework by uploading a PDF file.
  - View and download their own submitted work.
  - Status badges: "Submitted" (green) or "Pending" (yellow).

#### 5.4 Assignments (Graded)
- **Teacher Actions:**
  - Create assignments with title, description, deadline (required), total marks, and an optional reference PDF.
  - View all student submissions with student name and roll number.
  - **Grade submissions** — Enter marks (out of total) and written feedback for each student.
  - Edit grades after initial submission.
  - Delete assignments.
- **Student Actions:**
  - View assigned work with deadlines, mark allocation, and reference materials.
  - Submit assignments by uploading a PDF file.
  - View their grade and teacher feedback once graded.
  - Status badges: "Submitted" (green) or "Pending" (red).

#### 5.5 Group Chat
- Real-time messaging within the classroom powered by Firestore live listeners.
- Messages display with the sender's name and are styled differently for the current user (right-aligned, indigo) vs other participants (left-aligned, white).
- Auto-scrolls to the latest message on new arrivals.
- Scrollable chat window with a 600px height container.

#### 5.6 Meetings (Google Meet Integration)
- **Google Account Connection** — Users must first link their Google account to participate in meetings.
- **Teacher Controls:**
  - **Start Meeting** — Generates a Google Meet link and broadcasts it to all students in real time. A notification is sent to the classroom.
  - **End Meeting** — Terminates the active meeting session and clears the link.
- **Student Experience:**
  - See a "Meeting is Live!" screen with a real-time duration timer (HH:MM:SS) when a meeting is active.
  - One-click **Join Now** button to open the Google Meet link.
  - When no meeting is active, students see a waiting state.
- **Live Indicator** — Active meetings show a pulsing "LIVE" badge on the classroom card in both the teacher and student dashboards.

#### 5.7 Participants
- **Student Roster** — Full list of enrolled students with avatar initials, name, roll number, class, and section.
- **Pending Requests** (Teacher only) — Queue of students who requested to join. Teachers can:
  - **Approve** — Adds the student to the classroom and sends them a personal notification.
  - **Reject** — Removes the student's request.
- Student count is displayed in the header.

### 6. Notification System

A platform-wide, real-time notification system that tracks all significant events:

| Event | Triggered When | Recipients |
|-------|---------------|------------|
| New Material Uploaded | Teacher uploads a PDF or link | All classroom members |
| Homework Assigned | Teacher creates a new homework | All classroom members |
| Assignment Posted | Teacher creates a new assignment | All classroom members |
| Live Class Started | Teacher starts a Google Meet session | All classroom members |
| Access Granted | Teacher approves a join request | Specific student |
| New Teacher Signup | A teacher registers on the platform | System administrators |

Notifications are categorized by type with distinct icons:
- 📅 Homework → Calendar icon (yellow)
- ✅ Assignment → Check icon (red)
- 🎥 Meeting → Video icon (green)
- 📤 Material → Upload icon (blue)
- ✅ Approval → Check icon (indigo)

### 7. Profile Management

A shared profile page accessible from all dashboards (Admin, Teacher, Student):

- View and edit display name and subject.
- View email address and account role.
- Google account linking status with a one-click connect button.
- Approval status indicator (for teachers).
- Success/error feedback on profile updates.

---

## File Management System

MyMentor uses **Cloudinary (raw resource type)** for all PDF document storage:

| Aspect | Detail |
|--------|--------|
| **Upload Endpoint** | `https://api.cloudinary.com/v1_1/{cloud}/raw/upload` |
| **Max File Size** | 10 MB per file |
| **Supported Format** | PDF only (enforced by MIME type and extension) |
| **URL Format** | `https://res.cloudinary.com/{cloud}/raw/upload/...` |
| **Folder Organization** | Files are organized into folders: `materials/`, `homework_briefs/`, `homework_submissions/`, `assignments/`, `assignment_submissions/` |
| **Download Method** | Fetch-to-blob for filename control, with anchor fallback for CORS scenarios |
| **View Method** | Direct URL opened in a new browser tab |
| **Legacy Support** | Auto-rewrites old `/image/upload/` URLs to `/raw/upload/` |

---

## Real-Time Data Synchronization

MyMentor leverages **Firebase Firestore `onSnapshot()` listeners** across every module. This means:

- When a teacher posts an announcement → students see it instantly.
- When a student submits homework → the teacher's submission count updates live.
- When a meeting starts → all student dashboards show the "LIVE" badge immediately.
- When an admin approves a teacher → the teacher's dashboard unlocks without page reload.
- Analytics counters update in real time as users join the platform.

There are **no polling intervals** — all updates are push-based through Firestore's real-time streaming protocol.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 19 with TypeScript |
| **Build Tool** | Vite 6 |
| **Routing** | React Router DOM 7 |
| **Styling** | Tailwind CSS 4 |
| **Icons** | Lucide React |
| **Animations** | Motion (Framer Motion) |
| **Authentication** | Firebase Authentication (Email/Password + Google OAuth) |
| **Database** | Firebase Cloud Firestore (NoSQL, real-time) |
| **File Storage** | Cloudinary (raw resource type, 25 GB free tier) |
| **Video Conferencing** | Google Meet (link-based integration) |
| **Date Formatting** | date-fns |
| **Deployment** | Vercel |

---

## Data Model

### Firestore Collections

```
users/
  └── {userId}
        ├── role: "teacher" | "student"
        ├── name, email, subject
        ├── class, section, rollNumber (students)
        ├── designation (teachers)
        ├── approved: boolean
        └── googleConnected: boolean

classrooms/
  └── {classroomId}
        ├── name, subject, classroomId (code)
        ├── teacherId, teacherName
        ├── students: [{ uid, timestamp }]
        ├── pendingRequests: [{ uid, timestamp }]
        ├── meetingActive, meetingLink, meetingStartTime
        │
        ├── announcements/
        │     └── {id}: { text, authorId, authorName, timestamp }
        │
        ├── materials/
        │     └── {id}: { title, type, cloudinaryUrl, uploaderName, timestamp }
        │
        ├── homework/
        │     └── {id}: { title, description, dueDate, fileUrl, timestamp }
        │
        ├── homeworkSubmissions/
        │     └── {id}: { homeworkId, studentId, studentName, rollNumber, cloudinaryUrl, submittedAt }
        │
        ├── assignments/
        │     └── {id}: { title, description, deadline, totalMarks, fileUrl, timestamp }
        │
        ├── assignmentSubmissions/
        │     └── {id}: { assignmentId, studentId, studentName, rollNumber, cloudinaryUrl, marks, feedback, submittedAt }
        │
        └── messages/
              └── {id}: { text, senderId, senderName, timestamp }

notifications/
  └── {id}: { classroomId, title, message, type, targetUids?, timestamp }
```

---

## Security Model

| Mechanism | Implementation |
|-----------|---------------|
| **Route Protection** | `ProtectedRoute` component wraps all dashboard routes, checking user role against allowed roles |
| **Teacher Gating** | Teacher accounts are created with `approved: false` and cannot access the dashboard until an admin sets `approved: true` |
| **Classroom Access** | Students must request access via classroom code; teachers must explicitly approve each request |
| **Admin Identification** | Admin UIDs are hardcoded in a constants file — no self-elevation possible |
| **Supervisor Read-Only** | Subject Coordinators and Headmasters get teacher-level view access to all classrooms but operate under supervisory context |
| **File Validation** | Only PDF files under 10 MB are accepted for upload; enforced by both client-side validation and Cloudinary configuration |

---

## User Flows

### Teacher Flow
```
Sign Up → Wait for Admin Approval → Login → Create Classroom →
Upload Materials / Create Homework / Create Assignments →
Start Live Meeting → Grade Submissions → View Analytics
```

### Student Flow
```
Sign Up (instant access) → Login → Join Classroom (via code) →
Wait for Teacher Approval → Access Materials →
Submit Homework & Assignments → Join Live Classes → Chat
```

### Admin Flow
```
Login → Approve Pending Teachers → Assign Elevated Roles →
Monitor Platform Analytics → Manage Users & Classrooms →
View All Classroom Content (as supervisor)
```

---

*MyMentor — Empowering Education Through Real-Time Technology*

# TechAFlon Implementation Plan

## Overview
TechAFlon - The Doomsday Protocol - Internal Hackathon for CARE College of Engineering, Trichy

## Event Details
- **Event Name**: TechAFlon
- **Theme**: Avengers: Doomsday
- **Date**: August 28, 2026 (10:00 AM IST)
- **Organizer**: CSSA (Computer Science Students Association)
- **Eligible Departments**: CSE, AI & DS
- **Team Size**: 3-4 members
- **Registration Window**: August 24-26, 2026

## Completed Implementation

### Frontend
1. ✅ Homepage redesign with Doomsday theme
2. ✅ Countdown timer (Days : Hours : Minutes : Seconds)
3. ✅ Event date: August 28, 2026 at 10:00 AM IST
4. ✅ Updated FAQ page with TechAFlon-specific questions
5. ✅ Updated Rules page with correct event rules
6. ✅ Team registration form (CSE/AI-DS specific)
7. ✅ Team Portal dashboard

### Backend
1. ✅ Team model with approval workflow
2. ✅ CSE/AI-DS department validation
3. ✅ Team ID generation (TFLN-2026-XXX format)
4. ✅ Duplicate prevention (register number, team name, leader email)
5. ✅ One-time submission with lock mechanism
6. ✅ Problem statement allocation system
7. ✅ Admin controls for submission toggle
8. ✅ Team approval/rejection workflow

## Database Migrations Created
- `0009_teams.py` - Teams table
- `0010_submissions_lock.py` - Submission lock column
- `0011_team_portal_fix.py` - Fix submission lock enforcement

## Next Steps to Complete

### 1. Run Database Migrations
```bash
cd backend
alembic upgrade head
```

### 2. Update Frontend Registration API
- Connect TechAFlon registration form to backend
- Handle team creation with CSE/AI-DS validation
- Return Team ID (TFLN-2026-XXX format)

### 3. Implement Team Leader Login
- Create team leader accounts
- Default password: Demo@123 (hashed)
- Link to team after registration

### 4. Admin Panel Updates
- Team management (approve/reject)
- Problem statement upload (CSV)
- Problem statement allocation
- Submission ON/OFF toggle
- Venue information management
- Certificate upload and assignment

### 5. Email Notifications
- Team confirmation email
- Team approval notification
- Problem statement allocation notification
- Submission received notification

### 6. Testing
- Registration with valid/invalid data
- Duplicate prevention
- Team approval workflow
- Problem statement allocation
- Submission lock mechanism
- Certificate upload/download

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Styling**: Custom CSS with Doomsday theme colors
- **3D Graphics**: Three.js (for ReactorCore component)

## Doomsday Theme Colors
- Background: #020403
- Secondary: #050806
- Dark Green: #07150D
- Emerald: #0B6B38
- Primary Energy: #39D56A
- Bright Temporal: #8AFF9A
- Muted Gold: #B9A86A

## Project Structure
```
backend/
├── app/
│   ├── models/
│   │   ├── team.py (NEW)
│   │   ├── user.py
│   │   └── ...
│   ├── schemas/
│   │   ├── team.py (NEW)
│   │   └── ...
│   ├── api/v1/
│   │   ├── teams.py (NEW)
│   │   └── ...
│   └── services/
│       ├── team.py (NEW)
│       └── ...
frontend/
├── src/
│   ├── pages/public/
│   │   ├── HomePage.tsx (UPDATED)
│   │   ├── RegistrationPage.tsx (UPDATED)
│   │   ├── FaqPage.tsx (UPDATED)
│   │   └── RulesPage.tsx (UPDATED)
│   ├── data/
│   │   └── home.ts (UPDATED)
│   └── components/
│       └── doomsday/
│           └── Countdown.tsx (UPDATED)
```

## Countdown Timer Status
**Target**: August 28, 2026 at 10:00 AM IST
**Current**: August 23, 2026 at 14:21:52 UTC
**Remaining**: ~4 days, 14 hours, 38 minutes

## Ready for Testing
The following features are ready for testing:
1. Homepage countdown timer
2. FAQ page
3. Rules page
4. Backend models and services
5. Database schema

## Known Issues
- None currently

## Next Priority
Update frontend registration to use TechAFlon-specific fields and connect to backend Team API.

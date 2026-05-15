# Amaan (أمان) — Secure Customer Request Tracking System

A full-stack web application built to replace the unsafe practice of sharing sensitive customer documents over WhatsApp (Any unsafe way) at car dealerships. Developed as a Final Year Project at the University of Southampton.

## The Problem

During an internship at Abdul Latif Jameel (Toyota), I observed that tele-sales agents were collecting customer documents — ID cards, driving licences, bank statements — through personal WhatsApp messages. These documents remained on agents' personal phones for weeks with no encryption, no audit trail, and no access control, violating PDPL (Saudi Arabia) and UK GDPR.

## The Solution

A secure, role-based web system with three portals:

- **Customer Portal** — Customers receive a unique secure link and upload their documents without needing to create an account
- **Tele-Sales Dashboard** — Agents create and manage requests, share secure links with customers, and approve or reject submitted documents
- **Manager Dashboard** — Full oversight across all agents with filtering, reassignment, performance metrics, and a complete activity log

## Features

- Token-based customer access (256-bit random tokens — no login required)
- Real-time document upload progress (0–100%)
- Automated 24-hour (yellow) and 48-hour (red) reminder badges
- 6-day SLA expiry mechanism
- Approve / reject workflow with mandatory comments
- Request reassignment between agents with full audit trail
- Agent performance statistics with date range filters
- Global activity log with 9 action types, colour-coded and searchable
- Role-based access control enforced server-side
- Documents never exposed to the frontend — no file URLs accessible to users
- Fully compliant with PDPL and UK GDPR

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Authentication |
| Scheduling | node-cron |

## System Architecture

```
Frontend (React)
├── /telesales       → Tele-Sales Agent Dashboard
├── /customer/:token → Customer Portal
└── /manager         → Manager Dashboard

Backend (Node.js + Express)
├── REST API
├── Reminder Job (node-cron) — runs every hour
└── SLA Expiry Job (node-cron) — runs every hour

Firebase
├── Firestore — requests, documents, audit logs
├── Storage — uploaded customer files
└── Auth — agent and manager authentication
```

## Getting Started

### Prerequisites
- Node.js v18+
- Firebase project with Firestore, Storage, and Authentication enabled
- Firebase service account key

### Backend Setup
```bash
cd backend
npm install
# Add your Firebase service account JSON to backend/
# Create backend/.env with:
# FIREBASE_SERVICE_ACCOUNT_PATH=./your-service-account.json
# PORT=3001
# FRONTEND_URL=http://localhost:5173
node src/server.js
```

### Frontend Setup
```bash
cd frontend
npm install
# Create frontend/.env with your Firebase web config:
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_FIREBASE_STORAGE_BUCKET=...
# VITE_FIREBASE_MESSAGING_SENDER_ID=...
# VITE_FIREBASE_APP_ID=...
# VITE_API_URL=http://localhost:3001
npm run dev
```

## Testing

42 functional tests covering all system components — all passed.

| Component | Tests |
|-----------|-------|
| Customer Portal | 9 |
| Tele-Sales Dashboard | 12 |
| Manager Dashboard | 16 |
| Security | 5 |
| **Total** | **42** |

All 32 functional requirements implemented and verified.

## Author

**Dawoud Aboalsaud**  
BEng Software Engineering — University of Southampton  
Supervisor: Leslie Carr | Examiner: Sasan Mahmoodi

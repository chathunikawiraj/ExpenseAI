# ExpenseAI – Smart Personal Finance Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

ExpenseAI is a production-quality, privacy-first personal finance platform built as a clean TypeScript monorepo. It couples intelligent receipt OCR (Tesseract.js), automated monthly budget threshold monitoring (50%, 80%, 100%), and zero-PII spending insights (OpenAI + algorithmic rule-based fallback) with a pastel visual design matching the **Comet Wallet** dashboard aesthetic.

---

## 🎨 Visual Design System (Comet Wallet Reference)

- **Canvas & Ambient Lighting**: Soft `#F3F5FD` background framed by blurred pastel ambient circular gradients (`#FFD4E5` pink, `#DDD9FB` lavender, `#C9E4FF` light blue).
- **Primary Color Palette**: Glowing vibrant purple `#6C5CE7` (`shadow-comet-glow`), deep navy text `#1E1B4B`, and muted captions `#8A8FA8`.
- **Card Styling & Geometry**: `rounded-3xl` (24px–32px) cards with ambient soft drop-shadows (`box-shadow: 0 8px 30px rgba(30, 27, 75, 0.04)`), pill-shaped action buttons (`rounded-full`), and pill search inputs.
- **Layout Architecture**:
  - Slim icon-only left sidebar with active purple button and hover tooltips (collapses into a bottom tab bar on mobile screens).
  - Top navigation bar featuring search, unread notification counter badge, and user profile chip.
  - Dual-column content grid with a dedicated right summary panel (Balance header, Today's transactions list with "New" pill badges, Loan Calculator budget slider, and avatar chips).

---

## 🛠️ Monorepo Architecture & Tech Stack

```mermaid
graph TD
    subgraph Client ["/client (React + Vite + TypeScript)"]
        UI[Tailwind CSS & Comet Palette]
        Routing[React Router v6 + Protected / Admin Routes]
        Query[TanStack Query v5 + AuthContext]
        Viz[Recharts: Area, Bar, Donut, Line]
    end

    subgraph Server ["/server (Node.js + Express + TypeScript)"]
        REST[REST API /api/v1 + Swagger Docs]
        Auth[JWT 15m + Refresh Token 7d httpOnly Cookie]
        Security[Helmet, CORS, Rate Limiters, Bcrypt 10+]
    end

    subgraph Services ["Pluggable Service Interfaces"]
        OCR[OcrService: Tesseract.js Heuristic Parser]
        AI[InsightService: OpenAI + Zero-PII Rule Fallback]
        Storage[StorageService: Cloudinary + Local Disk]
    end

    subgraph Data ["Data Persistence Layer"]
        Prisma[Prisma ORM 5.22]
        DB[(PostgreSQL / Docker / Neon)]
    end

    UI --> REST
    REST --> Security
    Security --> Auth
    REST --> Services
    REST --> Prisma
    Prisma --> DB
```

### Component Directory Layout
```text
ExpenseAI/
├── client/                     # Frontend Application (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/         # Shared AppShell, Sidebar, Topbar, Modals, Badges
│   │   ├── context/            # AuthContext & Session management
│   │   ├── pages/              # Dashboard, Transactions, Receipts, Budgets, Analytics, Reports, Insights, Settings, Admin
│   │   ├── services/           # Axios/Fetch API client with JWT 401 refresh interception
│   │   └── types/              # Comprehensive TypeScript interfaces
│   └── tailwind.config.js      # Custom Comet design tokens
├── server/                     # Backend REST API (Node.js + Express + Prisma)
│   ├── prisma/                 # Prisma PostgreSQL schema and seed definitions
│   ├── src/
│   │   ├── controllers/        # Auth, Incomes, Expenses, Budgets, Receipts, Insights, Admin
│   │   ├── middleware/         # JWT verification, RBAC (FR-34), rate-limit, error handler
│   │   ├── routes/             # Versioned REST routing (/api/v1)
│   │   ├── services/           # Pluggable OcrService, InsightService, StorageService
│   │   └── __tests__/          # Automated unit & integration tests (100% pass)
├── docker-compose.yml          # PostgreSQL 16 container definition
└── package.json                # Monorepo workspaces orchestration
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (v24 LTS recommended)
- **Docker**: (Optional, for running local PostgreSQL container)

### 2. Installation
Clone the repository and install dependencies for both client and server:
```bash
# In project root:
npm install
cd client && npm install
cd ../server && npm install
```

### 3. Database Initialization (PostgreSQL)
To run local PostgreSQL using Docker Compose:
```bash
docker compose up -d
```
Generate the Prisma client:
```bash
npm --workspace=server run prisma:generate
```
*(Note: ExpenseAI includes an intelligent data repository fallback that initializes all seed demo accounts, categories, and 3 months of transactions automatically if PostgreSQL is temporarily offline during local review).*

### 4. Running the Development Servers
Run both client and server concurrently from the monorepo root:
```bash
npm run dev
```
Or start them individually:
```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend Web App (runs on http://localhost:5173)
npm run dev:client
```

---

## 🔐 Demo User Credentials

The application is pre-seeded with two active accounts:

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Demo User** | `demo@expenseai.local` | `Demo123!` | Full personal finance tracking, receipt scanning, budgets, reports, AI insights. |
| **Admin Operator** | `admin@expenseai.local` | `Admin123!` | System stats, user management (FR-36), default categories manager (FR-37). *Enforces FR-38 strict privacy: zero access to personal transactions.* |

*(A convenient **Quick Autofill** pill button is available on the Login screen for instant 1-click credential filling).*

---

## 📖 API Documentation & Swagger

Interactive Swagger/OpenAPI documentation is available at:
👉 **[http://localhost:5000/api/v1/docs](http://localhost:5000/api/v1/docs)**

### Summary of REST Endpoints (`/api/v1`)
- **Authentication**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`, `PUT /auth/profile`, `DELETE /auth/account`.
- **Transactions**: `GET/POST /incomes`, `PUT/DELETE /incomes/:id`, `GET/POST /expenses`, `PUT/DELETE /expenses/:id`, `GET/POST /categories`.
- **Budgets & Goals**: `GET/POST /budgets`, `DELETE /budgets/:id`, `GET/POST/PUT/DELETE /goals`.
- **Receipts & OCR**: `POST /receipts` (Multipart upload with magic-byte validation & Tesseract OCR), `DELETE /receipts/:id`.
- **Analytics & Export**: `GET /analytics/summary`, `GET /analytics/trends`, `GET /reports/:month`, `GET /export/csv` (Formula-injection protected).
- **AI Insights**: `GET /insights`, `POST /insights/generate` (Aggregated figures only, zero PII).
- **Admin**: `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `DELETE /admin/users/:id`, `GET/POST/DELETE /admin/categories`.

---

## ⚙️ Environment Variables Reference

Copy `.env.example` to `.env` in the root or individual packages:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express backend server |
| `NODE_ENV` | `development` | Runtime environment (`development` / `production`) |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/expenseai?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | *(32+ char secret)* | Secret key for 15-minute access tokens |
| `JWT_REFRESH_SECRET` | *(32+ char secret)* | Secret key for 7-day httpOnly refresh cookies |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS frontend origin |
| `OPENAI_API_KEY` | *(Optional)* | OpenAI API key for AI insights (falls back to rule engine if absent) |
| `CLOUDINARY_CLOUD_NAME` | *(Optional)* | Cloudinary cloud name (falls back to local `/uploads` if absent) |
| `CLOUDINARY_API_KEY` | *(Optional)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | *(Optional)* | Cloudinary API secret |
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Backend API base URL consumed by Vite frontend |

---

## 🧪 Testing & Quality Assurance

Run the automated test suite:
```bash
npm test
```

### Verified Test Suites:
- ✅ **Budget & Threshold Engine (`budget.test.ts`)**: Verifies spent, remaining buffer, percentage, and 50%, 80%, 100% threshold notification generation.
- ✅ **Formula Injection Neutralization (`csv.test.ts`)**: Verifies neutralization of spreadsheet execution characters (`=`, `+`, `-`, `@`) according to SRS FR-29.
- ✅ **Receipt OCR Parser (`ocr.test.ts`)**: Verifies heuristic parsing of vendor name, transaction date, total amount, and keyword category mapping according to SRS FR-19.
- ✅ **Auth & Role-Based Access Control (`auth_and_rbac.test.ts`)**:
  - Validates authentication token issuance and generic error handling.
  - Verifies that regular users receive `403 Forbidden` on admin endpoints (FR-34).
  - Verifies that the admin statistics endpoint strictly exposes aggregate KPIs and NEVER leaks personal transactions or receipt files (FR-38).

---

## 🚢 Production Deployment

- **Frontend (Vercel)**:
  - Framework Preset: `Vite`
  - Root Directory: `client`
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Set `VITE_API_BASE_URL` to your production backend URL.
- **Backend (Railway or Render)**:
  - Root Directory: `server`
  - Build Command: `npm run build`
  - Start Command: `npm start`
  - Provision environment variables (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`).
- **Database (Neon PostgreSQL)**:
  - Provision a serverless PostgreSQL instance on Neon.tech and paste the connection string into `DATABASE_URL`. Run `npm run prisma:generate && npm run prisma:migrate`.

---

## 📄 License
This project is open-source and distributed under the MIT License.

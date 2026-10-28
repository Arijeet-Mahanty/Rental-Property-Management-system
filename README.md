# RentRoll — Property Management for Independent Landlords

> A high-performance, cream neomorphic property management web application designed specifically for independent landlords managing 1 to 50 units and their tenants.

---

## 1. Project Overview & Problem Statement

Independent landlords operating 1 to 50 rental doors are currently underserved by real estate software. Existing enterprise platforms (AppFolio, RealPage, Yardi) are bloated, expensive, and require extensive training. Consequently, most DIY landlords rely on messy spreadsheets, fragmented text messages, paper checks, and paper leases.

**RentRoll** bridges this gap by providing an intuitive, lightweight, and tactile cream neomorphic web application with:
- Dedicated, role-tailored workflows for both **Landlords** and **Tenants**.
- Hands-free, automated digital rent collection (eliminating awkward late-fee conversations).
- Seamless applicant screening, digital lease signing, and renewal tracking.
- Centralized photo-based repair requests and maintenance triage.
- Clean Schedule E tax reporting and real-time cash flow metrics per unit.

---

## 2. Current Status & Phase Roadmap

The project is structured into three iterative milestones:

```
[Phase 1: Completed] ─────────────► [Phase 2: ACTIVE] ────────────────► [Phase 3: Production]
- Marketing Landing Page            - Node.js & Express REST API         - Stripe ACH & Card Webhooks
- Shared Glassmorphic Navbar        - PostgreSQL Relational DB Schema    - AWS S3 Repair Photo Storage
- Accessible Auth (Login/Signup)    - bcrypt Password Hashing            - Background Check API Integration
- Mock API & LocalStorage Session   - HttpOnly Cookie JWT Sessions       - State-Specific Lease PDF Gen
- Tactile Cream Neomorphism UI      - Landlord & Tenant Core Portals     - Automated SMS / Email Reminders
                                    - Properties, Units, Leases, Ledger
```

### Roadmap Overview
- **Phase 1 (Completed)**: Pure vanilla frontend implementation consisting of the marketing landing page, tactile Cream Neomorphism design system, shared injected navbar and footer, accessible client-side form validations, strength meter, and mock authentication layer.
- **Phase 2 (Active & Completed)**: Fullstack implementation featuring a Node.js & Express REST API, PostgreSQL relational schema (`database/schema.sql` and `database/seeds.sql`) with persistent embedded relational storage fallback, bcrypt password hashing, HttpOnly cookie JWT authentication, and interactive Landlord & Tenant Command Center portals (Properties, Units, Leases, Ledger, Maintenance Triage, and 5 tactile dialog modals).
- **Phase 3 (Next)**: Real Stripe ACH/Card webhooks, AWS S3 cloud media uploads for maintenance tickets, and electronic lease PDF generation.

---

## 3. Features Implemented in Phase 2

- [x] **Node.js & Express REST API (`server/server.js`)**
  - [x] Fast, modular REST API server with JSON body parsing, cookie-parser, CORS, and formatted request logging.
  - [x] Static frontend serving: `npm start` serves both frontend web pages and backend `/api/*` endpoints from a single port (3000).
  - [x] Live health check endpoint at `GET /api/health`.
  - [x] Strict JWT authentication middleware (`server/middleware/auth.js`) supporting HttpOnly cookies and Bearer token headers.
  - [x] Role-based access control with `requireLandlord` and `requireTenant` route guards.
- [x] **PostgreSQL Relational DB & Multi-Tenant Schema (`database/`)**
  - [x] Production DDL schema (`database/schema.sql`): `users`, `properties`, `units`, `leases`, `payments`, `maintenance_tickets` tables with cascading foreign keys and check constraints.
  - [x] Seed data (`database/seeds.sql`): Realistic multi-property portfolio (Oakwood Manor, Highland Lofts, Maple Court Duplex, Sunset Palms), doors, active leases, transactions, and repair tickets.
  - [x] Dual-driver database adapter (`database/db.js`): Automatic PostgreSQL connection when `DATABASE_URL` is set, with atomic persistent JSON engine (`data/rentroll_db.json`) fallback for zero-friction local execution.
  - [x] Automated migration and seeding CLI runners (`npm run db:migrate`, `npm run db:seed`).
- [x] **Production bcrypt Password Security**
  - [x] Zero plain-text credentials stored. Passwords salted and hashed with `bcryptjs` (cost factor 10).
  - [x] Secure session issuance with expiration (24h standard, 30d with "Remember Me").
- [x] **Landlord Command Center Portal (`dashboard.html` & `js/dashboard.js`)**
  - [x] **Segmented Tactile Tab Controls**: Command Center, Properties & Units, Leases & Tenancy, Rent Ledger, Maintenance Triage.
  - [x] **Properties & Units Manager**: Property cards with occupancy meters, unit inventory table, "+ Add Property" modal, and "+ Add Unit" modal.
  - [x] **Lease Agreements**: Active and past lease contracts table with tenant profiles, monthly rent, security deposits, and "+ New Lease" modal.
  - [x] **Rent Roll & Payments Ledger**: Transaction history, financial KPI summaries (Total Collected, Pending, Collection Rate %), filter chips (Paid, Pending, Late), and "Record Payment" modal with receipt simulation.
  - [x] **Maintenance Request Triage**: Work orders categorized by urgency (Emergency, High, Medium, Low), status toggles (`Open` &rarr; `In Progress` &rarr; `Resolved`), notes logging, and "+ Submit Repair" modal.
- [x] **Tenant Self-Service Portal (`dashboard.html` & `js/dashboard.js`)**
  - [x] **My Home Spotlight Banner**: Unit details, property address, lease dates, and security deposit.
  - [x] **Rent Pay Action**: Upcoming payment due date, monthly rent amount, and 1-click "Pay Rent Now" modal.
  - [x] **Repair Dispatcher**: Direct maintenance ticket creation with urgency selection and live status tracking.
- [x] **Landing Page Enhancements & Conversion Funnel (`index.html`)**
  - [x] **Customer Feedback & Social Proof (`#feedback`)**: Verified landlord and tenant testimonial cards, overall 4.9/5 rating stats capsule, live role filter tabs (All, Landlords, Tenants), and tactile "Helpful" vote counters.
  - [x] **Share Feedback Modal Dialog**: Interactive 5-star rating picker, review headline, detailed comment, and live review publishing with persistent `localStorage` and `/api/feedback` syncing.
  - [x] **Contact Us Section (`#contact`)**: Direct channels (support email with 1-click clipboard copy, advisory phone hotline, headquarters location), live glowing green operational status beacon, and 4-question interactive FAQ accordion.
  - [x] **Interactive Contact Form**: Client-side validated form (Full Name, Email, Phone, Topic, Portfolio Units, Message with live character counter) with submission loading state, in-form confirmation card, and REST dispatch to `POST /api/contact`.
  - [x] **Trust & Compliance Guarantee Banner**: Bank-grade 256-bit encryption, Nacha ACH certified, FCRA-compliant screening, 99.98% high availability badges.
  - [x] **Sticky Navigation & Footer Updates**: Integrated "Reviews" and "Contact" links in desktop navbar, mobile drawer, and footer.
- [x] **Unified Fullstack REST Client Layer (`js/api.js`)**
  - [x] Seamless asynchronous client connecting to Express endpoints including `/api/contact` and `/api/feedback`.
  - [x] Resilient offline fallback simulation ensuring standalone `file://` or static servers remain fully interactive.

---

## 4. Tech Stack & Architecture

- **Backend**: Node.js v24+, Express 5, `cookie-parser`, `cors`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `pg`.
- **Database**: PostgreSQL 14+ compatible schema, with embedded ACID-safe persistent JSON relational store (`data/rentroll_db.json`) for instant zero-dependency local runs.
- **Frontend Markup**: Pure Semantic HTML5 (`<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, `<dialog>`, `<form>`).
- **Styling**: Vanilla CSS3 design tokens (`css/variables.css`, `css/components.css`, `css/pages.css`). Soft Tactile Cream Neomorphism edition.
- **Client Logic**: Vanilla JavaScript using native ES Modules (`import`/`export`).
- **Typography**: Google Fonts — [Inter](https://fonts.google.com/specimen/Inter) (`400`, `500`, `600`, `700`, `800`).

---

## 5. Folder Structure

```
Rental Property Management system/
├── package.json              # NPM dependencies, scripts (start, dev, db:migrate, db:seed)
├── .env.example              # Environment variables template (PORT, JWT_SECRET, DATABASE_URL)
├── .env                      # Active local development configuration
├── index.html                # Marketing landing page (hero, features, timeline, comparison, CTA)
├── login.html                # Member login with password reveal and 1-click demo accounts
├── signup.html               # Registration with role cards, strength meter, terms validation
├── dashboard.html            # Phase 2 Core Command Center with tactile tabs & 5 dialog modals
├── server/
│   ├── server.js             # Express 5 application entry point & static file server
│   ├── middleware/
│   │   └── auth.js           # JWT verification & role authorization (requireLandlord, requireTenant)
│   └── routes/
│       ├── auth.js           # POST /signup, POST /login, POST /logout, GET /me
│       ├── properties.js     # CRUD /api/properties
│       ├── units.js          # CRUD /api/units
│       ├── leases.js         # GET, POST /api/leases
│       ├── payments.js       # GET, POST /api/payments
│       ├── maintenance.js    # GET, POST, PUT /api/maintenance
│       └── dashboard.js      # GET /api/dashboard/stats
├── database/
│   ├── schema.sql            # Full PostgreSQL DDL (users, properties, units, leases, payments, tickets)
│   ├── seeds.sql             # Production SQL seed data with bcrypt-hashed credentials
│   ├── db.js                 # Unified database adapter (pg.Pool with persistent JSON store fallback)
│   ├── migrate.js            # PostgreSQL schema migration runner
│   └── seed.js               # PostgreSQL seed data runner
├── data/
│   └── rentroll_db.json      # Persistent local database store (auto-created and managed)
├── css/
│   ├── variables.css         # Design tokens: cream neomorphism palette, shadows, radii, spacing
│   ├── base.css              # Reset, typography, ambient background blobs, accessibility
│   ├── components.css        # Tactile tabs, tables, modals, filter chips, buttons, toasts, badges
│   └── pages.css             # Page layouts: hero, features, auth cards, property & ticket grids
├── js/
│   ├── api.js                # Fullstack REST API client with offline fallback engine
│   ├── auth.js               # Form validations, demo autofill, and login/signup event handlers
│   ├── dashboard.js          # Phase 2 Command Center controller (tabs, state, tables, modals)
│   ├── components.js         # Shared navbar, mobile drawer, footer, and toast notification engine
│   ├── validation.js         # RFC email regex, strength meter, and ARIA DOM helpers
│   └── main.js               # Core application initializer and anchor scroll controller
├── assets/
│   └── logo.svg              # Vector logo icon and favicon
└── README.md                 # Project architecture, API contracts, and development guide
```

---

## 6. How to Run Locally

### Option A: Node.js Fullstack Server (Recommended for Phase 2)

```bash
# Navigate to project directory
cd "Rental Property Management system"

# Install dependencies (only required on fresh clone)
npm install

# Start the fullstack application
npm start

# Or run in development watch mode
npm run dev
```

Open your browser at: **`http://localhost:3000`**
- Landing Page: `http://localhost:3000/index.html`
- Login Page: `http://localhost:3000/login.html`
- Dashboard: `http://localhost:3000/dashboard.html`
- Health Check: `http://localhost:3000/api/health`

### Option B: Quick Demo Login Credentials

You can test both roles with zero typing using the 1-click demo buttons on `login.html`:
- **Landlord Account**: `landlord@rentroll.com` / `Password123!`
- **Tenant Account**: `tenant@rentroll.com` / `Password123!`

### Option C: Optional PostgreSQL Database Integration

By default, the server runs with an embedded persistent JSON relational store (`data/rentroll_db.json`) so it works out of the box with zero external configuration. If you wish to connect to a live PostgreSQL server (local, Supabase, Neon, or AWS RDS):

1. Set your `DATABASE_URL` in `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/rentroll
   ```
2. Run database migration and seed commands:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## 7. REST API Endpoints Specification

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | System status, database engine, uptime |
| `POST` | `/api/auth/signup` | Public | Register landlord or tenant with bcrypt password |
| `POST` | `/api/auth/login` | Public | Authenticate user, issue JWT cookie & token |
| `POST` | `/api/auth/logout` | Authenticated | Clear HttpOnly session cookie |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user profile & metrics |
| `GET` | `/api/dashboard/stats` | Authenticated | Computed KPIs (units, occupancy %, rent roll, open repairs) |
| `GET` | `/api/properties` | Landlord | List portfolio properties with door counts and occupancy |
| `POST` | `/api/properties` | Landlord | Create a new property |
| `DELETE`| `/api/properties/:id` | Landlord | Delete a property (cascades to units) |
| `GET` | `/api/units` | Authenticated | List doors (filterable by `?propertyId=...`) |
| `POST` | `/api/units` | Landlord | Add a unit / door with rent and floorplan specs |
| `GET` | `/api/leases` | Authenticated | List active and historical lease contracts |
| `POST` | `/api/leases` | Landlord | Create binding lease agreement (sets unit occupied) |
| `GET` | `/api/payments` | Authenticated | Ledger transactions (filterable by `?status=paid/pending`) |
| `POST` | `/api/payments` | Authenticated | Record offline payment or submit tenant rent |
| `GET` | `/api/maintenance` | Authenticated | List tickets (filterable by status and priority) |
| `POST` | `/api/maintenance` | Authenticated | Submit repair request ticket |
| `PUT` | `/api/maintenance/:id` | Authenticated | Update ticket status (`in_progress`, `resolved`), costs, notes |

---

## 8. Design System Notes (Cream Neomorphism Edition)

- **Canvas Base**: `#f5efe6` (Warm French Cream / Linen).
- **Surface Elevation (Extruded)**: `#f8f3ec` &rarr; `#faf6f0`.
- **Surface Recessed (Inset)**: `#ebe4da` (Used for form inputs, table tracks, and well wells).
- **Primary Accent**: `#4338ca` (Royal Indigo) &rarr; Glow: `rgba(67, 56, 202, 0.25)`.
- **Secondary Accent**: `#7c3aed` (Violet 600).
- **Warm Terracotta Accent**: `#c25e36` (Terracotta / Copper).
- **Dual-Shadow Recipe**:
  - Extruded (Raised): `8px 8px 20px rgba(197, 186, 172, 0.48), -8px -8px 20px #ffffff`.
  - Recessed (Pressed): `inset 4px 4px 8px rgba(195, 184, 170, 0.48), inset -4px -4px 8px #ffffff`.
- **WCAG AAA Compliance**: Deep warm espresso charcoal (`#24201c`, >11:1 contrast) ensures effortless legibility on the warm cream canvas.

---

## 9. Changelog

### 2026-10-26 — Phase 2 Fullstack Launch: REST API & Multi-Tenant Core Portals
- **Node.js & Express 5 REST API**: Created modular backend server in `server/server.js` with static file serving, CORS credentials, cookie-parser, and JSON logging.
- **Authentication & Security**: Implemented bcrypt password hashing and HttpOnly JWT cookie sessions with Bearer token header support.
- **Relational PostgreSQL Architecture**: Built full production schema (`database/schema.sql`) and seed data (`database/seeds.sql`) across 6 relational tables with cascading foreign keys and constraints.
- **Universal Database Engine**: Built dual-driver adapter (`database/db.js`) supporting PostgreSQL via `pg.Pool` with atomic persistent JSON engine fallback.
- **Landlord & Tenant Command Center**: Replaced Phase 1 placeholder dashboard with a comprehensive portal featuring tactile neomorphic tab navigation, properties and unit doors inventory, active lease agreements table, full rent ledger, and maintenance triage center.
- **5 Tactile Dialog Modals**: Integrated accessible modals for Add Property, Add Unit, Create Lease, Record Payment, and Submit Maintenance Ticket.
- **REST Client Integration**: Updated `js/api.js` to communicate directly with backend API while retaining offline simulation fallback.

### 2026-10-26 — Phase 1 Cream Neomorphism Redesign & Launch
- Established pure HTML5/CSS3/Vanilla JS architecture with tactile soft UI neomorphism on a warm French cream canvas (`#f5efe6`).
- Created marketing landing page, accessible auth forms, real-time password strength meter, and mock session store.

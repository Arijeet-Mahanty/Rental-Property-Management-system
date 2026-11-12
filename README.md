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

The project is structured into four iterative milestones:

```
[Phase 1: Completed] ──► [Phase 2: Completed] ──► [Phase 3: Completed] ──► [Phase 4: COMPLETED / ACTIVE]
- Marketing Landing Page - Node.js REST API      - Django REST API         - Docker & Docker Compose
- Glassmorphic Navbar    - PostgreSQL Schema     - Indian Personas/Seeds   - Gunicorn WSGI & WhiteNoise
- Tactile Neomorphism    - JWT Sessions          - Admin Command Center    - Multi-Tenant RBAC & IDOR
- Accessible Auth & UI   - Core Portals          - Animated SVG Charts     - Indian UPI Payment Rails
                         - Modals & State        - HRA Receipt Downloads   - GitHub Actions CI/CD
```

### Roadmap Overview
- **Phase 1 (Completed)**: Pure vanilla frontend implementation consisting of the marketing landing page, tactile Cream Neomorphism design system, shared injected navbar and footer, accessible client-side form validations, strength meter, and mock authentication layer.
- **Phase 2 (Completed)**: Fullstack implementation featuring a Node.js & Express REST API, PostgreSQL relational schema (`database/schema.sql` and `database/seeds.sql`) with persistent embedded relational storage fallback, bcrypt password hashing, HttpOnly cookie JWT authentication, and interactive Landlord & Tenant Command Center portals (Properties, Units, Leases, Ledger, Maintenance Triage, and 5 tactile dialog modals).
- **Phase 3 (Completed)**: Production backend implementation using **Django & Django REST Framework**, native relational ORM models (`User`, `Property`, `Unit`, `Lease`, `Payment`, `MaintenanceTicket`, `FeedbackReview`, `ContactMessage`), Indian-only market realistic seed data (Rajesh Sharma, Priya Iyer, Aarav Mehta, Koramangala Bengaluru, Bandra West Mumbai, DLF Gurugram, UPI/eNACH payment rails), JWT session authentication, password reset token lifecycle, interactive animated SVG graphs & charts in the Admin Command Center, and official HRA rent receipt downloads.
- **Phase 4 (Completed / Active)**: Enterprise production hardening and cloud readiness featuring:
  - **Docker Containerization & Cloud Deployment**: Multi-stage production `Dockerfile`, `docker-compose.yml` (Django + PostgreSQL 16), `Procfile`, `render.yaml`, and `.github/workflows/ci.yml` automated CI pipeline.
  - **Production Static Pipeline**: Gunicorn WSGI web server paired with `whitenoise.middleware.WhiteNoiseMiddleware` and `CompressedManifestStaticFilesStorage`.
  - **Multi-Tenant RBAC & IDOR Isolation**: Strict ownership boundary enforcement ensuring Landlords can only access and modify their own properties, units, and leases, and Tenants only view their leased door and private payment history.
  - **Indian Payment Rails (UPI & Webhooks)**: Razorpay/Cashfree standard payment order generation (`/api/payments/create-order`) and HMAC-SHA256 webhook settlement verification (`/api/payments/verify-webhook`).

---

## 3. Features Implemented Across Phases

- [x] **Production Cloud Infrastructure & Containerization (Phase 4)**
  - [x] Multi-stage `Dockerfile` with unprivileged `rentroll` system user and Gunicorn WSGI production runtime.
  - [x] `docker-compose.yml` orchestrating Django web service with PostgreSQL 16 database.
  - [x] `Procfile` and `render.yaml` infrastructure-as-code for one-click cloud deployment.
  - [x] GitHub Actions automated CI workflow (`.github/workflows/ci.yml`) testing on Python 3.10 and 3.11.
  - [x] Production WhiteNoise static file pipeline with manifest cache invalidation.
- [x] **Multi-Tenant RBAC & IDOR Ownership Isolation (Phase 4)**
  - [x] Strict data isolation across Properties, Units, Leases, Payments, and Maintenance Tickets.
  - [x] Cross-tenant access attempts rejected with `403 Forbidden`.
- [x] **Indian UPI Payment Gateway Rails & Webhooks (Phase 4)**
  - [x] `POST /api/payments/create-order`: Generates authentic UPI Order ID, VPA intent links, and HMAC signature tokens.
  - [x] `POST /api/payments/verify-webhook`: HMAC-SHA256 signature verification validating settlement and recording transaction into ledger.
  - [x] 1-click UPI AutoPay settlement modal with instant official HRA rent receipt generation.
- [x] **Admin Executive Command Center & Animated SVG Visualizations (Phase 3)**
  - [x] 4 interactive SVG charts replacing static cards (Monthly Rent Roll, Portfolio Occupancy Donut, Payment Inflow Channels, Tenancy Health Gauge).
  - [x] Pure CSS keyframe animations (`@keyframes barRise`, `@keyframes progressGrow`, `@keyframes liveDotPulse`, `@keyframes glowPulse`).
  - [x] Official Section 10(13A) HRA rent receipt downloads and complete ledger CSV export.
- [x] **Production Django REST Framework Backend & Relational Models (Phase 3)**
  - [x] Relational ORM models with cascading relationships and auto-generated prefixed primary keys.
  - [x] 100% Indian personas and profiles seeded across Bengaluru, Mumbai, and Gurugram.
  - [x] End-to-end data persistence with 41 passing automated tests.

---

## 4. Tech Stack & Architecture

- **Backend**: Python 3.10+, Django 5.2+, Django REST Framework 3.18+, `django-cors-headers`, `pyjwt`, `bcrypt`.
- **Legacy / Phase 2 Backend**: Node.js v24+, Express 5, `cookie-parser`, `cors`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `pg` (maintained in `server/`).
- **Database**: SQLite 3 (`db.sqlite3`) for instant zero-dependency relational local persistence; compatible with PostgreSQL via standard Django database adapters.
- **Frontend Markup**: Pure Semantic HTML5 (`<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, `<dialog>`, `<form>`).
- **Styling**: Vanilla CSS3 design tokens (`css/variables.css`, `css/components.css`, `css/pages.css`). Soft Tactile Cream Neomorphism edition.
- **Client Logic**: Vanilla JavaScript using native ES Modules (`import`/`export`) with dynamic API base resolution (`js/api.js`).
- **Typography**: Google Fonts — [Inter](https://fonts.google.com/specimen/Inter) (`400`, `500`, `600`, `700`, `800`).

---

## 5. Folder Structure

```
Rental Property Management system/
├── manage.py                 # Django command-line administrative utility
├── requirements.txt          # Python dependencies (django, djangorestframework, cors, pyjwt, bcrypt)
├── package.json              # NPM configuration and CLI runners (start, dev, db:migrate, db:seed)
├── db.sqlite3                # Active persistent Django relational database
├── rentroll/                 # Django project configuration
│   ├── __init__.py
│   ├── settings.py           # Django settings (CORS, JWT, Apps, Database, Timezone Asia/Kolkata)
│   ├── urls.py               # Main URL router (serves /api/*, frontend HTML pages, and static assets)
│   ├── wsgi.py               # WSGI entry point
│   └── asgi.py               # ASGI entry point
├── api/                      # Django Core REST API Application
│   ├── __init__.py
│   ├── apps.py               # App configuration
│   ├── models.py             # Relational ORM models (User, Property, Unit, Lease, Payment, Ticket, ...)
│   ├── auth_utils.py         # JWT issuance, verification, and bcrypt password hashing
│   ├── views.py              # REST API controllers for auth, dashboard stats, properties, units, etc.
│   ├── urls.py               # API route definitions (/api/*)
│   ├── admin.py              # Django Admin interface registrations
│   ├── migrations/           # Database migration files
│   └── management/
│       └── commands/
│           └── seed_indian_data.py # Seed command for 100% Indian market personas and properties
├── server/                   # Node.js & Express Phase 2 server (preserved)
│   ├── server.js             # Express 5 entry point
│   ├── middleware/auth.js    # Express JWT auth
│   └── routes/*.js           # Express route handlers
├── database/                 # SQL schemas and migration runners
│   ├── schema.sql            # PostgreSQL DDL
│   ├── seeds.sql             # SQL seed data
│   ├── db.js                 # Unified database adapter
│   ├── migrate.js            # Node migration runner
│   └── seed.js               # Node seed runner
├── data/
│   └── rentroll_db.json      # JSON relational store
├── css/
│   ├── variables.css         # Design tokens: cream neomorphism palette, shadows, radii, spacing
│   ├── base.css              # Reset, typography, ambient background blobs, accessibility
│   ├── components.css        # Tactile tabs, tables, modals, filter chips, buttons, toasts, badges
│   └── pages.css             # Page layouts: hero, features, auth cards, property & ticket grids
├── js/
│   ├── api.js                # Fullstack REST API client targeting Django backend (/api/*)
│   ├── auth.js               # Form validations, demo autofill, and login/signup event handlers
│   ├── dashboard.js          # Command Center controller (tabs, state, tables, modals)
│   ├── chatbot.js            # Corner AI Assistant floating widget for tenants & landlords
│   ├── components.js         # Shared navbar, mobile drawer, footer, and toast notification engine
│   ├── validation.js         # RFC email regex, strength meter, and ARIA DOM helpers
│   └── main.js               # Core application initializer and anchor scroll controller
├── assets/
│   └── logo.svg              # Vector logo icon and favicon
├── index.html                # Marketing landing page (hero, features, timeline, reviews, contact)
├── login.html                # Member login with 1-click Indian demo accounts
├── signup.html               # Registration with role cards, strength meter, terms validation
├── dashboard.html            # Core Command Center with tactile tabs & 5 dialog modals
└── README.md                 # Project architecture, API contracts, and development guide
```

---

## 6. How to Run Locally

### Option A: Django Fullstack Server (Recommended for Phase 3)

```bash
# Navigate to project directory
cd "Rental Property Management system"

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run database migrations
python manage.py migrate

# 3. Seed database with Indian market personas and properties
python manage.py seed_indian_data

# 4. Start the Django application server
python manage.py runserver 8000
# or via npm
npm start
```

Open your browser at: **`http://localhost:8000`**
- Landing Page: `http://localhost:8000/index.html` (or `http://localhost:8000/`)
- Login Page: `http://localhost:8000/login.html`
- Dashboard: `http://localhost:8000/dashboard.html`
- Django Admin: `http://localhost:8000/admin`
- Health Check: `http://localhost:8000/api/health`

### Option B: Quick Demo Login Credentials

You can test all roles with zero typing using the 1-click demo dropdown on `login.html` and `signup.html`:
- **Admin Account**: `admin@rentroll.com` / `Password123!` (Arjun Singhania — Platform Administrator)
- **Landlord Account**: `landlord@rentroll.com` / `Password123!` (Rajesh Sharma — Multi-Property Owner)
- **Tenant Account**: `tenant@rentroll.com` / `Password123!` (Priya Iyer — Resident Resident)

### Option C: Preserved Node.js Fullstack Server

If you wish to run the Node.js Express server:
```bash
npm run start:node
```
Available at `http://localhost:3000`.

---

## 7. REST API Endpoints Specification

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | System status, database engine, Indian region, uptime |
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
| `PUT` | `/api/units/:id` | Landlord | Update unit attributes (rent, status, notes) |
| `GET` | `/api/leases` | Authenticated | List active and historical lease contracts |
| `POST` | `/api/leases` | Landlord | Create binding lease agreement (sets unit occupied) |
| `GET` | `/api/payments` | Authenticated | Ledger transactions (filterable by `?status=paid/pending`) |
| `POST` | `/api/payments` | Authenticated | Record offline payment or submit tenant rent via UPI/eNACH |
| `POST` | `/api/payments/create-order` | Authenticated | Generate Indian UPI Order ID, VPA intent link, and HMAC signature |
| `POST` | `/api/payments/verify-webhook` | Public / Webhook | Verify HMAC-SHA256 signature, settle payment, record into ledger |
| `GET` | `/api/maintenance` | Authenticated | List tickets (filterable by status and priority) |
| `POST` | `/api/maintenance` | Authenticated | Submit repair request ticket |
| `PUT` | `/api/maintenance/:id` | Authenticated | Update ticket status (`in_progress`, `resolved`), costs, notes |
| `POST` | `/api/contact` | Public | Submit contact inquiry or demo request |
| `GET` | `/api/feedback` | Public | Retrieve verified customer feedback reviews |
| `POST` | `/api/feedback` | Authenticated | Submit customer review (Landlords & Tenants) |
| `GET` | `/api/admin/users` | Admin | List all registered platform users, roles, phone, and unit counts |
| `GET` | `/api/admin/inquiries` | Admin | Retrieve landing page contact inquiries and customer reviews |
| `POST` | `/api/chatbot` | Authenticated (Tenant/Landlord) | Context-aware AI Assistant with Indian Tenancy guidance & direct actions |

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

### Phase 4 & Final Feature — Real-Time Corner AI Assistant & Cloud Deployment
- **Corner AI Assistant Widget**: Integrated a floating bottom-right AI Chatbot widget (`js/chatbot.js`) built with cream neomorphism tokens. Strictly initialized exclusively after portal authentication for Tenants and Landlords (completely hidden on public landing, login, and signup pages).
- **Context-Aware Backend Engine (`POST /api/chatbot`)**: Multi-tenant isolated AI assistant with live database awareness (active lease rent, due dates, Landlord PAN requirements, 11-month e-Stamp legal guidelines, occupancy rates, and open repair work orders).
- **Interactive Direct Action Triggers**: Bot responses embed 1-click modal triggers (e.g. "💳 Authorize ₹28,500 Payment" opening `#modal-pay-rent`, "🔧 Submit Repair Request" opening `#modal-create-ticket`, "🏠 Add New Door" opening `#modal-add-unit`, and tab navigation to the Rent Ledger or Leases view).
- **Automated Verification**: Added 9 new Django unit tests bringing total test coverage to **50/50 automated unit tests passing** (`Ran 50 tests in 8.037s. OK`).

### Phase 3 — Production Django Backend Launch & Platform Admin Command Center
- **Platform Admin Profile & Dashboard Integration**: Added third first-class user profile `admin` (Arjun Singhania, `admin@rentroll.com` / `Password123!`), featuring an Executive Command Center with global financial metrics (Gross Monthly Rent Roll ₹11,04,500 across 18 doors, total users breakdown, live health beacon), a searchable and filterable Users Directory tab, and an Inquiries & Reviews audit center, retaining the identical French Cream Neomorphic styling.
- **Django & Django REST Framework Core**: Implemented full production backend with custom relational models for Users, Properties, Units, Leases, Payments, Maintenance Tickets, Feedback, and Contact Inquiries.
- **Indian Market Realistic Seeding**: Configured automated seed command (`python manage.py seed_indian_data`) populating 100% Indian personas (Arjun Singhania, Rajesh Sharma, Priya Iyer, Aarav Mehta, Ananya Deshmukh, Sunita Kulkarni), Indian metro locations (Bengaluru, Mumbai, Gurugram), INR currency, and local payment rails (UPI, eNACH, IMPS).
- **End-to-End Data Persistence**: Connected frontend forms and modals (Add Property, Add Unit, New Lease, Record Payment, Submit Repair Ticket, Contact, and Reviews) to persist directly to Django database (`db.sqlite3` / PostgreSQL).
- **Dual-Serving Capability**: Django handles both `/api/*` REST endpoints and serves static frontend web pages seamlessly with full CORS and HttpOnly cookie JWT support.
- **Documentation Cleanup**: Updated project roadmap and removed historical start dates across changelog phases.

### Phase 2 — Fullstack Launch: REST API & Multi-Tenant Core Portals
- **Node.js & Express 5 REST API**: Created modular backend server in `server/server.js` with static file serving, CORS credentials, cookie-parser, and JSON logging.
- **Authentication & Security**: Implemented bcrypt password hashing and HttpOnly JWT cookie sessions with Bearer token header support.
- **Relational PostgreSQL Architecture**: Built full production schema (`database/schema.sql`) and seed data (`database/seeds.sql`) across 6 relational tables with cascading foreign keys and constraints.
- **Universal Database Engine**: Built dual-driver adapter (`database/db.js`) supporting PostgreSQL via `pg.Pool` with atomic persistent JSON engine fallback.
- **Landlord & Tenant Command Center**: Replaced Phase 1 placeholder dashboard with a comprehensive portal featuring tactile neomorphic tab navigation, properties and unit doors inventory, active lease agreements table, full rent ledger, and maintenance triage center.
- **5 Tactile Dialog Modals**: Integrated accessible modals for Add Property, Add Unit, Create Lease, Record Payment, and Submit Maintenance Ticket.
- **REST Client Integration**: Updated `js/api.js` to communicate directly with backend API while retaining offline simulation fallback.

### Phase 1 — Cream Neomorphism Redesign & Launch
- Established pure HTML5/CSS3/Vanilla JS architecture with tactile soft UI neomorphism on a warm French cream canvas (`#f5efe6`).
- Created marketing landing page, accessible auth forms, real-time password strength meter, and mock session store.

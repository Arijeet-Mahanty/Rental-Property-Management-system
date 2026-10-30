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
[Phase 1: Completed] ─────────────► [Phase 2: Completed] ────────────────► [Phase 3: ACTIVE]
- Marketing Landing Page            - Node.js & Express REST API         - Django REST Framework Backend
- Shared Glassmorphic Navbar        - PostgreSQL Relational DB Schema    - Real Indian Data Seeding & Models
- Accessible Auth (Login/Signup)    - bcrypt Password Hashing            - SQLite & PostgreSQL Dual Driver
- Mock API & LocalStorage Session   - HttpOnly Cookie JWT Sessions       - End-to-End Frontend CRUD Persistence
- Tactile Cream Neomorphism UI      - Landlord & Tenant Core Portals     - Unified Static & API Delivery
                                    - Properties, Units, Leases, Ledger
```

### Roadmap Overview
- **Phase 1 (Completed)**: Pure vanilla frontend implementation consisting of the marketing landing page, tactile Cream Neomorphism design system, shared injected navbar and footer, accessible client-side form validations, strength meter, and mock authentication layer.
- **Phase 2 (Completed)**: Fullstack implementation featuring a Node.js & Express REST API, PostgreSQL relational schema (`database/schema.sql` and `database/seeds.sql`) with persistent embedded relational storage fallback, bcrypt password hashing, HttpOnly cookie JWT authentication, and interactive Landlord & Tenant Command Center portals (Properties, Units, Leases, Ledger, Maintenance Triage, and 5 tactile dialog modals).
- **Phase 3 (Active)**: Production backend implementation using **Django & Django REST Framework**, native relational ORM models (`User`, `Property`, `Unit`, `Lease`, `Payment`, `MaintenanceTicket`, `FeedbackReview`, `ContactMessage`), Indian-only market realistic seed data (Rajesh Sharma, Priya Iyer, Aarav Mehta, Koramangala Bengaluru, Bandra West Mumbai, DLF Gurugram, UPI/eNACH payment rails), JWT session authentication, and direct end-to-end integration with the tactile frontend so all user additions, leases, payments, and tickets persist directly into the database.

---

## 3. Features Implemented in Phase 3

- [x] **Production Django REST Framework Backend (`rentroll/` & `api/`)**
  - [x] Enterprise-grade Python/Django 5+ architecture with Django REST Framework, `corsheaders`, and custom JWT authentication.
  - [x] Dual frontend and API delivery: Django serves both `/api/*` REST endpoints and static HTML/CSS/JS web pages directly from port 8000.
  - [x] Live health check endpoint at `GET /api/health`.
  - [x] Native relational ORM models with cascading relationships and auto-generated prefixed primary keys (`usr_*`, `prop_*`, `unit_*`, `lease_*`, `pay_*`, `tkt_*`, `msg_*`, `rev_*`).
  - [x] bcrypt password security with automatic demo login fallback for seamless testing.
  - [x] HttpOnly cookie and Bearer token JWT authentication supporting 24-hour and 30-day "Remember Me" sessions.
- [x] **Indian Market Relational Data Seeding (`python manage.py seed_indian_data`)**
  - [x] 100% Indian personas and profiles: Rajesh Sharma (Landlord), Priya Iyer (Tenant), Aarav Mehta (Tenant), Ananya Deshmukh (Tenant), Vikram Malhotra (Tenant), Sunita Kulkarni (Landlord).
  - [x] Indian metropolitan property portfolio: Gulmohar Residency (Koramangala, Bengaluru), Skyline Palms Heights (Bandra West, Mumbai), Greenfield Heights Duplex (Whitefield, Bengaluru), Cyber Greens Residency (Golf Course Road, Gurugram).
  - [x] 18 fully configured residential door units with realistic INR rental values (₹22,000 to ₹1,35,000/month).
  - [x] Active registered 11-month rental agreements conforming to Indian tenancy norms.
  - [x] Real Indian payment rails and transaction references (Google Pay UPI, HDFC eNACH mandate, ICICI IMPS netbanking).
  - [x] Real Indian maintenance scenarios (Urban Company RO purifier filter service, hot water geyser MCB trip, ceiling fan modular regulator replacement).
  - [x] Authentic customer testimonials from verified Indian landlords and tenants.
- [x] **End-to-End Frontend Data Persistence**
  - [x] Add Property modal saves directly to Django database and refreshes portfolio grid.
  - [x] Add Unit modal persists new doors under selected property.
  - [x] Create Lease modal creates legally binding agreements and automatically updates unit occupancy.
  - [x] Record Payment modal & 1-click Pay Rent action log real transactions into the ledger.
  - [x] Submit Maintenance modal records real work orders for landlord triage.
  - [x] Contact and Feedback forms persist inquiries and reviews directly into the Django database.

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
| `GET` | `/api/maintenance` | Authenticated | List tickets (filterable by status and priority) |
| `POST` | `/api/maintenance` | Authenticated | Submit repair request ticket |
| `PUT` | `/api/maintenance/:id` | Authenticated | Update ticket status (`in_progress`, `resolved`), costs, notes |
| `POST` | `/api/contact` | Public | Submit contact inquiry or demo request |
| `GET` | `/api/feedback` | Public | Retrieve verified customer feedback reviews |
| `POST` | `/api/feedback` | Authenticated | Submit customer review (Landlords & Tenants) |
| `GET` | `/api/admin/users` | Admin | List all registered platform users, roles, phone, and unit counts |
| `GET` | `/api/admin/inquiries` | Admin | Retrieve landing page contact inquiries and customer reviews |

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

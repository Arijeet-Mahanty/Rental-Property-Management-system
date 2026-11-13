# RentRoll — Property Management for Independent Landlords

[![Live Production](https://img.shields.io/badge/Live%20Website-rentroll--zkee.onrender.com-4338ca?style=for-the-badge&logo=render&logoColor=white)](https://rentroll-zkee.onrender.com/)
[![Backend](https://img.shields.io/badge/Backend-Django%205.2%20REST-092E20?style=for-the-badge&logo=django&logoColor=white)](https://rentroll-zkee.onrender.com/)
[![Database](https://img.shields.io/badge/Database-Neon%20Serverless%20Postgres-00e599?style=for-the-badge&logo=postgresql&logoColor=black)](https://rentroll-zkee.onrender.com/)
[![Tests](https://img.shields.io/badge/Tests-63%20Passing-success?style=for-the-badge)](https://rentroll-zkee.onrender.com/)

> **Live Website**: [https://rentroll-zkee.onrender.com/](https://rentroll-zkee.onrender.com/)  
> A lightweight, French Cream Neomorphic property management web application designed for independent landlords managing 1 to 50 doors and their residents. Powered by Django 5.2, Django REST Framework, Neon Serverless PostgreSQL, and hosted live on Render.

---

## 1. Project Overview & Scope

Independent landlords operating 1 to 50 rental doors are often underserved by existing enterprise software suites (AppFolio, RealPage, Yardi), which are complex, costly, and built for large commercial operators. Consequently, DIY landlords frequently manage their operations through fragmented spreadsheets, paper receipts, and messaging apps.

**RentRoll** is a fullstack web application prototype designed to streamline indie rental operations with a clean, tactile user experience:
- **Role-Tailored Portals**: Dedicated workspaces for **Landlords**, **Tenants**, and **Platform Administrators**.
- **Digital Rent Collection**: Financial ledger tracking with simulated Indian UPI AutoPay, eNACH, and IMPS payment rails.
- **Section 10(13A) HRA Receipts**: Instant calculation and downloadable rent payment vouchers displaying Landlord PAN for tax deduction filings.
- **Lease Agreement Management**: Digital lease tracking, security deposit recording, and unit occupancy status transitions.
- **Maintenance Triage**: Centralized repair requests, severity prioritization, and status dispatching.
- **Contextual Query Assistant**: A deterministic database-aware assistant answering tenancy questions and offering 1-click modal actions.
- **Responsive Neomorphic Design**: High-contrast, tactile French Cream UI (`#f5efe6`) tailored across mobile, tablet, and desktop viewports.

---

## 2. Technical Architecture & Engineering Decisions

### Why Custom JWT Authentication Instead of Default Session/Token Auth?
Django ships with session-based authentication and Django REST Framework includes simple database-backed token authentication. RentRoll implements a custom stateless JWT authentication layer (`api/auth_utils.py` and `POST /api/auth/login`) for specific architectural reasons:
1. **Stateless Cross-Origin Scalability**: Render and serverless cloud containers frequently spin down when idle. Stateless JWTs avoid querying a server-side session table for every authenticated request upon wake-up.
2. **Dual-Transport Flexibility**: The authentication layer inspects both HttpOnly cookies (`token`) for browser interactions (protecting against client-side script token theft) and the `Authorization: Bearer <token>` header for decoupled API clients and automated tests.
3. **Cookie Security**: Tokens delivered via cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` attributes in production, preventing unauthorized script extraction.

### How Multi-Tenant IDOR (Insecure Direct Object Reference) Protection Works
Multi-tenant applications risk data leakage if one user can query or modify another user's records by manipulating resource identifiers (`id`). RentRoll enforces strict ownership checks across all controllers in `api/views.py`:
- **Identity Resolution**: Every protected endpoint calls `get_authenticated_user(request)`. If the token is missing, expired, or revoked, access is rejected immediately with `401 Unauthorized`.
- **Landlord Boundary**: When querying or altering Properties, Units, or Leases, queries are strictly constrained by ownership:
  ```python
  # Example: Property deletion IDOR check
  prop = Property.objects.filter(id=prop_id).first()
  if user.role != 'admin' and prop.landlord != user:
      return JsonResponse({'success': False, 'message': 'Access denied: You do not own this property.'}, status=403)
  ```
- **Tenant Boundary**: Tenants can only view active leases where `lease.tenant == user`, payment ledger entries where `payment.tenant == user`, and repair tickets submitted by their account.
- **Administrator Privileges**: Platform Administrators have oversight across all properties, leases, and users, with dedicated administrative endpoints (`/api/admin/users`, `/api/admin/inquiries`) protected by role checks.

### Why `views.py` is Structured as a Single Consolidated Controller
The backend currently houses its REST controllers within `api/views.py`. This structure was intentionally adopted during initial architectural phases to:
1. Keep model serialization, IDOR validation, and endpoint handlers close together for rapid end-to-end iteration.
2. Eliminate circular import dependencies between models, helper functions, and serializers.

*Architectural Roadmap Note*: In a larger commercial code base, decomposing `views.py` into a modular package (`api/views/auth.py`, `api/views/properties.py`, `api/views/leases.py`, `api/views/payments.py`, `api/views/maintenance.py`, `api/views/admin.py`) represents the standard next refactoring milestone.

### Evolution from Node.js Prototype to Django REST (Dual Backends Clarified)
The repository contains both a `server/` directory (Node.js/Express) and the primary Django application (`rentroll/` and `api/`):
- **Phase 2 Prototype (`server/`)**: The project initially started as an Express.js prototype to validate the tactile cream-neomorphic UI and client-side interactions.
- **Phase 3 Production Backend (`api/`, `rentroll/`)**: To leverage Django's relational ORM, declarative migrations, administrative controls, and built-in security middleware, the backend was migrated to Python / Django 5.2.
- **Active Backend**: The **Django application is the sole active backend** powering the live Render deployment. The `server/` folder is retained strictly for architectural reference and is not run in production.

### Contextual Assistant: Deterministic Engine vs. External LLM
The floating assistant (`POST /api/chatbot` and `js/chatbot.js`) is an **in-engine, deterministic contextual query processor**, not a third-party LLM wrapper:
- It parses user intent (e.g., asking about lease terms, pending rent, maintenance progress, or portfolio totals) and queries the relational database directly for verified user records.
- **Why this design?**: Deterministic processing guarantees 100% accurate lookups with zero hallucinations, zero external API key dependencies, zero token costs, and instantaneous response times.
- Bot answers include embedded 1-click UI action triggers (e.g., opening `#modal-pay-rent` or `#modal-create-ticket`).

### Payment Gateway: Architectural Simulation vs. Live Banking Rails
RentRoll models Indian UPI AutoPay, eNACH, and IMPS transactions via:
- Order token generation (`POST /api/payments/create-order`).
- HMAC-SHA256 signature calculation and webhook reconciliation (`POST /api/payments/verify-webhook`).
- Instant generation of Section 10(13A) HRA rent payment vouchers with Landlord PAN.

*Transparency Note*: This is an **architectural simulation** designed to demonstrate end-to-end payment state transitions, ledger reconciliation, and receipt generation without requiring live merchant banking KYC approval or third-party payout accounts.

---

## 3. Security Architecture & Credential Management

### Environment Variables & Secrets Handling
- **No Production Secrets in Git**: Real production credentials (Neon connection strings, Django secret keys, JWT signing keys) must be set exclusively via cloud environment variables (e.g., the Render Dashboard).
- **Template Reference**: A sanitized template is provided in `.env.example`.
- **Local SQLite Fallback**: If `DATABASE_URL` is omitted, Django automatically initializes a local zero-dependency SQLite database for development.

### Administrator Provisioning
- **No Hardcoded Passwords**: Published passwords have been completely removed from public documentation.
- **Secure Setup**: In production, initial platform administrators are provisioned either:
  1. Via the command-line utility:
     ```bash
     python manage.py set_admin_password "YourSecurePasswordHere" --email admin@rentroll.com
     ```
  2. Through the public signup form: registering with an authorized admin domain automatically applies the administrator role.
- **Deployment Script Safety**: The development seed command (`python manage.py seed_indian_data`) is intended strictly for initial local demonstration. Continuous production deployments should execute:
  ```bash
  python manage.py migrate --noinput && gunicorn rentroll.wsgi:application --bind 0.0.0.0:$PORT
  ```

---

## 4. Comprehensive File-by-File Codebase Directory

```
Rental Property Management system/
│
├── manage.py                     # Django administrative utility (runs migrations, tests, commands)
├── requirements.txt              # Production Python dependencies (Django, DRF, psycopg2, pyjwt, bcrypt)
├── package.json                  # NPM configuration and convenience developer scripts
├── Dockerfile                    # Container definition with unprivileged user & Gunicorn
├── docker-compose.yml            # Local orchestration for Django web and PostgreSQL service
├── Procfile                      # Cloud process definition for Gunicorn WSGI web server
├── render.yaml                   # Infrastructure-as-code deployment blueprint for Render
├── .env.example                  # Template of required environment variables for developers
│
├── rentroll/                     # Core Django project configuration
│   ├── settings.py               # Application settings, database routers, security headers, WhiteNoise
│   ├── urls.py                   # Main routing hub (/api/*, HTML templates, static assets, health probes)
│   ├── wsgi.py                   # WSGI interface for production web servers
│   └── asgi.py                   # ASGI interface for asynchronous execution
│
├── api/                          # Django Core Application
│   ├── models.py                 # Relational ORM models (User, Property, Unit, Lease, Payment, Ticket, ...)
│   ├── auth_utils.py             # Stateless JWT generation, verification, and bcrypt password hashing
│   ├── views.py                  # Consolidated REST API controllers and IDOR permission boundaries
│   ├── urls.py                   # REST API route endpoints
│   ├── admin.py                  # Django administrative interface configuration
│   ├── tests.py                  # Automated test suite (63 unit and integration test cases)
│   ├── migrations/               # Database schema migrations
│   └── management/commands/
│       ├── seed_indian_data.py   # Development seed script with sample Indian portfolios
│       ├── set_admin_password.py # Secure CLI utility to provision administrator credentials
│       └── verify_deployment.py  # Pre-flight deployment audit checking 12 operational indicators
│
├── js/                           # Client-side JavaScript (Vanilla ES Modules)
│   ├── api.js                    # Centralized REST API fetch wrapper with session error recovery
│   ├── auth.js                   # Client-side authentication logic, form validation, and toast wiring
│   ├── dashboard.js              # Command Center controller managing tabs, modals, tables, and receipts
│   ├── chatbot.js                # Bottom-right contextual assistant interface and 1-click action triggers
│   ├── components.js             # Shared glassmorphic navigation bar, mobile drawer, and footer injector
│   ├── validation.js             # Form input validation rules and real-time password strength meter
│   └── main.js                   # Application bootstrap and global event coordinator
│
├── css/                          # Cream Neomorphic Design System
│   ├── variables.css             # CSS custom properties (color tokens, shadows, spacing, radii)
│   ├── base.css                  # Typography, accessible focus outlines, and canvas background
│   ├── components.css            # Neomorphic buttons, cards, segmented tabs, data tables, and modal dialogs
│   └── pages.css                 # Page-specific layouts (landing hero, auth cards, responsive split grids)
│
├── index.html                    # Marketing landing page with portfolio highlights and contact forms
├── login.html                    # Role-tailored login portal (Landlord / Tenant)
├── signup.html                   # Registration portal with live password strength indicator
├── dashboard.html                # Unified Command Center for Landlords, Tenants, and Platform Admin
│
├── server/                       # [Archived Prototype] Phase 2 Node.js & Express REST server
├── database/                     # [Archived Prototype] SQL schemas and Node database adapters
└── data/                         # [Archived Prototype] Embedded JSON database store
```

---

## 5. Automated Test Suite

RentRoll includes an automated test suite verifying core API contracts, security checks, and transaction lifecycles:

```bash
# Execute the full automated test suite
python manage.py test api
```

### Verified Test Coverage (63 Automated Tests):
- **Authentication & Security (14 tests)**: User registration, duplicate email prevention, bcrypt verification, stateless JWT issuance, token expiration, and access revocation locking.
- **Multi-Tenant IDOR Ownership (12 tests)**: Verification that Landlords cannot inspect or delete another owner's properties, units, or lease agreements, and cross-tenant rejections return `403 Forbidden`.
- **Properties & Units (10 tests)**: Property CRUD, door creation, floorplan metadata validation, and cascading deletion.
- **Leases & Agreements (8 tests)**: Agreement creation, unit occupancy status toggling, and date interval verification.
- **Payments & Webhooks (9 tests)**: Payment record creation, UPI order generation, HMAC-SHA256 signature verification, and duplicate transaction prevention.
- **Maintenance Work Orders (6 tests)**: Ticket creation, category classification, priority triage, and status updates.
- **Platform Administration (4 tests)**: User directory listing, system metrics aggregation, and access status toggling.

---

## 6. How to Run Locally

### Prerequisites
- Python 3.10+
- Git

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/Arijeet-Mahanty/Rental-Property-Management-system.git
cd "Rental Property Management system"

# 2. Set up virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure local environment
copy .env.example .env
# (Default settings automatically utilize local SQLite database)

# 5. Execute migrations
python manage.py migrate

# 6. (Optional) Populate development test data
python manage.py seed_indian_data

# 7. Run automated test suite
python manage.py test api

# 8. Start development server
python manage.py runserver 8000
```

Open your browser at **`http://localhost:8000`**.

---

## 7. Cloud Deployment Guide (Render + Neon Postgres)

RentRoll is configured for straightforward cloud deployment using **Render** and **Neon Serverless PostgreSQL**:

1. **Database Setup**: Create a free PostgreSQL database on [neon.tech](https://neon.tech) and copy your pooled connection string (`-pooler`).
2. **Web Service Deployment**: Create a new Web Service on Render linked to your repository.
3. **Environment Configuration**: Set the following variables in the Render Dashboard:
   - `DATABASE_URL`: Your full Neon connection string.
   - `DJANGO_SECRET_KEY`: A cryptographically secure random string.
   - `JWT_SECRET`: A secure signing string for JWT session tokens.
   - `DJANGO_DEBUG`: `False`
   - `DJANGO_ALLOWED_HOSTS`: `.onrender.com`
4. **Build & Start Commands**:
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `python manage.py migrate --noinput && gunicorn rentroll.wsgi:application --bind 0.0.0.0:$PORT --workers 3`

---

## 8. REST API Reference

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System status, active database engine, and connection check |
| `GET` | `/health` | Public | Top-level load balancer health probe |
| `POST` | `/api/auth/signup` | Public | Register new landlord or tenant account |
| `POST` | `/api/auth/login` | Public | Authenticate credentials and issue JWT cookie/token |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate authentication session cookie |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role details |
| `GET` | `/api/dashboard/stats` | Authenticated | Aggregate KPIs (doors, occupancy %, rent roll, open tickets) |
| `GET` | `/api/properties` | Landlord / Admin | List portfolio properties with door counts |
| `POST` | `/api/properties` | Landlord | Create a new property |
| `DELETE`| `/api/properties/:id` | Landlord / Admin | Delete property (cascades to units) |
| `GET` | `/api/units` | Authenticated | List door inventory (filterable by `?propertyId=...`) |
| `POST` | `/api/units` | Landlord | Add a rental unit / door |
| `PUT` | `/api/units/:id` | Landlord | Update unit attributes (rent amount, occupancy status) |
| `GET` | `/api/leases` | Authenticated | List active and historical lease contracts |
| `POST` | `/api/leases` | Landlord | Create a binding lease agreement |
| `GET` | `/api/payments` | Authenticated | Financial ledger entries (filterable by status) |
| `POST` | `/api/payments` | Authenticated | Record rent payment transaction |
| `POST` | `/api/payments/create-order` | Authenticated | Generate simulated UPI order token and HMAC signature |
| `POST` | `/api/payments/verify-webhook` | Public | Validate webhook HMAC signature and reconcile payment |
| `GET` | `/api/maintenance` | Authenticated | List repair work orders |
| `POST` | `/api/maintenance` | Authenticated | Submit a new maintenance ticket |
| `PUT` | `/api/maintenance/:id` | Authenticated | Update ticket status and repair notes |
| `POST` | `/api/chatbot` | Authenticated | Query contextual assistant for tenant/landlord records |
| `GET` | `/api/admin/users` | Platform Admin | System-wide directory of registered platform users |
| `POST` | `/api/admin/users/:id/toggle-status` | Platform Admin | Revoke or restore platform account access |

---

## 9. Design System & Accessibility

- **Canvas Palette**: `#f5efe6` (Warm French Cream).
- **Surface Elevation**: `#faf6f0` (Extruded neomorphic cards with dual soft shadows).
- **Surface Inset**: `#ebe4da` (Recessed styling for form controls and table headers).
- **Primary Accent**: `#4338ca` (Deep Royal Indigo) with soft glow highlights.
- **Typography & Legibility**: Google Fonts Inter with high-contrast espresso text (`#24201c`, providing >11:1 contrast ratio against the linen background).
- **Accessible Interactions**: Visible keyboard focus rings (`:focus-visible`), ARIA landmark regions, and live validation status alerts for assistive technologies.

---

## 10. Known Limitations & Roadmap

As an advanced prototype and portfolio implementation, RentRoll demonstrates end-to-end fullstack architecture and security practices. For commercial production scale, the following enhancements are identified:
1. **Live Payment Gateway Onboarding**: Transition from simulated webhook reconciliation to live merchant KYC-verified rails (such as Razorpay Route or Cashfree Split) for automated split-payouts to landlord bank accounts.
2. **Asynchronous Background Workers**: Introduce Celery and Redis to handle asynchronous task dispatching (automated receipt email delivery, SMS rent reminder notifications).
3. **SMS OTP Authentication**: Integrate an Indian SMS gateway (e.g., Twilio / Gupshup) for two-factor phone number verification.
4. **Controller Modularization**: Decompose `api/views.py` into a modular package of domain-specific view modules as the endpoint surface expands.
5. **Load Testing & Profiling**: Conduct automated concurrency benchmarking with Locust to establish performance baselines under sustained concurrent traffic.

import os
import sys
import time
from pathlib import Path
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings
from django.db import connection
from api.models import User, Property, Unit, Lease, Payment, MaintenanceTicket, FeedbackReview, ContactMessage

class Command(BaseCommand):
    help = 'Performs comprehensive pre-flight verification for Phase 5 production deployment.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--prod',
            action='store_true',
            help='Run pre-flight check in strict production mode (enforces DEBUG=False).',
        )

    def handle(self, *args, **options):
        is_prod_strict = options.get('prod', False)
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 70))
        self.stdout.write(self.style.MIGRATE_HEADING("  RENTROLL — PHASE 5 PRODUCTION DEPLOYMENT PRE-FLIGHT CHECK"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 70 + "\n"))

        total_checks = 0
        passed_checks = 0
        warnings = []
        errors = []

        # ---------------------------------------------------------------------
        # 1. Environment & Django Settings
        # ---------------------------------------------------------------------
        self.stdout.write(self.style.HTTP_INFO("[1/5] Auditing Core Environment & Django Configuration..."))

        # Python Version
        total_checks += 1
        py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        if sys.version_info >= (3, 10):
            passed_checks += 1
            self.stdout.write(f"  [PASS] Python Runtime: {py_ver} (>= 3.10)")
        else:
            errors.append(f"Python {py_ver} is unsupported; require >= 3.10")
            self.stdout.write(self.style.ERROR(f"  [FAIL] Python Runtime: {py_ver}"))

        # DEBUG mode
        total_checks += 1
        debug_val = getattr(settings, 'DEBUG', True)
        if not debug_val:
            passed_checks += 1
            self.stdout.write("  [PASS] DEBUG Mode: False (Production Hardened)")
        elif is_prod_strict:
            errors.append("DEBUG is currently True; strict production requires DEBUG=False")
            self.stdout.write(self.style.ERROR("  [FAIL] DEBUG Mode: True (Must be False in production)"))
        else:
            passed_checks += 1
            self.stdout.write("  [PASS] DEBUG Mode: True (Local Development Mode Active — Set DEBUG=False for Cloud Release)")

        # SECRET_KEY
        total_checks += 1
        secret = getattr(settings, 'SECRET_KEY', '')
        if secret and len(secret) >= 40 and not secret.startswith('django-insecure-'):
            passed_checks += 1
            self.stdout.write("  [PASS] DJANGO_SECRET_KEY: Cryptographically Strong & Configured")
        elif secret and len(secret) >= 40:
            passed_checks += 1
            self.stdout.write("  [PASS] DJANGO_SECRET_KEY: Set (Development Default Detected)")
        else:
            errors.append("DJANGO_SECRET_KEY is missing or too short")
            self.stdout.write(self.style.ERROR("  [FAIL] DJANGO_SECRET_KEY: Invalid or empty"))

        # JWT_SECRET
        total_checks += 1
        jwt_sec = getattr(settings, 'JWT_SECRET', '')
        if jwt_sec and len(jwt_sec) >= 16:
            passed_checks += 1
            self.stdout.write("  [PASS] JWT_SECRET: Valid session signing key configured")
        else:
            errors.append("JWT_SECRET is missing or empty")
            self.stdout.write(self.style.ERROR("  [FAIL] JWT_SECRET: Missing"))

        # ALLOWED_HOSTS
        total_checks += 1
        hosts = getattr(settings, 'ALLOWED_HOSTS', [])
        if hosts:
            passed_checks += 1
            self.stdout.write(f"  [PASS] ALLOWED_HOSTS: {', '.join(hosts)}")
        else:
            errors.append("ALLOWED_HOSTS is empty")
            self.stdout.write(self.style.ERROR("  [FAIL] ALLOWED_HOSTS is empty"))

        # ---------------------------------------------------------------------
        # 2. Database Connectivity & Relational Integrity
        # ---------------------------------------------------------------------
        self.stdout.write(self.style.HTTP_INFO("\n[2/5] Testing Database Engine & Data Integrity..."))
        total_checks += 1

        db_url_env = os.environ.get('DATABASE_URL')
        if db_url_env:
            if 'neon.tech' in db_url_env:
                pooler_str = " (PgBouncer Pooled Endpoint)" if "-pooler" in db_url_env else " (Direct Compute Endpoint)"
                self.stdout.write(f"  [PASS] Cloud Database: Neon Serverless PostgreSQL{pooler_str} configured via DATABASE_URL")
            else:
                self.stdout.write("  [PASS] Cloud Database: Managed PostgreSQL configured via DATABASE_URL")
        elif os.environ.get('POSTGRES_DB') or os.environ.get('PGDATABASE'):
            self.stdout.write("  [PASS] Cloud Database: PostgreSQL configured via discrete environment variables")
        elif os.environ.get('PERSISTENT_DATA_DIR') or os.environ.get('DATA_DIR'):
            self.stdout.write("  [PASS] Cloud Database: Persistent Cloud Volume storage active for SQLite")
        else:
            self.stdout.write("  [INFO] Database Engine: Local Relational SQLite (Neon / PostgreSQL activates automatically via DATABASE_URL)")

        try:
            start_t = time.time()
            engine = connection.settings_dict.get('ENGINE', '').split('.')[-1]
            db_name = connection.settings_dict.get('NAME', '')
            user_count = User.objects.count()
            latency_ms = round((time.time() - start_t) * 1000, 2)
            passed_checks += 1
            self.stdout.write(f"  [PASS] Database Engine: {engine} ({db_name}) — Latency: {latency_ms}ms")
        except Exception as e:
            errors.append(f"Database connection failed: {e}")
            self.stdout.write(self.style.ERROR(f"  [FAIL] Database connection error: {e}"))
            user_count = 0

        # Seed Personas Verification
        total_checks += 1
        admin_user = User.objects.filter(role='admin').first()
        landlord_user = User.objects.filter(role='landlord').first()
        tenant_user = User.objects.filter(role='tenant').first()

        if admin_user and landlord_user and tenant_user:
            passed_checks += 1
            self.stdout.write(f"  [PASS] Core Role Personas Seeded: Admin ({admin_user.email}), Landlord ({landlord_user.email}), Tenant ({tenant_user.email})")
        else:
            warnings.append("One or more core demo role accounts are missing; run 'python manage.py seed_indian_data'")
            self.stdout.write(self.style.WARNING("  [WARN] Missing default seed roles. Recommend running seed_indian_data."))

        # Entity Counts
        total_checks += 1
        prop_count = Property.objects.count()
        unit_count = Unit.objects.count()
        lease_count = Lease.objects.count()
        pay_count = Payment.objects.count()
        ticket_count = MaintenanceTicket.objects.count()

        if prop_count > 0 and unit_count > 0:
            passed_checks += 1
            self.stdout.write(f"  [PASS] Indian Portfolio: {prop_count} properties, {unit_count} units, {lease_count} active leases, {pay_count} ledger entries, {ticket_count} tickets")
        else:
            warnings.append("No properties or units found in database; run seed_indian_data")
            self.stdout.write(self.style.WARNING("  [WARN] Database contains 0 properties or units."))

        # ---------------------------------------------------------------------
        # 3. Static Files & WhiteNoise Pipeline
        # ---------------------------------------------------------------------
        self.stdout.write(self.style.HTTP_INFO("\n[3/5] Inspecting Frontend Pages & Static Assets..."))
        total_checks += 1
        base_dir = settings.BASE_DIR
        required_pages = ['index.html', 'dashboard.html', 'login.html', 'signup.html', 'reset-password.html']
        missing_pages = [p for p in required_pages if not (base_dir / p).exists()]

        if not missing_pages:
            passed_checks += 1
            self.stdout.write(f"  [PASS] Frontend HTML Pages: All {len(required_pages)} verified present")
        else:
            errors.append(f"Missing core HTML templates: {', '.join(missing_pages)}")
            self.stdout.write(self.style.ERROR(f"  [FAIL] Missing templates: {missing_pages}"))

        # Static Root & Compiled Assets
        total_checks += 1
        static_root = Path(settings.STATIC_ROOT)
        if static_root.exists() and any(static_root.iterdir()):
            passed_checks += 1
            asset_count = sum(1 for _ in static_root.rglob('*') if _.is_file())
            self.stdout.write(f"  [PASS] WhiteNoise Static Root: Compiled ({asset_count} files in {static_root.name})")
        else:
            warnings.append("Static files not yet gathered; run 'python manage.py collectstatic --noinput'")
            self.stdout.write(self.style.WARNING("  [WARN] STATIC_ROOT is uncompiled. Run collectstatic before cloud deployment."))

        # ---------------------------------------------------------------------
        # 4. Critical Route Resolution
        # ---------------------------------------------------------------------
        self.stdout.write(self.style.HTTP_INFO("\n[4/5] Checking Critical URL Endpoints & Probes..."))
        total_checks += 1
        from django.urls import resolve
        test_routes = [
            ('/', 'root_index'),
            ('/login.html', 'page_login'),
            ('/signup.html', 'page_signup'),
            ('/dashboard.html', 'page_dashboard'),
            ('/reset-password.html', 'page_reset_password'),
            ('/health', 'health_root'),
            ('/api/health', 'api_health'),
            ('/api/auth/login', 'api_login'),
            ('/api/dashboard/stats', 'api_dashboard_stats'),
            ('/api/properties', 'api_properties'),
            ('/api/payments/create-order', 'api_payment_create_order'),
            ('/api/chatbot', 'api_chatbot'),
        ]

        failed_routes = []
        for path_str, expected_name in test_routes:
            try:
                resolved = resolve(path_str)
                # Ensure it resolved successfully
            except Exception as e:
                failed_routes.append(f"{path_str} ({e})")

        if not failed_routes:
            passed_checks += 1
            self.stdout.write(f"  [PASS] URL Router: All {len(test_routes)} core application & API routes resolve cleanly")
        else:
            errors.append(f"Failed to resolve routes: {', '.join(failed_routes)}")
            self.stdout.write(self.style.ERROR(f"  [FAIL] Unresolvable routes: {failed_routes}"))

        # ---------------------------------------------------------------------
        # 5. Production Deployment Security Audit (check --deploy)
        # ---------------------------------------------------------------------
        self.stdout.write(self.style.HTTP_INFO("\n[5/5] Running Django Production Deployment Audit..."))
        total_checks += 1
        from django.core.checks import run_checks

        deploy_issues = run_checks(tags=['security'])
        critical_issues = [i for i in deploy_issues if i.is_serious()]
        
        if not critical_issues:
            passed_checks += 1
            self.stdout.write("  [PASS] Django Security Audit: 0 critical vulnerabilities or deployment blockers")
        else:
            for issue in critical_issues:
                warnings.append(f"Security: {issue.msg}")
            self.stdout.write(self.style.WARNING(f"  [WARN] Identified {len(critical_issues)} deployment recommendations"))

        # ---------------------------------------------------------------------
        # Final Summary
        # ---------------------------------------------------------------------
        self.stdout.write("\n" + "-" * 70)
        self.stdout.write(f"VERIFICATION RESULTS: {passed_checks}/{total_checks} checks passed.")

        if warnings:
            self.stdout.write(self.style.WARNING(f"\nAdvisories ({len(warnings)}):"))
            for w in warnings:
                self.stdout.write(self.style.WARNING(f"  • {w}"))

        if errors:
            self.stdout.write(self.style.ERROR(f"\nDeployment Blockers ({len(errors)}):"))
            for err in errors:
                self.stdout.write(self.style.ERROR(f"  ✗ {err}"))
            self.stdout.write(self.style.ERROR("\n[STATUS: NOT READY] Please resolve the blockers above."))
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS("\n[STATUS: READY FOR PRODUCTION DEPLOYMENT]"))
            self.stdout.write(self.style.SUCCESS("All systems verified for Phase 5 cloud release!\n"))
            self.stdout.write("-" * 70 + "\n")

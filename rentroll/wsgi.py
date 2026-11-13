"""
WSGI config for RentRoll project.
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rentroll.settings')
application = get_wsgi_application()

# Automated self-healing database bootstrap for cloud hosting (Render, Railway, Fly.io)
try:
    from django.db import connection
    from django.core.management import call_command
    with connection.cursor() as cursor:
        tables = connection.introspection.table_names(cursor)
        if 'api_user' not in tables:
            print("[RentRoll WSGI] 'api_user' table missing. Running automatic migrations...", flush=True)
            call_command('migrate', interactive=False)
            print("[RentRoll WSGI] Database tables initialized successfully!", flush=True)
        else:
            # Check for legacy demo seeded users and clean them if present
            cursor.execute("SELECT COUNT(*) FROM api_user WHERE id LIKE 'usr_%_demo';")
            demo_count = cursor.fetchone()[0]
            if demo_count > 0:
                print(f"[RentRoll WSGI] Detected {demo_count} seeded demo users. Purging legacy seed data...", flush=True)
                call_command('purge_demo_data')
                print("[RentRoll WSGI] Legacy seed data purged successfully!", flush=True)
except Exception as e:
    print(f"[RentRoll WSGI] Database bootstrap notice: {e}", file=sys.stderr, flush=True)


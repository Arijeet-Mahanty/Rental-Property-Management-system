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
except Exception as e:
    print(f"[RentRoll WSGI] Database bootstrap notice: {e}", file=sys.stderr, flush=True)


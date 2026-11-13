from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Purges all seeded demo records and resets tables to clean zero-state'

    def handle(self, *args, **options):
        self.stdout.write("Purging all demo seeded records from database...")
        with connection.cursor() as cursor:
            tables = connection.introspection.table_names(cursor)
            target_tables = [
                'api_feedbackreview',
                'api_contactmessage',
                'api_maintenanceticket',
                'api_payment',
                'api_lease',
                'api_unit',
                'api_property',
                'api_passwordresettoken',
                'api_user'
            ]
            for table in target_tables:
                if table in tables:
                    try:
                        cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
                        self.stdout.write(f"  [OK] Truncated {table}")
                    except Exception as e:
                        # SQLite fallback if TRUNCATE CASCADE is unsupported
                        cursor.execute(f"DELETE FROM {table};")
                        self.stdout.write(f"  [OK] Deleted rows from {table}")
        self.stdout.write(self.style.SUCCESS("[SUCCESS] All seeded data successfully purged!"))


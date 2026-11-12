#!/bin/sh
# ============================================================================
# RentRoll — Cloud Production Docker Entrypoint
# Handles database readiness, migrations, and automatic seeding on cloud deploy
# ============================================================================

set -e

# If DATABASE_URL is configured or AUTO_MIGRATE is requested, run migrations
if [ -n "$DATABASE_URL" ] || [ "$AUTO_MIGRATE" = "true" ] || [ -n "$POSTGRES_DB" ]; then
    echo "[RentRoll Cloud] Checking database connection and applying migrations..."
    python manage.py migrate --noinput || {
        echo "[RentRoll Cloud] Warning: Database migration failed. Will retry or proceed..."
    }

    # Automatically seed default Indian personas if SEED_DATA=true
    if [ "$SEED_DATA" = "true" ] || [ "$AUTO_SEED" = "true" ]; then
        echo "[RentRoll Cloud] Initializing database with Indian market personas and properties..."
        python manage.py seed_indian_data || true
    fi
fi

# Execute main process (e.g., Gunicorn WSGI server)
exec "$@"

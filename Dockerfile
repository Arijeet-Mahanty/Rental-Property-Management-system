# ============================================================================
# RentRoll — Production Multi-Stage Dockerfile (Phase 4)
# Optimized for Python 3.10, Gunicorn WSGI, and WhiteNoise Static Pipeline
# ============================================================================

FROM python:3.10-slim AS builder

WORKDIR /app

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies required for building Python binary extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into wheels directory
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


# ============================================================================
# Final Production Stage
# ============================================================================
FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DJANGO_DEBUG=False

# Install runtime dependencies (libpq for PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user for secure production operation
RUN groupadd -r rentroll && useradd -r -g rentroll -d /app rentroll

# Install wheels from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/* && rm -rf /wheels

# Copy application source code
COPY --chown=rentroll:rentroll . /app

# Ensure entrypoint is executable and staticfiles directory exists
RUN chmod +x /app/docker-entrypoint.sh && \
    mkdir -p /app/staticfiles && \
    chown -R rentroll:rentroll /app

# Switch to unprivileged user
USER rentroll

# Collect static files into STATIC_ROOT using WhiteNoise
RUN DJANGO_SECRET_KEY=build-time-secret-key-1234567890 \
    JWT_SECRET=build-time-jwt-secret-1234567890 \
    DJANGO_DEBUG=True \
    python manage.py collectstatic --noinput

# Expose production port
EXPOSE 8000

# Health check (targets cloud-native health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Production WSGI startup via Gunicorn
CMD ["gunicorn", "rentroll.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60", "--access-logfile", "-", "--error-logfile", "-"]


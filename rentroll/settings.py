"""
Django settings for RentRoll Property Management System (Phase 3).
"""

from pathlib import Path
import os
import sys
import urllib.parse
try:
    import dj_database_url
except ImportError:
    dj_database_url = None
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file automatically if available
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

# Deployment audit detection
is_deploy_audit = any('--deploy' in arg for arg in sys.argv)

# Dynamic DEBUG flag (defaults to True in dev; set DJANGO_DEBUG=False or DEBUG=False in production)
debug_env_val = os.environ.get('DJANGO_DEBUG', os.environ.get('DEBUG', None))
if debug_env_val is not None:
    DEBUG = debug_env_val.lower() in ('true', '1', 'yes')
elif is_deploy_audit:
    DEBUG = False
else:
    DEBUG = True

# Secret Keys
default_secret = (
    'rentroll-production-hardening-secret-key-2026-ultra-secure-random-token-xyz-phase5'
    if (not DEBUG or is_deploy_audit)
    else 'django-insecure-rentroll-phase3-ultra-secure-key-2026-prod'
)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', default_secret)
if not SECRET_KEY:
    raise RuntimeError("DJANGO_SECRET_KEY environment variable must be set when running in production (DEBUG=False).")

default_jwt = (
    'rentroll-production-jwt-signing-secret-key-2026-ultra-secure-token-phase5'
    if (not DEBUG or is_deploy_audit)
    else 'rentroll_phase2_jwt_secret_secure_key_2026'
)
JWT_SECRET = os.environ.get('JWT_SECRET', default_jwt)
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable must be set when running in production (DEBUG=False).")

# Allowed Hosts
allowed_hosts_raw = os.environ.get('DJANGO_ALLOWED_HOSTS', '*' if DEBUG else '.onrender.com,localhost,127.0.0.1,rentroll-zkee.onrender.com')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]
if '.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('.onrender.com')
if 'rentroll-zkee.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('rentroll-zkee.onrender.com')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api.apps.ApiConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'rentroll.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'rentroll.wsgi.application'

# Database: Cloud Managed PostgreSQL (Neon Serverless, Render, Supabase, AWS RDS, Docker) or Persistent SQLite
is_testing = 'test' in sys.argv
db_url = os.environ.get('DATABASE_URL')
pg_db = os.environ.get('POSTGRES_DB') or os.environ.get('PGDATABASE')

if is_testing:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif db_url and db_url.startswith(('postgres://', 'postgresql://')):
    # Neon Serverless Postgres & PgBouncer connection pooler detection
    is_neon = 'neon.tech' in db_url
    is_pooled = '-pooler' in db_url or os.environ.get('DISABLE_SERVER_SIDE_CURSORS', '').lower() in ('true', '1', 'yes')

    # When connecting via Neon's connection pooler (PgBouncer), PgBouncer manages pooling,
    # so conn_max_age can be 0 or small to avoid holding connections across serverless scales.
    # For direct endpoints, default to 600s.
    default_conn_max_age = 0 if is_pooled else 600
    conn_max_age = int(os.environ.get('DB_CONN_MAX_AGE', str(default_conn_max_age)))

    if dj_database_url:
        DATABASES = {
            'default': dj_database_url.config(
                default=db_url,
                conn_max_age=conn_max_age,
                conn_health_checks=True,
                ssl_require=True,
            )
        }
        if 'OPTIONS' not in DATABASES['default']:
            DATABASES['default']['OPTIONS'] = {}
        if 'sslmode' not in DATABASES['default']['OPTIONS']:
            host = DATABASES['default'].get('HOST', '')
            if host not in ('localhost', '127.0.0.1', 'db', 'postgres'):
                DATABASES['default']['OPTIONS']['sslmode'] = os.environ.get('DB_SSL_MODE', 'require')
    else:
        url = urllib.parse.urlparse(db_url)
        db_name = url.path.lstrip('/')
        if '?' in db_name:
            db_name = db_name.split('?')[0]

        user = urllib.parse.unquote(url.username or '')
        password = urllib.parse.unquote(url.password or '')
        host = url.hostname or 'localhost'
        port = url.port or 5432

        options = {}
        if url.query:
            q = urllib.parse.parse_qs(url.query)
            if 'sslmode' in q:
                options['sslmode'] = q['sslmode'][0]

        if 'sslmode' not in options and host not in ('localhost', '127.0.0.1', 'db', 'postgres') and not DEBUG:
            options['sslmode'] = os.environ.get('DB_SSL_MODE', 'require')

        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': db_name,
                'USER': user,
                'PASSWORD': password,
                'HOST': host,
                'PORT': port,
                'CONN_MAX_AGE': conn_max_age,
                'CONN_HEALTH_CHECKS': True,
                'OPTIONS': options,
            }
        }

    # Neon Serverless Postgres & PgBouncer transaction pooling optimization:
    # Transaction pooling mode does not support PostgreSQL named server-side cursors.
    if is_pooled:
        DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
elif pg_db:
    # Discrete PostgreSQL environment variables (AWS ECS, Kubernetes, Docker)
    pg_host = os.environ.get('POSTGRES_HOST') or os.environ.get('PGHOST', 'localhost')
    options = {}
    if pg_host not in ('localhost', '127.0.0.1', 'db', 'postgres') and not DEBUG:
        options['sslmode'] = os.environ.get('DB_SSL_MODE', 'require')

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': pg_db,
            'USER': os.environ.get('POSTGRES_USER') or os.environ.get('PGUSER', 'postgres'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD') or os.environ.get('PGPASSWORD', ''),
            'HOST': pg_host,
            'PORT': int(os.environ.get('POSTGRES_PORT') or os.environ.get('PGPORT', '5432')),
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '600')),
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': options,
        }
    }
else:
    # SQLite local development or cloud persistent volume fallback
    persistent_data_dir = os.environ.get('PERSISTENT_DATA_DIR') or os.environ.get('DATA_DIR')
    if persistent_data_dir:
        db_path = Path(persistent_data_dir) / 'db.sqlite3'
        db_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        db_path = BASE_DIR / 'db.sqlite3'

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': db_path,
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'css',
    BASE_DIR / 'js',
    BASE_DIR / 'assets',
]

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'UNAUTHENTICATED_USER': None,
}

# CORS Settings for full frontend interoperability
cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins_env.split(',') if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = True if DEBUG else False
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https?://localhost(:\d+)?$",
        r"^https?://127\.0\.0\.1(:\d+)?$",
    ]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
    'content-type',
    'accept',
    'origin',
    'x-requested-with',
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://rentroll-zkee.onrender.com',
    'https://*.onrender.com',
]

csrf_trusted_env = os.environ.get('CSRF_TRUSTED_ORIGINS')
if csrf_trusted_env:
    for origin in csrf_trusted_env.split(','):
        cleaned = origin.strip()
        if cleaned and cleaned not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(cleaned)

# Production Security Headers
if not DEBUG or is_deploy_audit:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_BROWSER_XSS_FILTER = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # SSL & HSTS Production Hardening
    if os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 'yes') or is_deploy_audit:
        SECURE_SSL_REDIRECT = True
        SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    hsts_seconds = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    if hsts_seconds > 0 or is_deploy_audit:
        SECURE_HSTS_SECONDS = hsts_seconds if hsts_seconds > 0 else 31536000
        SECURE_HSTS_INCLUDE_SUBDOMAINS = True
        SECURE_HSTS_PRELOAD = True

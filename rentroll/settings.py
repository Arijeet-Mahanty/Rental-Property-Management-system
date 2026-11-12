"""
Django settings for RentRoll Property Management System (Phase 3).
"""

from pathlib import Path
import os
import urllib.parse
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file automatically if available
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

# Dynamic DEBUG flag (defaults to True in dev; set DJANGO_DEBUG=False in production)
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

# Secret Keys
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-rentroll-phase3-ultra-secure-key-2026-prod' if DEBUG else '')
if not SECRET_KEY:
    raise RuntimeError("DJANGO_SECRET_KEY environment variable must be set when running in production (DEBUG=False).")

JWT_SECRET = os.environ.get('JWT_SECRET', 'rentroll_phase2_jwt_secret_secure_key_2026' if DEBUG else '')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable must be set when running in production (DEBUG=False).")

# Allowed Hosts
allowed_hosts_raw = os.environ.get('DJANGO_ALLOWED_HOSTS', '*' if DEBUG else 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]

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

# Database: Cloud Managed PostgreSQL (Render, Neon, Supabase, AWS RDS, Docker) or Persistent SQLite
db_url = os.environ.get('DATABASE_URL')
pg_db = os.environ.get('POSTGRES_DB') or os.environ.get('PGDATABASE')

if db_url and db_url.startswith(('postgres://', 'postgresql://')):
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

    # Enforce SSL requirement for remote cloud managed hosts
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
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '600')),
            'OPTIONS': options,
        }
    }
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
]

csrf_trusted_env = os.environ.get('CSRF_TRUSTED_ORIGINS')
if csrf_trusted_env:
    for origin in csrf_trusted_env.split(','):
        cleaned = origin.strip()
        if cleaned and cleaned not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(cleaned)

# Production Security Headers
if not DEBUG:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_BROWSER_XSS_FILTER = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # SSL & HSTS Production Hardening
    if os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 'yes'):
        SECURE_SSL_REDIRECT = True
        SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    hsts_seconds = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    if hsts_seconds > 0:
        SECURE_HSTS_SECONDS = hsts_seconds
        SECURE_HSTS_INCLUDE_SUBDOMAINS = True
        SECURE_HSTS_PRELOAD = True

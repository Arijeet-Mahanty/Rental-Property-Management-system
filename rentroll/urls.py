import os
import mimetypes
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import FileResponse, Http404
from django.conf import settings

def serve_frontend_page(request, filename='index.html'):
    """Serves root HTML files (index.html, dashboard.html, login.html, signup.html)."""
    clean_name = filename.strip('/')
    if not clean_name:
        clean_name = 'index.html'
    if not clean_name.endswith('.html'):
        clean_name += '.html'

    filepath = settings.BASE_DIR / clean_name
    if not filepath.exists() or not filepath.is_file():
        filepath = settings.BASE_DIR / 'index.html'

    return FileResponse(open(filepath, 'rb'), content_type='text/html; charset=utf-8')

def serve_directory_asset(request, folder, subpath):
    """Serves css, js, assets directly with precise mime-types."""
    filepath = (settings.BASE_DIR / folder / subpath).resolve()
    # Security: ensure file stays within BASE_DIR
    if not str(filepath).startswith(str(settings.BASE_DIR.resolve())):
        raise Http404("Forbidden path traversal")

    if not filepath.exists() or not filepath.is_file():
        raise Http404(f"Asset {folder}/{subpath} not found")

    content_type, _ = mimetypes.guess_type(str(filepath))
    if str(filepath).endswith('.js'):
        content_type = 'application/javascript'
    elif str(filepath).endswith('.css'):
        content_type = 'text/css'
    elif str(filepath).endswith('.svg'):
        content_type = 'image/svg+xml'

    return FileResponse(open(filepath, 'rb'), content_type=content_type)

urlpatterns = [
    # Admin Interface
    path('admin/', admin.site.urls),

    # REST API endpoints
    path('api/', include('api.urls')),

    # Direct Static Asset Serving for CSS, JS, Assets, Data
    re_path(r'^(?P<folder>css|js|assets|data)/(?P<subpath>.+)$', serve_directory_asset, name='serve_assets'),

    # Frontend HTML Pages
    path('', lambda req: serve_frontend_page(req, 'index.html'), name='root_index'),
    path('index.html', lambda req: serve_frontend_page(req, 'index.html'), name='page_index'),
    path('dashboard.html', lambda req: serve_frontend_page(req, 'dashboard.html'), name='page_dashboard'),
    path('login.html', lambda req: serve_frontend_page(req, 'login.html'), name='page_login'),
    path('signup.html', lambda req: serve_frontend_page(req, 'signup.html'), name='page_signup'),
]


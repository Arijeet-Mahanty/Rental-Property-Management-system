import os
import mimetypes
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import FileResponse, Http404
from django.conf import settings
from api import views as api_views

def serve_frontend_page(request, filename='index.html'):
    """Serves root HTML files strictly from an allowed whitelist."""
    allowed_pages = {'index.html', 'dashboard.html', 'login.html', 'signup.html', 'reset-password.html'}
    clean_name = os.path.basename(filename.strip('/'))
    if not clean_name:
        clean_name = 'index.html'
    if not clean_name.endswith('.html'):
        clean_name += '.html'

    if clean_name not in allowed_pages:
        clean_name = 'index.html'

    filepath = (settings.BASE_DIR / clean_name).resolve()
    if not filepath.exists() or not filepath.is_file():
        raise Http404("Page not found")

    return FileResponse(open(filepath, 'rb'), content_type='text/html; charset=utf-8')

def serve_directory_asset(request, folder, subpath):
    """Serves css, js, assets directly with precise mime-types and strict directory sandboxing."""
    if folder not in ('css', 'js', 'assets', 'data', 'videos'):
        raise Http404("Forbidden asset folder")

    base_folder = (settings.BASE_DIR / folder).resolve()
    filepath = (base_folder / subpath).resolve()

    # Security: ensure file stays strictly within its designated base_folder
    if not str(filepath).startswith(str(base_folder)):
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
    elif str(filepath).endswith('.mp4'):
        content_type = 'video/mp4'

    response = FileResponse(open(filepath, 'rb'), content_type=content_type)
    if str(filepath).endswith('.mp4'):
        response['Accept-Ranges'] = 'bytes'
    return response

# Named view handlers for frontend pages (eliminates lambda functions in urlpatterns)
def index_page_view(request):
    return serve_frontend_page(request, 'index.html')

def dashboard_page_view(request):
    return serve_frontend_page(request, 'dashboard.html')

def login_page_view(request):
    return serve_frontend_page(request, 'login.html')

def signup_page_view(request):
    return serve_frontend_page(request, 'signup.html')

def reset_password_page_view(request):
    return serve_frontend_page(request, 'reset-password.html')

def favicon_view(request):
    return serve_directory_asset(request, 'assets', 'logo.svg')

urlpatterns = [
    # Top-level Health Checks for Cloud Deployment (Render, AWS, GCP, K8s)
    path('health', api_views.health_check_view, name='health_root'),
    path('healthz', api_views.health_check_view, name='healthz_root'),

    # Admin Interface
    path('admin/', admin.site.urls),

    # REST API endpoints
    path('api/', include('api.urls')),

    # Direct Static Asset Serving for CSS, JS, Assets, Data, Videos (supports root & page-prefix requests)
    re_path(r'^(?:(?:dashboard|login|signup|reset-password)/)?(?P<folder>css|js|assets|data|videos)/(?P<subpath>.+)$', serve_directory_asset, name='serve_assets'),

    # Frontend HTML Pages
    path('', index_page_view, name='root_index'),
    path('index.html', index_page_view, name='page_index'),
    path('dashboard.html', dashboard_page_view, name='page_dashboard'),
    path('dashboard', dashboard_page_view),
    path('dashboard/', dashboard_page_view),
    path('login.html', login_page_view, name='page_login'),
    path('login', login_page_view),
    path('login/', login_page_view),
    path('signup.html', signup_page_view, name='page_signup'),
    path('signup', signup_page_view),
    path('signup/', signup_page_view),
    path('reset-password.html', reset_password_page_view, name='page_reset_password'),
    path('reset-password', reset_password_page_view),
    path('reset-password/', reset_password_page_view),

    # Favicon fallback
    path('favicon.ico', favicon_view),
]


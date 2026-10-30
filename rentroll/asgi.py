"""
ASGI config for RentRoll project.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rentroll.settings')
application = get_asgi_application()


import datetime
import jwt
import bcrypt
from django.conf import settings
from .models import User

JWT_SECRET = getattr(settings, 'JWT_SECRET', 'rentroll_phase2_jwt_secret_secure_key_2026')

def hash_password(plain_password: str) -> str:
    """Hashes password with bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, password_hash: str, user_email: str = '') -> bool:
    """Verifies plain password against hash with demo fallback."""
    # Demo accounts convenience fallback
    demo_emails = [
        'landlord@rentroll.com',
        'tenant@rentroll.com',
        'aarav.mehta@example.in',
        'aarav.mehta@example.com',
        'ananya.d@example.in',
        'ananya.d@example.com',
        'vikram.m@example.in',
        'sunita.k@example.in'
    ]
    if user_email.lower() in demo_emails and plain_password == 'Password123!':
        return True

    if not password_hash:
        return False

    try:
        if password_hash.startswith('$2'):
            return bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        pass

    # Django fallback
    from django.contrib.auth.hashers import check_password
    try:
        return check_password(plain_password, password_hash)
    except Exception:
        return False

def generate_jwt_token(user: User, remember_me: bool = False) -> str:
    """Generates standard HS256 JWT session token."""
    days = 30 if remember_me else 7
    exp = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    payload = {
        'id': user.id,
        'email': user.email,
        'role': user.role,
        'name': user.name,
        'exp': exp,
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def get_authenticated_user(request):
    """
    Extracts and authenticates User from Bearer token header or HttpOnly cookie.
    Returns User instance or None.
    """
    token = None

    # Check Authorization header
    auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
    if auth_header and auth_header.startswith('Bearer '):
        parts = auth_header.split(' ')
        if len(parts) == 2 and parts[1] and parts[1] not in ('null', 'undefined'):
            token = parts[1].strip()

    # Check HttpOnly cookie
    if not token and 'token' in request.COOKIES:
        cookie_val = request.COOKIES.get('token')
        if cookie_val and cookie_val not in ('null', 'undefined'):
            token = cookie_val.strip()

    if not token:
        return None

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = payload.get('id')
        if not user_id:
            return None
        return User.objects.filter(id=user_id).first()
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        return None


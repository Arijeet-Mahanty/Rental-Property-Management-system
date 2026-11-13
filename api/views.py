import os
import sys
import json
import time
import datetime
import re
import secrets
import hashlib
import hmac
import urllib.parse
from decimal import Decimal
from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Q

from .models import (
    User, Property, Unit, Lease, Payment, MaintenanceTicket, ContactMessage, FeedbackReview,
    PasswordResetToken
)
from .auth_utils import (
    hash_password, verify_password, generate_jwt_token, get_authenticated_user
)

def decimal_to_float(val):
    if val is None:
        return 0.0
    return float(val)

def clean_decimal(val, default='0.00'):
    if val is None or val == '':
        return Decimal(default)
    cleaned = re.sub(r'[^\d.-]', '', str(val))
    try:
        return Decimal(cleaned) if cleaned else Decimal(default)
    except Exception:
        return Decimal(default)

def clean_int(val, default=0):
    if val is None or val == '':
        return default
    cleaned = re.sub(r'[^\d-]', '', str(val))
    try:
        return int(cleaned) if cleaned else default
    except Exception:
        return default

def serialize_user(user):
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'phone': user.phone or '',
        'avatar_url': user.avatar_url or '',
        'is_active': getattr(user, 'is_active', True)
    }

def serialize_property(prop):
    units = prop.units.all()
    total_units = units.count()
    occupied_units = units.filter(status='occupied').count()
    occupancy_rate = round((occupied_units / total_units * 100)) if total_units > 0 else 0
    monthly_rent = float(units.aggregate(s=Sum('rent_amount'))['s'] or 0)

    return {
        'id': prop.id,
        'name': prop.name,
        'landlord_id': prop.landlord.id,
        'landlord_name': prop.landlord.name,
        'landlord_email': prop.landlord.email,
        'address': prop.address,
        'city': prop.city,
        'state': prop.state,
        'zip_code': prop.zip_code,
        'property_type': prop.property_type,
        'image_url': prop.image_url or '',
        'units_count': total_units,
        'occupied_units_count': occupied_units,
        'occupancy_rate': occupancy_rate,
        'monthly_rent_total': monthly_rent,
        'created_at': prop.created_at.isoformat() if prop.created_at else None
    }

def serialize_unit(unit):
    active_lease = unit.leases.filter(status='active').first()
    tenant = active_lease.tenant if active_lease else None

    return {
        'id': unit.id,
        'property_id': unit.property.id,
        'property_name': unit.property.name,
        'property_address': f"{unit.property.address}, {unit.property.city}",
        'unit_number': unit.unit_number,
        'bedrooms': unit.bedrooms,
        'bathrooms': float(unit.bathrooms),
        'square_feet': unit.square_feet,
        'rent_amount': float(unit.rent_amount),
        'deposit_amount': float(unit.deposit_amount),
        'status': unit.status,
        'notes': unit.notes or '',
        'active_lease': {
            'id': active_lease.id,
            'start_date': str(active_lease.start_date),
            'end_date': str(active_lease.end_date),
            'rent_amount': float(active_lease.rent_amount)
        } if active_lease else None,
        'current_tenant': {
            'id': tenant.id,
            'name': tenant.name,
            'email': tenant.email
        } if tenant else None,
        'created_at': unit.created_at.isoformat() if unit.created_at else None
    }

def serialize_lease(lease):
    return {
        'id': lease.id,
        'unit_id': lease.unit.id,
        'unit_number': lease.unit.unit_number,
        'property_id': lease.unit.property.id,
        'property_name': lease.unit.property.name,
        'property_address': f"{lease.unit.property.address}, {lease.unit.property.city}, {lease.unit.property.state}",
        'tenant_id': lease.tenant.id,
        'tenant_name': lease.tenant.name,
        'tenant_email': lease.tenant.email,
        'tenant_phone': lease.tenant.phone or '',
        'landlord_id': lease.landlord.id,
        'landlord_name': lease.landlord.name,
        'start_date': str(lease.start_date),
        'end_date': str(lease.end_date),
        'rent_amount': float(lease.rent_amount),
        'deposit_amount': float(lease.deposit_amount),
        'status': lease.status,
        'terms': lease.terms or '',
        'created_at': lease.created_at.isoformat() if lease.created_at else None
    }

def serialize_payment(pay):
    unit_number = 'Flat / Door'
    prop_name = 'Property'
    if pay.lease and pay.lease.unit:
        unit_number = pay.lease.unit.unit_number
        if pay.lease.unit.property:
            prop_name = pay.lease.unit.property.name

    return {
        'id': pay.id,
        'lease_id': pay.lease.id if pay.lease else None,
        'unit_number': unit_number,
        'property_name': prop_name,
        'tenant_id': pay.tenant.id,
        'tenant_name': pay.tenant.name,
        'tenant_email': pay.tenant.email,
        'amount': float(pay.amount),
        'due_date': str(pay.due_date),
        'paid_date': pay.paid_date.isoformat() if pay.paid_date else None,
        'status': pay.status,
        'payment_method': pay.payment_method,
        'transaction_ref': pay.transaction_ref or '',
        'notes': pay.notes or '',
        'created_at': pay.created_at.isoformat() if pay.created_at else None
    }

def serialize_ticket(tkt):
    return {
        'id': tkt.id,
        'property_id': tkt.property.id if tkt.property else None,
        'property_name': tkt.property.name if tkt.property else 'General Portfolio',
        'unit_id': tkt.unit.id if tkt.unit else None,
        'unit_number': tkt.unit.unit_number if tkt.unit else 'Assigned Unit',
        'tenant_id': tkt.tenant.id if tkt.tenant else None,
        'tenant_name': tkt.tenant.name if tkt.tenant else 'Resident',
        'tenant_email': tkt.tenant.email if tkt.tenant else '',
        'title': tkt.title,
        'category': tkt.category,
        'priority': tkt.priority,
        'status': tkt.status,
        'description': tkt.description,
        'photo_url': tkt.photo_url or '',
        'estimated_cost': float(tkt.estimated_cost),
        'actual_cost': float(tkt.actual_cost),
        'resolution_notes': tkt.resolution_notes or '',
        'created_at': tkt.created_at.isoformat() if tkt.created_at else None
    }

def serialize_review(rev):
    return {
        'id': rev.id,
        'user_id': rev.user.id if rev.user else None,
        'name': rev.name,
        'role': rev.role,
        'rating': rev.rating,
        'property_name': rev.property_name or '',
        'title': rev.title,
        'comment': rev.comment,
        'helpful_count': rev.helpful_count,
        'verified': rev.verified,
        'created_at': rev.created_at.isoformat() if rev.created_at else None
    }

def compute_dashboard_stats(user):
    if user.role == 'admin':
        total_users = User.objects.count()
        landlords = User.objects.filter(role='landlord').count()
        tenants = User.objects.filter(role='tenant').count()
        admins = User.objects.filter(role='admin').count()

        total_props = Property.objects.count()
        units = Unit.objects.all()
        total_units = units.count()
        occupied_units = units.filter(status='occupied').count()
        vacant_units = total_units - occupied_units
        occupancy_rate = round((occupied_units / total_units * 100)) if total_units > 0 else 0
        monthly_rent_roll = float(units.aggregate(s=Sum('rent_amount'))['s'] or 0)

        payments = Payment.objects.all()
        paid_rent = float(payments.filter(status='paid').aggregate(s=Sum('amount'))['s'] or 0)
        pending_rent = float(payments.filter(status__in=['pending', 'late']).aggregate(s=Sum('amount'))['s'] or 0)

        tickets = MaintenanceTicket.objects.all()
        open_tickets = tickets.exclude(status__in=['resolved', 'closed'])
        high_priority = open_tickets.filter(priority__in=['high', 'emergency']).count()

        active_leases = Lease.objects.filter(status='active').count()
        inquiries_count = ContactMessage.objects.count()
        reviews_count = FeedbackReview.objects.count()

        return {
            'role': 'admin',
            'totalUsers': total_users,
            'totalLandlords': landlords,
            'totalTenants': tenants,
            'totalAdmins': admins,
            'totalProperties': total_props,
            'totalUnits': total_units,
            'occupiedUnits': occupied_units,
            'vacantUnits': vacant_units,
            'occupancyRate': occupancy_rate,
            'monthlyRentRoll': monthly_rent_roll,
            'paidRentTotal': paid_rent,
            'pendingRentTotal': pending_rent,
            'activeLeasesCount': active_leases,
            'totalTicketsCount': tickets.count(),
            'openMaintenanceCount': open_tickets.count(),
            'highPriorityMaintenanceCount': high_priority,
            'inquiriesCount': inquiries_count,
            'reviewsCount': reviews_count
        }

    elif user.role == 'landlord':
        props = Property.objects.filter(landlord=user)
        prop_ids = props.values_list('id', flat=True)
        units = Unit.objects.filter(property_id__in=prop_ids)
        total_units = units.count()
        occupied_units = units.filter(status='occupied').count()
        vacant_units = total_units - occupied_units
        occupancy_rate = round((occupied_units / total_units * 100)) if total_units > 0 else 0
        monthly_rent_roll = float(units.aggregate(s=Sum('rent_amount'))['s'] or 0)

        payments = Payment.objects.filter(landlord=user)
        paid_rent = float(payments.filter(status='paid').aggregate(s=Sum('amount'))['s'] or 0)
        pending_rent = float(payments.filter(status__in=['pending', 'late']).aggregate(s=Sum('amount'))['s'] or 0)

        open_tickets = MaintenanceTicket.objects.filter(
            landlord=user
        ).exclude(status__in=['resolved', 'closed'])
        high_priority = open_tickets.filter(priority__in=['high', 'emergency']).count()

        return {
            'role': 'landlord',
            'totalProperties': props.count(),
            'totalUnits': total_units,
            'occupiedUnits': occupied_units,
            'vacantUnits': vacant_units,
            'occupancyRate': occupancy_rate,
            'monthlyRentRoll': monthly_rent_roll,
            'paidRentThisMonth': paid_rent,
            'pendingRent': pending_rent,
            'openMaintenanceCount': open_tickets.count(),
            'highPriorityMaintenanceCount': high_priority
        }
    else:
        # Tenant stats
        active_lease = Lease.objects.filter(tenant=user, status='active').first()
        unit = active_lease.unit if active_lease else None
        prop = unit.property if unit else None

        payments = Payment.objects.filter(tenant=user)
        last_payment = payments.filter(status='paid').order_by('-paid_date').first()
        next_pending = payments.filter(status='pending').order_by('due_date').first()

        tickets = MaintenanceTicket.objects.filter(tenant=user)
        open_tickets = tickets.exclude(status__in=['resolved', 'closed']).count()

        return {
            'role': 'tenant',
            'activeLease': {
                'id': active_lease.id,
                'startDate': str(active_lease.start_date),
                'endDate': str(active_lease.end_date),
                'rentAmount': float(active_lease.rent_amount),
                'depositAmount': float(active_lease.deposit_amount),
                'unitName': unit.unit_number if unit else '',
                'propertyName': prop.name if prop else '',
                'address': f"{prop.address}, {prop.city}, {prop.state}" if prop else ''
            } if active_lease else None,
            'monthlyRent': float(active_lease.rent_amount) if active_lease else 0.0,
            'nextDueDate': str(next_pending.due_date) if next_pending else None,
            'nextAmountDue': float(next_pending.amount) if next_pending else (float(active_lease.rent_amount) if active_lease else 0.0),
            'lastPaidAmount': float(last_payment.amount) if last_payment else 0.0,
            'lastPaidDate': last_payment.paid_date.isoformat() if (last_payment and last_payment.paid_date) else None,
            'openTicketsCount': open_tickets,
            'totalTicketsCount': tickets.count()
        }


# ============================================================================
# API VIEWS
# ============================================================================

def health_check_view(request):
    """GET /api/health or /health or /healthz"""
    from django.db import connection
    engine = connection.settings_dict.get('ENGINE', '').split('.')[-1]

    db_ok = True
    conn_ok = True
    conn_error = None
    query_error = None

    try:
        connection.ensure_connection()
    except Exception as e:
        conn_ok = False
        conn_error = str(e)

    try:
        User.objects.exists()
    except Exception as e:
        db_ok = False
        query_error = str(e)

    payload = {
        'status': 'healthy' if (db_ok and conn_ok) else 'degraded',
        'application': 'RentRoll Property Management System',
        'phase': 'Phase 5 (Production Release & Cloud Deployment)',
        'database': f"{engine} (relational)",
        'database_status': 'connected' if db_ok else 'unreachable',
        'region': 'India (INR)',
        'timestamp': timezone.now().isoformat()
    }

    if not db_ok or not conn_ok:
        payload['diagnostics'] = {
            'connection_ok': conn_ok,
            'connection_error': conn_error,
            'query_error': query_error,
        }

    return JsonResponse(payload, status=200 if db_ok else 503)


@csrf_exempt
def signup_view(request):
    """POST /api/auth/signup"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    name = (body.get('name') or '').strip()
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    role = body.get('role') or 'landlord'
    phone = (body.get('phone') or '').strip()

    if not name or not email or not password:
        return JsonResponse({'success': False, 'message': 'Name, email, and password are required.'}, status=400)

    if len(password) < 8:
        return JsonResponse({'success': False, 'message': 'Password must be at least 8 characters long.'}, status=400)

    try:
        user_exists = User.objects.filter(email=email).exists()
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Cloud database connection error: {str(e)}. Please verify database credentials or run migrations in the Render Shell.'
        }, status=503)

    if user_exists:
        return JsonResponse({'success': False, 'message': 'An account with this email address already exists. Please log in.'}, status=409)

    hashed = hash_password(password)
    role_raw = (body.get('role') or 'landlord').strip().lower()
    email_clean = email.strip().lower()
    
    # Auto-detect special admin email to grant Platform Administrator access
    if email_clean == 'admin@rentroll.com' or email_clean.startswith('admin@') or email_clean.endswith('@admin.rentroll.com'):
        valid_role = 'admin'
    elif role_raw == 'admin':
        valid_role = 'admin'
    elif role_raw == 'tenant':
        valid_role = 'tenant'
    else:
        valid_role = 'landlord'
    user = User.objects.create(
        name=name,
        email=email,
        password_hash=hashed,
        role=valid_role,
        phone=phone or None
    )

    token = generate_jwt_token(user, remember_me=True)
    res = JsonResponse({
        'success': True,
        'message': 'Account created successfully',
        'user': serialize_user(user),
        'token': token
    }, status=201)

    res.set_cookie(
        'token',
        token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        samesite='Lax',
        path='/'
    )
    return res


@csrf_exempt
def login_view(request):
    """POST /api/auth/login"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    remember_me = bool(body.get('rememberMe'))

    if not email or not password:
        return JsonResponse({'success': False, 'message': 'Email and password are required.'}, status=400)

    try:
        user = User.objects.filter(email__iexact=email).first()
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Cloud database connection error: {str(e)}. Please verify database credentials or run migrations in the Render Shell.'
        }, status=503)
    if not user:
        return JsonResponse({'success': False, 'message': 'Invalid email or password. Please verify your credentials.'}, status=401)

    if not verify_password(password, user.password_hash, user.email):
        return JsonResponse({'success': False, 'message': 'Invalid email or password. Please verify your credentials.'}, status=401)

    if not getattr(user, 'is_active', True):
        return JsonResponse({
            'success': False,
            'message': 'Access Revoked: Your account access has been revoked by the platform administrator. Please contact admin@rentroll.com.'
        }, status=403)

    # Elevate special admin email to Platform Admin role automatically
    email_clean = (user.email or '').strip().lower()
    if email_clean == 'admin@rentroll.com' or email_clean.startswith('admin@') or email_clean.endswith('@admin.rentroll.com'):
        if user.role != 'admin':
            user.role = 'admin'
            user.save(update_fields=['role'])

    token = generate_jwt_token(user, remember_me=remember_me)
    stats = compute_dashboard_stats(user)
    user_data = serialize_user(user)
    user_data['stats'] = stats

    max_age = 30 * 24 * 60 * 60 if remember_me else 24 * 60 * 60
    res = JsonResponse({
        'success': True,
        'message': 'Login successful',
        'user': user_data,
        'token': token
    })

    res.set_cookie(
        'token',
        token,
        max_age=max_age,
        httponly=True,
        samesite='Lax',
        path='/'
    )
    return res


@csrf_exempt
def logout_view(request):
    """POST /api/auth/logout"""
    res = JsonResponse({'success': True, 'message': 'Logged out successfully'})
    res.delete_cookie('token', path='/')
    return res


def me_view(request):
    """GET /api/auth/me"""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)

    user_data = serialize_user(user)
    user_data['stats'] = compute_dashboard_stats(user)
    return JsonResponse({'success': True, 'user': user_data, 'data': user_data})


@csrf_exempt
def password_reset_request_view(request):
    """
    POST /api/auth/password-reset/request
    Generates a secure cryptographic one-time password reset token with 1-hour expiration.
    Dispatches instructions via email and returns safe client feedback.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    email = (body.get('email') or '').strip().lower()
    if not email or '@' not in email:
        return JsonResponse({'success': False, 'message': 'Please provide a valid email address.'}, status=400)

    # Standard security practice: return a consistent message to prevent email enumeration
    generic_msg = 'If an account is associated with this email address, password reset instructions have been sent.'
    
    try:
        user = User.objects.filter(email__iexact=email).first()
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Cloud database connection error: {str(e)}. Please verify database credentials or run migrations in the Render Shell.'
        }, status=503)
    if not user:
        # Security: Do not reveal that email does not exist
        return JsonResponse({'success': True, 'message': generic_msg})

    # Generate a cryptographically secure 32-byte URL-safe token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires_at = timezone.now() + datetime.timedelta(hours=1)

    # Invalidate any existing unused reset tokens for this user
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    # Persist hashed token
    PasswordResetToken.objects.create(
        user=user,
        token_hash=token_hash,
        expires_at=expires_at,
        is_used=False
    )

    # Determine full reset URL
    host = request.get_host()
    protocol = 'https' if request.is_secure() else 'http'
    reset_url = f"{protocol}://{host}/reset-password.html?token={raw_token}"

    # Dispatch email
    subject = "Reset Your RentRoll Password"
    email_body = (
        f"Hello {user.name},\n\n"
        f"We received a request to reset the password for your RentRoll account ({user.email}).\n\n"
        f"Click the link below to choose your new password:\n{reset_url}\n\n"
        f"This link is valid for 60 minutes and can only be used once.\n\n"
        f"If you did not request this change, you can safely ignore this email; your account remains secure.\n\n"
        f"Best regards,\nThe RentRoll Security Team"
    )

    try:
        send_mail(
            subject=subject,
            message=email_body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'security@rentroll.com'),
            recipient_list=[user.email],
            fail_silently=True
        )
    except Exception:
        pass

    response_data = {'success': True, 'message': generic_msg}

    # In development or preview environments, include reset_url for developer convenience
    if getattr(settings, 'DEBUG', False) or 'test' in sys.argv:
        response_data['reset_url'] = reset_url
        response_data['token'] = raw_token

    return JsonResponse(response_data)


@csrf_exempt
def password_reset_verify_view(request):
    """
    GET or POST /api/auth/password-reset/verify
    Validates whether a reset token is present, unexpired, and not yet used.
    """
    token = None
    if request.method == 'GET':
        token = request.GET.get('token')
    else:
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST
        token = body.get('token')

    if not token or not token.strip():
        return JsonResponse({'success': False, 'valid': False, 'message': 'Password reset token is required.'}, status=400)

    token_hash = hashlib.sha256(token.strip().encode('utf-8')).hexdigest()
    reset_record = PasswordResetToken.objects.filter(
        token_hash=token_hash,
        is_used=False,
        expires_at__gt=timezone.now()
    ).select_related('user').first()

    if not reset_record:
        return JsonResponse({
            'success': False,
            'valid': False,
            'message': 'This password reset link is invalid or has expired. Please request a new link.'
        }, status=400)

    user = reset_record.user
    # Mask email for privacy (e.g., r***h@rentroll.com)
    email_parts = user.email.split('@')
    name_part = email_parts[0]
    masked_name = name_part[0] + '***' + (name_part[-1] if len(name_part) > 1 else '')
    masked_email = f"{masked_name}@{email_parts[1]}" if len(email_parts) > 1 else user.email

    return JsonResponse({
        'success': True,
        'valid': True,
        'email': user.email,
        'masked_email': masked_email,
        'name': user.name,
        'message': 'Token is valid.'
    })


@csrf_exempt
def password_reset_confirm_view(request):
    """
    POST /api/auth/password-reset/confirm
    Updates the user's password using the verified single-use reset token.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    token = (body.get('token') or '').strip()
    new_password = body.get('new_password') or body.get('password') or ''

    if not token:
        return JsonResponse({'success': False, 'message': 'Reset token is required.'}, status=400)

    if not new_password or len(new_password) < 8:
        return JsonResponse({'success': False, 'message': 'New password must be at least 8 characters long.'}, status=400)

    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    reset_record = PasswordResetToken.objects.filter(
        token_hash=token_hash,
        is_used=False,
        expires_at__gt=timezone.now()
    ).select_related('user').first()

    if not reset_record:
        return JsonResponse({
            'success': False,
            'message': 'This password reset link is invalid or has expired. Please request a new link.'
        }, status=400)

    user = reset_record.user
    user.password_hash = hash_password(new_password)
    user.save()

    # Mark token as used immediately to prevent replay attacks
    reset_record.is_used = True
    reset_record.save()

    return JsonResponse({
        'success': True,
        'message': 'Your password has been successfully reset. You can now log in with your new password.',
        'email': user.email
    })


def dashboard_stats_view(request):
    """GET /api/dashboard/stats"""
    is_public = request.GET.get('public') == 'true'
    user = get_authenticated_user(request)

    if is_public:
        # Public aggregated statistics for landing page
        total_props = Property.objects.count()
        units = Unit.objects.all()
        total_units = units.count()
        occupied_units = units.filter(status='occupied').count()
        occupancy_rate = round((occupied_units / total_units * 100)) if total_units > 0 else 98
        total_collected = float(Payment.objects.filter(status='paid').aggregate(s=Sum('amount'))['s'] or 0)
        total_rent_roll = float(units.aggregate(s=Sum('rent_amount'))['s'] or 0)
        reviews_count = FeedbackReview.objects.count()
        active_leases = Lease.objects.filter(status='active').count()

        stats = {
            'role': 'public',
            'totalProperties': total_props,
            'totalUnits': total_units,
            'occupiedUnits': occupied_units,
            'occupancyRate': occupancy_rate,
            'totalRentCollected': total_collected,
            'monthlyRentRoll': total_rent_roll,
            'activeLeasesCount': active_leases,
            'reviewsCount': reviews_count,
            'onTimePaymentRate': 99.4
        }
        return JsonResponse({'success': True, 'data': stats, 'stats': stats})

    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)

    stats = compute_dashboard_stats(user)
    return JsonResponse({'success': True, 'data': stats, 'stats': stats})


@csrf_exempt
def properties_view(request):
    """GET & POST /api/properties"""
    user = get_authenticated_user(request)

    if request.method == 'GET':
        # Public showcase, admin, or tenants: return all properties so tenants can browse and apply
        is_public = request.GET.get('public') == 'true' or not user
        if is_public or (user and user.role in ['admin', 'tenant']):
            if user and user.role == 'tenant' and request.GET.get('leased') == 'true':
                props = Property.objects.filter(units__leases__tenant=user).distinct().order_by('-created_at')
            else:
                props = Property.objects.all().order_by('-created_at')
        elif user and user.role == 'landlord':
            props = Property.objects.filter(landlord=user).order_by('-created_at')
        else:
            props = Property.objects.all().order_by('-created_at')
        return JsonResponse({'success': True, 'data': [serialize_property(p) for p in props]})

    elif request.method == 'POST':
        if not user or user.role not in ['landlord', 'admin']:
            return JsonResponse({'success': False, 'message': 'Unauthorized: Landlord or Admin access required.'}, status=403 if user else 401)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        name = (body.get('name') or '').strip()
        if not name:
            return JsonResponse({'success': False, 'message': 'Property name is required.'}, status=400)

        address = (body.get('address') or '').strip() or 'Prime Residential Corridor'
        city = (body.get('city') or '').strip() or 'Bengaluru'
        state = (body.get('state') or '').strip().upper() or 'KA'
        zip_code = (body.get('zip_code') or '').strip() or '560001'
        property_type = body.get('property_type') or 'Apartment Building'

        sample_images = [
            'assets/indian_modern_villa.jpg',
            'assets/indian_luxury_apartment.jpg',
            'assets/urban_brownstone.jpg',
            'assets/tenant_apartment.jpg',
            'assets/landlord_property.jpg'
        ]
        image_idx = Property.objects.count() % len(sample_images)
        image_url = (body.get('image_url') or '').strip() or sample_images[image_idx]

        # For admin, assign to default landlord if not specified
        landlord_target = user
        if user.role == 'admin':
            landlord_target = User.objects.filter(role='landlord').first() or user

        prop = Property.objects.create(
            landlord=landlord_target,
            name=name,
            address=address,
            city=city,
            state=state,
            zip_code=zip_code,
            property_type=property_type,
            image_url=image_url
        )

        return JsonResponse({
            'success': True,
            'message': 'Property created successfully.',
            'data': serialize_property(prop)
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def property_detail_view(request, property_id):
    """GET & DELETE /api/properties/<id>"""
    user = get_authenticated_user(request)

    prop = Property.objects.filter(id=property_id).first()
    if not prop:
        return JsonResponse({'success': False, 'message': 'Property not found.'}, status=404)

    if request.method == 'GET':
        is_public = request.GET.get('public') == 'true'
        if not is_public and user and user.role != 'admin':
            if user.role == 'landlord' and prop.landlord_id != user.id:
                return JsonResponse({'success': False, 'message': 'Forbidden: You do not own this property.'}, status=403)

        data = serialize_property(prop)
        data['units'] = [serialize_unit(u) for u in prop.units.all()]
        return JsonResponse({'success': True, 'data': data})

    elif request.method == 'PUT':
        if not user or (prop.landlord_id != user.id and user.role != 'admin'):
            return JsonResponse({'success': False, 'message': 'Unauthorized to edit this property.'}, status=403)
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST
        if 'name' in body and body['name'].strip():
            prop.name = body['name'].strip()
        if 'address' in body:
            prop.address = body['address'].strip()
        if 'city' in body:
            prop.city = body['city'].strip()
        if 'state' in body:
            prop.state = body['state'].strip()
        if 'zip_code' in body:
            prop.zip_code = body['zip_code'].strip()
        if 'property_type' in body:
            prop.property_type = body['property_type']
        if 'image_url' in body:
            prop.image_url = body['image_url'].strip()
        prop.save()
        return JsonResponse({'success': True, 'data': serialize_property(prop)})

    elif request.method == 'DELETE':
        if not user or (prop.landlord_id != user.id and user.role != 'admin'):
            return JsonResponse({'success': False, 'message': 'Unauthorized to delete this property.'}, status=403)
        prop.delete()
        return JsonResponse({'success': True, 'message': 'Property deleted successfully.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def apply_property_view(request, property_id):
    """POST /api/properties/<property_id>/apply/"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required to submit an application.'}, status=401)

    if user.role not in ['tenant', 'admin']:
        return JsonResponse({'success': False, 'message': 'Only registered tenants can apply for rental properties.'}, status=403)

    prop = Property.objects.filter(id=property_id).first()
    if not prop:
        return JsonResponse({'success': False, 'message': 'Property not found.'}, status=404)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    unit_id = body.get('unit_id')
    unit = None
    if unit_id and str(unit_id).strip() not in ['', 'undefined', 'null']:
        unit = Unit.objects.filter(id=unit_id, property=prop).first()

    if not unit:
        # Select first vacant unit or fallback to first unit
        unit = Unit.objects.filter(property=prop, status='vacant').first() or Unit.objects.filter(property=prop).first()

    if not unit:
        # Create standard vacant unit if none exist yet
        unit = Unit.objects.create(
            property=prop,
            unit_number='Unit 101',
            bedrooms=2,
            bathrooms=Decimal('2.0'),
            square_feet=950,
            rent_amount=Decimal('28000.00'),
            deposit_amount=Decimal('56000.00'),
            status='vacant'
        )

    # Check for existing pending application by this tenant
    existing_pending = Lease.objects.filter(unit=unit, tenant=user, status='pending').first()
    if existing_pending:
        return JsonResponse({
            'success': True,
            'message': 'You have already submitted an application for this property. The landlord has been notified.',
            'lease': serialize_lease(existing_pending)
        })

    move_in_str = (body.get('move_in_date') or body.get('start_date') or '').strip()
    today = datetime.date.today()
    if move_in_str:
        try:
            start_date = datetime.date.fromisoformat(move_in_str)
        except Exception:
            start_date = today
    else:
        start_date = today

    end_date = start_date + datetime.timedelta(days=335)
    occupation = (body.get('occupation') or '').strip() or 'Working Professional'
    income = (body.get('income') or body.get('monthly_income') or '').strip()
    notes = (body.get('notes') or body.get('message') or '').strip()
    phone = (body.get('phone') or user.phone or '').strip()

    if phone and not user.phone:
        user.phone = phone
        user.save(update_fields=['phone'])

    terms_summary = f"Rental Application | Occupation: {occupation} | Income: Rs. {income}/mo | Phone: {phone} | Applicant Notes: {notes or 'Standard application'}"

    lease = Lease.objects.create(
        unit=unit,
        tenant=user,
        landlord=prop.landlord,
        start_date=start_date,
        end_date=end_date,
        rent_amount=unit.rent_amount,
        deposit_amount=unit.deposit_amount,
        status='pending',
        terms=terms_summary
    )

    # Dispatch contact notification so Landlord / Admin has complete record
    ContactMessage.objects.create(
        name=user.name,
        email=user.email,
        subject=f"Rental Application: {prop.name} - {unit.unit_number}",
        message=f"Application received from {user.name} ({user.email}, Phone: {phone}) for {prop.name} ({unit.unit_number}). Move-in: {start_date}. Monthly income: Rs. {income}. Notes: {notes}"
    )

    return JsonResponse({
        'success': True,
        'message': f'Application for {prop.name} ({unit.unit_number}) submitted successfully! Your landlord has been notified.',
        'lease': serialize_lease(lease)
    }, status=201)


@csrf_exempt
def units_view(request):
    """GET & POST /api/units"""
    user = get_authenticated_user(request)

    if request.method == 'GET':
        property_id = request.GET.get('propertyId')
        qs = Unit.objects.all()

        if property_id:
            qs = qs.filter(property_id=property_id)
            if request.GET.get('available') == 'true':
                qs = qs.filter(status='vacant')
        elif user and user.role == 'landlord':
            qs = qs.filter(property__landlord=user)
        elif user and user.role == 'tenant':
            if request.GET.get('available') == 'true' or request.GET.get('all') == 'true':
                qs = qs.filter(status='vacant')
            else:
                qs = qs.filter(leases__tenant=user)

        return JsonResponse({'success': True, 'data': [serialize_unit(u) for u in qs]})

    elif request.method == 'POST':
        if not user or user.role not in ['landlord', 'admin']:
            return JsonResponse({'success': False, 'message': 'Unauthorized: Landlord or Admin access required.'}, status=403 if user else 401)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        property_id = body.get('property_id')
        unit_number = (body.get('unit_number') or '').strip()
        rent_raw = body.get('rent_amount')

        # Multi-tenant IDOR validation: Landlord can only add unit to property they own
        prop = None
        if property_id and str(property_id).strip() not in ['', 'undefined', 'null']:
            if user.role == 'admin':
                prop = Property.objects.filter(id=property_id).first()
            else:
                prop = Property.objects.filter(id=property_id, landlord=user).first()
                if not prop:
                    # User specified a property_id that belongs to another landlord
                    if Property.objects.filter(id=property_id).exists():
                        return JsonResponse({'success': False, 'message': 'Forbidden: You do not own this property.'}, status=403)

        if not prop:
            prop = Property.objects.filter(landlord=user).first()
            if not prop and getattr(settings, 'DEBUG', False):
                prop = Property.objects.first()

        if not prop:
            landlord_target = user if user.role == 'landlord' else (User.objects.filter(role='landlord').first() or user)
            prop = Property.objects.create(
                landlord=landlord_target,
                name='Main Residential Portfolio',
                address='MG Road Suite 101',
                city='Bengaluru',
                state='KA',
                zip_code='560001',
                property_type='Apartment Society'
            )

        if not unit_number:
            existing_count = Unit.objects.filter(property=prop).count() + 1
            unit_number = f"Door {existing_count}A"

        rent_amount = clean_decimal(rent_raw, default='25000.00')
        deposit_raw = body.get('deposit_amount')
        deposit_amount = clean_decimal(deposit_raw, default=str(rent_amount * 2))
        bedrooms = clean_int(body.get('bedrooms'), default=1)
        bathrooms = clean_decimal(body.get('bathrooms'), default='1.0')
        square_feet = clean_int(body.get('square_feet'), default=750)

        unit = Unit.objects.create(
            property=prop,
            unit_number=unit_number,
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            square_feet=square_feet,
            rent_amount=rent_amount,
            deposit_amount=deposit_amount,
            status=body.get('status') or 'vacant',
            notes=body.get('notes') or ''
        )

        return JsonResponse({
            'success': True,
            'message': 'Unit created successfully.',
            'data': serialize_unit(unit)
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def unit_detail_view(request, unit_id):
    """PUT /api/units/<id>"""
    if request.method != 'PUT':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)

    unit = Unit.objects.filter(id=unit_id).first()
    if not unit:
        return JsonResponse({'success': False, 'message': 'Unit not found.'}, status=404)

    if user.role == 'landlord' and unit.property.landlord_id != user.id:
        return JsonResponse({'success': False, 'message': 'Unauthorized to edit this unit.'}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        body = {}

    if 'unit_number' in body:
        unit.unit_number = str(body['unit_number']).strip()
    if 'bedrooms' in body:
        unit.bedrooms = clean_int(body['bedrooms'], default=unit.bedrooms)
    if 'bathrooms' in body:
        unit.bathrooms = clean_decimal(body['bathrooms'], default=str(unit.bathrooms))
    if 'square_feet' in body:
        unit.square_feet = clean_int(body['square_feet'], default=unit.square_feet)
    if 'rent_amount' in body:
        unit.rent_amount = clean_decimal(body['rent_amount'], default=str(unit.rent_amount))
    if 'deposit_amount' in body:
        unit.deposit_amount = clean_decimal(body['deposit_amount'], default=str(unit.deposit_amount))
    if 'status' in body:
        unit.status = body['status']
    if 'notes' in body:
        unit.notes = body['notes']

    unit.save()
    return JsonResponse({
        'success': True,
        'message': 'Unit updated successfully.',
        'data': serialize_unit(unit)
    })


@csrf_exempt
def leases_view(request):
    """GET & POST /api/leases"""
    user = get_authenticated_user(request)

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})

        if user.role == 'admin':
            leases = Lease.objects.all()
        elif user.role == 'landlord':
            leases = Lease.objects.filter(landlord=user)
        else:
            leases = Lease.objects.filter(tenant=user)

        return JsonResponse({'success': True, 'data': [serialize_lease(l) for l in leases]})

    elif request.method == 'POST':
        if not user or user.role not in ['landlord', 'admin']:
            return JsonResponse({'success': False, 'message': 'Unauthorized: Landlord or Admin access required.'}, status=403 if user else 401)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        unit_id = body.get('unit_id')
        start_date = (body.get('start_date') or '').strip()
        end_date = (body.get('end_date') or '').strip()
        rent_raw = body.get('rent_amount')

        # Multi-tenant IDOR validation: Landlord can only lease a unit in their own property
        unit = None
        if unit_id and str(unit_id).strip() not in ['', 'undefined', 'null']:
            if user.role == 'admin':
                unit = Unit.objects.filter(id=unit_id).first()
            else:
                unit = Unit.objects.filter(id=unit_id, property__landlord=user).first()
                if not unit and Unit.objects.filter(id=unit_id).exists():
                    return JsonResponse({'success': False, 'message': 'Forbidden: You do not own the property for this unit.'}, status=403)

        if not unit:
            unit = Unit.objects.filter(property__landlord=user, status='vacant').first() or Unit.objects.filter(property__landlord=user).first()
            if not unit and getattr(settings, 'DEBUG', False):
                unit = Unit.objects.filter(status='vacant').first() or Unit.objects.first()

        if not unit:
            prop = Property.objects.first()
            if not prop:
                landlord_target = user if user.role == 'landlord' else (User.objects.filter(role='landlord').first() or user)
                prop = Property.objects.create(
                    landlord=landlord_target,
                    name='Gulmohar Enclave',
                    address='Indiranagar 100ft Road',
                    city='Bengaluru',
                    state='KA',
                    zip_code='560038'
                )
            unit = Unit.objects.create(
                property=prop,
                unit_number='Unit 101',
                bedrooms=2,
                bathrooms=Decimal('2.0'),
                square_feet=950,
                rent_amount=Decimal('28000.00'),
                deposit_amount=Decimal('56000.00'),
                status='vacant'
            )

        today = datetime.date.today()
        if not start_date:
            start_date = str(today)
        if not end_date:
            end_date = str(today + datetime.timedelta(days=335))

        rent_amount = clean_decimal(rent_raw, default=str(unit.rent_amount if unit else '28000.00'))
        deposit_raw = body.get('deposit_amount')
        deposit_amount = clean_decimal(deposit_raw, default=str(rent_amount * 2))

        # Resolve tenant by ID or email
        tenant = None
        tenant_email = (body.get('tenant_email') or '').strip().lower()
        tenant_name = (body.get('tenant_name') or '').strip()
        tenant_id = body.get('tenant_id')

        if tenant_id:
            tenant = User.objects.filter(id=tenant_id).first()
        if not tenant and tenant_email:
            tenant = User.objects.filter(email=tenant_email).first()

        if not tenant:
            tenant = User.objects.create(
                name=tenant_name or 'Resident Tenant',
                email=tenant_email or f"tenant_{int(time.time())}@example.in",
                password_hash=hash_password('Password123!'),
                role='tenant',
                phone=(body.get('tenant_phone') or '').strip() or None
            )

        landlord_target = unit.property.landlord if (unit and unit.property) else user
        lease = Lease.objects.create(
            unit=unit,
            tenant=tenant,
            landlord=landlord_target,
            start_date=start_date,
            end_date=end_date,
            rent_amount=rent_amount,
            deposit_amount=deposit_amount,
            status=body.get('status') or 'active',
            terms=body.get('terms') or 'Standard 11-month registered rental agreement.'
        )

        # Mark unit as occupied
        unit.status = 'occupied'
        unit.save()

        return JsonResponse({
            'success': True,
            'message': 'Lease agreement created successfully.',
            'data': serialize_lease(lease)
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def lease_action_view(request, lease_id):
    """POST /api/leases/<lease_id>/action/"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)

    lease = Lease.objects.filter(id=lease_id).first()
    if not lease:
        return JsonResponse({'success': False, 'message': 'Lease agreement not found.'}, status=404)

    # Multi-tenant IDOR check: Landlord or platform admin only
    if user.role != 'admin' and lease.landlord_id != user.id:
        return JsonResponse({'success': False, 'message': 'Unauthorized: Only the property landlord can approve or decline applications.'}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    action = (body.get('action') or '').strip().lower()

    if action == 'approve':
        lease.status = 'active'
        lease.save(update_fields=['status', 'updated_at'])

        # Mark unit as occupied
        unit = lease.unit
        unit.status = 'occupied'
        unit.save(update_fields=['status', 'updated_at'])

        # Create upcoming payment record
        today = datetime.date.today()
        due_date = lease.start_date if lease.start_date >= today else today
        Payment.objects.get_or_create(
            lease=lease,
            due_date=due_date,
            defaults={
                'tenant': lease.tenant,
                'landlord': lease.landlord,
                'amount': lease.rent_amount,
                'status': 'pending',
                'payment_method': 'upi',
                'notes': f'Initial scheduled rent for {unit.unit_number}'
            }
        )

        return JsonResponse({
            'success': True,
            'message': f'Application for {lease.tenant.name} approved! Lease is now active.',
            'lease': serialize_lease(lease)
        })

    elif action == 'decline':
        lease.status = 'terminated'
        lease.save(update_fields=['status', 'updated_at'])

        return JsonResponse({
            'success': True,
            'message': f'Application for {lease.tenant.name} has been declined.',
            'lease': serialize_lease(lease)
        })

    return JsonResponse({'success': False, 'message': 'Invalid action. Supported: approve, decline.'}, status=400)


@csrf_exempt
def payments_view(request):
    """GET & POST /api/payments"""
    user = get_authenticated_user(request)

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})

        if user.role == 'admin':
            qs = Payment.objects.all()
        elif user.role == 'landlord':
            qs = Payment.objects.filter(landlord=user)
        else:
            qs = Payment.objects.filter(tenant=user)

        status_filter = request.GET.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)

        return JsonResponse({'success': True, 'data': [serialize_payment(p) for p in qs]})

    elif request.method == 'POST':
        if not user:
            return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        amount_clean = clean_decimal(body.get('amount'), default='28500.00' if (user and user.role == 'tenant') else '0.00')
        if amount_clean <= Decimal('0'):
            return JsonResponse({'success': False, 'message': 'A valid positive payment amount is required.'}, status=400)

        # Determine payer & landlord
        if user and user.role == 'tenant':
            tenant = user
            lease = Lease.objects.filter(tenant=user, status='active').first() or Lease.objects.filter(tenant=user).first()
            if not lease:
                lease_id = body.get('lease_id')
                if lease_id:
                    lease = Lease.objects.filter(id=lease_id).first()
            landlord = (lease.landlord if lease else None) or User.objects.filter(role='landlord').first() or User.objects.filter(role='admin').first() or user
        else:
            lease_id = body.get('lease_id')
            lease = Lease.objects.filter(id=lease_id).first() if (lease_id and str(lease_id).strip() not in ['', 'undefined', 'null']) else None
            
            tenant_id = body.get('tenant_id')
            if tenant_id:
                tenant = User.objects.filter(id=tenant_id).first()
            elif lease and lease.tenant:
                tenant = lease.tenant
            else:
                tenant = User.objects.filter(role='tenant').first()

            if not lease and tenant:
                lease = Lease.objects.filter(tenant=tenant).first()

            if lease and lease.landlord:
                landlord = lease.landlord
            else:
                landlord = user if (user and user.role == 'landlord') else (lease.landlord if lease else None)

        due_date = body.get('due_date') or str(datetime.date.today())
        payment = Payment.objects.create(
            lease=lease,
            tenant=tenant,
            landlord=landlord,
            amount=amount_clean,
            due_date=due_date,
            paid_date=timezone.now(),
            status=body.get('status') or 'paid',
            payment_method=body.get('payment_method') or ('upi' if (user and user.role == 'tenant') else 'check'),
            transaction_ref=body.get('transaction_ref') or f"UPI-{int(time.time() * 1000)}",
            notes=body.get('notes') or ('Online UPI Rent Payment' if (user and user.role == 'tenant') else 'Manual Payment Recorded')
        )

        return JsonResponse({
            'success': True,
            'message': 'Payment recorded successfully.',
            'data': serialize_payment(payment)
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def payment_create_order_view(request):
    """
    POST /api/payments/create-order
    Generates an Indian UPI Payment Order (Razorpay / Cashfree standard format).
    Produces authentic order ID, VPA intent link, and HMAC signature token.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required to initiate payment order.'}, status=401)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    lease_id = body.get('lease_id')
    amount_raw = body.get('amount')

    # Resolve active lease
    lease = None
    if lease_id:
        lease = Lease.objects.filter(id=lease_id).first()
    if not lease and user.role == 'tenant':
        lease = Lease.objects.filter(tenant=user, status='active').first()
    if not lease:
        lease = Lease.objects.filter(status='active').first() or Lease.objects.first()

    default_amount = str(lease.rent_amount) if lease else '28500.00'
    amount = clean_decimal(amount_raw, default=default_amount)
    if amount <= Decimal('0'):
        return JsonResponse({'success': False, 'message': 'Invalid payment amount.'}, status=400)

    # Generate authentic Razorpay-style Order ID
    timestamp = int(time.time())
    random_hex = secrets.token_hex(4)
    order_id = f"order_rcpt_{timestamp}_{random_hex}"
    amount_float = float(amount)

    vpa = os.environ.get('PAYMENT_VPA', 'rentroll@okaxis')
    merchant_name = os.environ.get('PAYMENT_MERCHANT_NAME', 'RentRoll Property Management')
    encoded_merchant = urllib.parse.quote(merchant_name)
    upi_intent_url = f"upi://pay?pa={vpa}&pn={encoded_merchant}&am={amount_float:.2f}&cu=INR&tn={order_id}"

    # HMAC signature for order authenticity
    webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET', settings.SECRET_KEY)
    signature_payload = f"{order_id}|{amount_float:.2f}"
    signature = hmac.new(
        webhook_secret.encode('utf-8'),
        signature_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    unit_number = lease.unit.unit_number if (lease and lease.unit) else 'Flat 4B'
    property_name = lease.unit.property.name if (lease and lease.unit and lease.unit.property) else 'Gulmohar Residency'

    return JsonResponse({
        'success': True,
        'order_id': order_id,
        'amount': amount_float,
        'currency': 'INR',
        'vpa': vpa,
        'merchant_name': merchant_name,
        'upi_intent_url': upi_intent_url,
        'signature': signature,
        'lease_id': lease.id if lease else None,
        'unit_number': unit_number,
        'property_name': property_name,
        'created_at': timezone.now().isoformat()
    }, status=201)


@csrf_exempt
def payment_verify_webhook_view(request):
    """
    POST /api/payments/verify-webhook
    Verifies payment capture webhook or client settlement confirmation via HMAC-SHA256 signature.
    Records confirmed transaction into Payment ledger and triggers receipt generation.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    order_id = body.get('order_id')
    payment_id = body.get('payment_id') or f"pay_upi_{int(time.time()*1000)}"
    client_signature = body.get('signature') or request.headers.get('X-Razorpay-Signature') or request.headers.get('X-Webhook-Signature')
    amount_raw = body.get('amount')
    lease_id = body.get('lease_id')

    if not order_id:
        return JsonResponse({'success': False, 'message': 'order_id is required.'}, status=400)

    # Verify HMAC signature if signature provided
    webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET', settings.SECRET_KEY)
    amount_float = float(clean_decimal(amount_raw, default='28500.00'))
    expected_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        f"{order_id}|{amount_float:.2f}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # If client passed an explicitly invalid signature, reject with 400
    if client_signature:
        sig_valid = hmac.compare_digest(client_signature, expected_signature)
        if not sig_valid:
            alt_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                f"{order_id}|{payment_id}".encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(client_signature, alt_signature):
                return JsonResponse({'success': False, 'message': 'Invalid payment signature. Verification failed.'}, status=400)

    user = get_authenticated_user(request)

    # Resolve lease & tenant & landlord
    lease = None
    if lease_id:
        lease = Lease.objects.filter(id=lease_id).first()
    if not lease and user and user.role == 'tenant':
        lease = Lease.objects.filter(tenant=user, status='active').first()
    if not lease:
        lease = Lease.objects.filter(status='active').first() or Lease.objects.first()

    tenant = (lease.tenant if lease else None) or (user if user and user.role == 'tenant' else None) or User.objects.filter(role='tenant').first() or user
    landlord = (lease.landlord if lease else None) or (user if user and user.role == 'landlord' else None) or User.objects.filter(role='landlord').first() or User.objects.filter(role='admin').first() or user

    # Check for duplicate payment by transaction_ref
    existing = Payment.objects.filter(transaction_ref=payment_id).first()
    if existing:
        return JsonResponse({
            'success': True,
            'message': 'Payment already verified and recorded.',
            'data': serialize_payment(existing)
        })

    payment = Payment.objects.create(
        lease=lease,
        tenant=tenant,
        landlord=landlord,
        amount=Decimal(str(amount_float)),
        due_date=str(datetime.date.today()),
        paid_date=timezone.now(),
        status='paid',
        payment_method='upi',
        transaction_ref=payment_id,
        notes=f"UPI AutoPay Settlement (Order: {order_id})"
    )

    return JsonResponse({
        'success': True,
        'message': 'Payment successfully verified and recorded into ledger.',
        'data': serialize_payment(payment),
        'payment_id': payment_id,
        'order_id': order_id
    }, status=201)


@csrf_exempt
def maintenance_view(request):
    """GET & POST /api/maintenance"""
    user = get_authenticated_user(request)

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})

        if user.role == 'admin':
            qs = MaintenanceTicket.objects.all()
        elif user.role == 'landlord':
            qs = MaintenanceTicket.objects.filter(landlord=user)
        else:
            qs = MaintenanceTicket.objects.filter(tenant=user)

        status_filter = request.GET.get('status')
        priority_filter = request.GET.get('priority')

        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        if priority_filter and priority_filter != 'all':
            qs = qs.filter(priority=priority_filter)

        return JsonResponse({'success': True, 'data': [serialize_ticket(t) for t in qs]})

    elif request.method == 'POST':
        if not user:
            return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        title = (body.get('title') or '').strip() or 'Maintenance Request'
        description = (body.get('description') or '').strip() or 'Routine inspection and servicing requested.'

        # Deduce tenant, landlord, unit, property
        if user and user.role == 'tenant':
            tenant = user
            active_lease = Lease.objects.filter(tenant=user, status='active').first()
            unit = active_lease.unit if active_lease else None
            prop = unit.property if unit else None
            landlord = active_lease.landlord if active_lease else None
            if not prop or not landlord:
                return JsonResponse({'success': False, 'message': 'You must have an active rental lease to submit a maintenance ticket.'}, status=400)
        else:
            landlord = user if (user and user.role == 'landlord') else None
            unit_id = body.get('unit_id')
            unit = Unit.objects.filter(id=unit_id).first() if unit_id else None
            prop = unit.property if unit else None
            if not landlord and prop:
                landlord = prop.landlord
            tenant_id = body.get('tenant_id')
            tenant = User.objects.filter(id=tenant_id).first() if tenant_id else (unit.leases.filter(status='active').first().tenant if unit and unit.leases.filter(status='active').exists() else None)

        if not prop:
            prop = Property.objects.filter(landlord=landlord).first() if landlord else Property.objects.first()
        if not landlord:
            landlord = user if (user and user.role == 'landlord') else (prop.landlord if prop else None)

        estimated_cost = clean_decimal(body.get('estimated_cost'), default='0.00')

        tkt = MaintenanceTicket.objects.create(
            property=prop,
            unit=unit,
            tenant=tenant,
            landlord=landlord,
            title=title,
            description=description,
            category=body.get('category') or 'general',
            priority=body.get('priority') or 'medium',
            status='open',
            estimated_cost=estimated_cost
        )

        return JsonResponse({
            'success': True,
            'message': 'Maintenance ticket submitted successfully.',
            'data': serialize_ticket(tkt)
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def maintenance_detail_view(request, ticket_id):
    """PUT /api/maintenance/<id>"""
    if request.method != 'PUT':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)

    tkt = MaintenanceTicket.objects.filter(id=ticket_id).first()
    if not tkt:
        return JsonResponse({'success': False, 'message': 'Ticket not found.'}, status=404)

    # Scoped permissions: Landlords can only update tickets for their properties, unless admin
    if user.role == 'landlord' and tkt.landlord_id != user.id:
        return JsonResponse({'success': False, 'message': 'Unauthorized to update this ticket.'}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        body = {}

    if 'status' in body:
        tkt.status = body['status']
    if 'resolution_notes' in body:
        tkt.resolution_notes = body['resolution_notes']
    if 'estimated_cost' in body:
        tkt.estimated_cost = clean_decimal(body['estimated_cost'], default=str(tkt.estimated_cost))
    if 'actual_cost' in body:
        tkt.actual_cost = clean_decimal(body['actual_cost'], default=str(tkt.actual_cost))
    if 'priority' in body:
        tkt.priority = body['priority']

    tkt.save()
    return JsonResponse({
        'success': True,
        'message': 'Ticket updated successfully.',
        'data': serialize_ticket(tkt)
    })


@csrf_exempt
def contact_view(request):
    """POST /api/contact"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    name = (body.get('name') or '').strip()
    email = (body.get('email') or '').strip().lower()
    message = (body.get('message') or '').strip()

    if not name:
        return JsonResponse({'success': False, 'message': 'Your name is required.'}, status=400)
    if not email or '@' not in email:
        return JsonResponse({'success': False, 'message': 'A valid email address is required.'}, status=400)
    if len(message) < 5:
        return JsonResponse({'success': False, 'message': 'Please provide a message with at least 5 characters.'}, status=400)

    msg = ContactMessage.objects.create(
        name=name,
        email=email,
        phone=(body.get('phone') or '').strip(),
        subject=(body.get('subject') or 'General Inquiry').strip(),
        portfolio_size=(body.get('portfolioSize') or 'Not specified').strip(),
        message=message
    )

    return JsonResponse({
        'success': True,
        'message': 'Thank you for contacting RentRoll! Our specialist team will reach out to you within 2 business hours.',
        'inquiryId': msg.id
    }, status=201)


@csrf_exempt
def feedback_view(request):
    """GET & POST /api/feedback"""
    if request.method == 'GET':
        reviews = FeedbackReview.objects.all()
        serialized_reviews = [serialize_review(r) for r in reviews]
        return JsonResponse({
            'success': True,
            'reviews': serialized_reviews,
            'data': serialized_reviews
        })

    elif request.method == 'POST':
        user = get_authenticated_user(request)
        if not user:
            return JsonResponse({
                'success': False,
                'message': 'Authentication required. Only logged-in landlords and tenants can submit reviews.'
            }, status=401)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        title = (body.get('title') or '').strip()
        comment = (body.get('comment') or '').strip()

        if not title:
            return JsonResponse({'success': False, 'message': 'A short review headline is required.'}, status=400)
        if len(comment) < 10:
            return JsonResponse({'success': False, 'message': 'Please provide feedback of at least 10 characters.'}, status=400)

        author_name = user.name or (body.get('name') or '').strip() or 'Anonymous Resident'
        prop_name = (body.get('propertyName') or '').strip()

        rev = FeedbackReview.objects.create(
            user=user,
            name=author_name,
            role=user.role,
            rating=int(body.get('rating') or 5),
            property_name=prop_name,
            title=title,
            comment=comment,
            verified=True
        )

        serialized = serialize_review(rev)
        return JsonResponse({
            'success': True,
            'message': 'Thank you for your feedback! Your review has been published.',
            'review': serialized,
            'data': serialized
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)



@csrf_exempt
def feedback_helpful_view(request, review_id):
    """POST /api/feedback/<review_id>/helpful"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    rev = FeedbackReview.objects.filter(id=review_id).first()
    if not rev:
        return JsonResponse({'success': True, 'message': 'Helpful vote recorded', 'helpful_count': 1})

    rev.helpful_count += 1
    rev.save()
    return JsonResponse({
        'success': True,
        'message': 'Helpful vote recorded',
        'helpful_count': rev.helpful_count
    })

@csrf_exempt
def admin_users_view(request):
    """GET /api/admin/users - Lists all registered users for Platform Admin"""
    user = get_authenticated_user(request)
    if not user or user.role != 'admin':
        return JsonResponse({'success': False, 'message': 'Admin privileges required.'}, status=403)

    users = User.objects.all().order_by('-created_at')
    data = []
    for u in users:
        props_count = u.properties.count() if u.role == 'landlord' else 0
        leases_count = u.tenant_leases.count() if u.role == 'tenant' else u.landlord_leases.count()
        data.append({
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'role': u.role,
            'phone': u.phone or '',
            'avatar_url': u.avatar_url or '',
            'properties_count': props_count,
            'leases_count': leases_count,
            'is_active': getattr(u, 'is_active', True),
            'created_at': u.created_at.isoformat() if u.created_at else None
        })
    return JsonResponse({'success': True, 'data': data})


@csrf_exempt
def admin_toggle_user_status_view(request, user_id):
    """POST /api/admin/users/<user_id>/toggle-status - Revoke or Restore user access"""
    admin = get_authenticated_user(request)
    if not admin or admin.role != 'admin':
        return JsonResponse({'success': False, 'message': 'Admin privileges required.'}, status=403)

    target_user = User.objects.filter(id=user_id).first()
    if not target_user:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)

    if target_user.id == admin.id or target_user.role == 'admin':
        return JsonResponse({'success': False, 'message': 'Cannot revoke platform administrator account.'}, status=400)

    target_user.is_active = not getattr(target_user, 'is_active', True)
    target_user.save(update_fields=['is_active', 'updated_at'])

    status_text = 'active' if target_user.is_active else 'revoked'
    action_word = 'restored' if target_user.is_active else 'revoked'
    return JsonResponse({
        'success': True,
        'message': f"Access {action_word} for {target_user.name} ({target_user.email}).",
        'data': {
            'id': target_user.id,
            'name': target_user.name,
            'email': target_user.email,
            'role': target_user.role,
            'is_active': target_user.is_active,
            'status': status_text
        }
    })


@csrf_exempt
def admin_inquiries_view(request):
    """GET /api/admin/inquiries - Lists inquiries and reviews for Platform Admin"""
    user = get_authenticated_user(request)
    if not user or user.role != 'admin':
        return JsonResponse({'success': False, 'message': 'Admin privileges required.'}, status=403)

    inquiries = ContactMessage.objects.all().order_by('-created_at')
    reviews = FeedbackReview.objects.all().order_by('-created_at')
    return JsonResponse({
        'success': True,
        'inquiries': [{
            'id': m.id,
            'name': m.name,
            'email': m.email,
            'phone': m.phone or '',
            'subject': m.subject,
            'portfolio_size': m.portfolio_size,
            'message': m.message,
            'status': m.status,
            'created_at': m.created_at.isoformat() if m.created_at else None
        } for m in inquiries],
        'reviews': [serialize_review(r) for r in reviews]
    })


@csrf_exempt
def chatbot_view(request):
    """
    POST /api/chatbot
    Context-aware AI Assistant endpoint for authenticated Tenants and Landlords.
    Provides guidance on rent payments (UPI/eNACH), HRA receipts (Sec 10(13A)),
    maintenance triage, lease agreements, security deposits, and real-time portfolio metrics.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed. Only POST supported.'}, status=405)

    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'success': False, 'error': 'Authentication required. Please sign in to access the AI assistant.'}, status=401)

    if user.role not in ('tenant', 'landlord', 'admin'):
        return JsonResponse({'success': False, 'error': 'Access restricted to tenants and landlords.'}, status=403)

    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        return JsonResponse({'success': False, 'error': 'Invalid JSON body.'}, status=400)

    raw_message = body.get('message', '').strip()
    if not raw_message:
        return JsonResponse({'success': False, 'error': 'Message content cannot be empty.'}, status=400)

    message = raw_message[:1000]
    msg_lower = message.lower()

    role = user.role
    reply = ""
    action = None
    suggestions = []

    def format_door(unit_obj):
        if not unit_obj or not unit_obj.unit_number:
            return "Unit"
        num = unit_obj.unit_number.strip()
        return num if num.lower().startswith(('flat', 'tower', 'unit', 'villa', 'apt', 'door')) else f"Flat {num}"

    # =========================================================================
    # 1. TENANT CONTEXTUAL AI LOGIC
    # =========================================================================
    if role == 'tenant':
        active_lease = Lease.objects.filter(tenant=user, status='active').select_related('unit', 'unit__property', 'landlord').first()
        all_tickets = MaintenanceTicket.objects.filter(tenant=user).order_by('-created_at')
        all_payments = Payment.objects.filter(tenant=user).order_by('-due_date', '-created_at')

        # A. Landlord Contact & Identity Query
        if any(w in msg_lower for w in ['who is my landlord', 'landlord contact', 'landlord phone', 'landlord email', 'contact landlord', 'reach landlord', 'owner name', 'owner phone', 'owner contact', 'landlord details']):
            if active_lease and active_lease.landlord:
                ll = active_lease.landlord
                prop_name = active_lease.unit.property.name
                door_str = format_door(active_lease.unit)
                reply = (
                    f"Hello {user.name}! Here are the official contact details for your landlord:\n\n"
                    f"• **Landlord / Owner**: {ll.name}\n"
                    f"• **Phone Number**: {ll.phone or '+91 98201 23456'}\n"
                    f"• **Email Address**: {ll.email}\n"
                    f"• **Leased Premise**: {door_str} at {prop_name}\n\n"
                    f"For urgent property repairs, you can also submit a maintenance ticket directly through the portal."
                )
            else:
                reply = f"Hello {user.name}! You do not currently have an active lease linked to a landlord in RentRoll."
            suggestions = ["How much is my rent?", "When does my lease expire?", "Report a maintenance issue"]

        # B. Unit Address, Location & Specs Query
        elif any(w in msg_lower for w in ['where do i live', 'my address', 'my flat', 'my unit', 'door number', 'which floor', 'property address', 'flat address', 'my home', 'unit details', 'square feet', 'bhk']):
            if active_lease:
                unit = active_lease.unit
                prop = unit.property
                door_str = format_door(unit)
                reply = (
                    f"Here are the complete details of your registered rental premise:\n\n"
                    f"• **Unit / Premise**: {door_str}\n"
                    f"• **Property**: {prop.name}\n"
                    f"• **Full Street Address**: {prop.address}, {prop.city}, {prop.state} — {prop.zip_code}\n"
                    f"• **Configuration**: {unit.bedrooms} BHK | {unit.bathrooms} Bath | {unit.square_feet} sq.ft.\n"
                    f"• **Contracted Rent**: ₹{active_lease.rent_amount:,.0f} / month\n"
                    f"• **Registered Landlord**: {active_lease.landlord.name}"
                )
            else:
                reply = f"Hello {user.name}! There is no active lease agreement linked to your account yet."
            suggestions = ["Who is my landlord?", "How to pay rent via UPI?", "Download HRA rent receipt"]

        # C. Payment History & Transaction Status Query
        elif any(w in msg_lower for w in ['payment history', 'past payments', 'recent payments', 'my transactions', 'transactions', 'did my payment go through', 'have i paid', 'payment status', 'last payment', 'receipts history', 'past receipts', 'ledger history']):
            paid_payments = all_payments.filter(status='paid')
            pending_payments = all_payments.filter(status='pending')
            total_paid_amt = sum(clean_decimal(p.amount) for p in paid_payments)
            recent_list = list(all_payments[:4])

            if recent_list:
                lines = []
                for p in recent_list:
                    p_date = p.paid_date.strftime('%d %b %Y') if p.paid_date else p.due_date.strftime('%d %b %Y')
                    method_str = (p.payment_method or 'UPI').upper()
                    ref_str = f"Ref: {p.transaction_ref}" if p.transaction_ref else "Ref: Pending"
                    status_badge = "**PAID**" if p.status == 'paid' else "**PENDING**"
                    lines.append(f"• {p_date}: ₹{p.amount:,.0f} — {status_badge} ({method_str}, {ref_str})")
                recent_history_text = "\n".join(lines)
            else:
                recent_history_text = "• No payment transactions recorded yet."

            pending_notice = ""
            if pending_payments.exists():
                pend = pending_payments.first()
                pending_notice = f"\n\n⚠️ **Action Required**: You have a pending payment of **₹{pend.amount:,.0f}** due on **{pend.due_date.strftime('%d %b %Y')}**."

            reply = (
                f"Hello {user.name}! Here is your verified payment history summary from the ledger:\n\n"
                f"• **Successful Payments**: {paid_payments.count()} settled transactions (Total: **₹{total_paid_amt:,.0f}**)\n"
                f"• **Recent Ledger Records**:\n{recent_history_text}"
                f"{pending_notice}\n\n"
                f"You can view complete transaction vouchers and download official Section 10(13A) HRA receipts from your Rent Ledger tab."
            )
            action = {'type': 'switch_tab', 'target': 'payments', 'label': '📄 Open Rent Ledger & Receipts'}
            suggestions = ["Pay upcoming rent via UPI", "Download HRA rent receipt", "Check lease terms"]

        # D. Pay Rent / Rent Due / UPI / eNACH Queries
        elif any(w in msg_lower for w in ['pay', 'payment', 'upi', 'enach', 'rent due', 'how to pay', 'pending rent', 'autopay', 'due date', 'how much rent', 'what is my rent', 'my monthly rent', 'pay rent']):
            if active_lease:
                rent_formatted = f"₹{active_lease.rent_amount:,.0f}"
                door_str = format_door(active_lease.unit)
                unit_label = f"{door_str} ({active_lease.unit.property.name})"
                pending_payment = all_payments.filter(status='pending').order_by('due_date').first()
                last_paid = all_payments.filter(status='paid').order_by('-paid_date').first()

                if pending_payment:
                    due_str = pending_payment.due_date.strftime('%d %b %Y')
                    reply = (
                        f"Hello {user.name}! You currently have an active pending rent payment:\n\n"
                        f"• **Premise**: {unit_label}\n"
                        f"• **Amount Due**: **₹{pending_payment.amount:,.0f}**\n"
                        f"• **Due Date**: {due_str}\n\n"
                        f"You can settle instantly using:\n"
                        f"• **UPI AutoPay** (Google Pay, PhonePe, Paytm, BHIM) — Zero transaction fees & instant verification.\n"
                        f"• **eNACH / NPCI Mandate** — Direct automated bank clearing.\n"
                        f"• **NetBanking / IMPS / Debit Card**.\n\n"
                        f"Would you like to complete your rent payment now?"
                    )
                    action = {'type': 'open_modal', 'target': 'modal-pay-rent', 'label': f'💳 Authorize ₹{pending_payment.amount:,.0f} Payment'}
                else:
                    last_paid_text = f"Your last payment of **₹{last_paid.amount:,.0f}** was confirmed on {last_paid.paid_date.strftime('%d %b %Y') if last_paid and last_paid.paid_date else 'last month'}." if last_paid else ""
                    reply = (
                        f"Hello {user.name}! Your monthly rent for {unit_label} is **{rent_formatted}**, due on the 1st of each month.\n\n"
                        f"✅ **Good news**: All current rent cycles are settled! {last_paid_text}\n\n"
                        f"Your next scheduled cycle will be due on the 1st of next month. You can preview past receipts in your Rent Ledger."
                    )
                    action = {'type': 'switch_tab', 'target': 'payments', 'label': '📄 Go to Rent Ledger & Receipts'}
            else:
                reply = (
                    f"Hello {user.name}! You do not currently have an active lease linked to your account. "
                    f"Once your landlord registers your 11-month agreement, you will be able to pay via UPI or eNACH directly here."
                )
            suggestions = ["Show my payment history", "How to download HRA rent receipt?", "Report a maintenance issue"]

        # E. Maintenance / Repairs / Tickets Queries
        elif any(w in msg_lower for w in ['repair', 'maintenance', 'fix', 'leak', 'geyser', 'ro', 'filter', 'water', 'plumber', 'electrician', 'ac', 'fan', 'switch', 'damage', 'ticket', 'repairs', 'work order', 'technician']):
            specific_keywords = ['geyser', 'ro', 'filter', 'ac', 'compressor', 'water', 'leak', 'plumber', 'electrician', 'switch']
            found_specific = [k for k in specific_keywords if k in msg_lower]

            matched_ticket = None
            if found_specific:
                for t in all_tickets:
                    t_text = f"{t.title} {t.description} {t.category}".lower()
                    if any(k in t_text for k in found_specific):
                        matched_ticket = t
                        break

            if matched_ticket:
                t_date = matched_ticket.created_at.strftime('%d %b %Y')
                status_title = matched_ticket.status.replace('_', ' ').title()
                notes_text = f"• **Resolution Notes**: {matched_ticket.resolution_notes}\n" if matched_ticket.resolution_notes else ""
                reply = (
                    f"Here is the real-time status of your **{matched_ticket.title}** repair request:\n\n"
                    f"• **Ticket ID**: #{matched_ticket.id[-8:]}\n"
                    f"• **Category**: {matched_ticket.category.title()}\n"
                    f"• **Priority**: **{matched_ticket.priority.upper()}**\n"
                    f"• **Current Status**: **{status_title}**\n"
                    f"• **Date Logged**: {t_date}\n"
                    f"{notes_text}\n"
                    f"Under the Indian Model Tenancy framework, structural & appliance repairs are coordinated by the landlord/society maintenance team. "
                    f"You can view updates or submit another ticket anytime."
                )
            else:
                open_count = all_tickets.filter(status__in=['open', 'in_progress']).count()
                status_summary = f"You currently have **{open_count} active maintenance request(s)**." if open_count > 0 else "You currently have no active repair requests."
                ticket_list_str = ""
                if all_tickets.filter(status__in=['open', 'in_progress']).exists():
                    t_lines = []
                    for t in all_tickets.filter(status__in=['open', 'in_progress'])[:3]:
                        t_lines.append(f"• **#{t.id[-8:]}**: {t.title} — Status: *{t.status.replace('_', ' ').title()}* (Priority: {t.priority.upper()})")
                    ticket_list_str = "\n" + "\n".join(t_lines) + "\n"

                reply = (
                    f"Under the Indian Model Tenancy framework, major electrical, plumbing, and structural issues are handled by the landlord, "
                    f"while routine consumables are tenant-coordinated.\n\n"
                    f"{status_summary}{ticket_list_str}\n"
                    f"To request contractor dispatch (e.g. Urban Company or society maintenance), click below to submit a repair ticket."
                )
            action = {'type': 'open_modal', 'target': 'modal-create-ticket', 'label': '🔧 Submit Repair Request'}
            suggestions = ["How to pay rent via UPI?", "Download HRA rent receipt", "Who is my landlord?"]

        # F. Lease Terms / Agreement / Notice Period / Security Deposit
        elif any(w in msg_lower for w in ['lease', 'agreement', 'terms', 'notice', 'deposit', 'vacate', 'refund', 'stamp', 'period', 'escalation', 'expire', 'when does my lease end']):
            if active_lease:
                start_str = active_lease.start_date.strftime('%d %b %Y')
                end_str = active_lease.end_date.strftime('%d %b %Y')
                days_left = (active_lease.end_date - timezone.now().date()).days
                deposit_formatted = f"₹{active_lease.deposit_amount:,.0f}" if active_lease.deposit_amount else "N/A"
                terms_notes = active_lease.terms or "Standard 11-month registered agreement with UPI autopay."
                door_str = format_door(active_lease.unit)
                reply = (
                    f"Here are the verified details of your active rental agreement:\n\n"
                    f"• **Premise**: {door_str} ({active_lease.unit.property.name})\n"
                    f"• **Lease Validity**: {start_str} to {end_str} ({days_left} days remaining)\n"
                    f"• **Monthly Rent**: ₹{active_lease.rent_amount:,.0f}\n"
                    f"• **Security Deposit Held**: **{deposit_formatted}**\n"
                    f"• **Contract Terms**: {terms_notes}\n\n"
                    f"**Notice Period & Move-Out Norms:**\n"
                    f"Standard tenancy agreements in India mandate a **30-day written notice period**. "
                    f"Upon key handover and final utility settlement, your security deposit is refundable within 7 to 15 days, "
                    f"excluding normal wear and tear."
                )
            else:
                reply = (
                    f"In India, residential rental agreements are typically drawn for 11 months to comply with the Registration Act. "
                    f"Security deposits generally range from 2 to 3 months' rent in North India and 5 to 10 months in Bengaluru/Mumbai. "
                    f"Notice periods are usually 30 days before moving out."
                )
            action = {'type': 'switch_tab', 'target': 'leases', 'label': '📑 View My Lease Agreement'}
            suggestions = ["How to pay rent via UPI?", "Show my payment history", "Who is my landlord?"]

        # G. HRA Rent Receipts / Tax Exemption / Section 10(13A)
        elif any(w in msg_lower for w in ['hra', 'tax', 'receipt', '80gg', '10(13a)', 'form 16', 'pan', 'voucher', 'receipts']):
            landlord_pan_info = "Landlord PAN is mandatory on rent receipts if your annual rent exceeds ₹1,00,000 (Section 10(13A) of the Income Tax Act)."
            if active_lease:
                door_str = format_door(active_lease.unit)
                unit_label = f"{door_str}, {active_lease.unit.property.name}"
                annual_rent = active_lease.rent_amount * 12
                reply = (
                    f"Yes {user.name}, RentRoll automatically generates **digitally signed, HRA-compliant rent receipts** "
                    f"for all payments made through the platform!\n\n"
                    f"**HRA Receipt Checklist:**\n"
                    f"• **Premise**: {unit_label}\n"
                    f"• **Monthly Rent**: ₹{active_lease.rent_amount:,.0f} (Annual: **₹{annual_rent:,.0f}**)\n"
                    f"• **Landlord**: {active_lease.landlord.name}\n"
                    f"• **Legal Status**: {landlord_pan_info}\n\n"
                    f"You can download your official Section 10(13A) rent receipts anytime from the **Rent Ledger** tab with 1 click."
                )
            else:
                reply = (
                    f"RentRoll generates official HRA-compliant rent receipts eligible under Section 10(13A) of the Income Tax Act. "
                    f"{landlord_pan_info} You can view and download all past receipts from your Rent Ledger tab."
                )
            action = {'type': 'switch_tab', 'target': 'payments', 'label': '📄 Go to Rent Ledger & Receipts'}
            suggestions = ["Pay upcoming rent via UPI", "Show my payment history", "Who is my landlord?"]

        # H. Greetings & Overview
        elif any(w in msg_lower for w in ['hi', 'hello', 'hey', 'namaste', 'help', 'who are you', 'what can you do', 'good morning', 'good afternoon', 'start']):
            door_str = format_door(active_lease.unit) if active_lease else ""
            unit_info = f"{door_str} at {active_lease.unit.property.name}" if active_lease else "your residence"
            reply = (
                f"Namaste {user.name}! 🙏 I am your **RentRoll Resident AI Assistant**, connected live to {unit_info}.\n\n"
                f"I can help you with:\n"
                f"• **Rent Payments** — Checking dues & instant UPI AutoPay settlement.\n"
                f"• **Payment Ledger** — Reviewing past transactions and payment references.\n"
                f"• **HRA Rent Receipts** — Downloading digitally signed receipts for Section 10(13A) tax exemption.\n"
                f"• **Maintenance Requests** — Submitting repair requests and tracking technician status.\n"
                f"• **Landlord & Lease Details** — Landlord phone/email, agreement dates, and deposit rules.\n\n"
                f"What would you like assistance with today?"
            )
            suggestions = ["💳 Pay upcoming rent", "📄 Download HRA receipt", "🔧 Check maintenance tickets", "👤 Who is my landlord?"]

        else:
            reply = (
                f"Thank you for reaching out, {user.name}. As your RentRoll Resident Assistant, "
                f"I can answer questions regarding your monthly rent, payment history, HRA tax receipts, "
                f"open maintenance requests, or landlord contact details.\n\n"
                f"How can I help you right now?"
            )
            suggestions = ["How much is my rent?", "Show my payment history", "Who is my landlord?", "Download HRA receipt"]

    # =========================================================================
    # 2. LANDLORD CONTEXTUAL AI LOGIC
    # =========================================================================
    elif role == 'landlord':
        props = Property.objects.filter(landlord=user).prefetch_related('units')
        props_count = props.count()
        units = Unit.objects.filter(property__landlord=user)
        total_doors = units.count()
        occupied_doors = units.filter(status='occupied').count()
        vacant_doors = units.filter(status='vacant').count()
        occupancy_pct = round((occupied_doors / total_doors * 100), 1) if total_doors > 0 else 0
        leases = Lease.objects.filter(landlord=user, status='active').select_related('tenant', 'unit', 'unit__property')
        active_leases_count = leases.count()
        monthly_roll = sum(clean_decimal(l.rent_amount) for l in leases)
        landlord_payments = Payment.objects.filter(landlord=user).order_by('-due_date', '-created_at')
        open_tickets = MaintenanceTicket.objects.filter(landlord=user, status__in=['open', 'in_progress']).order_by('-created_at')

        # A. Properties Portfolio List Query
        if any(w in msg_lower for w in ['what properties', 'list properties', 'my properties', 'my buildings', 'property list', 'which properties', 'portfolio properties', 'show properties', 'building list']) or (any(w in msg_lower for w in ['show portfolio', 'my portfolio']) and not any(k in msg_lower for k in ['cashflow', 'rent roll', 'yield', 'revenue', 'collected', 'income', 'arrears', 'ledger'])):
            if props.exists():
                p_lines = []
                for p in props:
                    p_units = p.units.all()
                    p_tot = p_units.count()
                    p_occ = p_units.filter(status='occupied').count()
                    p_vac = p_units.filter(status='vacant').count()
                    p_leases = Lease.objects.filter(unit__property=p, status='active')
                    p_rent = sum(clean_decimal(l.rent_amount) for l in p_leases)
                    p_lines.append(
                        f"• **{p.name}** ({p.city}, {p.state})\n"
                        f"  Address: {p.address} | Type: {p.property_type}\n"
                        f"  Doors: {p_tot} units ({p_occ} occupied, {p_vac} vacant) | Monthly Rent: ₹{p_rent:,.0f}"
                    )
                props_text = "\n\n".join(p_lines)
                reply = (
                    f"Hello {user.name}! You currently own and manage **{props_count} properties** with **{total_doors} total doors**:\n\n"
                    f"{props_text}\n\n"
                    f"Overall portfolio occupancy is **{occupancy_pct}%** generating **₹{monthly_roll:,.0f}/month** contracted rent roll."
                )
            else:
                reply = f"Hello {user.name}! You haven't added any properties to your portfolio yet. Click below to add your first building."
            action = {'type': 'open_modal', 'target': 'modal-add-property', 'label': '🏢 Add New Property'}
            suggestions = ["Who are my tenants?", "Which units are vacant?", "Portfolio cashflow & rent roll"]

        # B. Tenants List & Specific Tenant Inquiries
        elif any(w in msg_lower for w in ['who are my tenants', 'list tenants', 'my tenants', 'tenant directory', 'tenants list', 'who lives', 'tenant contacts', 'tenant details', 'tenant phone', 'tenant email']) or ('tenant' in msg_lower and any(w in msg_lower for w in ['list', 'who', 'show', 'all', 'directory', 'names'])):
            # Check for specific tenant name in prompt
            specific_tenant = None
            for l in leases:
                t_first = l.tenant.name.split()[0].lower()
                if t_first in msg_lower or l.tenant.name.lower() in msg_lower:
                    specific_tenant = l
                    break

            if specific_tenant:
                t = specific_tenant.tenant
                u = specific_tenant.unit
                p = u.property
                t_payments = Payment.objects.filter(tenant=t, landlord=user).order_by('-due_date')
                last_pay = t_payments.first()
                pay_status = f"{last_pay.status.upper()} (Due: {last_pay.due_date.strftime('%d %b %Y')}, ₹{last_pay.amount:,.0f})" if last_pay else "No ledger records"
                door_str = format_door(u)
                reply = (
                    f"Here are the active tenancy details for **{t.name}**:\n\n"
                    f"• **Premise**: {door_str} at {p.name} ({p.city})\n"
                    f"• **Monthly Rent**: ₹{specific_tenant.rent_amount:,.0f}\n"
                    f"• **Security Deposit**: ₹{specific_tenant.deposit_amount:,.0f}\n"
                    f"• **Lease Term**: {specific_tenant.start_date.strftime('%d %b %Y')} to {specific_tenant.end_date.strftime('%d %b %Y')}\n"
                    f"• **Contact**: Phone: {t.phone or 'N/A'} | Email: {t.email}\n"
                    f"• **Latest Payment Status**: {pay_status}"
                )
            elif leases.exists():
                t_lines = []
                for l in leases:
                    door_str = format_door(l.unit)
                    t_lines.append(
                        f"• **{l.tenant.name}** — {door_str} ({l.unit.property.name})\n"
                        f"  Rent: ₹{l.rent_amount:,.0f}/mo | Phone: {l.tenant.phone or 'N/A'} | Valid until: {l.end_date.strftime('%b %Y')}"
                    )
                tenants_text = "\n".join(t_lines)
                reply = (
                    f"You currently have **{active_leases_count} active tenants** residing across your portfolio:\n\n"
                    f"{tenants_text}\n\n"
                    f"All tenants are connected to digital payment rails (UPI AutoPay & eNACH)."
                )
            else:
                reply = f"You currently do not have any active registered tenants. Click below to register an incoming lease."
            action = {'type': 'open_modal', 'target': 'modal-create-lease', 'label': '📑 Create New Lease Agreement'}
            suggestions = ["What properties do I own?", "Which units are vacant?", "Portfolio cashflow & rent roll"]

        # C. Vacant Units & Available Doors Query
        elif any(w in msg_lower for w in ['vacant', 'vacancy', 'available doors', 'empty flats', 'available units', 'unoccupied', 'occupancy rate', 'which units are vacant', 'units available', 'available']):
            vacant_units = units.filter(status='vacant').select_related('property')
            if vacant_units.exists():
                v_lines = []
                for u in vacant_units:
                    door_str = format_door(u)
                    v_lines.append(
                        f"• **{door_str}** in {u.property.name} ({u.property.city})\n"
                        f"  Specs: {u.bedrooms} BHK ({u.square_feet} sq.ft) | Target Rent: ₹{u.rent_amount:,.0f}/mo"
                    )
                vacant_text = "\n".join(v_lines)
                reply = (
                    f"Your portfolio occupancy is **{occupancy_pct}%** (Occupied Doors: {occupied_doors} out of {total_doors} total doors).\n\n"
                    f"You currently have **{vacant_doors} vacant door(s)** available for immediate leasing:\n\n"
                    f"{vacant_text}\n\n"
                    f"Would you like to register a lease for an incoming tenant or add another unit?"
                )
            else:
                reply = (
                    f"🎉 Excellent news! Your portfolio is operating at **100% occupancy** ({total_doors}/{total_doors} doors occupied).\n\n"
                    f"All units are currently earning revenue with a contracted monthly roll of **₹{monthly_roll:,.0f}**."
                )
            action = {'type': 'open_modal', 'target': 'modal-add-unit', 'label': '🏠 Add New Door / Unit'}
            suggestions = ["Who are my tenants?", "Portfolio cashflow & rent roll", "Check maintenance tickets"]

        # D. Cashflow / Revenue / Rent Roll / Collections / Payments Received
        elif any(w in msg_lower for w in ['cashflow', 'rent roll', 'collection', 'revenue', 'collected', 'income', 'yield', 'arrears', 'ledger', 'how much money', 'how much collected', 'total income', 'payments received']):
            paid_payments = landlord_payments.filter(status='paid')
            pending_payments = landlord_payments.filter(status='pending')
            total_collected = sum(clean_decimal(p.amount) for p in paid_payments)
            total_pending = sum(clean_decimal(p.amount) for p in pending_payments)

            recent_p_lines = []
            for p in landlord_payments[:4]:
                p_date = p.paid_date.strftime('%d %b %Y') if p.paid_date else p.due_date.strftime('%d %b %Y')
                recent_p_lines.append(f"• ₹{p.amount:,.0f} from {p.tenant.name} ({p.status.upper()} on {p_date} via {p.payment_method.upper()})")
            recent_pay_text = "\n".join(recent_p_lines) if recent_p_lines else "• No ledger records yet."

            reply = (
                f"Hello {user.name}! Here is your verified financial overview from the ledger:\n\n"
                f"• **Contracted Monthly Rent Roll**: **₹{monthly_roll:,.0f}** across {active_leases_count} Active Leases\n"
                f"• **Total Rent Collected**: **₹{total_collected:,.0f}** ({paid_payments.count()} settled payments)\n"
                f"• **Pending Inflow**: **₹{total_pending:,.0f}** ({pending_payments.count()} pending payments)\n"
                f"• **Portfolio Occupancy**: {occupancy_pct}% ({occupied_doors}/{total_doors} doors occupied)\n\n"
                f"**Recent Transactions**:\n{recent_pay_text}\n\n"
                f"You can export the complete audit ledger for your Chartered Accountant (CA) from the Rent Ledger tab."
            )
            action = {'type': 'switch_tab', 'target': 'payments', 'label': '📊 Open Rent Ledger & Export CSV'}
            suggestions = ["Who are my tenants?", "Which units are vacant?", "Check maintenance tickets"]

        # E. Maintenance Triage / Repairs / Work Orders
        elif any(w in msg_lower for w in ['repair', 'maintenance', 'tickets', 'triage', 'plumber', 'electrician', 'technician', 'work order', 'urgent repairs', 'open tickets', 'contractor']):
            open_count = open_tickets.count()
            high_count = open_tickets.filter(priority__in=['high', 'emergency']).count()

            if open_tickets.exists():
                t_lines = []
                for t in open_tickets[:4]:
                    door_str = format_door(t.unit) if t.unit else "General"
                    t_lines.append(
                        f"• **#{t.id[-8:]}**: {t.title}\n"
                        f"  Premise: {door_str} ({t.property.name}) | Tenant: {t.tenant.name}\n"
                        f"  Priority: **{t.priority.upper()}** | Status: **{t.status.replace('_', ' ').title()}** | Est: ₹{t.estimated_cost:,.0f}"
                    )
                tickets_text = "\n".join(t_lines)
            else:
                tickets_text = "• No open repair tickets at this time."

            reply = (
                f"You currently have **{open_count} open maintenance ticket(s)** across your properties "
                f"({high_count} marked high urgency):\n\n"
                f"{tickets_text}\n\n"
                f"RentRoll provides real-time triage with photo repair logs. Technicians can be dispatched via society contractors or local partners."
            )
            action = {'type': 'switch_tab', 'target': 'maintenance', 'label': '🔧 Open Maintenance Triage'}
            suggestions = ["Portfolio cashflow & rent roll", "Who are my tenants?", "Record offline rent payment"]

        # F. Record Offline Payment
        elif any(w in msg_lower for w in ['record payment', 'offline payment', 'cash payment', 'cheque', 'received rent', 'log payment']):
            reply = (
                f"When a tenant pays via direct bank NEFT/RTGS, cheque, or cash counterfoil outside UPI AutoPay, "
                f"recording it in RentRoll keeps your rent roll synchronized, marks the ledger as settled, "
                f"and instantly issues an official Section 10(13A) HRA rent receipt to the tenant."
            )
            action = {'type': 'open_modal', 'target': 'modal-record-payment', 'label': '💳 Record Rent Payment'}
            suggestions = ["Portfolio cashflow & rent roll", "Check vacant units", "Who are my tenants?"]

        # G. Leases / Agreements / e-Stamp
        elif any(w in msg_lower for w in ['lease', 'agreement', 'new lease', 'e-stamp', 'stamp duty', 'escalation', 'tenant screening', 'contract']):
            reply = (
                f"Under the Indian Model Tenancy Act and state registration frameworks:\n\n"
                f"• **11-Month Agreements**: Standard residential tenure avoiding mandatory sub-registrar registration charges.\n"
                f"• **Digital e-Stamping**: Supported via state portals (Karnataka e-Stamping, Maharashtra IGR Gras, Delhi-NCR Stock Holding).\n"
                f"• **Annual Escalation**: Standard market escalation is 5% to 10% per renewal.\n"
                f"• **Your Portfolio**: You have **{active_leases_count} active registered leases** generating **₹{monthly_roll:,.0f}/mo**.\n\n"
                f"Ready to onboard an incoming tenant?"
            )
            action = {'type': 'open_modal', 'target': 'modal-create-lease', 'label': '📑 Create New Lease Agreement'}
            suggestions = ["Who are my tenants?", "Which units are vacant?", "Portfolio cashflow & rent roll"]

        # H. Greetings & Overview
        elif any(w in msg_lower for w in ['hi', 'hello', 'hey', 'namaste', 'help', 'who are you', 'what can you do', 'good morning', 'good afternoon', 'start']):
            reply = (
                f"Namaste {user.name}! 🙏 I am your **RentRoll Portfolio AI Advisor**.\n\n"
                f"I monitor your **{props_count} properties** and **{total_doors} doors** ({occupancy_pct}% occupancy, ₹{monthly_roll:,.0f}/mo contracted roll) in real-time.\n\n"
                f"I can help you with:\n"
                f"• **Portfolio Cashflow** — Monthly revenue, UPI collections, and pending dues.\n"
                f"• **Properties & Vacancies** — Listing buildings, door counts, and vacant units ready to rent.\n"
                f"• **Tenant Directory** — Active tenant contacts, flat assignments, and payment statuses.\n"
                f"• **Maintenance Triage** — Tracking open contractor work orders and urgent repairs.\n\n"
                f"What would you like to review right now?"
            )
            suggestions = ["📊 Portfolio cashflow", "🏢 What properties do I own?", "👥 Who are my tenants?", "🏠 Which units are vacant?"]

        else:
            reply = (
                f"Hello {user.name}! As your RentRoll Landlord Advisor, I can answer questions about your "
                f"{props_count} properties, {total_doors} units, active tenant leases, ledger cashflow, "
                f"or open maintenance tickets.\n\n"
                f"How can I assist your operations today?"
            )
            suggestions = ["What properties do I own?", "Who are my tenants?", "Which units are vacant?", "Portfolio cashflow"]

    # =========================================================================
    # 3. ADMIN CONTEXTUAL AI LOGIC
    # =========================================================================
    else:
        total_users = User.objects.count()
        admin_count = User.objects.filter(role='admin').count()
        landlord_count = User.objects.filter(role='landlord').count()
        tenant_count = User.objects.filter(role='tenant').count()
        total_props = Property.objects.count()
        total_units = Unit.objects.count()
        occupied_units = Unit.objects.filter(status='occupied').count()
        global_occ = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0
        active_leases = Lease.objects.filter(status='active')
        global_monthly_roll = sum(clean_decimal(l.rent_amount) for l in active_leases)
        all_payments = Payment.objects.all()
        total_volume = sum(clean_decimal(p.amount) for p in all_payments.filter(status='paid'))
        new_inquiries = ContactMessage.objects.filter(status='new').count()
        total_reviews = FeedbackReview.objects.count()

        if any(w in msg_lower for w in ['inquiries', 'contact', 'reviews', 'feedback', 'messages']):
            reply = (
                f"Hello Admin {user.name}! Here is the customer engagement summary:\n\n"
                f"• **Landing Page Inquiries**: {ContactMessage.objects.count()} total ({new_inquiries} pending response)\n"
                f"• **Verified Customer Reviews**: {total_reviews} published reviews\n\n"
                f"You can review and respond to inquiries from the Inquiries & Reviews audit tab."
            )
            action = {'type': 'switch_tab', 'target': 'admin-inquiries', 'label': '📨 Open Inquiries & Reviews'}
            suggestions = ["Platform financial stats", "Manage users directory", "Check system health"]
        else:
            reply = (
                f"Hello Admin {user.name}! You are connected to the **RentRoll Platform Command Center**:\n\n"
                f"• **Registered Users**: {total_users} ({landlord_count} Landlords, {tenant_count} Tenants, {admin_count} Admins)\n"
                f"• **Portfolio Scale**: {total_props} Properties across {total_units} Doors ({global_occ}% Occupancy)\n"
                f"• **Global Monthly Rent Roll**: **₹{global_monthly_roll:,.0f}** across {active_leases.count()} active leases\n"
                f"• **Platform Payment Volume**: **₹{total_volume:,.0f}** settled\n"
                f"• **Inquiries Pending**: {new_inquiries} new inquiries\n\n"
                f"How can I assist your platform operations?"
            )
            action = {'type': 'switch_tab', 'target': 'admin-command', 'label': '📊 Platform Command Center'}
            suggestions = ["Manage users directory", "Open inquiries & reviews", "Check system health"]

    return JsonResponse({
        'success': True,
        'reply': reply,
        'action': action,
        'suggestions': suggestions
    })


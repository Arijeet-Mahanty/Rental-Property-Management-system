import json
import time
import datetime
from decimal import Decimal
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Q

from .models import (
    User, Property, Unit, Lease, Payment, MaintenanceTicket, ContactMessage, FeedbackReview
)
from .auth_utils import (
    hash_password, verify_password, generate_jwt_token, get_authenticated_user
)

def decimal_to_float(val):
    if val is None:
        return 0.0
    return float(val)

def serialize_user(user):
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'phone': user.phone or '',
        'avatar_url': user.avatar_url or ''
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
    if user.role == 'landlord':
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
                'unitName': unit.unit_number if unit else 'Flat 4B',
                'propertyName': prop.name if prop else 'Gulmohar Residency',
                'address': f"{prop.address}, {prop.city}, {prop.state}" if prop else '14th Main, 4th Block, Koramangala, Bengaluru, KA'
            } if active_lease else None,
            'monthlyRent': float(active_lease.rent_amount) if active_lease else 28500,
            'nextDueDate': str(next_pending.due_date) if next_pending else '2026-11-01',
            'nextAmountDue': float(next_pending.amount) if next_pending else 28500,
            'lastPaidAmount': float(last_payment.amount) if last_payment else 28500,
            'lastPaidDate': last_payment.paid_date.isoformat() if (last_payment and last_payment.paid_date) else '2026-10-01',
            'openTicketsCount': open_tickets,
            'totalTicketsCount': tickets.count()
        }


# ============================================================================
# API VIEWS
# ============================================================================

def health_check_view(request):
    """GET /api/health"""
    return JsonResponse({
        'status': 'healthy',
        'application': 'RentRoll Property Management System',
        'phase': 'Phase 3 (Production Django Backend)',
        'database': 'sqlite3 (relational)',
        'region': 'India (INR)',
        'timestamp': timezone.now().isoformat()
    })


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

    if User.objects.filter(email=email).exists():
        return JsonResponse({'success': False, 'message': 'An account with this email address already exists. Please log in.'}, status=409)

    hashed = hash_password(password)
    user = User.objects.create(
        name=name,
        email=email,
        password_hash=hashed,
        role='tenant' if role == 'tenant' else 'landlord',
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

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({'success': False, 'message': 'Invalid email or password. Please verify your credentials.'}, status=401)

    if not verify_password(password, user.password_hash, user.email):
        return JsonResponse({'success': False, 'message': 'Invalid email or password. Please verify your credentials.'}, status=401)

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
    return JsonResponse({'success': True, 'user': user_data})


def dashboard_stats_view(request):
    """GET /api/dashboard/stats"""
    user = get_authenticated_user(request)
    if not user:
        # Fallback to demo landlord if preview
        user = User.objects.filter(id='usr_landlord_demo').first()
        if not user:
            return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)

    stats = compute_dashboard_stats(user)
    return JsonResponse({'success': True, 'data': stats})


@csrf_exempt
def properties_view(request):
    """GET & POST /api/properties"""
    user = get_authenticated_user(request)
    if not user:
        user = User.objects.filter(id='usr_landlord_demo').first()

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})
        props = Property.objects.filter(landlord=user)
        return JsonResponse({'success': True, 'data': [serialize_property(p) for p in props]})

    elif request.method == 'POST':
        if not user or user.role != 'landlord':
            return JsonResponse({'success': False, 'message': 'Unauthorized: Landlord access required.'}, status=403)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        name = (body.get('name') or '').strip()
        address = (body.get('address') or '').strip()
        city = (body.get('city') or '').strip()
        state = (body.get('state') or '').strip().upper()
        zip_code = (body.get('zip_code') or '').strip()
        property_type = body.get('property_type') or 'Apartment Society'

        if not name or not address or not city or not state or not zip_code:
            return JsonResponse({'success': False, 'message': 'Name, address, city, state, and zip code are required.'}, status=400)

        prop = Property.objects.create(
            landlord=user,
            name=name,
            address=address,
            city=city,
            state=state,
            zip_code=zip_code,
            property_type=property_type
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
    if not user:
        user = User.objects.filter(id='usr_landlord_demo').first()

    prop = Property.objects.filter(id=property_id).first()
    if not prop:
        return JsonResponse({'success': False, 'message': 'Property not found.'}, status=404)

    if request.method == 'GET':
        data = serialize_property(prop)
        data['units'] = [serialize_unit(u) for u in prop.units.all()]
        return JsonResponse({'success': True, 'data': data})

    elif request.method == 'DELETE':
        if not user or prop.landlord_id != user.id:
            return JsonResponse({'success': False, 'message': 'Unauthorized to delete this property.'}, status=403)
        prop.delete()
        return JsonResponse({'success': True, 'message': 'Property deleted successfully.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def units_view(request):
    """GET & POST /api/units"""
    user = get_authenticated_user(request)
    if not user:
        user = User.objects.filter(id='usr_landlord_demo').first()

    if request.method == 'GET':
        property_id = request.GET.get('propertyId')
        qs = Unit.objects.all()

        if property_id:
            qs = qs.filter(property_id=property_id)
        elif user and user.role == 'landlord':
            qs = qs.filter(property__landlord=user)

        return JsonResponse({'success': True, 'data': [serialize_unit(u) for u in qs]})

    elif request.method == 'POST':
        if not user or user.role != 'landlord':
            return JsonResponse({'success': False, 'message': 'Unauthorized: Landlord access required.'}, status=403)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        property_id = body.get('property_id')
        unit_number = (body.get('unit_number') or '').strip()
        rent_amount = body.get('rent_amount')

        if not property_id or not unit_number or not rent_amount:
            return JsonResponse({'success': False, 'message': 'Property, unit number, and rent amount are required.'}, status=400)

        prop = Property.objects.filter(id=property_id, landlord=user).first()
        if not prop:
            return JsonResponse({'success': False, 'message': 'Property not found or unauthorized.'}, status=404)

        deposit_amount = body.get('deposit_amount') or rent_amount
        unit = Unit.objects.create(
            property=prop,
            unit_number=unit_number,
            bedrooms=int(body.get('bedrooms') or 1),
            bathrooms=Decimal(str(body.get('bathrooms') or 1.0)),
            square_feet=int(body.get('square_feet') or 750),
            rent_amount=Decimal(str(rent_amount)),
            deposit_amount=Decimal(str(deposit_amount)),
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
    unit = Unit.objects.filter(id=unit_id).first()
    if not unit:
        return JsonResponse({'success': False, 'message': 'Unit not found.'}, status=404)

    if user and user.role == 'landlord' and unit.property.landlord_id != user.id:
        return JsonResponse({'success': False, 'message': 'Unauthorized to edit this unit.'}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        body = {}

    if 'unit_number' in body:
        unit.unit_number = str(body['unit_number']).strip()
    if 'bedrooms' in body:
        unit.bedrooms = int(body['bedrooms'])
    if 'bathrooms' in body:
        unit.bathrooms = Decimal(str(body['bathrooms']))
    if 'square_feet' in body:
        unit.square_feet = int(body['square_feet'])
    if 'rent_amount' in body:
        unit.rent_amount = Decimal(str(body['rent_amount']))
    if 'deposit_amount' in body:
        unit.deposit_amount = Decimal(str(body['deposit_amount']))
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
    if not user:
        user = User.objects.filter(id='usr_landlord_demo').first()

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})

        if user.role == 'landlord':
            leases = Lease.objects.filter(landlord=user)
        else:
            leases = Lease.objects.filter(tenant=user)

        return JsonResponse({'success': True, 'data': [serialize_lease(l) for l in leases]})

    elif request.method == 'POST':
        if not user or user.role != 'landlord':
            return JsonResponse({'success': False, 'message': 'Unauthorized: Landlord access required.'}, status=403)

        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        unit_id = body.get('unit_id')
        start_date = body.get('start_date')
        end_date = body.get('end_date')
        rent_amount = body.get('rent_amount')

        if not unit_id or not start_date or not end_date or not rent_amount:
            return JsonResponse({'success': False, 'message': 'Unit, start date, end date, and rent amount are required.'}, status=400)

        unit = Unit.objects.filter(id=unit_id, property__landlord=user).first()
        if not unit:
            return JsonResponse({'success': False, 'message': 'Unit not found or unauthorized.'}, status=404)

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
            # Auto-create resident account
            tenant = User.objects.create(
                name=tenant_name or 'Resident Tenant',
                email=tenant_email or f"tenant_{int(time.time())}@example.in",
                password_hash=hash_password('Password123!'),
                role='tenant',
                phone=(body.get('tenant_phone') or '').strip() or None
            )

        deposit_amount = body.get('deposit_amount') or rent_amount
        lease = Lease.objects.create(
            unit=unit,
            tenant=tenant,
            landlord=user,
            start_date=start_date,
            end_date=end_date,
            rent_amount=Decimal(str(rent_amount)),
            deposit_amount=Decimal(str(deposit_amount)),
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
def payments_view(request):
    """GET & POST /api/payments"""
    user = get_authenticated_user(request)
    if not user:
        user = User.objects.filter(id='usr_landlord_demo').first()

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})

        if user.role == 'landlord':
            qs = Payment.objects.filter(landlord=user)
        else:
            qs = Payment.objects.filter(tenant=user)

        status_filter = request.GET.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)

        return JsonResponse({'success': True, 'data': [serialize_payment(p) for p in qs]})

    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        amount = body.get('amount')
        if not amount or float(amount) <= 0:
            return JsonResponse({'success': False, 'message': 'A valid payment amount is required.'}, status=400)

        # Determine payer & landlord
        if user and user.role == 'tenant':
            tenant = user
            landlord = User.objects.filter(id='usr_landlord_demo').first()
            if not landlord:
                landlord = User.objects.filter(role='landlord').first()
        else:
            tenant_id = body.get('tenant_id')
            tenant = User.objects.filter(id=tenant_id).first() if tenant_id else User.objects.filter(id='usr_tenant_demo').first()
            landlord = user if (user and user.role == 'landlord') else User.objects.filter(id='usr_landlord_demo').first()

        lease_id = body.get('lease_id')
        lease = Lease.objects.filter(id=lease_id).first() if lease_id else Lease.objects.filter(tenant=tenant).first()

        due_date = body.get('due_date') or str(datetime.date.today())
        payment = Payment.objects.create(
            lease=lease,
            tenant=tenant,
            landlord=landlord,
            amount=Decimal(str(amount)),
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
def maintenance_view(request):
    """GET & POST /api/maintenance"""
    user = get_authenticated_user(request)
    if not user:
        user = User.objects.filter(id='usr_landlord_demo').first()

    if request.method == 'GET':
        if not user:
            return JsonResponse({'success': True, 'data': []})

        if user.role == 'landlord':
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
        try:
            body = json.loads(request.body)
        except Exception:
            body = request.POST

        title = (body.get('title') or '').strip()
        description = (body.get('description') or '').strip()

        if not title or not description:
            return JsonResponse({'success': False, 'message': 'Title and description are required.'}, status=400)

        # Deduce tenant, landlord, unit, property
        if user and user.role == 'tenant':
            tenant = user
            active_lease = Lease.objects.filter(tenant=user, status='active').first()
            unit = active_lease.unit if active_lease else None
            prop = unit.property if unit else Property.objects.first()
            landlord = active_lease.landlord if active_lease else (prop.landlord if prop else User.objects.filter(role='landlord').first())
        else:
            landlord = user if (user and user.role == 'landlord') else User.objects.filter(role='landlord').first()
            tenant = User.objects.filter(id='usr_tenant_demo').first()
            unit_id = body.get('unit_id')
            unit = Unit.objects.filter(id=unit_id).first() if unit_id else Unit.objects.first()
            prop = unit.property if unit else Property.objects.first()

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
            estimated_cost=Decimal(str(body.get('estimated_cost') or 0))
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
    tkt = MaintenanceTicket.objects.filter(id=ticket_id).first()
    if not tkt:
        return JsonResponse({'success': False, 'message': 'Ticket not found.'}, status=404)

    try:
        body = json.loads(request.body)
    except Exception:
        body = {}

    if 'status' in body:
        tkt.status = body['status']
    if 'resolution_notes' in body:
        tkt.resolution_notes = body['resolution_notes']
    if 'estimated_cost' in body:
        tkt.estimated_cost = Decimal(str(body['estimated_cost']))
    if 'actual_cost' in body:
        tkt.actual_cost = Decimal(str(body['actual_cost']))
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
        return JsonResponse({
            'success': True,
            'reviews': [serialize_review(r) for r in reviews]
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

        return JsonResponse({
            'success': True,
            'message': 'Thank you for your feedback! Your review has been published.',
            'review': serialize_review(rev)
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

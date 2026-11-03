import json
from django.test import TestCase, Client
from django.urls import reverse
from django.core.management import call_command
from api.models import (
    User, Property, Unit, Lease, Payment, MaintenanceTicket, ContactMessage, FeedbackReview
)
from api.auth_utils import hash_password, generate_jwt_token

class RentRollBackendPhase3Tests(TestCase):
    def setUp(self):
        self.client = Client()
        self.password_hash = hash_password('Password123!')

        # Seed test Indian users
        self.landlord = User.objects.create(
            id='usr_landlord_demo',
            name='Rajesh Sharma',
            email='landlord@rentroll.com',
            password_hash=self.password_hash,
            role='landlord',
            phone='+91 98201 23456'
        )

        self.tenant = User.objects.create(
            id='usr_tenant_demo',
            name='Priya Iyer',
            email='tenant@rentroll.com',
            password_hash=self.password_hash,
            role='tenant',
            phone='+91 98450 87654'
        )

        self.admin = User.objects.create(
            id='usr_admin_demo',
            name='Arjun Singhania',
            email='admin@rentroll.com',
            password_hash=self.password_hash,
            role='admin',
            phone='+91 98100 00001'
        )

        self.property = Property.objects.create(
            id='prop_1',
            landlord=self.landlord,
            name='Gulmohar Residency',
            address='42, 80 Feet Road, 4th Block, Koramangala',
            city='Bengaluru',
            state='KA',
            zip_code='560034',
            property_type='Apartment Society'
        )

        self.unit = Unit.objects.create(
            id='unit_104',
            property=self.property,
            unit_number='Flat 4B',
            bedrooms=2,
            bathrooms=2.0,
            square_feet=1100,
            rent_amount=28500,
            deposit_amount=85500,
            status='occupied'
        )

        self.lease = Lease.objects.create(
            id='lease_1',
            unit=self.unit,
            tenant=self.tenant,
            landlord=self.landlord,
            start_date='2026-02-01',
            end_date='2027-01-31',
            rent_amount=28500,
            deposit_amount=85500,
            status='active'
        )

        self.landlord_token = generate_jwt_token(self.landlord)
        self.tenant_token = generate_jwt_token(self.tenant)
        self.admin_token = generate_jwt_token(self.admin)

    # 1. Health Check
    def test_health_check(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertIn('Phase 3', data.get('phase'))

    # 2. Authentication
    def test_landlord_login_success(self):
        res = self.client.post('/api/auth/login', {
            'email': 'landlord@rentroll.com',
            'password': 'Password123!'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('user', {}).get('name'), 'Rajesh Sharma')
        self.assertIsNotNone(data.get('token'))

    def test_login_invalid_password(self):
        res = self.client.post('/api/auth/login', {
            'email': 'landlord@rentroll.com',
            'password': 'WrongPassword999'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data.get('success'))

    def test_signup_new_user(self):
        res = self.client.post('/api/auth/signup', {
            'name': 'Aarav Verma',
            'email': 'aarav.verma@example.in',
            'password': 'SecurePassword123!',
            'role': 'landlord',
            'phone': '+91 98765 11223'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get('success'))
        user = User.objects.get(email='aarav.verma@example.in')
        self.assertEqual(user.name, 'Aarav Verma')
        self.assertNotEqual(user.password_hash, 'SecurePassword123!')

    # 3. Dashboard Stats
    def test_dashboard_stats_landlord(self):
        res = self.client.get('/api/dashboard/stats', HTTP_AUTHORIZATION=f'Bearer {self.landlord_token}')
        self.assertEqual(res.status_code, 200)
        data = res.json().get('data', {})
        self.assertEqual(data.get('role'), 'landlord')
        self.assertEqual(data.get('totalProperties'), 1)
        self.assertEqual(data.get('totalUnits'), 1)
        self.assertEqual(data.get('monthlyRentRoll'), 28500.0)

    # 4. Property CRUD & Persistence
    def test_create_property_persistence(self):
        res = self.client.post('/api/properties', {
            'name': 'Skyline Heights',
            'address': 'Turner Road',
            'city': 'Mumbai',
            'state': 'MH',
            'zip_code': '400050',
            'property_type': 'Gated High-Rise'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.landlord_token}')
        self.assertEqual(res.status_code, 201)
        prop_id = res.json().get('data', {}).get('id')
        self.assertTrue(Property.objects.filter(id=prop_id).exists())

    # 5. Unit CRUD & Persistence
    def test_create_unit_persistence(self):
        res = self.client.post('/api/units', {
            'property_id': self.property.id,
            'unit_number': 'Flat 1A',
            'bedrooms': 1,
            'bathrooms': 1.0,
            'square_feet': 650,
            'rent_amount': 22000,
            'deposit_amount': 66000,
            'status': 'vacant'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.landlord_token}')
        self.assertEqual(res.status_code, 201)
        unit_id = res.json().get('data', {}).get('id')
        self.assertTrue(Unit.objects.filter(id=unit_id).exists())

    # 6. Payment Recording & Persistence
    def test_record_payment_persistence(self):
        res = self.client.post('/api/payments', {
            'lease_id': self.lease.id,
            'amount': 28500,
            'payment_method': 'upi',
            'notes': 'Advance rent via UPI',
            'due_date': '2026-11-01'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.tenant_token}')
        self.assertEqual(res.status_code, 201)
        pay_id = res.json().get('data', {}).get('id')
        self.assertTrue(Payment.objects.filter(id=pay_id).exists())

    # 7. Maintenance Ticket Submission & Update
    def test_maintenance_ticket_flow(self):
        # Create
        res = self.client.post('/api/maintenance', {
            'title': 'Geyser water heater inspection',
            'description': 'Water not heating in bathroom geyser.',
            'category': 'electrical',
            'priority': 'high',
            'unit_id': self.unit.id
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.tenant_token}')
        self.assertEqual(res.status_code, 201)
        ticket_id = res.json().get('data', {}).get('id')
        self.assertTrue(MaintenanceTicket.objects.filter(id=ticket_id).exists())

        # Update
        update_res = self.client.put(f'/api/maintenance/{ticket_id}', {
            'status': 'in_progress',
            'resolution_notes': 'Urban Company technician scheduled.'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.landlord_token}')
        self.assertEqual(update_res.status_code, 200)
        updated_ticket = MaintenanceTicket.objects.get(id=ticket_id)
        self.assertEqual(updated_ticket.status, 'in_progress')

    # 8. Contact Form Submission
    def test_contact_submission(self):
        res = self.client.post('/api/contact', {
            'name': 'Kavita Nair',
            'email': 'kavita.nair@example.in',
            'phone': '+91 98400 11223',
            'subject': 'Portfolio Demo',
            'message': 'Interested in managing our Koramangala portfolio.'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        inquiry_id = res.json().get('inquiryId')
        self.assertTrue(ContactMessage.objects.filter(id=inquiry_id).exists())

    # 9. Feedback Review Submission
    def test_feedback_review_submission(self):
        res = self.client.post('/api/feedback', {
            'rating': 5,
            'propertyName': 'Gulmohar Residency',
            'title': 'Seamless UPI autopay',
            'comment': 'Rent collection has never been this smooth and effortless.'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.landlord_token}')
        self.assertEqual(res.status_code, 201)
        rev_id = res.json().get('review', {}).get('id')
        self.assertTrue(FeedbackReview.objects.filter(id=rev_id).exists())

    # 10. Frontend HTML & Asset Serving
    def test_frontend_serving(self):
        for route in ['/', '/index.html', '/dashboard.html', '/login.html', '/signup.html']:
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200)
            self.assertIn('text/html', res.headers.get('Content-Type'))

        for asset in ['/css/variables.css', '/js/api.js', '/assets/logo.svg']:
            res = self.client.get(asset)
            self.assertEqual(res.status_code, 200)

    # 11. Platform Admin Profile & Endpoints
    def test_admin_login_success(self):
        res = self.client.post('/api/auth/login', {
            'email': 'admin@rentroll.com',
            'password': 'Password123!'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        user_info = data.get('user', {})
        self.assertEqual(user_info.get('role'), 'admin')
        self.assertEqual(user_info.get('name'), 'Arjun Singhania')

    def test_admin_dashboard_stats(self):
        res = self.client.get('/api/dashboard/stats', HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(res.status_code, 200)
        data = res.json().get('data', {})
        self.assertEqual(data.get('role'), 'admin')
        self.assertGreaterEqual(data.get('totalUsers', 0), 3)
        self.assertEqual(data.get('totalProperties'), 1)
        self.assertEqual(data.get('totalUnits'), 1)
        self.assertEqual(data.get('monthlyRentRoll'), 28500.0)
        self.assertEqual(data.get('activeLeasesCount'), 1)

    def test_admin_users_directory_endpoint(self):
        res = self.client.get('/api/admin/users', HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(res.status_code, 200)
        users = res.json().get('data', [])
        self.assertGreaterEqual(len(users), 3)
        roles = [u.get('role') for u in users]
        self.assertIn('admin', roles)
        self.assertIn('landlord', roles)
        self.assertIn('tenant', roles)

    def test_admin_inquiries_endpoint(self):
        # Create a contact message and feedback review
        ContactMessage.objects.create(
            id='msg_test_1',
            name='Karan Singhal',
            email='karan.s@realtyinvest.in',
            subject='Portfolio Inquiry',
            message='Test inquiry message'
        )
        res = self.client.get('/api/admin/inquiries', HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertGreaterEqual(len(data.get('inquiries', [])), 1)

    def test_admin_can_delete_property(self):
        prop_to_del = Property.objects.create(
            id='prop_del_test',
            landlord=self.landlord,
            name='Property To Delete',
            address='123 Test St',
            city='Bengaluru',
            state='KA',
            zip_code='560001'
        )
        res = self.client.delete(f'/api/properties/{prop_to_del.id}', HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Property.objects.filter(id='prop_del_test').exists())

    def test_admin_signup_with_admin_role(self):
        res = self.client.post('/api/auth/signup', {
            'name': 'New Super Admin',
            'email': 'superadmin@rentroll.com',
            'password': 'SecurePassword123!',
            'role': 'admin'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get('success'))
        user_info = data.get('user', {})
        self.assertEqual(user_info.get('role'), 'admin')
        user = User.objects.get(email='superadmin@rentroll.com')
        self.assertEqual(user.role, 'admin')

    def test_admin_login_case_insensitive(self):
        res = self.client.post('/api/auth/login', {
            'email': 'ADMIN@RENTROLL.COM',
            'password': 'Password123!'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('user', {}).get('role'), 'admin')

    def test_clean_frontend_url_routes(self):
        for route in ['/', '/index.html', '/dashboard', '/dashboard/', '/login', '/login/', '/signup', '/signup/', '/favicon.ico']:
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200, f"Route {route} failed with status {res.status_code}")

    def test_feedback_and_stats_data_keys(self):
        # Stats returns data and stats
        res_stats = self.client.get('/api/dashboard/stats', HTTP_AUTHORIZATION=f'Bearer {self.landlord_token}')
        self.assertEqual(res_stats.status_code, 200)
        stats_data = res_stats.json()
        self.assertIn('data', stats_data)
        self.assertIn('stats', stats_data)

        # Feedback returns reviews and data
        res_fb = self.client.get('/api/feedback')
        self.assertEqual(res_fb.status_code, 200)
        fb_data = res_fb.json()
        self.assertIn('reviews', fb_data)
        self.assertIn('data', fb_data)

    def test_query_param_token_auth(self):
        res = self.client.get(f'/api/auth/me?token={self.tenant_token}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get('user', {}).get('name'), 'Priya Iyer')


class IndianDemoDataPersistenceTests(TestCase):
    """
    Test suite verifying database persistence across all entities
    using the realistic Indian market demo personas, properties, and payment rails.
    """
    def setUp(self):
        self.client = Client()
        # Seed the realistic Indian demo database
        call_command('seed_indian_data', verbosity=0)

        # Retrieve seeded demo profiles
        self.admin = User.objects.get(email='admin@rentroll.com')
        self.landlord_rajesh = User.objects.get(email='landlord@rentroll.com')
        self.tenant_priya = User.objects.get(email='tenant@rentroll.com')
        self.tenant_aarav = User.objects.get(email='aarav.mehta@example.in')

        self.admin_token = generate_jwt_token(self.admin)
        self.rajesh_token = generate_jwt_token(self.landlord_rajesh)
        self.priya_token = generate_jwt_token(self.tenant_priya)

    def test_seed_command_persists_full_indian_portfolio(self):
        # 1. Indian Users
        self.assertEqual(User.objects.count(), 7)
        self.assertTrue(User.objects.filter(name='Arjun Singhania', role='admin').exists())
        self.assertTrue(User.objects.filter(name='Rajesh Sharma', role='landlord').exists())
        self.assertTrue(User.objects.filter(name='Priya Iyer', role='tenant').exists())

        # 2. Indian Properties
        self.assertEqual(Property.objects.count(), 4)
        gulmohar = Property.objects.get(id='prop_1')
        self.assertEqual(gulmohar.name, 'Gulmohar Residency')
        self.assertEqual(gulmohar.city, 'Bengaluru')

        # 3. Units & Doors
        self.assertEqual(Unit.objects.count(), 18)
        self.assertTrue(Unit.objects.filter(property=gulmohar, unit_number='Flat 4B').exists())

        # 4. Leases
        self.assertGreaterEqual(Lease.objects.filter(status='active').count(), 3)

        # 5. Ledger Payments
        self.assertGreaterEqual(Payment.objects.count(), 6)
        self.assertTrue(Payment.objects.filter(payment_method='upi').exists())

        # 6. Maintenance Work Orders
        self.assertGreaterEqual(MaintenanceTicket.objects.count(), 3)

        # 7. Inquiries & Reviews
        self.assertGreaterEqual(FeedbackReview.objects.count(), 3)
        self.assertGreaterEqual(ContactMessage.objects.count(), 2)

    def test_demo_landlord_rajesh_creates_unit_in_gulmohar_residency(self):
        res = self.client.post('/api/units', {
            'property_id': 'prop_1',
            'unit_number': 'Flat 5C',
            'bedrooms': 3,
            'bathrooms': 3.0,
            'square_feet': 1650,
            'rent_amount': 45000,
            'deposit_amount': 135000,
            'notes': 'Park-facing 3BHK flat'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res.status_code, 201)
        unit_id = res.json().get('data', {}).get('id')
        self.assertTrue(Unit.objects.filter(id=unit_id, unit_number='Flat 5C').exists())

    def test_demo_landlord_creates_lease_and_updates_occupancy(self):
        # Create vacant unit
        vacant_unit = Unit.objects.create(
            property_id='prop_1',
            unit_number='Studio 101',
            rent_amount=20000,
            deposit_amount=60000,
            status='vacant'
        )
        self.assertEqual(vacant_unit.status, 'vacant')

        # Create lease for tenant Aarav Mehta
        res = self.client.post('/api/leases', {
            'unit_id': vacant_unit.id,
            'tenant_email': 'aarav.mehta@example.in',
            'start_date': '2026-11-01',
            'end_date': '2027-10-31',
            'rent_amount': 20000,
            'deposit_amount': 60000,
            'terms': 'Standard 11-month registered rental agreement.'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res.status_code, 201)
        lease_id = res.json().get('data', {}).get('id')
        self.assertTrue(Lease.objects.filter(id=lease_id).exists())

        # Verify unit status automatically transitioned to occupied in database
        vacant_unit.refresh_from_db()
        self.assertEqual(vacant_unit.status, 'occupied')

    def test_demo_tenant_priya_iyer_pays_rent_via_upi_autoplay(self):
        res = self.client.post('/api/payments', {
            'amount': 28500,
            'payment_method': 'upi',
            'notes': 'November 2026 Rent - Flat 4B via UPI AutoPay'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')
        self.assertEqual(res.status_code, 201)
        pay_id = res.json().get('data', {}).get('id')

        # Verify persistent record in SQLite database
        payment = Payment.objects.get(id=pay_id)
        self.assertEqual(payment.tenant, self.tenant_priya)
        self.assertEqual(payment.amount, 28500.0)
        self.assertEqual(payment.payment_method, 'upi')
        self.assertEqual(payment.status, 'paid')

    def test_demo_tenant_submits_and_landlord_resolves_maintenance_ticket(self):
        # Priya submits Urban Company RO water purifier ticket
        res = self.client.post('/api/maintenance', {
            'title': 'Urban Company RO Purifier Filter Service',
            'category': 'appliance',
            'priority': 'medium',
            'description': 'Annual sediment and carbon filter replacement needed.'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')
        self.assertEqual(res.status_code, 201)
        ticket_id = res.json().get('data', {}).get('id')
        self.assertTrue(MaintenanceTicket.objects.filter(id=ticket_id).exists())

        # Rajesh moves ticket to in_progress
        res_progress = self.client.put(f'/api/maintenance/{ticket_id}', {
            'status': 'in_progress',
            'resolution_notes': 'Urban Company service booked for Friday 11 AM.'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_progress.status_code, 200)

        # Rajesh marks ticket resolved
        res_resolved = self.client.put(f'/api/maintenance/{ticket_id}', {
            'status': 'resolved',
            'actual_cost': 1250,
            'resolution_notes': 'New filters installed. TDS level tested at 85.'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_resolved.status_code, 200)

        ticket = MaintenanceTicket.objects.get(id=ticket_id)
        self.assertEqual(ticket.status, 'resolved')
        self.assertEqual(ticket.actual_cost, 1250.0)

    def test_demo_feedback_review_upvote_persists_in_database(self):
        # Review rev_1 from seed data
        review = FeedbackReview.objects.first()
        self.assertIsNotNone(review)
        initial_count = review.helpful_count

        res = self.client.post(f'/api/feedback/{review.id}/helpful')
        self.assertEqual(res.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.helpful_count, initial_count + 1)

    def test_add_property_unit_and_deletion_persists_in_database(self):
        # 1. Add Property via POST /api/properties
        res_prop = self.client.post('/api/properties', {
            'name': 'Brigade Gateway Premium Towers',
            'address': '26/1 Dr Rajkumar Road, Malleshwaram',
            'city': 'Bengaluru',
            'state': 'KA',
            'zip_code': '560055',
            'property_type': 'High-Rise Gated Community'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_prop.status_code, 201)
        prop_id = res_prop.json().get('data', {}).get('id')
        self.assertTrue(Property.objects.filter(id=prop_id, name='Brigade Gateway Premium Towers').exists())

        # 2. Add Unit Door to newly created property
        res_unit = self.client.post('/api/units', {
            'property_id': prop_id,
            'unit_number': 'Tower B - 1402',
            'bedrooms': 3,
            'bathrooms': 3.0,
            'square_feet': 1850,
            'rent_amount': '55,000',
            'deposit_amount': '165,000'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_unit.status_code, 201)
        unit_id = res_unit.json().get('data', {}).get('id')
        self.assertTrue(Unit.objects.filter(id=unit_id, property_id=prop_id).exists())

        # 3. Delete property via DELETE /api/properties/<id>
        res_del = self.client.delete(f'/api/properties/{prop_id}', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_del.status_code, 200)
        self.assertFalse(Property.objects.filter(id=prop_id).exists())
        self.assertFalse(Unit.objects.filter(id=unit_id).exists())

    def test_robust_fallback_add_unit_and_lease_creation(self):
        # Unit creation without explicit property falls back to landlord's existing property
        res_unit = self.client.post('/api/units', {
            'unit_number': 'Penthouse PH-1',
            'bedrooms': 4,
            'bathrooms': 4.0,
            'square_feet': 2800,
            'rent_amount': '₹ 85,000',
            'deposit_amount': '₹ 255,000'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_unit.status_code, 201)
        unit_data = res_unit.json().get('data', {})
        self.assertEqual(unit_data.get('rent_amount'), 85000.0)

        # Lease creation with string rent amount binds unit and marks it occupied
        res_lease = self.client.post('/api/leases', {
            'unit_id': unit_data['id'],
            'tenant_name': 'Kavita Chawla',
            'tenant_email': 'kavita.chawla@example.in',
            'rent_amount': '₹ 85,000'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')
        self.assertEqual(res_lease.status_code, 201)
        lease_data = res_lease.json().get('data', {})
        self.assertEqual(lease_data.get('rent_amount'), 85000.0)

        unit_obj = Unit.objects.get(id=unit_data['id'])
        self.assertEqual(unit_obj.status, 'occupied')





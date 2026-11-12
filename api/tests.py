import json
from django.test import TestCase, Client
from django.urls import reverse
from django.core.management import call_command
from api.models import (
    User, Property, Unit, Lease, Payment, MaintenanceTicket, ContactMessage, FeedbackReview,
    PasswordResetToken
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

    def test_password_reset_request_flow(self):
        res = self.client.post('/api/auth/password-reset/request', {
            'email': 'landlord@rentroll.com'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        token = data.get('token')
        self.assertIsNotNone(token)
        self.assertTrue(PasswordResetToken.objects.filter(user=self.landlord, is_used=False).exists())

    def test_password_reset_request_nonexistent_email_prevents_enumeration(self):
        res = self.client.post('/api/auth/password-reset/request', {
            'email': 'doesnotexist@nowhere.com'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertNotIn('token', data)

    def test_password_reset_verify_token(self):
        req_res = self.client.post('/api/auth/password-reset/request', {
            'email': 'landlord@rentroll.com'
        }, content_type='application/json')
        token = req_res.json()['token']

        # Verify with valid token
        verify_res = self.client.get(f'/api/auth/password-reset/verify?token={token}')
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json().get('valid'))

        # Verify with bogus token
        bogus_res = self.client.get('/api/auth/password-reset/verify?token=bogus_token_123')
        self.assertEqual(bogus_res.status_code, 400)
        self.assertFalse(bogus_res.json().get('valid'))

    def test_password_reset_confirm_and_login(self):
        req_res = self.client.post('/api/auth/password-reset/request', {
            'email': 'tenant@rentroll.com'
        }, content_type='application/json')
        token = req_res.json()['token']

        # Confirm new password
        confirm_res = self.client.post('/api/auth/password-reset/confirm', {
            'token': token,
            'new_password': 'MyNewBrandSecretPassword99!'
        }, content_type='application/json')
        self.assertEqual(confirm_res.status_code, 200)
        self.assertTrue(confirm_res.json().get('success'))

        # Old password should no longer work
        old_login_res = self.client.post('/api/auth/login', {
            'email': 'tenant@rentroll.com',
            'password': 'WrongPassword123'
        }, content_type='application/json')
        self.assertEqual(old_login_res.status_code, 401)

        # New password should successfully log in
        new_login_res = self.client.post('/api/auth/login', {
            'email': 'tenant@rentroll.com',
            'password': 'MyNewBrandSecretPassword99!'
        }, content_type='application/json')
        self.assertEqual(new_login_res.status_code, 200)
        self.assertIsNotNone(new_login_res.json().get('token'))

    def test_password_reset_cannot_reuse_token(self):
        req_res = self.client.post('/api/auth/password-reset/request', {
            'email': 'landlord@rentroll.com'
        }, content_type='application/json')
        token = req_res.json()['token']

        # First use
        confirm_res1 = self.client.post('/api/auth/password-reset/confirm', {
            'token': token,
            'new_password': 'FirstNewSecret123!'
        }, content_type='application/json')
        self.assertEqual(confirm_res1.status_code, 200)

        # Replay attempt (second use) must fail
        confirm_res2 = self.client.post('/api/auth/password-reset/confirm', {
            'token': token,
            'new_password': 'ReplayAttackPassword123!'
        }, content_type='application/json')
        self.assertEqual(confirm_res2.status_code, 400)
        self.assertFalse(confirm_res2.json().get('success'))

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

    def test_landlord_creates_property_with_custom_image_url(self):
        """Landlord can add a new property with a custom image URL."""
        custom_img = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'
        res = self.client.post('/api/properties', {
            'name': 'Prestige Golfshire Luxury Villas',
            'address': 'Nandi Hills Road',
            'city': 'Bengaluru',
            'state': 'KA',
            'zip_code': '562164',
            'property_type': 'Independent Villa/Duplex',
            'image_url': custom_img
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')

        self.assertEqual(res.status_code, 201)
        prop_id = res.json().get('data', {}).get('id')
        prop = Property.objects.get(id=prop_id)
        self.assertEqual(prop.image_url, custom_img)

    def test_admin_creates_property_with_uploaded_data_url_image(self):
        """Platform Admin can add a new property with an uploaded image data URL."""
        data_url_img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        res = self.client.post('/api/properties', {
            'name': 'Hiranandani Fortune City',
            'address': 'Panvel Highway',
            'city': 'Mumbai',
            'state': 'MH',
            'zip_code': '410206',
            'property_type': 'Apartment Society',
            'image_url': data_url_img
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')

        self.assertEqual(res.status_code, 201)
        prop_id = res.json().get('data', {}).get('id')
        prop = Property.objects.get(id=prop_id)
        self.assertEqual(prop.image_url, data_url_img)

    def test_update_property_image_via_put(self):
        """Landlord can update property image via PUT /api/properties/<id>."""
        new_img = 'assets/indian_luxury_apartment.jpg'
        res = self.client.put('/api/properties/prop_1', {
            'image_url': new_img
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')

        self.assertEqual(res.status_code, 200)
        prop = Property.objects.get(id='prop_1')
        self.assertEqual(prop.image_url, new_img)

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

    # =========================================================================
    # Phase 4 Tests: Multi-Tenant RBAC, IDOR Protection & UPI Payment Gateway
    # =========================================================================

    def test_multi_tenant_landlord_property_idor_protection(self):
        """Landlord B cannot delete or access Landlord A's private property."""
        pwd_hash = hash_password('Password123!')
        landlord_b = User.objects.create(
            id='usr_landlord_b_test',
            name='Vikramaditya Singhania',
            email='vikramaditya.singh@example.in',
            password_hash=pwd_hash,
            role='landlord'
        )
        token_b = generate_jwt_token(landlord_b)
        gulmohar = Property.objects.get(id='prop_1')

        # Landlord B tries to delete Landlord A's property
        res_del = self.client.delete(f'/api/properties/{gulmohar.id}', HTTP_AUTHORIZATION=f'Bearer {token_b}')
        self.assertEqual(res_del.status_code, 403)
        self.assertTrue(Property.objects.filter(id=gulmohar.id).exists())

        # Landlord B lists properties; Landlord A's property is not in Landlord B's private list
        res_list = self.client.get('/api/properties', HTTP_AUTHORIZATION=f'Bearer {token_b}')
        self.assertEqual(res_list.status_code, 200)
        b_props = res_list.json().get('data', [])
        self.assertFalse(any(p['id'] == gulmohar.id for p in b_props))

    def test_multi_tenant_landlord_unit_idor_protection(self):
        """Landlord B cannot create or attach units to Landlord A's property."""
        pwd_hash = hash_password('Password123!')
        landlord_b = User.objects.create(
            id='usr_landlord_b_unit_test',
            name='Karan Johar',
            email='karan.johar@example.in',
            password_hash=pwd_hash,
            role='landlord'
        )
        token_b = generate_jwt_token(landlord_b)
        gulmohar = Property.objects.get(id='prop_1')

        res_unit = self.client.post('/api/units', {
            'property_id': gulmohar.id,
            'unit_number': 'Unauthorized Flat 99',
            'rent_amount': '50000'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {token_b}')

        self.assertEqual(res_unit.status_code, 403)
        self.assertFalse(Unit.objects.filter(unit_number='Unauthorized Flat 99').exists())

    def test_multi_tenant_tenant_data_isolation(self):
        """Tenant B cannot view Tenant A's lease agreement or payments."""
        pwd_hash = hash_password('Password123!')
        tenant_b = User.objects.create(
            id='usr_tenant_b_test',
            name='Deepika Padukone',
            email='deepika.p@example.in',
            password_hash=pwd_hash,
            role='tenant'
        )
        token_b = generate_jwt_token(tenant_b)
        priya_lease = Lease.objects.filter(tenant=self.tenant_priya).first()
        self.assertIsNotNone(priya_lease)

        # Tenant B lists leases -> should not contain Priya's lease
        res_leases = self.client.get('/api/leases', HTTP_AUTHORIZATION=f'Bearer {token_b}')
        self.assertEqual(res_leases.status_code, 200)
        leases = res_leases.json().get('data', [])
        self.assertFalse(any(l['id'] == priya_lease.id for l in leases))

        # Tenant B lists payments -> should not contain Priya's payments
        res_payments = self.client.get('/api/payments', HTTP_AUTHORIZATION=f'Bearer {token_b}')
        self.assertEqual(res_payments.status_code, 200)
        payments = res_payments.json().get('data', [])
        self.assertEqual(len(payments), 0)

    def test_upi_payment_create_order_success(self):
        """Generates authentic UPI payment order with Order ID, UPI Intent URL and HMAC signature."""
        priya_lease = Lease.objects.filter(tenant=self.tenant_priya).first()
        res = self.client.post('/api/payments/create-order', {
            'amount': '28500.00',
            'lease_id': priya_lease.id if priya_lease else None
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')

        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(data.get('order_id', '').startswith('order_rcpt_'))
        self.assertEqual(data.get('amount'), 28500.0)
        self.assertEqual(data.get('currency'), 'INR')
        self.assertIn('upi://pay', data.get('upi_intent_url', ''))
        self.assertTrue(len(data.get('signature', '')) > 20)

    def test_upi_payment_webhook_verification_success(self):
        """Validates UPI settlement and records confirmed payment into ledger."""
        import hmac, hashlib
        from django.conf import settings

        order_id = 'order_rcpt_test_998877_abcd'
        amount = 28500.0
        secret = getattr(settings, 'SECRET_KEY', 'test-secret')
        valid_signature = hmac.new(
            secret.encode('utf-8'),
            f"{order_id}|{amount:.2f}".encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        priya_lease = Lease.objects.filter(tenant=self.tenant_priya).first()
        payment_txn_ref = f"TXN-UPI-{int(hashlib.sha256(order_id.encode()).hexdigest()[:8], 16)}"
        res = self.client.post('/api/payments/verify-webhook', {
            'order_id': order_id,
            'payment_id': payment_txn_ref,
            'amount': amount,
            'signature': valid_signature,
            'lease_id': priya_lease.id if priya_lease else None
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')

        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(Payment.objects.filter(transaction_ref=payment_txn_ref, status='paid').exists())

    def test_upi_payment_webhook_verification_rejects_invalid_signature(self):
        """Rejects forged or tampered webhook signatures with 400 Bad Request."""
        priya_lease = Lease.objects.filter(tenant=self.tenant_priya).first()
        res = self.client.post('/api/payments/verify-webhook', {
            'order_id': 'order_rcpt_fake_123',
            'payment_id': 'fake_txn_999',
            'amount': 28500.0,
            'signature': 'forged_fake_signature_abc123',
            'lease_id': priya_lease.id if priya_lease else None
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')

        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertFalse(data.get('success'))
        self.assertIn('Invalid payment signature', data.get('message', ''))

    # -------------------------------------------------------------------------
    # AI ASSISTANT CHATBOT INTEGRATION TESTS
    # -------------------------------------------------------------------------

    def test_chatbot_unauthenticated_rejected(self):
        """Unauthenticated requests to AI chatbot endpoint are rejected with 401."""
        res = self.client.post('/api/chatbot', {'message': 'Hello'}, content_type='application/json')
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json().get('success'))

    def test_chatbot_invalid_empty_message_rejected(self):
        """Empty or whitespace-only messages are rejected with 400."""
        res = self.client.post('/api/chatbot', {'message': '   '}, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json().get('success'))

    def test_chatbot_method_not_allowed_for_get(self):
        """GET request to chatbot endpoint returns 405 Method Not Allowed."""
        res = self.client.get('/api/chatbot', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')
        self.assertEqual(res.status_code, 405)

    def test_chatbot_tenant_rent_payment_query(self):
        """Tenant asking about rent payment receives active lease details and Pay Rent modal trigger."""
        res = self.client.post('/api/chatbot', {
            'message': 'How do I pay my rent and when is it due?'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        reply = data.get('reply', '')
        self.assertIn('₹28,500', reply)
        self.assertIn('Flat 4B', reply)
        self.assertIn('UPI AutoPay', reply)
        self.assertIsNotNone(data.get('action'))
        self.assertEqual(data.get('action', {}).get('type'), 'open_modal')
        self.assertEqual(data.get('action', {}).get('target'), 'modal-pay-rent')

    def test_chatbot_tenant_hra_receipt_query(self):
        """Tenant asking about HRA receipt receives Sec 10(13A) PAN compliance and ledger trigger."""
        res = self.client.post('/api/chatbot', {
            'message': 'How can I download my HRA rent receipt for tax saving?'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        reply = data.get('reply', '')
        self.assertIn('HRA', reply)
        self.assertIn('10(13A)', reply)
        self.assertIn('PAN', reply)
        self.assertEqual(data.get('action', {}).get('type'), 'switch_tab')
        self.assertEqual(data.get('action', {}).get('target'), 'payments')

    def test_chatbot_tenant_maintenance_ticket_query(self):
        """Tenant reporting repair issue receives maintenance triage guidance and ticket modal action."""
        res = self.client.post('/api/chatbot', {
            'message': 'Water purifier filter leaking in kitchen, need a plumber'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.priya_token}')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('action', {}).get('type'), 'open_modal')
        self.assertEqual(data.get('action', {}).get('target'), 'modal-create-ticket')

    def test_chatbot_landlord_cashflow_query(self):
        """Landlord asking about cashflow receives contracted rent roll metrics and ledger CSV trigger."""
        res = self.client.post('/api/chatbot', {
            'message': 'Show my portfolio cashflow and monthly rent roll yield'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        reply = data.get('reply', '')
        self.assertIn('Contracted Monthly Rent Roll', reply)
        self.assertIn('Active Leases', reply)
        self.assertEqual(data.get('action', {}).get('type'), 'switch_tab')
        self.assertEqual(data.get('action', {}).get('target'), 'payments')

    def test_chatbot_landlord_occupancy_query(self):
        """Landlord checking vacancy receives occupancy breakdown and Add Unit action."""
        res = self.client.post('/api/chatbot', {
            'message': 'What is my current occupancy and do I have vacant units?'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        reply = data.get('reply', '')
        self.assertIn('Occupied Doors', reply)
        self.assertEqual(data.get('action', {}).get('type'), 'open_modal')
        self.assertEqual(data.get('action', {}).get('target'), 'modal-add-unit')

    def test_chatbot_landlord_lease_agreement_query(self):
        """Landlord inquiring about agreements receives 11-month e-Stamp rules and lease creation action."""
        res = self.client.post('/api/chatbot', {
            'message': 'How does digital e-Stamp agreement signing work for new tenants?'
        }, content_type='application/json', HTTP_AUTHORIZATION=f'Bearer {self.rajesh_token}')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        reply = data.get('reply', '')
        self.assertIn('11-Month Agreements', reply)
        self.assertIn('e-Stamping', reply)
        self.assertEqual(data.get('action', {}).get('type'), 'open_modal')
        self.assertEqual(data.get('action', {}).get('target'), 'modal-create-lease')






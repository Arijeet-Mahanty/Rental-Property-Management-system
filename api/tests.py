import json
from django.test import TestCase, Client
from django.urls import reverse
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


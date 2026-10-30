import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    User, Property, Unit, Lease, Payment, MaintenanceTicket, FeedbackReview, ContactMessage
)
from api.auth_utils import hash_password

class Command(BaseCommand):
    help = 'Seeds database with realistic Indian rental market personas, properties, and transactions'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Indian rental market database seeding...'))

        # Clean existing records to guarantee fresh state
        FeedbackReview.objects.all().delete()
        ContactMessage.objects.all().delete()
        MaintenanceTicket.objects.all().delete()
        Payment.objects.all().delete()
        Lease.objects.all().delete()
        Unit.objects.all().delete()
        Property.objects.all().delete()
        User.objects.all().delete()

        password_hash = hash_password('Password123!')

        # 1. Indian Users
        landlord_rajesh = User.objects.create(
            id='usr_landlord_demo',
            name='Rajesh Sharma',
            email='landlord@rentroll.com',
            password_hash=password_hash,
            role='landlord',
            phone='+91 98201 23456'
        )

        tenant_priya = User.objects.create(
            id='usr_tenant_demo',
            name='Priya Iyer',
            email='tenant@rentroll.com',
            password_hash=password_hash,
            role='tenant',
            phone='+91 98450 87654'
        )

        tenant_aarav = User.objects.create(
            id='usr_tenant_2',
            name='Aarav Mehta',
            email='aarav.mehta@example.in',
            password_hash=password_hash,
            role='tenant',
            phone='+91 99102 34567'
        )

        tenant_ananya = User.objects.create(
            id='usr_tenant_3',
            name='Ananya Deshmukh',
            email='ananya.d@example.in',
            password_hash=password_hash,
            role='tenant',
            phone='+91 97654 12389'
        )

        tenant_vikram = User.objects.create(
            id='usr_tenant_4',
            name='Vikram Malhotra',
            email='vikram.m@example.in',
            password_hash=password_hash,
            role='tenant',
            phone='+91 98111 22334'
        )

        landlord_sunita = User.objects.create(
            id='usr_landlord_2',
            name='Sunita Kulkarni',
            email='sunita.k@example.in',
            password_hash=password_hash,
            role='landlord',
            phone='+91 98220 99887'
        )

        self.stdout.write(self.style.SUCCESS('[OK] Seeded 6 Indian users (landlords & tenants)'))

        # 2. Indian Properties
        prop_gulmohar = Property.objects.create(
            id='prop_1',
            landlord=landlord_rajesh,
            name='Gulmohar Residency',
            address='42, 80 Feet Road, 4th Block, Koramangala',
            city='Bengaluru',
            state='KA',
            zip_code='560034',
            property_type='Apartment Society'
        )

        prop_skyline = Property.objects.create(
            id='prop_2',
            landlord=landlord_rajesh,
            name='Skyline Palms Heights',
            address='15, Turner Road, Bandra West',
            city='Mumbai',
            state='MH',
            zip_code='400050',
            property_type='Gated High-Rise'
        )

        prop_greenfield = Property.objects.create(
            id='prop_3',
            landlord=landlord_rajesh,
            name='Greenfield Heights Duplex',
            address='88, Whitefield Main Road',
            city='Bengaluru',
            state='KA',
            zip_code='560066',
            property_type='Independent Villa/Duplex'
        )

        prop_cyber = Property.objects.create(
            id='prop_4',
            landlord=landlord_rajesh,
            name='Cyber Greens Residency',
            address='DLF Phase 5, Golf Course Road',
            city='Gurugram',
            state='HR',
            zip_code='122002',
            property_type='Luxury Condominium'
        )

        self.stdout.write(self.style.SUCCESS('[OK] Seeded 4 Indian portfolio properties in Bengaluru, Mumbai, Gurugram'))

        # 3. Units Inventory
        units_data = [
            # Gulmohar Residency (Bengaluru)
            ('unit_101', prop_gulmohar, 'Flat 1A', 1, 1.0, 680, 24000, 72000, 'occupied', 'Ground floor garden view'),
            ('unit_102', prop_gulmohar, 'Flat 2A', 2, 2.0, 1050, 35000, 105000, 'occupied', 'Balcony facing landscaped park'),
            ('unit_103', prop_gulmohar, 'Flat 3B', 3, 3.0, 1450, 45000, 135000, 'occupied', 'Corner flat with double balconies'),
            ('unit_104', prop_gulmohar, 'Flat 4B', 2, 2.0, 1100, 28500, 85500, 'occupied', 'Assigned to Priya Iyer'),
            ('unit_105', prop_gulmohar, 'Flat 5C', 3, 3.0, 1600, 48000, 144000, 'occupied', 'Top floor with private terrace'),
            ('unit_106', prop_gulmohar, 'Flat 6C', 1, 1.0, 650, 22000, 66000, 'vacant', 'Freshly painted, ready to move in'),

            # Skyline Palms Heights (Bandra West, Mumbai)
            ('unit_201', prop_skyline, 'Tower 101', 2, 2.0, 1150, 65000, 195000, 'occupied', 'Sea view Bandra West flat'),
            ('unit_202', prop_skyline, 'Tower 102', 2, 2.0, 1200, 68000, 204000, 'occupied', 'Italian marble & modular kitchen'),
            ('unit_203', prop_skyline, 'Tower 201', 3, 3.0, 1550, 85000, 255000, 'occupied', 'Reserved covered dual parking'),
            ('unit_204', prop_skyline, 'Tower 202', 3, 3.0, 1600, 90000, 270000, 'occupied', 'Private terrace garden view'),
            ('unit_205', prop_skyline, 'Tower 301', 4, 4.5, 2400, 135000, 405000, 'occupied', 'Exclusive penthouse with private elevator'),

            # Greenfield Heights Duplex (Whitefield, Bengaluru)
            ('unit_301', prop_greenfield, 'Villa A (North)', 3, 3.0, 2100, 60000, 180000, 'occupied', 'Private lawn & teak woodwork'),
            ('unit_302', prop_greenfield, 'Villa B (South)', 3, 3.0, 2100, 60000, 180000, 'occupied', 'Attached 2-car porch'),

            # Cyber Greens Residency (Golf Course Road, Gurugram)
            ('unit_401', prop_cyber, 'Suite 101', 2, 2.0, 1250, 50000, 150000, 'occupied', 'DLF Golf Course view'),
            ('unit_402', prop_cyber, 'Suite 102', 2, 2.0, 1250, 50000, 150000, 'occupied', 'Smart automation locks'),
            ('unit_403', prop_cyber, 'Suite 201', 3, 3.0, 1750, 72000, 216000, 'occupied', 'Designer modular kitchen'),
            ('unit_404', prop_cyber, 'Suite 202', 3, 3.0, 1750, 72000, 216000, 'occupied', 'Attached staff quarter'),
            ('unit_405', prop_cyber, 'Suite 301', 4, 4.0, 2600, 95000, 285000, 'occupied', 'Panoramic Aravali skyline view'),
        ]

        units_dict = {}
        for uid, prop, unum, bed, bath, sqft, rent, dep, stat, notes in units_data:
            u = Unit.objects.create(
                id=uid,
                property=prop,
                unit_number=unum,
                bedrooms=bed,
                bathrooms=bath,
                square_feet=sqft,
                rent_amount=rent,
                deposit_amount=dep,
                status=stat,
                notes=notes
            )
            units_dict[uid] = u

        self.stdout.write(self.style.SUCCESS(f'[OK] Seeded {len(units_data)} doors across residential properties'))

        # 4. Indian Registered Leases
        lease_1 = Lease.objects.create(
            id='lease_1',
            unit=units_dict['unit_104'],
            tenant=tenant_priya,
            landlord=landlord_rajesh,
            start_date=datetime.date(2026, 2, 1),
            end_date=datetime.date(2027, 1, 31),
            rent_amount=28500,
            deposit_amount=85500,
            status='active',
            terms='Standard 11-month registered rental agreement with UPI autopay. 5% annual escalation clause. No smoking.'
        )

        lease_2 = Lease.objects.create(
            id='lease_2',
            unit=units_dict['unit_102'],
            tenant=tenant_aarav,
            landlord=landlord_rajesh,
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 12, 31),
            rent_amount=35000,
            deposit_amount=105000,
            status='active',
            terms='11-month registered agreement with eNACH mandate. 1 pet dog permitted with deposit.'
        )

        lease_3 = Lease.objects.create(
            id='lease_3',
            unit=units_dict['unit_201'],
            tenant=tenant_ananya,
            landlord=landlord_rajesh,
            start_date=datetime.date(2026, 3, 1),
            end_date=datetime.date(2027, 2, 28),
            rent_amount=65000,
            deposit_amount=195000,
            status='active',
            terms='11-month residential agreement for Bandra West high-rise apartment.'
        )

        self.stdout.write(self.style.SUCCESS('[OK] Seeded active registered rental agreements'))

        # 5. Ledger Payments (INR & Indian Payment Rails)
        payments_data = [
            ('pay_101', lease_1, tenant_priya, landlord_rajesh, 28500, datetime.date(2026, 10, 1), timezone.make_aware(datetime.datetime(2026, 10, 1, 8, 30)), 'paid', 'upi', 'UPI-RR-90421', 'October 2026 Rent - Paid on time via Google Pay UPI'),
            ('pay_102', lease_1, tenant_priya, landlord_rajesh, 28500, datetime.date(2026, 9, 1), timezone.make_aware(datetime.datetime(2026, 9, 1, 8, 30)), 'paid', 'upi', 'UPI-RR-84192', 'September 2026 Rent - Auto-debited via UPI'),
            ('pay_103', lease_1, tenant_priya, landlord_rajesh, 28500, datetime.date(2026, 8, 1), timezone.make_aware(datetime.datetime(2026, 8, 1, 8, 30)), 'paid', 'upi', 'UPI-RR-79213', 'August 2026 Rent - Auto-debited via UPI'),
            ('pay_104', lease_2, tenant_aarav, landlord_rajesh, 35000, datetime.date(2026, 10, 1), timezone.make_aware(datetime.datetime(2026, 10, 2, 11, 20)), 'paid', 'enach', 'eNACH-HDFC-4028', 'October 2026 Rent - eNACH Mandate Cleared'),
            ('pay_105', lease_3, tenant_ananya, landlord_rajesh, 65000, datetime.date(2026, 10, 1), timezone.make_aware(datetime.datetime(2026, 10, 1, 14, 0)), 'paid', 'netbanking', 'IMPS-ICICI-1192', 'October 2026 Rent - Direct IMPS Transfer'),
            ('pay_106', lease_1, tenant_priya, landlord_rajesh, 28500, datetime.date(2026, 11, 1), None, 'pending', 'upi', None, 'November 2026 Rent (Upcoming UPI Auto-Debit)'),
        ]

        for pid, lse, tnt, lnd, amt, due, paid, stat, meth, ref, nts in payments_data:
            Payment.objects.create(
                id=pid,
                lease=lse,
                tenant=tnt,
                landlord=lnd,
                amount=amt,
                due_date=due,
                paid_date=paid,
                status=stat,
                payment_method=meth,
                transaction_ref=ref,
                notes=nts
            )

        self.stdout.write(self.style.SUCCESS('[OK] Seeded INR payments ledger (UPI, eNACH, IMPS)'))

        # 6. Maintenance Work Orders
        MaintenanceTicket.objects.create(
            id='tkt_1',
            property=prop_gulmohar,
            unit=units_dict['unit_104'],
            tenant=tenant_priya,
            landlord=landlord_rajesh,
            title='Water purifier (RO) filter servicing',
            category='plumbing',
            priority='medium',
            status='in_progress',
            description='RO water purifier flow has slowed down significantly. Filter cartridge replacement required.',
            estimated_cost=1200,
            actual_cost=0,
            resolution_notes='Urban Company technician booked for tomorrow 10:00 AM.'
        )

        MaintenanceTicket.objects.create(
            id='tkt_2',
            property=prop_gulmohar,
            unit=units_dict['unit_101'],
            tenant=tenant_priya,
            landlord=landlord_rajesh,
            title='Bathroom hot water geyser inspection',
            category='electrical',
            priority='high',
            status='open',
            description='Geyser is tripping the MCB switch whenever switched on. Heating element needs check.',
            estimated_cost=1500,
            actual_cost=0,
            resolution_notes=None
        )

        MaintenanceTicket.objects.create(
            id='tkt_3',
            property=prop_gulmohar,
            unit=units_dict['unit_102'],
            tenant=tenant_aarav,
            landlord=landlord_rajesh,
            title='Ceiling fan regulator replacement',
            category='electrical',
            priority='low',
            status='resolved',
            description='Master bedroom fan running only at speed 5. Regulator switch replaced.',
            estimated_cost=450,
            actual_cost=400,
            resolution_notes='Replaced modular regulator switch. Working smoothly.'
        )

        self.stdout.write(self.style.SUCCESS('[OK] Seeded maintenance triage work orders'))

        # 7. Customer Testimonials / Reviews
        FeedbackReview.objects.create(
            id='rev_in_1',
            user=landlord_rajesh,
            name='Rajesh Sharma',
            role='landlord',
            rating=5,
            property_name='Gulmohar Residency (18 Flats)',
            title='UPI autopay eliminated chasing rent completely',
            comment='Managing 18 flats across Koramangala and Indiranagar used to consume the first week of every month. With RentRoll UPI & eNACH autopay, 100% of my rent hits my HDFC account on the 1st. My CA loved the HRA & GST reports.',
            helpful_count=42,
            verified=True
        )

        FeedbackReview.objects.create(
            id='rev_in_2',
            user=tenant_priya,
            name='Priya Iyer',
            role='tenant',
            rating=5,
            property_name='Flat 4B, Koramangala',
            title='Instant HRA rent receipts with Landlord PAN',
            comment='No more awkward follow-ups for rent receipts at tax submission time. I pay via Google Pay UPI in 30 seconds and instantly download digitally signed HRA receipts for my company declaration.',
            helpful_count=29,
            verified=True
        )

        FeedbackReview.objects.create(
            id='rev_in_3',
            user=landlord_sunita,
            name='Sunita Kulkarni',
            role='landlord',
            rating=5,
            property_name='Koregaon Park Duplexes (6 Flats)',
            title='Photo repair triage saved thousands on contractor visits',
            comment='When a tenant reported a geyser issue on Sunday evening, they submitted a video ticket with sound. We identified the MCB trip remotely without paying emergency electrician charges. Highly recommended for Pune owners.',
            helpful_count=31,
            verified=True
        )

        self.stdout.write(self.style.SUCCESS('[OK] Seeded verified Indian customer reviews'))
        self.stdout.write(self.style.SUCCESS('[SUCCESS] All Indian rental market data successfully seeded into Django database!'))

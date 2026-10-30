import time
import random
from django.db import models

def gen_id(prefix):
    return f"{prefix}_{int(time.time() * 1000)}_{''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=4))}"

def gen_user_id():
    return gen_id('usr')

def gen_property_id():
    return gen_id('prop')

def gen_unit_id():
    return gen_id('unit')

def gen_lease_id():
    return gen_id('lease')

def gen_payment_id():
    return gen_id('pay')

def gen_ticket_id():
    return gen_id('tkt')

def gen_message_id():
    return gen_id('msg')

def gen_review_id():
    return gen_id('rev')


class User(models.Model):
    ROLE_CHOICES = [
        ('landlord', 'Landlord'),
        ('tenant', 'Tenant'),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=gen_user_id)
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='landlord', db_index=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    avatar_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.role}) - {self.email}"


class Property(models.Model):
    PROPERTY_TYPES = [
        ('Apartment Society', 'Apartment Society'),
        ('Apartment Building', 'Apartment Building'),
        ('Multi-Family', 'Multi-Family'),
        ('Single-Family', 'Single-Family'),
        ('Gated High-Rise', 'Gated High-Rise'),
        ('Independent Villa/Duplex', 'Independent Villa/Duplex'),
        ('Luxury Condominium', 'Luxury Condominium'),
        ('Duplex/Triplex', 'Duplex/Triplex'),
        ('Townhouse', 'Townhouse'),
        ('Condo', 'Condo'),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=gen_property_id)
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties')
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=20)
    property_type = models.CharField(max_length=60, default='Apartment Society')
    image_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.city}, {self.state}"


class Unit(models.Model):
    STATUS_CHOICES = [
        ('occupied', 'Occupied'),
        ('vacant', 'Vacant'),
        ('maintenance', 'Maintenance'),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=gen_unit_id)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='units')
    unit_number = models.CharField(max_length=50)
    bedrooms = models.IntegerField(default=1)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    square_feet = models.IntegerField(default=750)
    rent_amount = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='vacant')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['property', 'unit_number']

    def __str__(self):
        return f"{self.property.name} - {self.unit_number} ({self.status})"


class Lease(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('expired', 'Expired'),
        ('terminated', 'Terminated'),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=gen_lease_id)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='leases')
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_leases')
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='landlord_leases')
    start_date = models.DateField()
    end_date = models.DateField()
    rent_amount = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='active')
    terms = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"Lease {self.id}: {self.unit.unit_number} - {self.tenant.name}"


class Payment(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending'),
        ('late', 'Late'),
        ('failed', 'Failed'),
    ]

    PAYMENT_METHODS = [
        ('upi', 'UPI'),
        ('enach', 'eNACH Mandate'),
        ('netbanking', 'Net Banking / IMPS / NEFT'),
        ('ach', 'ACH'),
        ('credit_card', 'Credit / Debit Card'),
        ('cash', 'Cash'),
        ('check', 'Cheque'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=gen_payment_id)
    lease = models.ForeignKey(Lease, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_payments')
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='landlord_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    paid_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, default='upi')
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"Payment {self.id}: ₹{self.amount} ({self.status}) - {self.tenant.name}"


class MaintenanceTicket(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('emergency', 'Emergency'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    CATEGORY_CHOICES = [
        ('plumbing', 'Plumbing'),
        ('electrical', 'Electrical'),
        ('hvac', 'HVAC / AC'),
        ('appliance', 'Appliance'),
        ('structural', 'Structural'),
        ('pest_control', 'Pest Control'),
        ('general', 'General'),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=gen_ticket_id)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='tickets')
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_tickets')
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='landlord_tickets')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='open')
    description = models.TextField()
    photo_url = models.TextField(blank=True, null=True)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    resolution_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket {self.id}: {self.title} ({self.status})"


class ContactMessage(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=gen_message_id)
    name = models.CharField(max_length=150)
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=30, blank=True, null=True)
    subject = models.CharField(max_length=200, default='General Inquiry')
    portfolio_size = models.CharField(max_length=100, default='Not specified')
    message = models.TextField()
    status = models.CharField(max_length=30, default='new')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Contact {self.name} - {self.subject}"


class FeedbackReview(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=gen_review_id)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback_reviews')
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=30, default='landlord')
    rating = models.IntegerField(default=5)
    property_name = models.CharField(max_length=200, blank=True, null=True)
    title = models.CharField(max_length=255)
    comment = models.TextField()
    helpful_count = models.IntegerField(default=0)
    verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.name} ({self.rating} stars): {self.title}"


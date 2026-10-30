from django.contrib import admin
from .models import (
    User, Property, Unit, Lease, Payment, MaintenanceTicket, ContactMessage, FeedbackReview
)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'role', 'phone', 'created_at')
    search_fields = ('name', 'email', 'phone')
    list_filter = ('role', 'created_at')

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'property_type', 'landlord', 'created_at')
    search_fields = ('name', 'city', 'address')
    list_filter = ('property_type', 'city', 'state')

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'property', 'rent_amount', 'status', 'bedrooms', 'bathrooms')
    search_fields = ('unit_number', 'property__name')
    list_filter = ('status', 'property')

@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'unit', 'tenant', 'landlord', 'rent_amount', 'start_date', 'end_date', 'status')
    search_fields = ('tenant__name', 'landlord__name', 'unit__unit_number')
    list_filter = ('status', 'start_date', 'end_date')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'tenant', 'amount', 'due_date', 'paid_date', 'status', 'payment_method')
    search_fields = ('tenant__name', 'transaction_ref', 'notes')
    list_filter = ('status', 'payment_method', 'due_date')

@admin.register(MaintenanceTicket)
class MaintenanceTicketAdmin(admin.ModelAdmin):
    list_display = ('title', 'property', 'unit', 'tenant', 'priority', 'status', 'created_at')
    search_fields = ('title', 'description', 'tenant__name')
    list_filter = ('status', 'priority', 'category')

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'portfolio_size', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')

@admin.register(FeedbackReview)
class FeedbackReviewAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'rating', 'property_name', 'title', 'verified', 'created_at')
    search_fields = ('name', 'title', 'comment')
    list_filter = ('role', 'rating', 'verified')


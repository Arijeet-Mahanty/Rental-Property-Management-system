from django.urls import path, re_path
from . import views

urlpatterns = [
    # Health check
    re_path(r'^health/?$', views.health_check_view, name='api_health'),

    # Authentication
    re_path(r'^auth/signup/?$', views.signup_view, name='api_signup'),
    re_path(r'^auth/login/?$', views.login_view, name='api_login'),
    re_path(r'^auth/logout/?$', views.logout_view, name='api_logout'),
    re_path(r'^auth/me/?$', views.me_view, name='api_me'),
    re_path(r'^auth/password-reset/request/?$', views.password_reset_request_view, name='api_password_reset_request'),
    re_path(r'^auth/password-reset/verify/?$', views.password_reset_verify_view, name='api_password_reset_verify'),
    re_path(r'^auth/password-reset/confirm/?$', views.password_reset_confirm_view, name='api_password_reset_confirm'),

    # Dashboard metrics
    re_path(r'^dashboard/stats/?$', views.dashboard_stats_view, name='api_dashboard_stats'),

    # Properties
    re_path(r'^properties/?$', views.properties_view, name='api_properties'),
    re_path(r'^properties/(?P<property_id>[^/]+)/?$', views.property_detail_view, name='api_property_detail'),

    # Units
    re_path(r'^units/?$', views.units_view, name='api_units'),
    re_path(r'^units/(?P<unit_id>[^/]+)/?$', views.unit_detail_view, name='api_unit_detail'),

    # Leases
    re_path(r'^leases/?$', views.leases_view, name='api_leases'),

    # Payments
    re_path(r'^payments/?$', views.payments_view, name='api_payments'),
    re_path(r'^payments/create-order/?$', views.payment_create_order_view, name='api_payment_create_order'),
    re_path(r'^payments/verify-webhook/?$', views.payment_verify_webhook_view, name='api_payment_verify_webhook'),

    # Maintenance tickets
    re_path(r'^maintenance/?$', views.maintenance_view, name='api_maintenance'),
    re_path(r'^maintenance/(?P<ticket_id>[^/]+)/?$', views.maintenance_detail_view, name='api_maintenance_detail'),

    # Contact & Inquiries
    re_path(r'^contact/?$', views.contact_view, name='api_contact'),

    # Feedback & Reviews
    re_path(r'^feedback/?$', views.feedback_view, name='api_feedback'),
    re_path(r'^feedback/(?P<review_id>[^/]+)/helpful/?$', views.feedback_helpful_view, name='api_feedback_helpful'),

    # Admin Command Center endpoints
    re_path(r'^admin/users/?$', views.admin_users_view, name='api_admin_users'),
    re_path(r'^admin/users/(?P<user_id>[^/]+)/toggle-status/?$', views.admin_toggle_user_status_view, name='api_admin_toggle_user_status'),
    re_path(r'^admin/inquiries/?$', views.admin_inquiries_view, name='api_admin_inquiries'),

    # Context-aware AI Assistant
    re_path(r'^chatbot/?$', views.chatbot_view, name='api_chatbot'),
]


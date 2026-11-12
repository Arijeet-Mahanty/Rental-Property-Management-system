from django.core.management.base import BaseCommand
from api.models import User
from api.auth_utils import hash_password

class Command(BaseCommand):
    help = "Sets a secure private password for the Platform Administrator"

    def add_arguments(self, parser):
        parser.add_argument('password', type=str, help='New secret password for the admin account')
        parser.add_argument('--email', type=str, default='admin@rentroll.com', help='Admin email address (default: admin@rentroll.com)')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        new_password = options['password']

        if len(new_password) < 8:
            self.stderr.write(self.style.ERROR("Password must be at least 8 characters long."))
            return

        admin = User.objects.filter(email=email).first()
        if not admin:
            admin = User.objects.filter(role='admin').first()

        if not admin:
            admin = User.objects.create(
                id='usr_admin_root',
                name='Platform Administrator',
                email=email,
                password_hash=hash_password(new_password),
                role='admin',
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f"Created new Administrator account for {email}."))
        else:
            admin.password_hash = hash_password(new_password)
            admin.email = email
            admin.role = 'admin'
            admin.is_active = True
            admin.save()
            self.stdout.write(self.style.SUCCESS(f"Successfully updated secret password for Administrator {admin.email}."))

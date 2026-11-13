web: gunicorn rentroll.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 60
release: python manage.py migrate --noinput && python manage.py purge_demo_data


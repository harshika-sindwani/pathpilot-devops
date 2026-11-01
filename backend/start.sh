#!/bin/sh
set -e

python -c "from app import initialize_database; initialize_database()"

exec gunicorn --bind 0.0.0.0:5000 app:app
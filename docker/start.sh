#!/bin/sh
# Container start command: migrate, seed an empty database, then serve.
set -eu

cd /app/src/tinypm

python manage.py migrate --no-input

# Seed the demo data when the database is empty. On Render's free plan
# the SQLite file is recreated on every restart, so each wake-up gets a
# fresh board. Set SEED_ON_START=false to skip this.
if [ "${SEED_ON_START:-true}" = "true" ]; then
    python manage.py seed_data --if-empty
fi

# Render sets PORT (10000 by default); everything else falls back to
# sensible local values.
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-2}" \
    --access-logfile - \
    --error-logfile -

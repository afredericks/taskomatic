# syntax=docker/dockerfile:1

# Stage 1: build the Svelte bundle.
# vite.config.ts writes it to src/tinypm/static/dist,
# next to Django's other static files.
FROM node:20-slim AS frontend

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# Stage 2: the Django application, served by gunicorn with WhiteNoise
# handling the static files.
FROM python:3.13-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /bin/uv

WORKDIR /app

# Install the dependencies before copying the code so the layer is
# cached between code changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY src/ src/
COPY docker/ docker/
COPY --from=frontend /build/src/tinypm/static/dist src/tinypm/static/dist

WORKDIR /app/src/tinypm
RUN python manage.py collectstatic --no-input

# Run as an unprivileged user. The user owns /app so SQLite can write
# its database next to manage.py when DATABASE_URL is not set.
RUN useradd --system --create-home app && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["sh", "/app/docker/start.sh"]

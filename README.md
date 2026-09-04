# TinyPM

Task and project management.

A Django REST Framework API with a Svelte 5 frontend,
built with Vite and served through django-vite.

## Requirements

- Python 3.13 and [uv](https://docs.astral.sh/uv/)
- Node 20 or newer

## Setup

```console
# Backend
uv sync

cd src/tinypm
uv run python manage.py migrate
uv run python manage.py seed_data

# Frontend
cd ../../frontend
npm install
```

## Running the project

Run both servers side by side.
Django serves the API and the page shell,
Vite serves the frontend assets with hot reloading.

```console
# Terminal one
cd src/tinypm
uv run python manage.py runserver

# Terminal two
cd frontend
npm run dev
```

Then open <http://127.0.0.1:8000/pm/app/>.

To run against built assets instead of the Vite dev server,
build them and turn dev mode off:

```console
cd frontend
npm run build

cd ../src/tinypm
DJANGO_VITE_DEV_MODE=False uv run python manage.py runserver
```

## Filtering the task list

The task list at `/pm/app/tasks/` filters itself
from its query string,
one parameter per filter.
Each parameter names a grid column,
optionally followed by an operator and a value type
separated by double underscores:

```text
/pm/app/tasks/?status=done
/pm/app/tasks/?title__contains=login&assignee_email__empty=
/pm/app/tasks/?due_date__lt__date=today&status__neq=done
```

Operators: `eq` (the default), `neq`, `contains`, `startsWith`,
`lt`, `lte`, `gt`, `gte`, `in` (comma-separated), `empty` and `notEmpty`.
Value types: `text` (the default, case-insensitive), `number`, `date` and `boolean`.
The `due_date` and `comment_count` columns already compare as
a date and a number, so the type can be left off for them.
Dates accept the literal `today`.

The dashboard's tiles, panels and project rows
link to the task list with the matching filters,
and `frontend/src/lib/filters.ts` holds the parsing,
matching and link-building helpers.

## Tests

```console
# Python
uv run pytest

# TypeScript
cd frontend
npm test
npm run check
```

## Other commands

```console
cd src/tinypm

# Report overdue tasks
uv run python manage.py mark_overdue

# Create an admin login
uv run python manage.py createsuperuser
```

## Deploying to Render

The `Dockerfile` builds the frontend,
collects the static files,
and serves everything from one gunicorn process,
with WhiteNoise handling the static files.
`render.yaml` describes the matching Render web service.

1. Push the repository to GitHub.
2. In the Render dashboard choose **New → Blueprint**
   and pick the repository.
   Render reads `render.yaml`,
   creates the service on the free plan,
   and generates a `SECRET_KEY`.
3. Open `https://<service-name>.onrender.com/pm/app/`.

On start the container runs the migrations,
seeds the demo data when the database is empty,
and binds gunicorn to Render's `PORT`.

Things to know about the free plan:

- The service sleeps after fifteen minutes without traffic
  and takes about a minute to wake.
- The filesystem is wiped on every restart,
  so the SQLite database, and any edits, are lost each time.
  The seed runs again and the demo board comes back.
- The API accepts anonymous writes,
  so anyone with the link can change the data.

To keep data between restarts,
set `DATABASE_URL` in the service's environment
to a PostgreSQL URL;
Neon and Supabase offer free databases,
and `psycopg` is already installed.

### Running the production image locally

```console
docker build -t tinypm .
docker run --rm -p 8000:8000 -e DEBUG=False tinypm
```

Then open <http://localhost:8000/pm/app/>.

## Layout

| Path                             | Contents                                         |
| -------------------------------- | ------------------------------------------------ |
| `src/tinypm/task/models.py`      | `Project`, `Task`, and `Comment`                 |
| `src/tinypm/task/api.py`         | the DRF API the frontend consumes                |
| `src/tinypm/task/serializers.py` | API serializers                                  |
| `src/tinypm/task/views.py`       | the page shell and the server-rendered task page |
| `frontend/src/lib/`              | the Svelte components and API client             |

## Seeded logins

`alice`, `bob`, and `charlie`, all with the password `password123`.

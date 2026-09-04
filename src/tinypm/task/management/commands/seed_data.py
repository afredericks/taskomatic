"""
Management command to seed the database with sample data for the interview.
"""
from datetime import date, timedelta
from random import choice, randint, seed

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from task.models import Comment, Project, Task


class Command(BaseCommand):
    help = 'Seed the database with sample projects, tasks, and comments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
        parser.add_argument(
            '--if-empty',
            action='store_true',
            help='Do nothing when the database already has projects',
        )

    def handle(self, *args, **options):
        User = get_user_model()

        # Comments are appended on every run, so a deploy that reseeds on
        # each start needs a way to leave an existing database alone.
        if options['if_empty'] and Project.objects.exists():
            self.stdout.write('Database already seeded; skipping.')
            return

        # Fixed seed so every candidate sees the same board.
        seed(20260713)

        if options['clear']:
            self.stdout.write('Clearing existing data...')
            Comment.objects.all().delete()
            Task.objects.all().delete()
            Project.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

        # Create users
        users = []
        user_data = [
            ('alice', 'alice@example.com', 'Alice', 'Smith'),
            ('bob', 'bob@example.com', 'Bob', 'Johnson'),
            ('charlie', 'charlie@example.com', 'Charlie', 'Brown'),
        ]

        for username, email, first_name, last_name in user_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                self.stdout.write(f'Created user: {username}')
            users.append(user)

        # Create projects
        projects_data = [
            ('Website Redesign', 'Complete overhaul of the company website'),
            ('Mobile App', 'Native iOS and Android application'),
            ('API Integration', 'Third-party API integrations'),
            ('Database Migration', 'Migrate from MySQL to PostgreSQL'),
        ]

        projects = []
        for name, description in projects_data:
            project, created = Project.objects.get_or_create(
                name=name,
                defaults={'description': description}
            )
            if created:
                self.stdout.write(f'Created project: {name}')
            projects.append(project)

        # Create tasks
        # (title, description, project index, status, due date offset in days)
        tasks_data = [
            # Website Redesign
            ('Design homepage mockup', 'Create wireframes and high-fidelity designs', 0, 'done', -10),
            ('Implement responsive header', 'Header should work on mobile and desktop', 0, 'done', -5),
            ('Build contact form', 'Form with validation and email sending', 0, 'in_progress', 2),
            ('SEO optimization', 'Meta tags, sitemap, robots.txt', 0, 'todo', 7),
            ('Performance audit', 'Lighthouse scores and optimization', 0, 'todo', 14),

            # Mobile App
            ('Set up React Native project', 'Initialize project with TypeScript', 1, 'done', -15),
            ('User authentication flow', 'Login, register, password reset', 1, 'in_progress', -3),
            ('Push notifications', 'Firebase Cloud Messaging integration', 1, 'todo', 5),
            ('Offline mode', 'Local storage and sync', 1, 'todo', None),

            # API Integration
            ('Stripe payment integration', 'Checkout and subscription handling', 2, 'in_progress', -7),
            ('Twilio SMS notifications', 'Order updates via SMS', 2, 'todo', 3),
            ('Google Maps integration', 'Store locator feature', 2, 'todo', 10),

            # Database Migration
            ('Schema analysis', 'Document current schema and relationships', 3, 'done', -20),
            ('Data export scripts', 'Export data in migration-friendly format', 3, 'done', -14),
            ('PostgreSQL schema setup', 'Create tables and indexes', 3, 'in_progress', -2),
            ('Data import and validation', 'Import and verify data integrity', 3, 'todo', 5),
            ('Update application configs', 'Switch connection strings', 3, 'todo', 7),
        ]

        tasks = []
        for index, (title, description, project_idx, status, due_offset) in enumerate(tasks_data):
            due_date = None
            if due_offset is not None:
                due_date = date.today() + timedelta(days=due_offset)

            # Leave a couple of unassigned tasks so the frontend has to cope
            # with a null assignee, and so 'mark as done' can be rejected.
            assignee = None if index in (3, 8, 11) else choice(users)

            task, created = Task.objects.get_or_create(
                title=title,
                project=projects[project_idx],
                defaults={
                    'description': description,
                    'status': status,
                    'due_date': due_date,
                    'assignee': assignee,
                }
            )
            if created:
                self.stdout.write(f'Created task: {title}')
            tasks.append(task)

        # Create comments
        comments_data = [
            "Looking good so far!",
            "Can we schedule a review meeting?",
            "I've pushed the latest changes.",
            "Blocked on this - need access to the staging server.",
            "Updated the PR with the requested changes.",
            "This is taking longer than expected.",
            "Great progress!",
            "Need clarification on the requirements.",
            "Done! Ready for QA.",
            "Found a bug - investigating.",
        ]

        comment_count = 0
        for task in tasks:
            for _ in range(randint(0, 5)):
                Comment.objects.create(
                    task=task,
                    author=choice(users),
                    text=choice(comments_data),
                )
                comment_count += 1

        self.stdout.write(f'Created {comment_count} comments')

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeeding complete!\n'
                f'  - {len(users)} users\n'
                f'  - {len(projects)} projects\n'
                f'  - {len(tasks)} tasks\n'
                f'  - {comment_count} comments'
            )
        )

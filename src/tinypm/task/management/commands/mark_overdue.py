"""Management command to find and report overdue tasks."""
from datetime import date

from django.core.mail import send_mail
from django.core.management.base import BaseCommand

from task.models import Task


class Command(BaseCommand):
    help = 'Find and report overdue tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--notify',
            action='store_true',
            help='Send email notifications to assignees',
        )

    def handle(self, *args, **options):
        today = date.today()

        tasks = Task.objects.all()

        overdue_tasks = []
        for task in tasks:
            if task.due_date and task.due_date < today and task.status != 'done':
                overdue_tasks.append(task)

        self.stdout.write(f"Found {len(overdue_tasks)} overdue tasks")

        for task in overdue_tasks:
            days_overdue = (today - task.due_date).days

            self.stdout.write(
                f"  - {task.title} (Project: {task.project.name}) - "
                f"{days_overdue} days overdue"
            )

            if options['notify'] and task.assignee:
                send_mail(
                    subject=f'Overdue task: {task.title}',
                    message=(
                        f'Your task "{task.title}" is {days_overdue} days overdue.\n'
                        f'Due date: {task.due_date}\n'
                        f'Project: {task.project.name}'
                    ),
                    from_email='noreply@tinypm.local',
                    recipient_list=[task.assignee.email],
                    fail_silently=True,
                )
                self.stdout.write(f"    Notified: {task.assignee.email}")

        self.stdout.write(
            self.style.SUCCESS(f'Processed {len(overdue_tasks)} overdue tasks')
        )

"""DRF API consumed by the Svelte frontend."""
from django.core.mail import send_mail
from rest_framework import generics

from .models import Task
from .serializers import TaskSerializer, TaskWriteSerializer


class TaskListAPIView(generics.ListCreateAPIView):
    """List and create tasks."""
    queryset = Task.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskWriteSerializer
        return TaskSerializer


class TaskDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete a single task."""
    queryset = Task.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return TaskWriteSerializer
        return TaskSerializer

    def perform_update(self, serializer):
        old_status = serializer.instance.status

        task = serializer.save()

        if task.status == 'done' and old_status != 'done' and task.assignee:
            try:
                send_mail(
                    subject=f'Task completed: {task.title}',
                    message=f'The task "{task.title}" has been marked as complete.',
                    from_email='noreply@tinypm.local',
                    recipient_list=[task.assignee.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        print(f"Task {task.id} status changed from {old_status} to {task.status}")

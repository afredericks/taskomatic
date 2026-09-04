"""DRF API consumed by the Svelte frontend."""
import logging

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comment, Project, Task
from .serializers import (
    CommentSerializer,
    CommentWriteSerializer,
    ProjectSerializer,
    TaskSerializer,
    TaskWriteSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

# TaskSerializer embeds each task's project, assignee and comments, so fetch
# them alongside the tasks instead of one query per task.
TASK_QUERYSET = Task.objects.select_related('project', 'assignee').prefetch_related(
    'comments__author'
)


class ProjectListAPIView(generics.ListAPIView):
    """List projects, e.g. for the task form's project picker."""
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


class TaskListAPIView(generics.ListCreateAPIView):
    """List and create tasks."""
    queryset = TASK_QUERYSET

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskWriteSerializer
        return TaskSerializer


class TaskDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete a single task."""
    queryset = TASK_QUERYSET

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return TaskWriteSerializer
        return TaskSerializer

    def perform_update(self, serializer):
        old_status = serializer.instance.status

        task = serializer.save()

        if task.status == 'done' and old_status != 'done' and task.assignee:
            send_mail(
                subject=f'Task completed: {task.title}',
                message=f'The task "{task.title}" has been marked as complete.',
                from_email='noreply@tinypm.local',
                recipient_list=[task.assignee.email],
                fail_silently=True,
            )

        if task.status != old_status:
            logger.info(
                "Task %s status changed from %s to %s", task.id, old_status, task.status
            )


class CurrentUserAPIView(APIView):
    """Who the browser is signed in as, so the frontend can gate comment actions."""

    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'authenticated': False})
        return Response({
            'authenticated': True,
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user.get_full_name() or user.username,
            'is_staff': user.is_staff,
        })


class UserListAPIView(generics.ListAPIView):
    """List the active users, e.g. for the task list's assignee picker."""
    queryset = (
        get_user_model()
        .objects.filter(is_active=True)
        .order_by('first_name', 'last_name', 'username')
    )
    serializer_class = UserSerializer


class TaskCommentListCreateAPIView(generics.ListCreateAPIView):
    """List a task's comments, newest first, or post one as the signed-in user."""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_task(self):
        return get_object_or_404(Task, pk=self.kwargs['task_id'])

    def get_queryset(self):
        return self.get_task().comments.select_related('author')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommentWriteSerializer
        return CommentSerializer

    def create(self, request, *args, **kwargs):
        task = self.get_task()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(task=task, author=request.user)

        if task.assignee and task.assignee != request.user:
            send_mail(
                subject=f'New comment on: {task.title}',
                message=f'{request.user.username} commented: {comment.text[:100]}',
                from_email='noreply@tinypm.local',
                recipient_list=[task.assignee.email],
                fail_silently=True,
            )

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class IsCommentAuthorOrStaff(permissions.BasePermission):
    """Only the comment's author, or staff, may remove it."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.author_id == request.user.id


class CommentDetailAPIView(generics.DestroyAPIView):
    """Delete a single comment."""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsCommentAuthorOrStaff]

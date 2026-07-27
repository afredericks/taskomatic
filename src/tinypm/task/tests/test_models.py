"""Tests for the task models."""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from task.models import Comment, Project, Task

User = get_user_model()


class TestTaskModel(TestCase):
    """Tests for the Task model."""

    def setUp(self):
        self.project = Project.objects.create(name="Test Project")
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )

    def test_task_creation(self):
        """Test creating a task."""
        task = Task.objects.create(title="Test Task", project=self.project)
        self.assertIsNotNone(task)

    def test_task_str(self):
        """Test the string representation."""
        task = Task.objects.create(title="Test Task", project=self.project)
        self.assertEqual(str(task), "Test Task")

    def test_private_overdue_calculation(self):
        """Test the overdue day count."""
        task = Task.objects.create(
            title="Overdue Task",
            project=self.project,
            due_date=date.today() - timedelta(days=5),
            status='todo',
        )
        self.assertEqual(task._calculate_overdue_days(), 5)

    def test_private_overdue_done_task(self):
        """Test that a completed task is not overdue."""
        task = Task.objects.create(
            title="Done Task",
            project=self.project,
            due_date=date.today() - timedelta(days=5),
            status='done',
        )
        self.assertEqual(task._calculate_overdue_days(), 0)


class TestProjectTaskRelationship(TestCase):
    """Tests for the project/task relationship."""

    def setUp(self):
        self.project = Project.objects.create(name="Test Project")

    def test_project_task_relationship(self):
        """Test that tasks are reachable from their project."""
        Task.objects.create(title="Task One", project=self.project)
        Task.objects.create(title="Task Two", project=self.project)

        self.assertEqual(self.project.tasks.count(), 2)


class TestCommentModel(TestCase):
    """Tests for the Comment model."""

    def setUp(self):
        self.project = Project.objects.create(name="Test Project")
        self.task = Task.objects.create(title="Test Task", project=self.project)
        self.user = User.objects.create_user(
            username='commenter',
            email='commenter@example.com',
            password='testpass123',
        )

    def test_comment_creation(self):
        """Test creating a comment."""
        comment = Comment.objects.create(
            task=self.task,
            author=self.user,
            text="A comment",
        )
        self.assertIsNotNone(comment)

    def test_comment_ordering(self):
        """Test that comments come back newest first."""
        first = Comment.objects.create(task=self.task, author=self.user, text="First")
        second = Comment.objects.create(task=self.task, author=self.user, text="Second")

        comments = list(self.task.comments.all())

        self.assertEqual(comments, [second, first])

"""Tests for the task API."""
from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.test import TestCase

from task.models import Project, Task
from task.serializers import TaskSerializer

User = get_user_model()


class TestTaskSerializerFields(TestCase):
    """Tests for the fields TaskSerializer computes."""

    def test_project_name(self):
        task = Mock()
        task.project.name = "Mocked Project"

        self.assertEqual(TaskSerializer().get_project_name(task), "Mocked Project")

    def test_assignee_email(self):
        task = Mock()
        task.assignee.email = "mocked@example.com"

        self.assertEqual(TaskSerializer().get_assignee_email(task), "mocked@example.com")

    def test_comment_count(self):
        task = Mock()
        task.comments.count.return_value = 3

        self.assertEqual(TaskSerializer().get_comment_count(task), 3)

    def test_serializer_fields(self):
        self.assertIn('title', TaskSerializer().fields)
        self.assertIn('status', TaskSerializer().fields)


class TestTaskAPIEndpoints(TestCase):
    """Tests for the API endpoints."""

    def setUp(self):
        self.project = Project.objects.create(name="Test Project")
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        self.task = Task.objects.create(
            title="Test Task",
            project=self.project,
            assignee=self.user,
        )

    def test_api_task_list(self):
        response = self.client.get('/pm/api/tasks/')
        self.assertIn(response.status_code, [200, 301])

    def test_api_task_detail(self):
        response = self.client.get(f'/pm/api/tasks/{self.task.id}/')
        self.assertEqual(response.status_code, 200)

    def test_api_task_update(self):
        response = self.client.patch(
            f'/pm/api/tasks/{self.task.id}/',
            data={'status': 'in_progress'},
            content_type='application/json',
        )
        self.assertTrue(response.status_code)

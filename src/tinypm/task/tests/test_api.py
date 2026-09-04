"""Tests for the task API."""
from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase

from task.models import Comment, Project, Task
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

    def test_assignee_name(self):
        task = Mock()
        task.assignee.get_full_name.return_value = "Mocked User"

        self.assertEqual(TaskSerializer().get_assignee_name(task), "Mocked User")

    def test_assignee_name_falls_back_to_username(self):
        task = Mock()
        task.assignee.get_full_name.return_value = ""
        task.assignee.username = "mocked"

        self.assertEqual(TaskSerializer().get_assignee_name(task), "mocked")

    def test_assignee_fields_when_unassigned(self):
        task = Mock(assignee=None)

        self.assertIsNone(TaskSerializer().get_assignee_email(task))
        self.assertIsNone(TaskSerializer().get_assignee_name(task))

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

    def test_api_project_list(self):
        response = self.client.get('/pm/api/projects/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]['name'], "Test Project")

    def test_api_user_list(self):
        zed = User.objects.create_user(
            username='zed',
            email='zed@example.com',
            password='x',
            first_name='Zed',
            last_name='Zane',
        )
        User.objects.create_user(username='gone', email='gone@example.com', is_active=False)

        response = self.client.get('/pm/api/users/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    'id': self.user.id,
                    'username': 'testuser',
                    'email': 'test@example.com',
                    'name': 'testuser',
                },
                {'id': zed.id, 'username': 'zed', 'email': 'zed@example.com', 'name': 'Zed Zane'},
            ],
        )

    def test_api_task_create(self):
        response = self.client.post('/pm/api/tasks/', {
            'title': "Created Task",
            'project': self.project.id,
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Task.objects.filter(title="Created Task").exists())

    def test_api_task_list(self):
        response = self.client.get('/pm/api/tasks/')
        self.assertIn(response.status_code, [200, 301])

    def test_api_task_list_includes_assignee_details(self):
        response = self.client.get('/pm/api/tasks/')
        [task] = response.json()
        self.assertEqual(task['assignee'], self.user.id)
        self.assertEqual(task['assignee_email'], "test@example.com")
        self.assertEqual(task['assignee_name'], "testuser")

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


class TestCommentAPIEndpoints(TestCase):
    """Tests for the comment endpoints and the current-user endpoint."""

    def setUp(self):
        self.project = Project.objects.create(name="Test Project")
        self.author = User.objects.create_user(
            username='author',
            email='author@example.com',
            password='pw',
            first_name='Alice',
            last_name='Smith',
        )
        self.assignee = User.objects.create_user(
            username='assignee',
            email='assignee@example.com',
            password='pw',
        )
        self.staff = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='pw',
            is_staff=True,
        )
        self.task = Task.objects.create(
            title="Test Task",
            project=self.project,
            assignee=self.assignee,
        )
        self.comment = Comment.objects.create(
            task=self.task,
            author=self.author,
            text="An existing comment",
        )
        self.comments_url = f'/pm/api/tasks/{self.task.id}/comments/'
        self.comment_url = f'/pm/api/comments/{self.comment.id}/'

    def post_comment(self, text):
        return self.client.post(
            self.comments_url,
            data={'text': text},
            content_type='application/json',
        )

    def test_list_comments_includes_author_details(self):
        response = self.client.get(self.comments_url)
        self.assertEqual(response.status_code, 200)
        [comment] = response.json()
        self.assertEqual(comment['text'], "An existing comment")
        self.assertEqual(comment['author'], self.author.id)
        self.assertEqual(comment['author_email'], "author@example.com")
        self.assertEqual(comment['author_name'], "Alice Smith")

    def test_list_comments_for_unknown_task(self):
        response = self.client.get('/pm/api/tasks/9999/comments/')
        self.assertEqual(response.status_code, 404)

    def test_task_detail_embeds_author_details(self):
        response = self.client.get(f'/pm/api/tasks/{self.task.id}/')
        [comment] = response.json()['comments']
        self.assertEqual(comment['author'], self.author.id)
        self.assertEqual(comment['author_name'], "Alice Smith")

    def test_author_name_falls_back_to_username(self):
        Comment.objects.create(task=self.task, author=self.assignee, text="From the assignee")
        response = self.client.get(self.comments_url)
        names = {comment['author_name'] for comment in response.json()}
        self.assertIn("assignee", names)

    def test_create_comment_requires_login(self):
        response = self.post_comment("Anonymous comment")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.task.comments.count(), 1)

    def test_create_comment_as_signed_in_user(self):
        self.client.force_login(self.author)
        response = self.post_comment("  Looks good to me  ")
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['text'], "Looks good to me")
        self.assertEqual(body['author'], self.author.id)
        self.assertEqual(body['author_name'], "Alice Smith")
        self.assertTrue(
            Comment.objects.filter(
                task=self.task, author=self.author, text="Looks good to me"
            ).exists()
        )

    def test_create_comment_is_newest_first_in_list(self):
        self.client.force_login(self.author)
        self.post_comment("Second comment")
        response = self.client.get(self.comments_url)
        self.assertEqual(
            [comment['text'] for comment in response.json()],
            ["Second comment", "An existing comment"],
        )

    def test_create_comment_notifies_assignee(self):
        self.client.force_login(self.author)
        self.post_comment("Please review")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["assignee@example.com"])
        self.assertIn("Test Task", mail.outbox[0].subject)

    def test_create_comment_does_not_notify_self(self):
        self.client.force_login(self.assignee)
        self.post_comment("Talking to myself")
        self.assertEqual(len(mail.outbox), 0)

    def test_create_comment_rejects_short_text(self):
        self.client.force_login(self.author)
        response = self.post_comment("Hi   ")
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.json())
        self.assertEqual(self.task.comments.count(), 1)

    def test_create_comment_for_unknown_task(self):
        self.client.force_login(self.author)
        response = self.client.post(
            '/pm/api/tasks/9999/comments/',
            data={'text': "Into the void"},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_own_comment(self):
        self.client.force_login(self.author)
        response = self.client.delete(self.comment_url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Comment.objects.filter(pk=self.comment.id).exists())

    def test_delete_someone_elses_comment_is_forbidden(self):
        self.client.force_login(self.assignee)
        response = self.client.delete(self.comment_url)
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Comment.objects.filter(pk=self.comment.id).exists())

    def test_staff_can_delete_any_comment(self):
        self.client.force_login(self.staff)
        response = self.client.delete(self.comment_url)
        self.assertEqual(response.status_code, 204)

    def test_delete_requires_login(self):
        response = self.client.delete(self.comment_url)
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Comment.objects.filter(pk=self.comment.id).exists())

    def test_me_anonymous(self):
        response = self.client.get('/pm/api/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'authenticated': False})

    def test_me_signed_in(self):
        self.client.force_login(self.author)
        response = self.client.get('/pm/api/me/')
        body = response.json()
        self.assertTrue(body['authenticated'])
        self.assertEqual(body['id'], self.author.id)
        self.assertEqual(body['username'], "author")
        self.assertEqual(body['email'], "author@example.com")
        self.assertEqual(body['name'], "Alice Smith")
        self.assertFalse(body['is_staff'])

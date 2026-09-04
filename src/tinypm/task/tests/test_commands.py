"""Tests for the management commands."""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from task.models import Comment, Project, Task


class TestSeedData(TestCase):
    """Tests for the seed_data command."""

    def test_seeds_an_empty_database(self):
        """The command fills an empty database with the demo board."""
        call_command('seed_data', stdout=StringIO())

        self.assertEqual(Project.objects.count(), 4)
        self.assertEqual(Task.objects.count(), 17)
        self.assertGreater(Comment.objects.count(), 0)

    def test_if_empty_skips_a_seeded_database(self):
        """With --if-empty a second run leaves the data untouched."""
        call_command('seed_data', stdout=StringIO())
        comment_count = Comment.objects.count()

        out = StringIO()
        call_command('seed_data', '--if-empty', stdout=out)

        self.assertEqual(Comment.objects.count(), comment_count)
        self.assertIn('already seeded', out.getvalue())

    def test_if_empty_seeds_when_there_is_no_data(self):
        """--if-empty still seeds a database without projects."""
        call_command('seed_data', '--if-empty', stdout=StringIO())

        self.assertEqual(Project.objects.count(), 4)

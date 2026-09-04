from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, Project, Task

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """A user as the assignee picker needs it."""
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'created_at', 'task_count']

    def get_task_count(self, obj):
        return obj.tasks.count()


class CommentSerializer(serializers.ModelSerializer):
    author_email = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'text', 'author', 'author_email', 'author_name', 'created_at']

    def get_author_email(self, obj):
        return obj.author.email

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username


class CommentWriteSerializer(serializers.ModelSerializer):
    """Serializer for posting a comment. The task and author come from the request."""

    class Meta:
        model = Comment
        fields = ['text']

    def validate_text(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Comment must be at least 5 characters.")
        return value


class TaskSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    assignee_email = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'due_date',
            'project', 'project_name', 'assignee', 'assignee_email', 'assignee_name',
            'comments', 'comment_count', 'created_at', 'updated_at'
        ]

    def get_project_name(self, obj):
        return obj.project.name

    def get_assignee_email(self, obj):
        if obj.assignee:
            return obj.assignee.email
        return None

    def get_assignee_name(self, obj):
        if obj.assignee:
            return obj.assignee.get_full_name() or obj.assignee.username
        return None

    def get_comment_count(self, obj):
        return obj.comments.count()

    def validate_title(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long.")
        return value


class TaskWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tasks."""

    class Meta:
        model = Task
        fields = ['title', 'description', 'status', 'due_date', 'project', 'assignee']

    def validate_title(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long.")
        return value

    def validate(self, data):
        status = data.get('status', getattr(self.instance, 'status', None))
        assignee = data.get('assignee', getattr(self.instance, 'assignee', None))

        if status == 'done' and not assignee:
            raise serializers.ValidationError(
                "Cannot mark task as done without an assignee."
            )
        return data

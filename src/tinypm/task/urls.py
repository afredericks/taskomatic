from django.urls import path, re_path

from . import api, views

urlpatterns = [
    path('tasks/<int:task_id>/', views.task_detail, name='task_detail'),

    # API endpoints
    path('api/me/', api.CurrentUserAPIView.as_view(), name='api_me'),
    path('api/users/', api.UserListAPIView.as_view(), name='api_user_list'),
    path('api/projects/', api.ProjectListAPIView.as_view(), name='api_project_list'),
    path('api/tasks/', api.TaskListAPIView.as_view(), name='api_task_list'),
    path('api/tasks/<int:pk>/', api.TaskDetailAPIView.as_view(), name='api_task_detail'),
    path(
        'api/tasks/<int:task_id>/comments/',
        api.TaskCommentListCreateAPIView.as_view(),
        name='api_task_comments',
    ),
    path('api/comments/<int:pk>/', api.CommentDetailAPIView.as_view(), name='api_comment_detail'),

    # The frontend handles its own routing below /pm/app/
    re_path(r'^app/(?:.*)?$', views.app, name='app'),
]

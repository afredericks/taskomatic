from django.urls import path, re_path

from . import api, views

urlpatterns = [
    path('tasks/<int:task_id>/', views.task_detail, name='task_detail'),

    # API endpoints
    path('api/tasks/', api.TaskListAPIView.as_view(), name='api_task_list'),
    path('api/tasks/<int:pk>/', api.TaskDetailAPIView.as_view(), name='api_task_detail'),

    # The frontend handles its own routing below /pm/app/
    re_path(r'^app/(?:.*)?$', views.app, name='app'),
]

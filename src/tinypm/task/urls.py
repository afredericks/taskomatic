from django.urls import path

from . import api, views

urlpatterns = [
    path('tasks/<int:task_id>/', views.task_detail, name='task_detail'),

    # API endpoints
    path('api/tasks/', api.TaskListAPIView.as_view(), name='api_task_list'),
    path('api/tasks/<int:pk>/', api.TaskDetailAPIView.as_view(), name='api_task_detail'),
]

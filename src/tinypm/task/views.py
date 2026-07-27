"""Server-rendered task pages."""
from datetime import date

from django.contrib import messages
from django.core.mail import send_mail
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Comment, Task


@ensure_csrf_cookie
def app(request):
    """Serve the single-page frontend."""
    return render(request, 'task/app.html')


def task_detail(request, task_id):
    """Show and update task details."""
    task = get_object_or_404(Task, pk=task_id)

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_status':
            new_status = request.POST.get('status')

            if new_status == 'done' and not task.assignee:
                messages.error(request, "Cannot mark as done without an assignee.")
                return redirect('task_detail', task_id=task_id)

            old_status = task.status
            task.status = new_status
            task.save()

            if new_status == 'done' and task.assignee:
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

            print(f"Task {task.id} status changed from {old_status} to {new_status}")

            messages.success(request, f"Task status updated to {new_status}.")

        elif action == 'add_comment':
            if not request.user.is_authenticated:
                return HttpResponseForbidden("Must be logged in to comment")

            comment_text = request.POST.get('comment_text', '').strip()

            if len(comment_text) < 5:
                messages.error(request, "Comment must be at least 5 characters.")
                return redirect('task_detail', task_id=task_id)

            Comment.objects.create(
                task=task,
                author=request.user,
                text=comment_text,
            )

            if task.assignee and task.assignee != request.user:
                send_mail(
                    subject=f'New comment on: {task.title}',
                    message=f'{request.user.username} commented: {comment_text[:100]}',
                    from_email='noreply@tinypm.local',
                    recipient_list=[task.assignee.email],
                    fail_silently=True,
                )

            messages.success(request, "Comment added.")

        elif action == 'assign':
            if not request.user.is_staff:
                return HttpResponseForbidden("Only staff can assign tasks")

            from django.contrib.auth import get_user_model
            User = get_user_model()

            assignee_id = request.POST.get('assignee_id')
            if assignee_id:
                assignee = get_object_or_404(User, pk=assignee_id)
                task.assignee = assignee
                task.save()

                send_mail(
                    subject=f'Task assigned: {task.title}',
                    message=f'You have been assigned to: {task.title}',
                    from_email='noreply@tinypm.local',
                    recipient_list=[assignee.email],
                    fail_silently=True,
                )

        return redirect('task_detail', task_id=task_id)

    comments = task.comments.all()
    total_comments = comments.count()
    days_overdue = 0
    if task.due_date and task.status != 'done' and task.due_date < date.today():
        days_overdue = (date.today() - task.due_date).days

    from django.contrib.auth import get_user_model
    User = get_user_model()
    available_users = User.objects.all()

    return render(request, 'task/task_detail.html', {
        'task': task,
        'comments': comments,
        'total_comments': total_comments,
        'days_overdue': days_overdue,
        'available_users': available_users,
        'today': date.today(),
    })

<script lang="ts">
    import { getTask, getTasks } from './api'

    let tasks = $state([])
    let sortBy = $state('due_date')

    $effect(() => {
        loadTasks(sortBy)
    })

    async function loadTasks(sort: string) {
        const data = await getTasks()

        const rows = []
        for (const task of data) {
            const full = await getTask(task.id)
            rows.push({ ...task, commentCount: full.comments.length })
        }

        if (sort === 'title') {
            rows.sort((a, b) => a.title.localeCompare(b.title))
        } else {
            rows.sort((a, b) =>
                (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31')
            )
        }

        tasks = rows
    }
</script>

<h1>Tasks</h1>

<label>
    Sort by
    <select bind:value={sortBy}>
        <option value="due_date">Due date</option>
        <option value="title">Title</option>
    </select>
</label>

<table>
    <thead>
        <tr>
            <th>Title</th>
            <th>Project</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Due</th>
            <th>Comments</th>
        </tr>
    </thead>
    <tbody>
        {#each tasks as task (task.id)}
            <tr>
                <td><a href="/pm/app/tasks/{task.id}/">{task.title}</a></td>
                <td>{task.project_name}</td>
                <td>
                    <span
                        style="
                            padding: 3px 8px;
                            border-radius: 3px;
                            background: {task.status === 'done'
                            ? '#d4edda'
                            : task.status === 'in_progress'
                              ? '#cce5ff'
                              : '#f8f9fa'};
                            color: {task.status === 'done'
                            ? '#155724'
                            : task.status === 'in_progress'
                              ? '#004085'
                              : '#6c757d'};
                        "
                    >
                        {task.status === 'done'
                            ? 'Done'
                            : task.status === 'in_progress'
                              ? 'In Progress'
                              : 'To Do'}
                    </span>
                </td>
                <td>{task.assignee_email}</td>
                <td>
                    {#if task.due_date}
                        {task.due_date}
                        {#if new Date(task.due_date) < new Date() && task.status !== 'done'}
                            <strong style="color: red;">overdue</strong>
                        {/if}
                    {:else}
                        <em>No due date</em>
                    {/if}
                </td>
                <td>{task.commentCount}</td>
            </tr>
        {/each}
    </tbody>
</table>

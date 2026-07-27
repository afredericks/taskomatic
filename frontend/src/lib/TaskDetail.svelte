<script lang="ts">
    import { getTask, updateTaskStatus } from './api'

    let { id } = $props()

    let task = $state(null)
    let selectedStatus = $state('')
    let saving = $state(false)

    $effect(() => {
        load()
    })

    async function load() {
        const data = await getTask(id)
        task = data
        selectedStatus = data.status
    }

    async function save() {
        saving = true
        await updateTaskStatus(id, selectedStatus)
        await load()
        saving = false
    }
</script>

{#if task}
    <p><a href="/pm/app/">Back to tasks</a></p>

    <h1>{task.title}</h1>

    <dl>
        <dt>Project</dt>
        <dd>{task.project_name}</dd>

        <dt>Description</dt>
        <dd>{task.description || 'No description'}</dd>

        <dt>Status</dt>
        <dd>
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
        </dd>

        <dt>Assignee</dt>
        <dd>{task.assignee_email}</dd>

        <dt>Due date</dt>
        <dd>
            {#if task.due_date}
                {new Date(task.due_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })}
                {#if new Date(task.due_date) < new Date() && task.status !== 'done'}
                    <strong style="color: red;">
                        ({Math.floor(
                            (new Date().getTime() - new Date(task.due_date).getTime()) /
                                (1000 * 60 * 60 * 24)
                        )} days overdue)
                    </strong>
                {/if}
            {:else}
                <em>No due date set</em>
            {/if}
        </dd>
    </dl>

    <h2>Update status</h2>

    <select bind:value={selectedStatus}>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
    </select>
    <button onclick={save} disabled={saving}>Update</button>

    {#if selectedStatus === 'done' && !task.assignee}
        <p>This task has no assignee.</p>
    {/if}

    <h2>Comments ({task.comments.length})</h2>

    <ul>
        {#each task.comments as comment (comment.id)}
            <li>
                <strong>{comment.author_email}</strong>
                <p>{comment.text}</p>
            </li>
        {:else}
            <li>No comments yet.</li>
        {/each}
    </ul>
{/if}

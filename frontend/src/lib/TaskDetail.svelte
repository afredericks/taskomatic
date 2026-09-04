<script lang="ts">
    import { onMount } from 'svelte'

    import { getTask } from './api'
    import Capsule from './Capsule.svelte'
    import { ROUTES } from './routes'
    import StatusCapsule from './StatusCapsule.svelte'
    import TaskComments from './TaskComments.svelte'
    import { daysOverdue } from './tasks'
    import { formatDate } from './time'
    import type { Task } from './types'

    /** The task's id, from the URL. Every navigation is a full page load, so it never changes. */
    let { id }: { id: number } = $props()

    let task = $state<Task | null>(null)
    let loadError = $state('')

    // Loaded once, then again after a status change so the page shows what
    // the server now holds.
    onMount(load)

    async function load() {
        try {
            task = await getTask(id)
        } catch {
            loadError = 'This task could not be loaded. Refresh the page to try again.'
        }
    }

    const overdueDays = $derived(task ? daysOverdue(task) : 0)
</script>

{#if task}
    <p><a href={ROUTES.tasks}>Back to tasks</a></p>

    <h1>{task.title}</h1>

    <dl class="fields">
        <div class="field">
            <dt>Project</dt>
            <dd>{task.project_name}</dd>
        </div>

        <div class="field">
            <dt>Status</dt>
            <dd>
                <StatusCapsule taskId={task.id} status={task.status} onSaved={load} />
            </dd>
        </div>

        <div class="field">
            <dt>Assignee</dt>
            <dd>
                {#if task.assignee_email}
                    <span title={task.assignee_email}>
                        {task.assignee_name ?? task.assignee_email}
                    </span>
                {:else}
                    <em>Unassigned</em>
                {/if}
            </dd>
        </div>

        <div class="field">
            <dt>Due date</dt>
            <dd>
                {#if task.due_date}
                    {formatDate(task.due_date, 'long')}
                    {#if overdueDays}
                        <Capsule variant="overdue">
                            {overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue
                        </Capsule>
                    {/if}
                {:else}
                    <em>No due date set</em>
                {/if}
            </dd>
        </div>

        <div class="field field--wide">
            <dt>Description</dt>
            <dd>{task.description || 'No description'}</dd>
        </div>
    </dl>

    <TaskComments taskId={task.id} bind:comments={task.comments} />
{:else if loadError}
    <p class="text-danger" role="alert">{loadError}</p>
{:else}
    <p class="text-muted">Loading…</p>
{/if}

<style>
    .fields {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem 2rem;
        margin: 0 0 1.5rem;
    }

    .field {
        flex: 1 1 12rem;
        min-width: 0;
    }

    .field--wide {
        flex-basis: 100%;
    }

    .field dt {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        margin-bottom: 0.25rem;
    }

    .field dd {
        margin: 0;
        overflow-wrap: anywhere;
    }
</style>

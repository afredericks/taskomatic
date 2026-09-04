<script lang="ts">
    import { onMount } from 'svelte'

    import { getTasks, getUsers } from './api'
    import AssigneeCapsule from './AssigneeCapsule.svelte'
    import Capsule from './Capsule.svelte'
    import { describeFilter, parseFilters, type Filter } from './filters'
    import Grid, { type GridColumn } from './Grid.svelte'
    import Modal from './Modal.svelte'
    import { ROUTES, taskUrl } from './routes'
    import { statusLabel } from './status'
    import StatusCapsule from './StatusCapsule.svelte'
    import { compareDueDates, isOverdue } from './tasks'
    import { daysUntil, formatDateTime, formatDueIn } from './time'
    import { showToast } from './toast.svelte'
    import type { Task, User } from './types'

    let tasks = $state<Task[]>([])
    let users = $state<User[]>([])
    let loadError = $state('')
    let commentsTask = $state<Task | null>(null)
    let commentsOpen = $state(false)

    function showComments(task: Task) {
        commentsTask = task
        commentsOpen = true
    }

    const columns: GridColumn<Task>[] = [
        { key: 'title', header: 'Title', width: '2fr', cell: titleCell },
        { key: 'project_name', header: 'Project', width: '1.2fr' },
        { key: 'status', header: 'Status', width: '10rem', cell: statusCell },
        {
            key: 'assignee_email',
            header: 'Assignee',
            // Wide enough for an email capsule even when the fr columns squeeze.
            width: 'minmax(14rem, 1.6fr)',
            cell: assigneeCell,
        },
        { key: 'due_date', header: 'Due', width: '9rem', valueType: 'date', cell: dueCell },
        {
            key: 'dueIn',
            header: 'Due in',
            width: '9rem',
            valueType: 'number',
            accessor: (task) => daysUntil(task.due_date),
            cell: dueInCell,
        },
        {
            key: 'overdue',
            header: 'Overdue',
            width: '8rem',
            valueType: 'boolean',
            accessor: (task) => isOverdue(task),
            cell: overdueCell,
        },
        {
            key: 'comment_count',
            header: 'Comments',
            width: '7.5rem',
            valueType: 'number',
            cell: commentsCell,
        },
    ]

    // Filters arrive in the URL as ?field__operator__type=value (see filters.ts).
    // Only the grid's columns are filterable, so stray parameters are ignored.
    const filters: Filter[] = parseFilters(window.location.search, {
        fields: columns.map((column) => column.key),
    })

    function describe(filter: Filter): string {
        return describeFilter(filter, {
            label: (field) => columns.find((column) => column.key === field)?.header ?? field,
            format: (field, value) => (field === 'status' ? statusLabel(value) : value),
        })
    }

    onMount(async () => {
        try {
            tasks = (await getTasks()).sort(compareDueDates)
        } catch {
            loadError = 'The tasks could not be loaded. Refresh the page to try again.'
        }
    })

    // The assignee picker's choices. Without them the list still reads fine,
    // so a failure here only takes away the ability to reassign.
    onMount(async () => {
        try {
            users = await getUsers()
        } catch {
            showToast('The users could not be loaded, so assignees cannot be changed.', 'danger')
        }
    })
</script>

{#snippet titleCell(task: Task)}
    <a href={taskUrl(task.id)}>{task.title}</a>
{/snippet}

{#snippet statusCell(task: Task)}
    <StatusCapsule
        taskId={task.id}
        status={task.status}
        label="Change status for {task.title}"
        onSaved={(value) => {
            task.status = value
        }}
    />
{/snippet}

{#snippet assigneeCell(task: Task)}
    <AssigneeCapsule
        taskId={task.id}
        assignee={task.assignee}
        assigneeEmail={task.assignee_email}
        {users}
        label="Change assignee for {task.title}"
        onSaved={(user) => {
            task.assignee = user?.id ?? null
            task.assignee_email = user?.email ?? null
            task.assignee_name = user?.name ?? null
        }}
    />
{/snippet}

{#snippet commentsCell(task: Task)}
    <Capsule
        variant="primary"
        dot={false}
        label="Show comments for {task.title}"
        onclick={() => showComments(task)}
    >
        <span aria-hidden="true">💬</span>
        {task.comment_count}
    </Capsule>
{/snippet}

{#snippet dueCell(task: Task)}
    {#if task.due_date}
        {task.due_date}
    {:else}
        <em>No due date</em>
    {/if}
{/snippet}

{#snippet dueInCell(task: Task)}
    {#if task.due_date}
        {formatDueIn(task.due_date)}
    {/if}
{/snippet}

{#snippet overdueCell(task: Task)}
    {#if isOverdue(task)}
        <Capsule variant="overdue">overdue</Capsule>
    {/if}
{/snippet}

<h1>Tasks</h1>

{#if filters.length}
    <div class="filter-bar">
        <ul class="filter-list" aria-label="Active filters">
            {#each filters as filter}
                <li><Capsule variant="primary">{describe(filter)}</Capsule></li>
            {/each}
        </ul>
        <a class="clear-filters" href={ROUTES.tasks}>Clear filters</a>
    </div>
{/if}

{#if loadError}
    <p class="text-danger" role="alert">{loadError}</p>
{/if}

<Grid
    {columns}
    rows={tasks}
    {filters}
    rowKey={(task) => task.id}
    emptyMessage={filters.length ? 'No tasks match these filters.' : undefined}
    fill
    responsiveColumns={['title']}
/>

<Modal bind:open={commentsOpen} title="Comments on “{commentsTask?.title ?? ''}”">
    {#if commentsTask?.comments.length}
        <ul class="comments">
            {#each commentsTask.comments as comment (comment.id)}
                <li>
                    <div class="meta">
                        <strong title={comment.author_email}>{comment.author_name}</strong>
                        <time class="text-faint" datetime={comment.created_at}>
                            {formatDateTime(comment.created_at)}
                        </time>
                    </div>
                    <p>{comment.text}</p>
                </li>
            {/each}
        </ul>
    {:else}
        <p><em>No comments yet.</em></p>
    {/if}
</Modal>

<style>
    .filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem 1rem;
    }

    .filter-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .clear-filters {
        font-size: 0.875rem;
    }

    .comments {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .comments li {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-hover);
    }

    .comments .meta {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.25rem;
        font-size: 0.8rem;
    }

    .comments p {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }
</style>

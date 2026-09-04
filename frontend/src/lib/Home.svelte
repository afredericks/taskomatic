<script lang="ts">
    import { onMount } from 'svelte'

    import { getTasks } from './api'
    import Avatar from './Avatar.svelte'
    import Capsule, { type CapsuleVariant } from './Capsule.svelte'
    import { filterUrl, type Filter } from './filters'
    import { ROUTES, taskUrl } from './routes'
    import { TASK_STATUSES, statusLabel, statusVariant } from './status'
    import { compareDueDates, isOverdue } from './tasks'
    import { daysUntil, formatDate, formatDueIn } from './time'
    import type { Task, TaskStatus } from './types'

    // Every dashboard item links to the task list filtered down to what it counts.
    const NOT_DONE: Filter = { field: 'status', operator: 'neq', filterText: 'done' }
    const OVERDUE: Filter = {
        field: 'due_date',
        operator: 'lt',
        valueType: 'date',
        filterText: 'today',
    }
    const OVERDUE_URL = filterUrl(ROUTES.tasks, [OVERDUE, NOT_DONE])
    const DUE_SOON_URL = filterUrl(ROUTES.tasks, [
        NOT_DONE,
        { field: 'due_date', operator: 'gte', valueType: 'date', filterText: 'today' },
    ])
    const UNASSIGNED_URL = filterUrl(ROUTES.tasks, [
        { field: 'assignee_email', operator: 'empty', filterText: '' },
    ])

    function statusUrl(status: string): string {
        return filterUrl(ROUTES.tasks, [{ field: 'status', filterText: status }])
    }

    function projectUrl(name: string, status?: string): string {
        const filters: Filter[] = [{ field: 'project_name', filterText: name }]
        if (status) filters.push({ field: 'status', filterText: status })
        return filterUrl(ROUTES.tasks, filters)
    }

    function personUrl(email: string, status?: string): string {
        const filters: Filter[] = [{ field: 'assignee_email', filterText: email }]
        if (status) filters.push({ field: 'status', filterText: status })
        return filterUrl(ROUTES.tasks, filters)
    }

    function personOverdueUrl(email: string): string {
        return filterUrl(ROUTES.tasks, [
            { field: 'assignee_email', filterText: email },
            OVERDUE,
            NOT_DONE,
        ])
    }

    let tasks = $state<Task[]>([])
    let loadError = $state('')

    onMount(async () => {
        try {
            tasks = await getTasks()
        } catch {
            loadError = 'The tasks could not be loaded. Refresh the page to try again.'
        }
    })

    function emptyCounts(): Record<TaskStatus, number> {
        return { todo: 0, in_progress: 0, done: 0 }
    }

    const stats = $derived.by(() => {
        const byStatus = emptyCounts()
        let overdue = 0
        for (const task of tasks) {
            byStatus[task.status]++
            if (isOverdue(task)) {
                overdue++
            }
        }
        const total = tasks.length
        const completion = total ? Math.round((byStatus.done / total) * 100) : 0
        return { total, ...byStatus, overdue, completion }
    })

    // Open tasks due today or later, soonest first.
    const dueSoon = $derived(
        tasks
            .filter((task) => task.status !== 'done' && (daysUntil(task.due_date) ?? -1) >= 0)
            .sort(compareDueDates)
            .slice(0, 5)
    )

    const projects = $derived.by(() => {
        const byName = new Map<string, { name: string; total: number; done: number }>()
        for (const task of tasks) {
            const entry = byName.get(task.project_name) ?? {
                name: task.project_name,
                total: 0,
                done: 0,
            }
            entry.total++
            if (task.status === 'done') {
                entry.done++
            }
            byName.set(task.project_name, entry)
        }
        return [...byName.values()].sort((a, b) => b.total - a.total)
    })

    type Score = Record<TaskStatus, number> & {
        email: string
        name: string
        total: number
        overdue: number
    }

    // One row per assignee, ranked by what they have finished, then by load.
    const scoreboard = $derived.by(() => {
        const byEmail = new Map<string, Score>()
        let unassigned = 0
        for (const task of tasks) {
            if (!task.assignee_email) {
                unassigned++
                continue
            }
            const score = byEmail.get(task.assignee_email) ?? {
                ...emptyCounts(),
                email: task.assignee_email,
                name: task.assignee_name || task.assignee_email.split('@')[0],
                total: 0,
                overdue: 0,
            }
            score.total++
            score[task.status]++
            if (isOverdue(task)) {
                score.overdue++
            }
            byEmail.set(task.assignee_email, score)
        }
        const people = [...byEmail.values()].sort(
            (a, b) => b.done - a.done || b.total - a.total || a.name.localeCompare(b.name)
        )
        return { people, unassigned }
    })

    function percentDone(done: number, total: number): number {
        return total ? Math.round((done / total) * 100) : 0
    }
</script>

{#snippet stat(label: string, value: number, href: string, tone: string = '')}
    <a class="card stat" {href}>
        <span class="value {tone || 'gradient-text'}">{value}</span>
        <span class="label text-muted">{label}</span>
    </a>
{/snippet}

{#snippet scoreHeader(label: string, tone: CapsuleVariant)}
    <th scope="col" class="num">
        <span class="dot dot--{tone}" aria-hidden="true"></span>{label}
    </th>
{/snippet}

{#snippet progress(percent: number)}
    <div
        class="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
    >
        <div class="progress-fill" style="width: {percent}%"></div>
    </div>
{/snippet}

<h1>Home</h1>

{#if loadError}
    <p class="text-danger" role="alert">{loadError}</p>
{/if}

<div class="stats">
    {@render stat('Total tasks', stats.total, ROUTES.tasks)}
    {#each TASK_STATUSES as status (status)}
        {@render stat(statusLabel(status), stats[status], statusUrl(status))}
    {/each}
    {@render stat('Overdue', stats.overdue, OVERDUE_URL, stats.overdue ? 'text-danger' : '')}
</div>

<section class="card completion">
    <div class="completion-header">
        <h2>Completion</h2>
        <span class="gradient-text percent">{stats.completion}%</span>
    </div>
    {@render progress(stats.completion)}
    <p class="text-muted">
        <a href={statusUrl('done')}>{stats.done} of {stats.total} tasks done</a>
    </p>
</section>

<div class="panels">
    <section class="card">
        <div class="panel-header">
            <h2>Due soon</h2>
            <a class="view-all" href={DUE_SOON_URL}>View all</a>
        </div>
        {#if dueSoon.length}
            <ul class="due-list">
                {#each dueSoon as task (task.id)}
                    {@const dueDate = task.due_date ?? ''}
                    <li>
                        <a href={taskUrl(task.id)}>{task.title}</a>
                        <Capsule variant={statusVariant(task.status)} href={statusUrl(task.status)}>
                            {statusLabel(task.status)}
                        </Capsule>
                        <span class="due-date text-faint" title={formatDate(dueDate)}>
                            {formatDueIn(dueDate)}
                        </span>
                    </li>
                {/each}
            </ul>
        {:else}
            <p><em>Nothing coming up.</em></p>
        {/if}
    </section>

    <section class="card">
        <div class="panel-header">
            <h2>Projects</h2>
            <a class="view-all" href={ROUTES.tasks}>View all</a>
        </div>
        {#if projects.length}
            <ul class="project-list">
                {#each projects as project (project.name)}
                    <li>
                        <div class="project-meta">
                            <a href={projectUrl(project.name)}>{project.name}</a>
                            <a class="text-faint" href={projectUrl(project.name, 'done')}>
                                {project.done}/{project.total} done
                            </a>
                        </div>
                        {@render progress(percentDone(project.done, project.total))}
                    </li>
                {/each}
            </ul>
        {:else}
            <p><em>No projects yet.</em></p>
        {/if}
    </section>
</div>

<section class="card scoreboard">
    <div class="panel-header">
        <h2>Scoreboard</h2>
        <a class="view-all" href={ROUTES.tasks}>View all</a>
    </div>
    {#if scoreboard.people.length}
        <div class="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th scope="col" class="rank">#</th>
                        <th scope="col">Person</th>
                        {#each TASK_STATUSES as status (status)}
                            {@render scoreHeader(statusLabel(status), statusVariant(status))}
                        {/each}
                        {@render scoreHeader('Overdue', 'overdue')}
                        <th scope="col" class="progress-col">Progress</th>
                    </tr>
                </thead>
                <tbody>
                    {#each scoreboard.people as person, index (person.email)}
                        {@const percent = percentDone(person.done, person.total)}
                        <tr>
                            <td class="rank" class:leader={index === 0}>{index + 1}</td>
                            <td>
                                <a class="person" href={personUrl(person.email)} title={person.email}>
                                    <Avatar name={person.name} seed={person.email} />
                                    <span class="person-name">{person.name}</span>
                                </a>
                            </td>
                            {#each TASK_STATUSES as status (status)}
                                <td class="num">
                                    <a
                                        class="score score--{statusVariant(status)}"
                                        class:score--zero={!person[status]}
                                        href={personUrl(person.email, status)}
                                        aria-label="{person.name}: {person[status]} {statusLabel(status)}"
                                    >
                                        {person[status]}
                                    </a>
                                </td>
                            {/each}
                            <td class="num">
                                <a
                                    class="score score--overdue"
                                    class:score--zero={!person.overdue}
                                    href={personOverdueUrl(person.email)}
                                    aria-label="{person.name}: {person.overdue} overdue"
                                >
                                    {person.overdue}
                                </a>
                            </td>
                            <td class="progress-col">
                                <div class="progress-cell">
                                    {@render progress(percent)}
                                    <span class="percent-small text-faint">{percent}%</span>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <p><em>No one has tasks assigned yet.</em></p>
    {/if}
    {#if scoreboard.unassigned}
        <p class="unassigned text-muted">
            <a href={UNASSIGNED_URL}>
                {scoreboard.unassigned} unassigned {scoreboard.unassigned === 1 ? 'task' : 'tasks'}
            </a>
        </p>
    {/if}
</section>

<style>
    .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: 1rem;
    }

    .stat {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 1.1rem 1.25rem;
        color: inherit;
        text-decoration: none;
        transition:
            transform var(--ease),
            border-color var(--ease),
            box-shadow var(--ease);
    }

    .stat:hover {
        transform: translateY(-2px);
        border-color: var(--border-strong);
        box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-lg);
        text-decoration: none;
    }

    .value {
        font-size: 2.2rem;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.02em;
    }

    .label {
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .card h2 {
        margin-top: 0;
        font-size: 1.05rem;
    }

    .completion {
        margin-top: 1rem;
    }

    .completion-header,
    .panel-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
    }

    .percent {
        font-size: 1.4rem;
        font-weight: 800;
    }

    .completion p {
        margin: 0.6rem 0 0;
        font-size: 0.875rem;
    }

    .completion p a {
        color: inherit;
    }

    .view-all {
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
    }

    .panels {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .progress {
        height: 0.6rem;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-pill);
        background: var(--surface-hover);
    }

    .progress-fill {
        height: 100%;
        border-radius: inherit;
        background: var(--gradient-brand);
        transition: width var(--ease);
    }

    .due-list,
    .project-list {
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .project-list {
        display: flex;
        flex-direction: column;
    }

    /* One grid for the whole list, so the status and due columns line up
       across rows instead of drifting with each label's width. */
    .due-list {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
    }

    .due-list li {
        display: grid;
        grid-template-columns: subgrid;
        grid-column: 1 / -1;
        align-items: center;
    }

    .due-list li > a:first-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Capsules sit flush left in their column rather than stretching to the widest one. */
    .due-list li > :global(.badge) {
        justify-self: start;
    }

    .due-date {
        font-size: 0.8rem;
        text-align: right;
        white-space: nowrap;
    }

    .project-meta {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.35rem;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .project-meta a {
        text-decoration: none;
    }

    .project-meta a:hover {
        text-decoration: underline;
    }

    .project-meta a:first-child {
        color: var(--text);
    }

    .project-meta a:first-child:hover,
    .project-meta a.text-faint:hover {
        color: var(--link-hover);
    }

    /* Scoreboard: one row per assignee. */
    .scoreboard {
        --avatar-size: 1.75rem;

        margin-top: 1rem;
    }

    .table-scroll {
        overflow-x: auto;
    }

    /* brand.css dresses tables as their own glass card; inside a card, go flat. */
    .scoreboard table {
        margin: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
    }

    .scoreboard th {
        padding: 0.4rem 0.75rem;
        background: transparent;
    }

    .scoreboard td {
        padding: 0.55rem 0.75rem;
    }

    .scoreboard th:first-child,
    .scoreboard td:first-child {
        padding-left: 0.25rem;
    }

    .scoreboard th:last-child,
    .scoreboard td:last-child {
        padding-right: 0.25rem;
    }

    .rank {
        width: 2rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--text-faint);
    }

    .leader {
        font-weight: 800;
        color: var(--primary-text);
    }

    .num {
        text-align: right;
        white-space: nowrap;
    }

    /* Column dots echo the status capsules' glow. */
    .dot {
        --dot: var(--status-todo);

        display: inline-block;
        width: 0.5em;
        height: 0.5em;
        margin-right: 0.45em;
        border-radius: 50%;
        vertical-align: middle;
        background: var(--dot);
        box-shadow: 0 0 6px var(--dot);
    }

    .dot--in-progress {
        --dot: var(--status-in-progress);
    }

    .dot--done {
        --dot: var(--status-done);
    }

    .dot--overdue {
        --dot: var(--status-overdue);
    }

    .person {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 600;
        color: var(--text);
        text-decoration: none;
    }

    .person:hover {
        color: var(--link-hover);
    }

    .person-name {
        white-space: nowrap;
    }

    .score {
        display: inline-block;
        min-width: 1.5rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-decoration: none;
    }

    .score:hover {
        text-decoration: underline;
    }

    .score--todo {
        color: var(--status-todo-text);
    }

    .score--in-progress {
        color: var(--status-in-progress-text);
    }

    .score--done {
        color: var(--status-done-text);
    }

    .score--overdue {
        color: var(--status-overdue-text);
    }

    .score--zero {
        font-weight: 500;
        color: var(--text-faint);
    }

    .progress-col {
        width: 30%;
        min-width: 9rem;
    }

    .progress-cell {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    .progress-cell .progress {
        flex: 1;
    }

    .percent-small {
        min-width: 2.5rem;
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
        text-align: right;
    }

    .unassigned {
        margin: 0.75rem 0 0;
        font-size: 0.875rem;
    }

    .unassigned a {
        color: inherit;
    }
</style>

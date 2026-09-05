<script lang="ts">
    import './Home.css'

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
        <span class="key"><span class="dot dot--{tone}" aria-hidden="true"></span>{label}</span>
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

<div class="home">
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
        <p class="text-muted text-light">
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
            <p class="unassigned text-muted text-light">
                <a href={UNASSIGNED_URL}>
                    {scoreboard.unassigned} unassigned {scoreboard.unassigned === 1 ? 'task' : 'tasks'}
                </a>
            </p>
        {/if}
    </section>
</div>

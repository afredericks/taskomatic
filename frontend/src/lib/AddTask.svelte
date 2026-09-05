<script lang="ts">
    import './AddTask.css'

    import { onMount } from 'svelte'

    import { createTask, fieldErrors, getProjects } from './api'
    import { ROUTES } from './routes'
    import { STATUSES, TASK_STATUSES } from './status'
    import type { Project, TaskStatus } from './types'

    let {
        onCreated = () => window.location.assign(ROUTES.home),
    }: {
        /** Called once the task exists; by default, goes home. */
        onCreated?: () => void
    } = $props()

    let projects = $state<Project[]>([])
    let loadError = $state('')
    let title = $state('')
    let description = $state('')
    let status = $state<TaskStatus>('todo')
    let dueDate = $state('')
    let project = $state<number | null>(null)
    let errors = $state<Record<string, string[]>>({})
    let submitting = $state(false)

    onMount(async () => {
        try {
            projects = await getProjects()
        } catch {
            loadError = 'The projects could not be loaded. Refresh the page to try again.'
        }
    })

    async function submit(event: SubmitEvent) {
        event.preventDefault()
        if (project === null) {
            errors = { project: ['Choose a project.'] }
            return
        }

        submitting = true
        errors = {}

        const result = await createTask({
            title,
            description,
            status,
            due_date: dueDate || null,
            project,
        })

        if (result.ok) {
            onCreated()
        } else {
            errors = fieldErrors(result.data)
            submitting = false
        }
    }
</script>

{#snippet fieldError(messages: string[] | undefined)}
    {#if messages}
        <p class="text-danger error">{messages.join(' ')}</p>
    {/if}
{/snippet}

<h1>Add Task</h1>

<form class="card add-task" onsubmit={submit}>
    <div class="field">
        <label for="task-title">Title</label>
        <input id="task-title" type="text" required bind:value={title} />
        {@render fieldError(errors.title)}
    </div>

    <div class="field">
        <label for="task-description">Description</label>
        <textarea id="task-description" rows="4" bind:value={description}></textarea>
        {@render fieldError(errors.description)}
    </div>

    <div class="row">
        <div class="field">
            <label for="task-project">Project</label>
            <select id="task-project" required bind:value={project}>
                <option value={null} disabled>Choose a project</option>
                {#each projects as option (option.id)}
                    <option value={option.id}>{option.name}</option>
                {/each}
            </select>
            {@render fieldError(errors.project)}
            {#if loadError}
                <p class="text-danger error" role="alert">{loadError}</p>
            {/if}
        </div>

        <div class="field">
            <label for="task-status">Status</label>
            <select id="task-status" bind:value={status}>
                {#each TASK_STATUSES as value (value)}
                    <option {value}>{STATUSES[value].label}</option>
                {/each}
            </select>
            {@render fieldError(errors.status)}
        </div>

        <div class="field">
            <label for="task-due">Due date</label>
            <input id="task-due" type="date" bind:value={dueDate} />
            {@render fieldError(errors.due_date)}
        </div>
    </div>

    {@render fieldError(errors.non_field_errors)}
    {@render fieldError(errors.detail)}

    <button class="btn-primary" type="submit" disabled={submitting}>Add task</button>
</form>

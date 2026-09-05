<script lang="ts">
    import './StatusCapsule.css'

    import { firstErrorMessage, updateTaskStatus } from './api'
    import Capsule from './Capsule.svelte'
    import { STATUSES, TASK_STATUSES, statusLabel, statusVariant } from './status'
    import { showToast } from './toast.svelte'
    import type { TaskStatus } from './types'

    /**
     * A task's status as an editable capsule: clicking it opens a menu of
     * every status, picking one saves immediately (spinner on the capsule
     * while the PATCH runs) and raises a toast either way.
     *
     * The menu is a popover so it can escape scroll containers like the
     * grid's body; it is positioned under the capsule when opened.
     */
    let {
        taskId,
        status,
        label = 'Change status',
        onSaved,
    }: {
        taskId: number
        status: TaskStatus
        /** Accessible name for the capsule trigger. */
        label?: string
        /** Called with the new status once the API accepted it. */
        onSaved?: (status: TaskStatus) => void | Promise<void>
    } = $props()

    let menuOpen = $state(false)
    let saving = $state(false)
    let field = $state<HTMLElement>()
    let menu = $state<HTMLElement>()
    let menuPosition = $state({ left: 0, top: 0 })

    const MENU_WIDTH = 184

    // Without the API (jsdom, older browsers) the attribute would only hide
    // the menu, so leave it off and let the fixed positioning do the work.
    const POPOVER_SUPPORTED =
        typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype

    function toggleMenu() {
        if (!menuOpen && field) {
            const rect = field.getBoundingClientRect()
            menuPosition = {
                left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
                top: rect.bottom + 6,
            }
        }
        menuOpen = !menuOpen
    }

    $effect(() => {
        if (menuOpen) {
            menu?.showPopover?.()
        }
    })

    async function pick(value: TaskStatus) {
        menuOpen = false
        if (saving || value === status) {
            return
        }

        saving = true
        const result = await updateTaskStatus(taskId, value)
        if (result.ok) {
            await onSaved?.(value)
            showToast('Task saved')
        } else {
            showToast(
                firstErrorMessage(result.data, 'The task could not be saved. Try again.'),
                'danger'
            )
        }
        saving = false
    }
</script>

<svelte:window
    onclick={(event) => {
        if (menuOpen && field && !field.contains(event.target as Node)) {
            menuOpen = false
        }
    }}
    onkeydown={(event) => {
        if (event.key === 'Escape') {
            menuOpen = false
        }
    }}
/>

<div class="status-field" bind:this={field}>
    <Capsule
        variant={statusVariant(status)}
        {label}
        expanded={menuOpen}
        loading={saving}
        onclick={toggleMenu}
    >
        {statusLabel(status)}
        <span class="chevron" aria-hidden="true">▾</span>
    </Capsule>

    {#if menuOpen}
        <div
            bind:this={menu}
            class="status-menu"
            popover={POPOVER_SUPPORTED ? 'manual' : undefined}
            style="left: {menuPosition.left}px; top: {menuPosition.top}px"
        >
            {#each TASK_STATUSES as value (value)}
                <button type="button" class="status-option" onclick={() => pick(value)}>
                    <Capsule variant={STATUSES[value].variant}>{STATUSES[value].label}</Capsule>
                    {#if value === status}
                        <span class="current" aria-hidden="true">✓</span>
                    {/if}
                </button>
            {/each}
        </div>
    {/if}
</div>

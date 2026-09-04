<script lang="ts">
    import { firstErrorMessage, updateTaskAssignee } from './api'
    import Capsule from './Capsule.svelte'
    import { showToast } from './toast.svelte'
    import type { User } from './types'

    /**
     * A task's assignee as an editable capsule: clicking it opens a menu of
     * every user plus "Unassigned", picking one saves immediately (spinner
     * on the capsule while the PATCH runs) and raises a toast either way.
     *
     * The menu is a popover so it can escape scroll containers like the
     * grid's body; it is positioned under the capsule when opened.
     */
    let {
        taskId,
        assignee,
        assigneeEmail,
        users,
        label = 'Change assignee',
        onSaved,
    }: {
        taskId: number
        /** The assignee's user id; null when unassigned. */
        assignee: number | null
        /** What the capsule shows; null when unassigned. */
        assigneeEmail: string | null
        /** Everyone who can be picked. */
        users: User[]
        /** Accessible name for the capsule trigger. */
        label?: string
        /** Called with the picked user, or null for unassigned, once the API accepted it. */
        onSaved?: (user: User | null) => void | Promise<void>
    } = $props()

    let menuOpen = $state(false)
    let saving = $state(false)
    let field = $state<HTMLElement>()
    let menu = $state<HTMLElement>()
    let menuPosition = $state({ left: 0, top: 0 })

    const MENU_WIDTH = 240

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

    async function pick(user: User | null) {
        menuOpen = false
        const id = user?.id ?? null
        if (saving || id === assignee) {
            return
        }

        saving = true
        const { ok, data } = await updateTaskAssignee(taskId, id)
        if (ok) {
            await onSaved?.(user)
            showToast('Task saved')
        } else {
            showToast(firstErrorMessage(data, 'The task could not be saved. Try again.'), 'danger')
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

<div class="assignee-field" bind:this={field}>
    <Capsule
        variant={assignee === null ? 'todo' : 'primary'}
        dot={false}
        {label}
        expanded={menuOpen}
        loading={saving}
        onclick={toggleMenu}
    >
        {assigneeEmail ?? 'Unassigned'}
        <span class="chevron" aria-hidden="true">▾</span>
    </Capsule>

    {#if menuOpen}
        <div
            bind:this={menu}
            class="assignee-menu"
            popover={POPOVER_SUPPORTED ? 'manual' : undefined}
            style="left: {menuPosition.left}px; top: {menuPosition.top}px"
        >
            <button type="button" class="assignee-option" onclick={() => pick(null)}>
                <span class="who"><em>Unassigned</em></span>
                {#if assignee === null}
                    <span class="current" aria-hidden="true">✓</span>
                {/if}
            </button>
            {#each users as user (user.id)}
                <button type="button" class="assignee-option" onclick={() => pick(user)}>
                    <span class="who">
                        <span class="name">{user.name}</span>
                        {#if user.email && user.email !== user.name}
                            <span class="email text-faint">{user.email}</span>
                        {/if}
                    </span>
                    {#if user.id === assignee}
                        <span class="current" aria-hidden="true">✓</span>
                    {/if}
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .assignee-field {
        position: relative;
        display: inline-block;
    }

    .chevron {
        font-size: 0.7em;
    }

    /* Positioned from JS when opened; fixed also serves as the fallback when
       the Popover API is unavailable. */
    .assignee-menu {
        position: fixed;
        inset: auto;
        z-index: 30;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 14rem;
        max-height: 18rem;
        margin: 0;
        padding: 0.4rem;
        overflow-y: auto;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        background: var(--glass-bg-strong);
        box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow);
        -webkit-backdrop-filter: blur(var(--glass-blur));
        backdrop-filter: blur(var(--glass-blur));
        animation: menu-in var(--ease);
    }

    @keyframes menu-in {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
    }

    /* Menu rows are plain text on a transparent row, unlike the glass buttons
       brand.css styles by default. */
    .assignee-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.35rem 0.5rem;
        border: 0;
        border-radius: var(--radius-sm);
        background: transparent;
        box-shadow: none;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        color: var(--text);
        font: inherit;
        text-align: left;
    }

    .assignee-option:hover {
        background: var(--surface-hover);
        box-shadow: none;
    }

    .who {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1.25;
    }

    .name {
        font-weight: 500;
    }

    .email {
        font-size: 0.8rem;
    }

    .current {
        color: var(--text-muted);
    }
</style>

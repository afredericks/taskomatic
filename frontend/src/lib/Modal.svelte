<script lang="ts">
    import type { Snippet } from 'svelte'

    /**
     * Glass modal on the native <dialog> element, so focus trapping and the
     * Escape key come for free. Closes on backdrop click and the ✕ button.
     */
    let {
        open = $bindable(false),
        title,
        children,
    }: {
        open?: boolean
        title: string
        children: Snippet
    } = $props()

    let dialog = $state<HTMLDialogElement>()
    // Each modal is labelled by its own heading, so the id has to be unique.
    const titleId = $props.id()

    $effect(() => {
        if (!dialog) return
        if (open && !dialog.open) {
            dialog.showModal()
        } else if (!open && dialog.open) {
            dialog.close()
        }
    })
</script>

<!-- Keyboard users close with Escape, which <dialog> handles natively. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialog}
    aria-labelledby={titleId}
    onclose={() => (open = false)}
    onclick={(event) => {
        if (event.target === dialog) open = false
    }}
>
    <div class="frame">
        <header>
            <h2 id={titleId}>{title}</h2>
            <button type="button" class="close" aria-label="Close" onclick={() => (open = false)}>
                ✕
            </button>
        </header>
        <div class="body">
            {@render children()}
        </div>
    </div>
</dialog>

<style>
    dialog {
        width: min(34rem, calc(100vw - 2rem));
        max-height: min(72dvh, 40rem);
        margin: auto;
        padding: 0;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        color: var(--text);
        background: var(--glass-bg-strong);
        box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-lg);
        -webkit-backdrop-filter: blur(var(--glass-blur));
        backdrop-filter: blur(var(--glass-blur));
    }

    dialog[open] {
        animation: modal-in var(--ease);
    }

    /* ::backdrop cannot read the theme tokens everywhere, so literals. */
    dialog::backdrop {
        background: rgb(0 0 0 / 0.35);
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
    }

    @keyframes modal-in {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
        }
    }

    /* The frame carries the padding so a click on the backdrop is exactly a
       click on the dialog element itself. */
    .frame {
        display: flex;
        flex-direction: column;
        max-height: inherit;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 1.5rem 0.9rem;
        border-bottom: 1px solid var(--border);
    }

    h2 {
        margin: 0;
        font-size: 1.1rem;
    }

    .close {
        padding: 0.2rem 0.6rem;
        border-radius: var(--radius-pill);
        line-height: 1;
    }

    .body {
        padding: 1.1rem 1.5rem 1.4rem;
        overflow-y: auto;
    }
</style>

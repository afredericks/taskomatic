<script lang="ts">
    import './Modal.css'

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
    class="modal"
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

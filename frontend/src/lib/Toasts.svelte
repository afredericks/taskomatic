<script lang="ts">
    import './Toasts.css'

    import { dismissToast, toasts } from './toast.svelte'
</script>

<div class="toasts" role="status" aria-live="polite">
    {#each toasts as toast (toast.id)}
        <div class="toast toast--{toast.tone}">
            <span class="message">{toast.message}</span>
            <button
                type="button"
                class="dismiss"
                aria-label="Dismiss notification"
                onclick={() => dismissToast(toast.id)}
            >
                ✕
            </button>
        </div>
    {/each}
</div>

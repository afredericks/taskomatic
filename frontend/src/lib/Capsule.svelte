<script lang="ts" module>
    export type CapsuleVariant =
        | 'todo'
        | 'in-progress'
        | 'done'
        | 'overdue'
        | 'primary'
        | 'warning'
</script>

<script lang="ts">
    import type { Snippet } from 'svelte'

    /**
     * The app's pill: a glass capsule tinted by its variant (styling comes
     * from .badge in brand.css). Renders as a button when given `onclick`,
     * as a link when given `href`, and as a plain span otherwise; the
     * interactive forms carry hover and focus affordances.
     */
    let {
        variant = 'todo',
        href,
        onclick,
        label,
        expanded,
        dot = true,
        compact = false,
        loading = false,
        children,
    }: {
        variant?: CapsuleVariant
        /** Renders the capsule as a link to this URL. */
        href?: string
        /** Renders the capsule as a button. */
        onclick?: (event: MouseEvent) => void
        /** Accessible name for interactive capsules. */
        label?: string
        /** For menu-trigger capsules: reflected as aria-expanded. */
        expanded?: boolean
        /** Show the glowing status dot. Turn off for counts and icons. */
        dot?: boolean
        /** Smaller padding and type, e.g. for counts inside headings. */
        compact?: boolean
        /** The dot becomes a spinner and button capsules stop taking clicks.
            Turn on while a change made through the capsule is saving. */
        loading?: boolean
        children: Snippet
    } = $props()

    const tag = $derived(onclick ? 'button' : href ? 'a' : 'span')
    const isButton = $derived(tag === 'button')
</script>

<!-- The element is a real <button> whenever it has a click handler, so no role is needed. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
    this={tag}
    class="badge badge--{variant}"
    class:no-dot={!dot}
    class:compact
    class:loading
    type={isButton ? 'button' : undefined}
    href={tag === 'a' ? href : undefined}
    aria-label={isButton || tag === 'a' ? label : undefined}
    aria-expanded={isButton ? expanded : undefined}
    aria-busy={isButton && loading ? true : undefined}
    disabled={isButton && loading ? true : undefined}
    onclick={isButton ? onclick : undefined}
>
    {@render children()}
</svelte:element>

<style>
    .no-dot::before {
        display: none;
    }

    .compact {
        padding: 0.1em 0.65em;
        font-size: 0.75rem;
    }

    button,
    a {
        cursor: pointer;
        text-decoration: none;
        transition:
            border-color var(--ease),
            box-shadow var(--ease),
            filter var(--ease);
    }

    button:hover,
    a:hover {
        color: var(--badge-text);
        border-color: color-mix(in oklch, var(--badge-color) 70%, transparent);
        box-shadow:
            inset 0 1px 0 var(--glass-highlight),
            0 2px 12px color-mix(in oklch, var(--badge-color) 45%, transparent);
        filter: brightness(1.05);
    }

    /* While saving, the dot becomes a spinner (even when the dot is off). */
    .loading::before {
        content: '';
        display: inline-block;
        width: 0.6em;
        height: 0.6em;
        border-radius: 50%;
        background: transparent;
        border: 2px solid color-mix(in oklch, var(--badge-color) 30%, transparent);
        border-top-color: var(--badge-color);
        box-shadow: none;
        animation: capsule-spin 700ms linear infinite;
    }

    @keyframes capsule-spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* Busy, not broken: keep it legible and signal progress. */
    button:disabled {
        opacity: 0.85;
        cursor: progress;
        box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-sm);
    }
</style>

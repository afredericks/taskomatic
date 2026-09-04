<script lang="ts">
    import Logo from './Logo.svelte'
    import { ROUTES, type Route } from './routes'

    /** The page being shown, so its menu item can be marked current. */
    let { route = null }: { route?: Route | null } = $props()

    type Item = { label: string; href: string; pages: Route['page'][] }

    // A task's own page counts as part of the task list.
    const MENU: Item[] = [
        { label: 'Home', href: ROUTES.home, pages: ['home'] },
        { label: 'Add Task', href: ROUTES.newTask, pages: ['new-task'] },
        { label: 'Task List', href: ROUTES.tasks, pages: ['tasks', 'task'] },
        { label: 'Settings', href: ROUTES.settings, pages: ['settings'] },
    ]

    const current = $derived(route && MENU.find((item) => item.pages.includes(route.page)))
</script>

<header>
    <a class="title" href={ROUTES.home}>
        <Logo size={34} />
        <span class="gradient-text">Taskomatic</span>
    </a>
    <nav aria-label="Main menu">
        {#each MENU as item (item.href)}
            <a href={item.href} aria-current={item === current ? 'page' : undefined}>
                {item.label}
            </a>
        {/each}
    </nav>
</header>

<style>
    header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem 1.5rem;
        padding: 0.75rem 1.5rem;
        border-bottom: 1px solid var(--glass-border);
        background: var(--glass-bg-strong);
        box-shadow: var(--shadow-sm);
        -webkit-backdrop-filter: blur(var(--glass-blur));
        backdrop-filter: blur(var(--glass-blur));
    }

    .title {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 1.3rem;
        font-weight: 800;
        letter-spacing: -0.015em;
        text-decoration: none;
    }

    /* The menu is a segmented control: one frosted track, and the current
       section sits in a filled brand pill, so the selection reads by shape
       and contrast as well as colour. Active and inactive items share the
       same weight and padding so the pills never change size. */
    nav {
        display: flex;
        gap: 0.2rem;
        padding: 0.3rem;
        border-radius: var(--radius-pill);
        border: 1px solid var(--glass-border);
        background: var(--surface-hover);
        box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-sm);
    }

    nav a {
        display: inline-flex;
        align-items: center;
        padding: 0.4rem 1rem;
        border-radius: var(--radius-pill);
        font-size: 0.92rem;
        font-weight: 600;
        line-height: 1.2;
        text-decoration: none;
        color: var(--text-muted);
        transition:
            color var(--ease),
            background-color var(--ease),
            box-shadow var(--ease);
    }

    nav a:hover {
        color: var(--text);
        background: var(--glass-bg-strong);
    }

    nav a[aria-current='page'] {
        color: var(--text-on-brand);
        background: var(--gradient-brand);
        box-shadow:
            inset 0 1px 0 oklch(100% 0 0 / 0.28),
            0 4px 14px color-mix(in oklch, var(--primary) 45%, transparent);
    }

    @media (prefers-contrast: more) {
        nav a[aria-current='page'] {
            outline: 2px solid var(--text);
            outline-offset: -2px;
        }
    }
</style>

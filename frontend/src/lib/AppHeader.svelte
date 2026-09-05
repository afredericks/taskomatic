<script lang="ts">
    import './AppHeader.css'

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

<header class="app-header">
    <a class="title" href={ROUTES.home}>
        <Logo size={34} />
        <span class="wordmark gradient-text">Taskomatic</span>
    </a>
    <nav aria-label="Main menu">
        {#each MENU as item (item.href)}
            <a href={item.href} aria-current={item === current ? 'page' : undefined}>
                {item.label}
            </a>
        {/each}
    </nav>
</header>

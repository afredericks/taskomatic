<script lang="ts">
    import AddTask from './lib/AddTask.svelte'
    import AppHeader from './lib/AppHeader.svelte'
    import Home from './lib/Home.svelte'
    import PagePanel from './lib/PagePanel.svelte'
    import { matchRoute } from './lib/routes'
    import Settings from './lib/Settings.svelte'
    import TaskDetail from './lib/TaskDetail.svelte'
    import TaskList from './lib/TaskList.svelte'
    import Toasts from './lib/Toasts.svelte'

    // Every page is a full load, so the route is settled once at startup.
    const route = matchRoute(window.location.pathname)
</script>

<div class="app">
    <AppHeader {route} />

    <PagePanel>
        {#if route?.page === 'new-task'}
            <AddTask />
        {:else if route?.page === 'task'}
            <TaskDetail id={route.id} />
        {:else if route?.page === 'tasks'}
            <TaskList />
        {:else if route?.page === 'settings'}
            <Settings />
        {:else}
            <Home />
        {/if}
    </PagePanel>

    <Toasts />
</div>

<style>
    /* Typography, tables and colours come from brand.css; this is layout only.
       The column pins the header while PagePanel scrolls the page body. */
    .app {
        height: 100dvh;
        display: flex;
        flex-direction: column;
    }
</style>

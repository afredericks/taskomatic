<script lang="ts">
    import TaskDetail from './lib/TaskDetail.svelte'
    import TaskList from './lib/TaskList.svelte'

    const match = window.location.pathname.match(/\/pm\/app\/tasks\/(\d+)/)
    const taskId = match ? Number(match[1]) : null
</script>

<main>
    {#if taskId}
        <TaskDetail id={taskId} />
    {:else}
        <TaskList />
    {/if}
</main>

<style>
    main {
        font-family: sans-serif;
        margin: 2rem;
    }

    main :global(table) {
        border-collapse: collapse;
    }

    main :global(th),
    main :global(td) {
        border: 1px solid #ddd;
        padding: 4px 8px;
        text-align: left;
    }
</style>

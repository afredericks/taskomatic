<script lang="ts">
    import './PagePanel.css'

    import type { Snippet } from 'svelte'

    import { setPagePanel } from './pagePanel'

    /**
     * Page-level wrapper. Fills the remaining space of the app's viewport
     * column and scrolls its body, so the header above it stays put.
     *
     * A child can instead ask for the body to fit the viewport exactly (see
     * pagePanel.ts). The body then becomes a flex column, the child stretches
     * into whatever height its siblings leave, and it scrolls itself rather
     * than the page. The Grid's `fill` mode does this.
     */
    let { children }: { children: Snippet } = $props()

    // Children call requestFill from their own effects. Counting in a plain
    // variable and only writing the flag keeps those effects from depending
    // on the state they change, which would loop.
    let fillRequests = 0
    let fill = $state(false)

    setPagePanel({
        requestFill() {
            fillRequests++
            fill = true
            return () => {
                fillRequests--
                fill = fillRequests > 0
            }
        },
    })
</script>

<main class="page-panel" class:fill>
    <div class="content">
        {@render children()}
    </div>
</main>

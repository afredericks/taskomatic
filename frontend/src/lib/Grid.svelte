<script lang="ts" module>
    import type { Snippet } from 'svelte'

    import type { Filter, FilterValueType } from './filters'

    export type GridColumn<Row> = {
        /** Unique column id; also the row property read when no accessor is given. */
        key: string
        header: string
        /** Columns are sortable unless this is explicitly false. */
        sortable?: boolean
        /**
         * CSS grid track size, e.g. '2fr' or '8rem'. Defaults to an equal share
         * of the width. Header and body are separate grids, so use fractions or
         * lengths rather than content-based sizes like 'auto' to keep them aligned.
         */
        width?: string
        /** How filters on this column compare values when they don't say themselves. */
        valueType?: FilterValueType
        /** Derives the cell value, used for display, sorting and filtering. */
        accessor?: (row: Row) => unknown
        /** Custom cell markup; takes precedence over the accessor for display. */
        cell?: Snippet<[Row]>
    }

    /** `{ field, filterText, operator, valueType }`; see filters.ts. */
    export type GridFilter = Filter

    export type SortDirection = 'asc' | 'desc'

    const DEFAULT_WIDTH = 'minmax(0, 1fr)'

    /** Viewports at most this wide are the mobile view. */
    export const DEFAULT_MOBILE_BREAKPOINT = '40rem'
</script>

<script lang="ts" generics="Row">
    import './Grid.css'

    import { applyFilters } from './filters'
    import { getPagePanel } from './pagePanel'

    let {
        columns,
        rows,
        rowKey,
        filters = [],
        emptyMessage,
        fill = false,
        responsiveColumns,
        mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
    }: {
        columns: GridColumn<Row>[]
        rows: Row[]
        /** Stable identity for keyed rendering; falls back to the row index. */
        rowKey?: (row: Row) => unknown
        /** Rows must satisfy every filter to be shown. Fields may be column keys or row properties. */
        filters?: GridFilter[]
        /** Shown in place of the body when no rows are left to display. */
        emptyMessage?: string
        /**
         * Take up the remaining height of the viewport and scroll the rows
         * under a fixed header, instead of growing with the rows and letting
         * the page scroll. Inside a PagePanel the panel hands over its body;
         * elsewhere the grid needs a flex-column parent of definite height.
         */
        fill?: boolean
        /**
         * Keys of the columns to keep in the mobile view, in the grid's own
         * column order; the rest are hidden while the viewport is at most
         * `mobileBreakpoint` wide. Filters and sorting still apply to hidden
         * columns. Leave unset to show every column at every width.
         */
        responsiveColumns?: string[]
        /** Viewport width at or below which the mobile view applies. Read once. */
        mobileBreakpoint?: string
    } = $props()

    const panel = getPagePanel()

    $effect(() => {
        if (fill && panel) return panel.requestFill()
    })

    // Mobile view. Which columns and which breakpoint apply is settled once,
    // at setup. The query is read synchronously so the first paint is already
    // right, then followed as the viewport crosses the breakpoint.
    // Environments without matchMedia (jsdom) simply never go mobile.
    const mobileQuery = createMobileQuery()
    let isMobile = $state(mobileQuery?.matches ?? false)

    function createMobileQuery(): MediaQueryList | null {
        if (!responsiveColumns || typeof matchMedia !== 'function') return null
        return matchMedia(`(max-width: ${mobileBreakpoint})`)
    }

    $effect(() => {
        if (!mobileQuery) return
        const update = () => (isMobile = mobileQuery.matches)
        update()
        mobileQuery.addEventListener('change', update)
        return () => mobileQuery.removeEventListener('change', update)
    })

    const visibleColumns = $derived(
        isMobile && responsiveColumns
            ? columns.filter((column) => responsiveColumns.includes(column.key))
            : columns
    )

    let sortKey = $state<string | null>(null)
    let sortDirection = $state<SortDirection>('asc')

    /** One track per visible column, shared by the header and body grids so they line up. */
    const template = $derived(
        visibleColumns.map((column) => column.width ?? DEFAULT_WIDTH).join(' ')
    )

    const filteredRows = $derived.by(() => {
        if (!filters.length) return rows

        // A filter without a value type borrows the one declared on its column.
        const resolved = filters.map((filter) => ({
            ...filter,
            valueType: filter.valueType ?? columnFor(filter.field)?.valueType,
        }))
        return applyFilters(rows, resolved, (row, field) => fieldValue(field, row))
    })

    const sortedRows = $derived.by(() => {
        const column = columnFor(sortKey)
        if (!column) return filteredRows

        const direction = sortDirection === 'asc' ? 1 : -1
        return [...filteredRows].sort(
            (a, b) => direction * compare(cellValue(column, a), cellValue(column, b))
        )
    })

    function columnFor(key: string | null): GridColumn<Row> | undefined {
        return columns.find((c) => c.key === key)
    }

    function cellValue(column: GridColumn<Row>, row: Row): unknown {
        return column.accessor ? column.accessor(row) : (row as Record<string, unknown>)[column.key]
    }

    function fieldValue(field: string, row: Row): unknown {
        const column = columnFor(field)
        return column ? cellValue(column, row) : (row as Record<string, unknown>)[field]
    }

    function compare(a: unknown, b: unknown): number {
        if (a == null && b == null) return 0
        if (a == null) return 1
        if (b == null) return -1
        if (typeof a === 'number' && typeof b === 'number') return a - b
        return String(a).localeCompare(String(b))
    }

    function toggleSort(column: GridColumn<Row>) {
        if (sortKey === column.key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
        } else {
            sortKey = column.key
            sortDirection = 'asc'
        }
    }
</script>

<!-- The header and the rows are separate row groups so the header can stay
     put while the body scrolls. Both lay their cells out on the same column
     template, which keeps them aligned without measuring anything. -->
<div class="grid" class:fill role="table" style="--grid-columns: {template}">
    <div class="header" role="rowgroup">
        <div class="row" role="row">
            {#each visibleColumns as column (column.key)}
                <div
                    class="cell"
                    role="columnheader"
                    aria-sort={sortKey === column.key
                        ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                        : undefined}
                >
                    {#if column.sortable !== false}
                        <button type="button" onclick={() => toggleSort(column)}>
                            {column.header}
                            {#if sortKey === column.key}
                                <span class="sort-indicator">
                                    {sortDirection === 'asc' ? '▲' : '▼'}
                                </span>
                            {/if}
                        </button>
                    {:else}
                        {column.header}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
    <div class="body" role="rowgroup">
        {#each sortedRows as row, index (rowKey ? rowKey(row) : index)}
            <div class="row" role="row">
                {#each visibleColumns as column (column.key)}
                    <div class="cell" role="cell">
                        {#if column.cell}
                            {@render column.cell(row)}
                        {:else}
                            {cellValue(column, row)}
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            {#if emptyMessage}
                <div class="row empty" role="row">
                    <div class="cell" role="cell"><em>{emptyMessage}</em></div>
                </div>
            {/if}
        {/each}
    </div>
</div>

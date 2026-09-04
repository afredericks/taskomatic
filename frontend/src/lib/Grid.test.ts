import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Grid from './Grid.svelte'
import type { GridColumn, GridFilter } from './Grid.svelte'
import { PAGE_PANEL } from './pagePanel'

type Fruit = { id: number; name: string; quantity: number | null }

// Grid is generic over its row type; render() cannot infer it, so pin it here.
const FruitGrid = Grid as typeof Grid<Fruit>

const ROWS: Fruit[] = [
    { id: 1, name: 'Banana', quantity: 10 },
    { id: 2, name: 'Apple', quantity: 2 },
    { id: 3, name: 'Cherry', quantity: null },
]

const COLUMNS: GridColumn<Fruit>[] = [
    { key: 'name', header: 'Name' },
    { key: 'quantity', header: 'Quantity', valueType: 'number' },
]

type Extra = {
    filters?: GridFilter[]
    emptyMessage?: string
    fill?: boolean
    responsiveColumns?: string[]
    mobileBreakpoint?: string
}

function renderGrid(columns: GridColumn<Fruit>[] = COLUMNS, rows: Fruit[] = ROWS, extra: Extra = {}) {
    return render(FruitGrid, {
        props: { columns, rows, rowKey: (row: Fruit) => row.id, ...extra },
    })
}

function bodyRows(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>('.body [role="row"]'))
}

function columnText(container: HTMLElement, columnIndex: number): string[] {
    return bodyRows(container).map(
        (row) => row.querySelectorAll('[role="cell"]')[columnIndex - 1]?.textContent?.trim() ?? ''
    )
}

describe('Grid', () => {
    it('renders a header for each column config', () => {
        renderGrid()

        const headers = screen.getAllByRole('columnheader')
        expect(headers.map((th) => th.textContent?.trim())).toEqual(['Name', 'Quantity'])
    })

    it('renders a row per data item in the given order', () => {
        const { container } = renderGrid()

        expect(columnText(container, 1)).toEqual(['Banana', 'Apple', 'Cherry'])
    })

    it('renders values from an accessor', () => {
        const columns: GridColumn<Fruit>[] = [
            { key: 'label', header: 'Label', accessor: (row) => `${row.name}!` },
        ]
        const { container } = renderGrid(columns)

        expect(columnText(container, 1)).toEqual(['Banana!', 'Apple!', 'Cherry!'])
    })

    it('sorts ascending on the first header click', async () => {
        const { container } = renderGrid()

        await fireEvent.click(screen.getByRole('button', { name: 'Name' }))

        expect(columnText(container, 1)).toEqual(['Apple', 'Banana', 'Cherry'])
    })

    it('reverses the sort on the second click', async () => {
        const { container } = renderGrid()

        const header = screen.getByRole('button', { name: /Name/ })
        await fireEvent.click(header)
        await fireEvent.click(header)

        expect(columnText(container, 1)).toEqual(['Cherry', 'Banana', 'Apple'])
    })

    it('sorts numbers numerically and keeps null values last', async () => {
        const { container } = renderGrid()

        await fireEvent.click(screen.getByRole('button', { name: 'Quantity' }))

        expect(columnText(container, 2)).toEqual(['2', '10', ''])
    })

    it('marks the sorted column with aria-sort', async () => {
        renderGrid()

        const header = screen.getByRole('button', { name: /Name/ })
        await fireEvent.click(header)
        expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'ascending')

        await fireEvent.click(header)
        expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'descending')
    })

    it('does not render a sort button for non-sortable columns', () => {
        const columns: GridColumn<Fruit>[] = [{ key: 'name', header: 'Name', sortable: false }]
        renderGrid(columns)

        expect(screen.queryByRole('button')).toBeNull()
        expect(screen.getByRole('columnheader').textContent?.trim()).toBe('Name')
    })

    describe('layout', () => {
        it('keeps the header and the rows in separate row groups', () => {
            renderGrid()

            const [header, body] = screen.getAllByRole('rowgroup')
            expect(screen.getAllByRole('rowgroup')).toHaveLength(2)

            expect(within(header).getAllByRole('columnheader')).toHaveLength(2)
            expect(within(header).queryByRole('cell')).toBeNull()

            expect(within(body).getAllByRole('row')).toHaveLength(3)
            expect(within(body).queryByRole('columnheader')).toBeNull()
        })

        it('shares one column template between header and body', () => {
            renderGrid()

            expect(screen.getByRole('table').getAttribute('style')).toContain(
                '--grid-columns: minmax(0, 1fr) minmax(0, 1fr)'
            )
        })

        it('sizes the columns from the column config', () => {
            renderGrid([
                { key: 'name', header: 'Name', width: '2fr' },
                { key: 'quantity', header: 'Quantity', width: '6rem' },
            ])

            expect(screen.getByRole('table').getAttribute('style')).toContain(
                '--grid-columns: 2fr 6rem'
            )
        })

        it('only fills its container when asked', () => {
            renderGrid()
            expect(screen.getByRole('table')).not.toHaveClass('fill')
        })

        it('marks itself as filling when asked', () => {
            renderGrid(COLUMNS, ROWS, { fill: true })
            expect(screen.getByRole('table')).toHaveClass('fill')
        })

        it('asks the enclosing page panel to fill while mounted', async () => {
            const release = vi.fn()
            const requestFill = vi.fn(() => release)
            const { unmount } = render(FruitGrid, {
                props: { columns: COLUMNS, rows: ROWS, fill: true },
                context: new Map([[PAGE_PANEL, { requestFill }]]),
            })
            await tick()

            expect(requestFill).toHaveBeenCalledTimes(1)
            expect(release).not.toHaveBeenCalled()

            unmount()
            expect(release).toHaveBeenCalledTimes(1)
        })

        it('leaves the page panel alone when not filling', async () => {
            const requestFill = vi.fn(() => () => {})
            render(FruitGrid, {
                props: { columns: COLUMNS, rows: ROWS },
                context: new Map([[PAGE_PANEL, { requestFill }]]),
            })
            await tick()

            expect(requestFill).not.toHaveBeenCalled()
        })
    })

    describe('responsive columns', () => {
        type Listener = () => void

        /** Stands in for window.matchMedia and lets a test move across the breakpoint. */
        function stubViewport(mobile: boolean) {
            const listeners = new Set<Listener>()
            const query = {
                matches: mobile,
                addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
                removeEventListener: (_type: string, listener: Listener) =>
                    listeners.delete(listener),
            }
            const matchMedia = vi.fn(() => query)
            vi.stubGlobal('matchMedia', matchMedia)
            return {
                matchMedia,
                resize(toMobile: boolean) {
                    query.matches = toMobile
                    listeners.forEach((listener) => listener())
                },
            }
        }

        function headers(): string[] {
            return screen.getAllByRole('columnheader').map((th) => th.textContent?.trim() ?? '')
        }

        afterEach(() => {
            vi.unstubAllGlobals()
        })

        it('hides all but the responsive columns in the mobile view', () => {
            stubViewport(true)
            const { container } = renderGrid(COLUMNS, ROWS, { responsiveColumns: ['name'] })

            expect(headers()).toEqual(['Name'])
            expect(bodyRows(container)[0].querySelectorAll('[role="cell"]')).toHaveLength(1)
            expect(columnText(container, 1)).toEqual(['Banana', 'Apple', 'Cherry'])
            const style = screen.getByRole('table').getAttribute('style')
            expect(style).toContain('--grid-columns: minmax(0, 1fr)')
            expect(style).not.toContain('minmax(0, 1fr) minmax(0, 1fr)')
        })

        it('shows every column above the breakpoint', () => {
            stubViewport(false)
            renderGrid(COLUMNS, ROWS, { responsiveColumns: ['name'] })

            expect(headers()).toEqual(['Name', 'Quantity'])
        })

        it('follows the viewport across the breakpoint', async () => {
            const viewport = stubViewport(false)
            renderGrid(COLUMNS, ROWS, { responsiveColumns: ['name'] })
            await tick()

            viewport.resize(true)
            await tick()
            expect(headers()).toEqual(['Name'])

            viewport.resize(false)
            await tick()
            expect(headers()).toEqual(['Name', 'Quantity'])
        })

        it('watches the configured breakpoint', () => {
            const viewport = stubViewport(false)
            renderGrid(COLUMNS, ROWS, { responsiveColumns: ['name'], mobileBreakpoint: '30rem' })

            expect(viewport.matchMedia).toHaveBeenCalledWith('(max-width: 30rem)')
        })

        it('shows every column when no responsive columns are configured', () => {
            const viewport = stubViewport(true)
            renderGrid()

            expect(headers()).toEqual(['Name', 'Quantity'])
            expect(viewport.matchMedia).not.toHaveBeenCalled()
        })

        it('still filters on hidden columns', () => {
            stubViewport(true)
            const { container } = renderGrid(COLUMNS, ROWS, {
                responsiveColumns: ['name'],
                filters: [{ field: 'quantity', operator: 'notEmpty', filterText: '' }],
            })

            expect(columnText(container, 1)).toEqual(['Banana', 'Apple'])
        })
    })

    describe('filters', () => {
        it('shows only the rows matching the filter', () => {
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [{ field: 'name', operator: 'contains', filterText: 'an' }],
            })

            expect(columnText(container, 1)).toEqual(['Banana'])
        })

        it('requires every filter to match', () => {
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [
                    { field: 'name', operator: 'contains', filterText: 'a' },
                    { field: 'quantity', operator: 'lt', filterText: '5' },
                ],
            })

            expect(columnText(container, 1)).toEqual(['Apple'])
        })

        it("compares with the column's value type when the filter has none", () => {
            // As text, '10' sorts before '5'; as a number it does not.
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [{ field: 'quantity', operator: 'gte', filterText: '5' }],
            })

            expect(columnText(container, 1)).toEqual(['Banana'])
        })

        it("lets the filter's own value type win over the column's", () => {
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [
                    { field: 'quantity', operator: 'gte', valueType: 'text', filterText: '5' },
                ],
            })

            expect(columnText(container, 1)).toEqual([])
        })

        it('filters through a column accessor', () => {
            const columns: GridColumn<Fruit>[] = [
                { key: 'label', header: 'Label', accessor: (row) => `${row.name}!` },
            ]
            const { container } = renderGrid(columns, ROWS, {
                filters: [{ field: 'label', filterText: 'apple!' }],
            })

            expect(columnText(container, 1)).toEqual(['Apple!'])
        })

        it('filters on row fields that are not columns', () => {
            const columns: GridColumn<Fruit>[] = [{ key: 'name', header: 'Name' }]
            const { container } = renderGrid(columns, ROWS, {
                filters: [{ field: 'id', operator: 'gt', valueType: 'number', filterText: '1' }],
            })

            expect(columnText(container, 1)).toEqual(['Apple', 'Cherry'])
        })

        it('sorts the filtered rows', async () => {
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [{ field: 'quantity', operator: 'notEmpty', filterText: '' }],
            })
            expect(columnText(container, 1)).toEqual(['Banana', 'Apple'])

            await fireEvent.click(screen.getByRole('button', { name: 'Name' }))

            expect(columnText(container, 1)).toEqual(['Apple', 'Banana'])
        })

        it('shows the empty message when nothing matches', () => {
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [{ field: 'name', filterText: 'Durian' }],
                emptyMessage: 'Nothing here.',
            })

            const rows = bodyRows(container)
            expect(rows).toHaveLength(1)
            expect(rows[0]).toHaveClass('empty')
            expect(rows[0]).toHaveTextContent('Nothing here.')
        })

        it('renders an empty body when there is no empty message', () => {
            const { container } = renderGrid(COLUMNS, ROWS, {
                filters: [{ field: 'name', filterText: 'Durian' }],
            })

            expect(bodyRows(container)).toHaveLength(0)
        })
    })
})

import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TaskList from './TaskList.svelte'

// What /pm/api/tasks/ returns: each task carries its comments.
const TASKS = [
    {
        id: 1,
        title: 'Build contact form',
        status: 'in_progress',
        due_date: '2020-01-01',
        project: 1,
        project_name: 'Website Redesign',
        assignee: 1,
        assignee_email: 'alice@example.com',
        assignee_name: 'Alice Smith',
        comments: [
            {
                id: 1,
                text: 'First',
                author: 2,
                author_email: 'bob@example.com',
                author_name: 'Bob Johnson',
                created_at: '2020-01-01T10:00:00Z',
            },
            {
                id: 2,
                text: 'Second',
                author: 2,
                author_email: 'bob@example.com',
                author_name: 'Bob Johnson',
                created_at: '2020-01-02T10:00:00Z',
            },
        ],
        comment_count: 2,
    },
    {
        id: 2,
        title: 'Audit accessibility',
        status: 'todo',
        due_date: '2020-02-01',
        project: 1,
        project_name: 'Website Redesign',
        assignee: 2,
        assignee_email: 'bob@example.com',
        assignee_name: 'Bob Johnson',
        comments: [],
        comment_count: 0,
    },
]

// The grid renders ARIA rows inside a scrollable body row group instead of table rows.
const ROW = '.body [role="row"]'

function cell(column: number): string {
    return `${ROW} [role="cell"]:nth-child(${column})`
}

function columnText(container: HTMLElement, column: number): string[] {
    const cells = container.querySelectorAll(cell(column))
    return Array.from(cells, (el) => el.textContent?.trim() ?? '')
}

function firstColumnText(container: HTMLElement): string[] {
    return columnText(container, 1)
}

const USERS = [
    { id: 1, username: 'alice', email: 'alice@example.com', name: 'Alice Smith' },
    { id: 2, username: 'bob', email: 'bob@example.com', name: 'Bob Johnson' },
]

/** Answers the task list with `tasks` and the user list with USERS; saves always succeed. */
function listTasks(tasks: object[]) {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string, options?: RequestInit) => {
            let body: unknown = tasks
            if (options?.method === 'PATCH') body = {}
            else if (url.endsWith('/users/')) body = USERS
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
        })
    )
}

function requestsFor(path: string): number {
    return vi.mocked(fetch).mock.calls.filter(([url]) => url === path).length
}

function visit(url: string) {
    window.history.replaceState(null, '', url)
}

async function renderList() {
    const rendered = render(TaskList)
    await waitFor(() => {
        expect(rendered.container.querySelector(ROW)).toBeTruthy()
    })
    return rendered
}

describe('TaskList', () => {
    beforeEach(() => {
        visit('/pm/app/tasks/')
        listTasks(TASKS)
    })

    it('loads the tasks in one request, without fetching each task again', async () => {
        await renderList()

        expect(requestsFor('/pm/api/tasks/')).toBe(1)
        expect(requestsFor('/pm/api/tasks/1/')).toBe(0)
    })

    it('renders the tasks ordered by due date with the title in the first cell', async () => {
        const { container } = await renderList()

        expect(firstColumnText(container)).toEqual(['Build contact form', 'Audit accessibility'])
    })

    it('links each title to its task', async () => {
        await renderList()

        expect(screen.getByRole('link', { name: 'Build contact form' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/1/'
        )
    })

    it('renders the status as an editable capsule in the third column', async () => {
        const { container } = await renderList()

        const badge = container.querySelector(`${cell(3)} .badge`)
        expect(badge?.tagName).toBe('BUTTON')
        expect(badge).toHaveClass('badge--in-progress')
        expect(badge?.textContent).toContain('In Progress')
    })

    it('changes a status straight from the grid', async () => {
        const { container } = await renderList()

        await fireEvent.click(
            screen.getByRole('button', { name: 'Change status for Build contact form' })
        )
        await fireEvent.click(screen.getByRole('button', { name: 'Done' }))

        await waitFor(() => {
            const badge = container.querySelector(`${cell(3)} .badge`)
            expect(badge?.textContent).toContain('Done')
        })

        const patch = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')!
        expect(patch[0]).toBe('/pm/api/tasks/1/')
        expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({ status: 'done' })
    })

    it('shows the comment count as a clickable capsule', async () => {
        const { container } = await renderList()

        const pill = container.querySelector(`${cell(8)} button`)
        expect(pill).toHaveClass('badge', 'badge--primary')
        expect(pill?.textContent).toContain('2')
    })

    it('opens a modal with the comments when the count is clicked', async () => {
        const { container } = await renderList()

        await fireEvent.click(
            screen.getByRole('button', { name: 'Show comments for Build contact form' })
        )

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveTextContent('Comments on “Build contact form”')
        expect(dialog).toHaveTextContent('First')
        expect(dialog).toHaveTextContent('Second')
        expect(within(dialog).getAllByText('Bob Johnson')).toHaveLength(2)

        await fireEvent.click(screen.getByRole('button', { name: 'Close' }))
        expect(container.querySelector('dialog')!.open).toBe(false)
    })

    it('sorts by title when the Title header is clicked', async () => {
        const { container } = await renderList()

        const header = screen.getByRole('button', { name: 'Title' })

        await fireEvent.click(header)
        expect(firstColumnText(container)).toEqual(['Audit accessibility', 'Build contact form'])

        await fireEvent.click(header)
        expect(firstColumnText(container)).toEqual(['Build contact form', 'Audit accessibility'])
    })

    it('shows how long until each due date in the Due in column', async () => {
        const { container } = await renderList()

        const dueIn = columnText(container, 6)
        expect(dueIn).toHaveLength(2)
        for (const text of dueIn) {
            expect(text).toMatch(/^\d+ years ago$/)
        }
    })

    it('flags overdue open tasks in the Overdue column, not the Due column', async () => {
        listTasks([
            { ...TASKS[0], status: 'done' },
            TASKS[1],
            { ...TASKS[1], id: 3, title: 'Plan the roadmap', due_date: '2099-01-01' },
        ])
        const { container } = await renderList()

        expect(columnText(container, 7)).toEqual(['', 'overdue', ''])
        expect(container.querySelector(`${cell(7)} .badge`)).toHaveClass('badge--overdue')
        expect(container.querySelector(`${cell(5)} .badge`)).toBeNull()
        expect(columnText(container, 6)[2]).toMatch(/^in \d+ years$/)
    })

    it('sorts by time until due when the Due in header is clicked', async () => {
        const { container } = await renderList()

        const header = screen.getByRole('button', { name: 'Due in' })

        await fireEvent.click(header)
        expect(firstColumnText(container)).toEqual(['Build contact form', 'Audit accessibility'])

        await fireEvent.click(header)
        expect(firstColumnText(container)).toEqual(['Audit accessibility', 'Build contact form'])
    })

    it('reports when the tasks cannot be loaded', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject() }))
        )
        render(TaskList)

        expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded')
    })

    describe('URL filters', () => {
        it('shows no filter bar when the URL has none', async () => {
            await renderList()

            expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull()
            expect(screen.queryByRole('link', { name: 'Clear filters' })).toBeNull()
        })

        it('filters the grid by the fields in the query string', async () => {
            visit('/pm/app/tasks/?status=todo')
            const { container } = await renderList()

            expect(firstColumnText(container)).toEqual(['Audit accessibility'])
        })

        it('describes the active filters and links back to the full list', async () => {
            visit('/pm/app/tasks/?status__neq=todo&assignee_email__contains=alice')
            render(TaskList)

            const list = screen.getByRole('list', { name: 'Active filters' })
            const chips = within(list)
                .getAllByRole('listitem')
                .map((item) => item.textContent?.trim())
            expect(chips).toEqual(['Status ≠ To Do', 'Assignee contains alice'])

            expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
                'href',
                '/pm/app/tasks/'
            )
        })

        it('compares the due date as a date', async () => {
            visit('/pm/app/tasks/?due_date__gte=2020-01-15')
            const { container } = await renderList()

            expect(firstColumnText(container)).toEqual(['Audit accessibility'])
        })

        it('supports the operator and value type from the dashboard links', async () => {
            visit('/pm/app/tasks/?due_date__lt__date=today&status__neq=done')
            const { container } = await renderList()

            expect(firstColumnText(container)).toEqual([
                'Build contact form',
                'Audit accessibility',
            ])
        })

        it('filters to open, overdue tasks through the Overdue column', async () => {
            listTasks([{ ...TASKS[0], status: 'done' }, TASKS[1]])
            visit('/pm/app/tasks/?overdue=true')
            const { container } = await renderList()

            expect(firstColumnText(container)).toEqual(['Audit accessibility'])
        })

        it('filters by the number of comments', async () => {
            visit('/pm/app/tasks/?comment_count__gt=0')
            const { container } = await renderList()

            expect(firstColumnText(container)).toEqual(['Build contact form'])
        })

        it('ignores parameters that are not grid columns', async () => {
            visit('/pm/app/tasks/?utm_source=newsletter&project=99')
            const { container } = await renderList()

            expect(container.querySelectorAll(ROW).length).toBe(2)
            expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull()
        })

        it('says so when no task matches', async () => {
            visit('/pm/app/tasks/?status=done')
            const { container } = render(TaskList)

            await waitFor(() => {
                expect(container.querySelector('.body')).toHaveTextContent(
                    'No tasks match these filters.'
                )
            })
        })
    })

    describe('mobile view', () => {
        it('shows only the title column on a narrow viewport', async () => {
            vi.stubGlobal(
                'matchMedia',
                vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
            )
            const { container } = await renderList()

            expect(firstColumnText(container)).toEqual([
                'Build contact form',
                'Audit accessibility',
            ])

            const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
            expect(headers).toEqual(['Title'])
            expect(container.querySelectorAll(cell(2))).toHaveLength(0)

            vi.unstubAllGlobals()
        })
    })
})

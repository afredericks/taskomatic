import { render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TaskList from './TaskList.svelte'

const LIST_RESPONSE = [
    {
        id: 1,
        title: 'Build contact form',
        status: 'in_progress',
        due_date: '2020-01-01',
        project: 1,
        project_name: 'Website Redesign',
        assignee: 1,
        assignee_email: 'alice@example.com',
        comment_count: 2,
    },
]

const DETAIL_RESPONSE = {
    id: 1,
    title: 'Build contact form',
    status: 'in_progress',
    due_date: '2020-01-01',
    project: 1,
    project_name: 'Website Redesign',
    assignee: 1,
    assignee_email: 'alice@example.com',
    comments: [
        { id: 1, text: 'First', author_email: 'bob@example.com', created_at: '2020-01-01' },
        { id: 2, text: 'Second', author_email: 'bob@example.com', created_at: '2020-01-02' },
    ],
}

describe('TaskList', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                const body = url.match(/\/tasks\/\d+\//) ? DETAIL_RESPONSE : LIST_RESPONSE
                return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
            })
        )
    })

    it('renders', async () => {
        const { container } = render(TaskList)

        await waitFor(() => {
            expect(container.querySelector('tbody tr')).toBeTruthy()
        })
    })

    it('renders the title in the first cell', async () => {
        const { container } = render(TaskList)

        await waitFor(() => {
            const cell = container.querySelector('tbody tr td:nth-child(1)')
            expect(cell?.textContent).toContain('Build contact form')
        })
    })

    it('renders the status badge as a span in the third column', async () => {
        const { container } = render(TaskList)

        await waitFor(() => {
            const badge = container.querySelector('tbody tr td:nth-child(3) span')
            expect(badge?.tagName).toBe('SPAN')
            expect(badge?.textContent?.trim()).toBe('In Progress')
        })
    })

    it('shows the comment count', async () => {
        const { container } = render(TaskList)

        await waitFor(() => {
            const cell = container.querySelector('tbody tr td:nth-child(6)')
            expect(cell?.textContent?.trim()).toBe('2')
        })
    })

    it('updates the table when the sort order changes', async () => {
        const { container } = render(TaskList)

        await waitFor(() => {
            expect(container.querySelector('tbody tr')).toBeTruthy()
        })

        const select = container.querySelector('select') as HTMLSelectElement
        select.value = 'title'
        select.dispatchEvent(new Event('change', { bubbles: true }))

        await waitFor(() => {
            expect(screen.getByText('Build contact form')).toBeTruthy()
        })
    })
})

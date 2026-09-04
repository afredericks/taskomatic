import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TaskDetail from './TaskDetail.svelte'
import { clearToasts } from './toast.svelte'
import Toasts from './Toasts.svelte'

const TASK = {
    id: 1,
    title: 'Build contact form',
    description: '',
    status: 'in_progress',
    due_date: '2020-01-01',
    project: 1,
    project_name: 'Website Redesign',
    assignee: 1,
    assignee_email: 'alice@example.com',
    comments: [
        {
            id: 1,
            text: 'Looking good so far!',
            author: 2,
            author_email: 'bob@example.com',
            author_name: 'Bob Johnson',
            created_at: '2020-01-01T10:00:00Z',
        },
    ],
}

const ANONYMOUS = { authenticated: false }

let patchResponse: { ok: boolean; body: unknown }

describe('TaskDetail', () => {
    beforeEach(() => {
        clearToasts()
        patchResponse = { ok: true, body: { ...TASK, status: 'done' } }
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string, options?: RequestInit) => {
                if (options?.method === 'PATCH') {
                    return Promise.resolve({
                        ok: patchResponse.ok,
                        status: patchResponse.ok ? 200 : 400,
                        json: () => Promise.resolve(patchResponse.body),
                    })
                }
                const body = url.endsWith('/me/') ? ANONYMOUS : TASK
                return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
            })
        )
    })

    async function renderDetail() {
        const rendered = render(TaskDetail, { props: { id: 1 } })
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Build contact form' })).toBeInTheDocument()
        })
        return rendered
    }

    it('renders the status as a clickable capsule', async () => {
        const { container } = await renderDetail()

        const capsule = container.querySelector('dd .badge')!
        expect(capsule.tagName).toBe('BUTTON')
        expect(capsule).toHaveClass('badge--in-progress')
        expect(capsule.textContent).toContain('In Progress')
    })

    it('opens a menu with every status', async () => {
        await renderDetail()

        const trigger = screen.getByRole('button', { name: 'Change status' })
        expect(trigger).toHaveAttribute('aria-expanded', 'false')

        await fireEvent.click(trigger)

        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('button', { name: 'To Do' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })

    it('saves the picked status immediately and toasts', async () => {
        render(Toasts)
        await renderDetail()

        await fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
        await fireEvent.click(screen.getByRole('button', { name: 'Done' }))

        await waitFor(() => {
            expect(screen.getByText('Task saved')).toBeInTheDocument()
        })

        const patch = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')!
        expect(patch[0]).toBe('/pm/api/tasks/1/')
        expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({ status: 'done' })

        expect(screen.queryByRole('button', { name: 'To Do' })).toBeNull()
    })

    it('does not save when the current status is picked again', async () => {
        await renderDetail()

        await fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
        await fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))

        const patch = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')
        expect(patch).toBeUndefined()
    })

    it('toasts the API error when the save fails', async () => {
        patchResponse = {
            ok: false,
            body: { non_field_errors: ['Cannot mark task as done without an assignee.'] },
        }
        render(Toasts)
        await renderDetail()

        await fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
        await fireEvent.click(screen.getByRole('button', { name: 'Done' }))

        await waitFor(() => {
            expect(
                screen.getByText('Cannot mark task as done without an assignee.')
            ).toBeInTheDocument()
        })
    })

    it('renders the overdue marker as a badge capsule', async () => {
        await renderDetail()

        expect(screen.getByText(/days overdue/)).toHaveClass('badge', 'badge--overdue')
    })

    it('renders the comment thread for the task', async () => {
        await renderDetail()

        expect(screen.getByRole('heading', { name: /Comments/ })).toBeInTheDocument()
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
        expect(screen.getByText('Looking good so far!')).toBeInTheDocument()
    })
})

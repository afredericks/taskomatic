import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AssigneeCapsule from './AssigneeCapsule.svelte'
import { clearToasts, toasts } from './toast.svelte'

const USERS = [
    { id: 1, username: 'alice', email: 'alice@example.com', name: 'Alice Smith' },
    { id: 2, username: 'bob', email: 'bob@example.com', name: 'bob' },
]

function okResponse(body: unknown) {
    return { ok: true, status: 200, json: () => Promise.resolve(body) }
}

function patchBody(): unknown {
    const patch = vi
        .mocked(fetch)
        .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')
    return patch ? JSON.parse((patch[1] as RequestInit).body as string) : undefined
}

let patchImpl: () => Promise<any>

describe('AssigneeCapsule', () => {
    beforeEach(() => {
        clearToasts()
        patchImpl = () => Promise.resolve(okResponse({}))
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string, options?: RequestInit) => {
                if (options?.method === 'PATCH') {
                    return patchImpl()
                }
                return Promise.resolve(okResponse({}))
            })
        )
    })

    it('shows the assignee and opens a menu of every user plus Unassigned', async () => {
        render(AssigneeCapsule, {
            props: { taskId: 7, assignee: 1, assigneeEmail: 'alice@example.com', users: USERS },
        })

        const trigger = screen.getByRole('button', { name: 'Change assignee' })
        expect(trigger).toHaveTextContent('alice@example.com')
        expect(trigger).toHaveClass('badge--primary')
        expect(trigger).toHaveAttribute('aria-expanded', 'false')

        await fireEvent.click(trigger)

        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('button', { name: 'Unassigned' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Alice Smith/ })).toHaveTextContent(
            'alice@example.com'
        )
        expect(screen.getByRole('button', { name: /bob/ })).toHaveTextContent('bob@example.com')
    })

    it('reads Unassigned, in a muted capsule, when nobody is assigned', () => {
        render(AssigneeCapsule, {
            props: { taskId: 7, assignee: null, assigneeEmail: null, users: USERS },
        })

        const trigger = screen.getByRole('button', { name: 'Change assignee' })
        expect(trigger).toHaveTextContent('Unassigned')
        expect(trigger).toHaveClass('badge--todo')
    })

    it('saves the picked user, spinning while the request runs', async () => {
        let resolvePatch!: (value: unknown) => void
        patchImpl = () => new Promise((resolve) => (resolvePatch = resolve))
        const onSaved = vi.fn()
        render(AssigneeCapsule, {
            props: {
                taskId: 7,
                assignee: 1,
                assigneeEmail: 'alice@example.com',
                users: USERS,
                onSaved,
            },
        })

        const trigger = screen.getByRole('button', { name: 'Change assignee' })
        await fireEvent.click(trigger)
        await fireEvent.click(screen.getByRole('button', { name: /bob/ }))

        expect(trigger).toHaveClass('loading')
        expect(trigger).toHaveAttribute('aria-busy', 'true')
        expect(trigger).toBeDisabled()

        resolvePatch(okResponse({}))

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith(USERS[1])
        })
        await waitFor(() => {
            expect(trigger).not.toHaveAttribute('aria-busy')
        })
        expect(toasts.map((toast) => toast.message)).toContain('Task saved')

        const patch = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')!
        expect(patch[0]).toBe('/pm/api/tasks/7/')
        expect(patchBody()).toEqual({ assignee: 2 })
    })

    it('clears the assignee when Unassigned is picked', async () => {
        const onSaved = vi.fn()
        render(AssigneeCapsule, {
            props: {
                taskId: 7,
                assignee: 1,
                assigneeEmail: 'alice@example.com',
                users: USERS,
                onSaved,
            },
        })

        await fireEvent.click(screen.getByRole('button', { name: 'Change assignee' }))
        await fireEvent.click(screen.getByRole('button', { name: 'Unassigned' }))

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith(null)
        })
        expect(patchBody()).toEqual({ assignee: null })
    })

    it('does not save when the current assignee is picked again', async () => {
        render(AssigneeCapsule, {
            props: { taskId: 7, assignee: 1, assigneeEmail: 'alice@example.com', users: USERS },
        })

        await fireEvent.click(screen.getByRole('button', { name: 'Change assignee' }))
        await fireEvent.click(screen.getByRole('button', { name: /Alice Smith/ }))

        expect(patchBody()).toBeUndefined()
    })

    it('raises a danger toast and skips onSaved when the API refuses', async () => {
        patchImpl = () =>
            Promise.resolve({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ assignee: ['Nope.'] }),
            })
        const onSaved = vi.fn()
        render(AssigneeCapsule, {
            props: { taskId: 7, assignee: null, assigneeEmail: null, users: USERS, onSaved },
        })

        await fireEvent.click(screen.getByRole('button', { name: 'Change assignee' }))
        await fireEvent.click(screen.getByRole('button', { name: /bob/ }))

        await waitFor(() => {
            expect(
                toasts.some((toast) => toast.tone === 'danger' && toast.message === 'Nope.')
            ).toBe(true)
        })
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('closes the menu on Escape', async () => {
        render(AssigneeCapsule, {
            props: { taskId: 7, assignee: 1, assigneeEmail: 'alice@example.com', users: USERS },
        })

        await fireEvent.click(screen.getByRole('button', { name: 'Change assignee' }))
        expect(screen.getByRole('button', { name: 'Unassigned' })).toBeInTheDocument()

        await fireEvent.keyDown(window, { key: 'Escape' })

        expect(screen.queryByRole('button', { name: 'Unassigned' })).toBeNull()
    })
})

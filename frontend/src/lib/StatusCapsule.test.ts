import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import StatusCapsule from './StatusCapsule.svelte'
import { clearToasts, toasts } from './toast.svelte'

function okResponse(body: unknown) {
    return { ok: true, status: 200, json: () => Promise.resolve(body) }
}

let patchImpl: () => Promise<any>

describe('StatusCapsule', () => {
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

    it('shows the status and opens a menu of all statuses', async () => {
        render(StatusCapsule, { props: { taskId: 7, status: 'todo' } })

        const trigger = screen.getByRole('button', { name: 'Change status' })
        expect(trigger).toHaveTextContent('To Do')
        expect(trigger).toHaveAttribute('aria-expanded', 'false')

        await fireEvent.click(trigger)

        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('button', { name: 'To Do' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })

    it('saves the picked status, spinning while the request runs', async () => {
        let resolvePatch!: (value: unknown) => void
        patchImpl = () => new Promise((resolve) => (resolvePatch = resolve))
        const onSaved = vi.fn()
        render(StatusCapsule, { props: { taskId: 7, status: 'todo', onSaved } })

        const trigger = screen.getByRole('button', { name: 'Change status' })
        await fireEvent.click(trigger)
        await fireEvent.click(screen.getByRole('button', { name: 'Done' }))

        expect(trigger).toHaveClass('loading')
        expect(trigger).toHaveAttribute('aria-busy', 'true')
        expect(trigger).toBeDisabled()

        resolvePatch(okResponse({}))

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith('done')
        })
        await waitFor(() => {
            expect(trigger).not.toHaveAttribute('aria-busy')
        })
        expect(toasts.map((toast) => toast.message)).toContain('Task saved')

        const patch = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')!
        expect(patch[0]).toBe('/pm/api/tasks/7/')
        expect(JSON.parse((patch[1] as RequestInit).body as string)).toEqual({ status: 'done' })
    })

    it('does not save when the current status is picked again', async () => {
        render(StatusCapsule, { props: { taskId: 7, status: 'todo' } })

        await fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
        await fireEvent.click(screen.getByRole('button', { name: 'To Do' }))

        const patch = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'PATCH')
        expect(patch).toBeUndefined()
    })

    it('raises a danger toast and skips onSaved when the API refuses', async () => {
        patchImpl = () =>
            Promise.resolve({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ non_field_errors: ['Nope.'] }),
            })
        const onSaved = vi.fn()
        render(StatusCapsule, { props: { taskId: 7, status: 'todo', onSaved } })

        await fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
        await fireEvent.click(screen.getByRole('button', { name: 'Done' }))

        await waitFor(() => {
            expect(
                toasts.some((toast) => toast.tone === 'danger' && toast.message === 'Nope.')
            ).toBe(true)
        })
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('closes the menu on Escape', async () => {
        render(StatusCapsule, { props: { taskId: 7, status: 'todo' } })

        await fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()

        await fireEvent.keyDown(window, { key: 'Escape' })

        expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
    })
})

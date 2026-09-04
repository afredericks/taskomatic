import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AddTask from './AddTask.svelte'

const PROJECTS = [
    { id: 1, name: 'Website Redesign' },
    { id: 2, name: 'Ops' },
]

let postResponse: { ok: boolean; body: unknown }

function stubFetch() {
    vi.stubGlobal(
        'fetch',
        vi.fn((url: string, options?: RequestInit) => {
            const body = options?.method === 'POST' ? postResponse.body : PROJECTS
            const ok = options?.method === 'POST' ? postResponse.ok : true
            return Promise.resolve({ ok, json: () => Promise.resolve(body) })
        })
    )
}

async function fillForm(container: HTMLElement) {
    await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Website Redesign' })).toBeInTheDocument()
    })

    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'New task' } })
    await fireEvent.change(screen.getByLabelText('Project'), { target: { value: '1' } })
    await fireEvent.submit(container.querySelector('form')!)
}

describe('AddTask', () => {
    beforeEach(() => {
        postResponse = { ok: true, body: { id: 9 } }
        stubFetch()
    })

    it('loads the projects into the project picker', async () => {
        render(AddTask)

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Website Redesign' })).toBeInTheDocument()
            expect(screen.getByRole('option', { name: 'Ops' })).toBeInTheDocument()
        })
    })

    it('posts the task and calls onCreated on success', async () => {
        const onCreated = vi.fn()
        const { container } = render(AddTask, { props: { onCreated } })

        await fillForm(container)

        await waitFor(() => {
            expect(onCreated).toHaveBeenCalled()
        })

        const post = vi
            .mocked(fetch)
            .mock.calls.find(([, options]) => (options as RequestInit)?.method === 'POST')!
        expect(post[0]).toBe('/pm/api/tasks/')
        expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({
            title: 'New task',
            description: '',
            status: 'todo',
            due_date: null,
            project: 1,
        })
    })

    it('requires a project before submitting', async () => {
        const onCreated = vi.fn()
        const { container } = render(AddTask, { props: { onCreated } })

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Website Redesign' })).toBeInTheDocument()
        })

        await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'New task' } })
        await fireEvent.submit(container.querySelector('form')!)

        expect(screen.getByText('Choose a project.')).toBeInTheDocument()
        expect(onCreated).not.toHaveBeenCalled()
    })

    it('shows the API validation errors and does not redirect', async () => {
        postResponse = {
            ok: false,
            body: { title: ['Title must be at least 3 characters long.'] },
        }
        const onCreated = vi.fn()
        const { container } = render(AddTask, { props: { onCreated } })

        await fillForm(container)

        await waitFor(() => {
            expect(
                screen.getByText('Title must be at least 3 characters long.')
            ).toBeInTheDocument()
        })
        expect(onCreated).not.toHaveBeenCalled()
    })
})

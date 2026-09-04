import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TaskComments from './TaskComments.svelte'

const ANONYMOUS = { authenticated: false }

const ALICE = {
    authenticated: true,
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    name: 'Alice Smith',
    is_staff: false,
}

const STAFF = {
    authenticated: true,
    id: 3,
    username: 'root',
    email: 'root@example.com',
    name: 'Root',
    is_staff: true,
}

const COMMENTS = [
    {
        id: 1,
        text: 'Older comment',
        author: 2,
        author_email: 'bob@example.com',
        author_name: 'Bob Johnson',
        created_at: '2026-09-01T12:00:00Z',
    },
    {
        id: 2,
        text: 'Newer comment',
        author: 1,
        author_email: 'alice@example.com',
        author_name: 'Alice Smith',
        created_at: '2026-09-03T09:00:00Z',
    },
]

const POSTED = {
    id: 3,
    text: 'Looks good to me',
    author: 1,
    author_email: 'alice@example.com',
    author_name: 'Alice Smith',
    created_at: '2026-09-03T12:00:00Z',
}

type Stub = { status: number; body?: unknown }

function stubFetch({
    me = ANONYMOUS,
    post = { status: 201, body: POSTED },
    del = { status: 204 },
}: { me?: unknown; post?: Stub; del?: Stub } = {}) {
    const respond = ({ status, body }: Stub) =>
        Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) })

    vi.stubGlobal(
        'fetch',
        vi.fn((url: string, options?: RequestInit) => {
            if (url.endsWith('/me/')) return respond({ status: 200, body: me })
            if (options?.method === 'POST') return respond(post)
            if (options?.method === 'DELETE') return respond(del)
            return respond({ status: 404, body: null })
        })
    )
}

function calls(method: string) {
    return vi
        .mocked(fetch)
        .mock.calls.filter(([, options]) => (options as RequestInit)?.method === method)
}

function commentTexts(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('.thread .text'), (el) => el.textContent!.trim())
}

function count(container: HTMLElement): string {
    return container.querySelector('#comments-heading .badge')!.textContent!.trim()
}

async function typeComment(text: string): Promise<HTMLElement> {
    const textarea = await screen.findByLabelText('Add a comment')
    await fireEvent.input(textarea, { target: { value: text } })
    return textarea
}

describe('TaskComments', () => {
    beforeEach(() => {
        // Freeze the clock so the relative timestamps are predictable, but leave
        // the timer functions real so testing-library's waitFor keeps working.
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-09-03T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('renders each comment with its author, initials, and a relative time', async () => {
        stubFetch()
        const { container } = render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        expect(await screen.findByText('Bob Johnson')).toBeInTheDocument()
        expect(screen.getByText('Alice Smith')).toBeInTheDocument()
        expect(count(container)).toBe('2')

        const initials = Array.from(container.querySelectorAll('.thread .avatar'), (el) =>
            el.textContent!.trim()
        )
        expect(initials).toEqual(['AS', 'BJ'])

        expect(screen.getByText('3 hours ago')).toHaveAttribute('datetime', '2026-09-03T09:00:00Z')
        expect(screen.getByText('2 days ago')).toBeInTheDocument()
    })

    it('shows newest first and can switch to oldest first', async () => {
        stubFetch()
        const { container } = render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        expect(commentTexts(container)).toEqual(['Newer comment', 'Older comment'])

        const oldest = screen.getByRole('button', { name: 'Oldest' })
        await fireEvent.click(oldest)

        expect(commentTexts(container)).toEqual(['Older comment', 'Newer comment'])
        expect(oldest).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'Newest' })).toHaveAttribute(
            'aria-pressed',
            'false'
        )
    })

    it('invites anonymous visitors to sign in instead of showing the composer', async () => {
        stubFetch({ me: ANONYMOUS })
        render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        const link = await screen.findByRole('link', { name: 'Sign in' })
        expect(link.getAttribute('href')).toContain('/admin/login/?next=')
        expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Delete comment' })).not.toBeInTheDocument()
    })

    it('shows an empty state when there are no comments', async () => {
        stubFetch({ me: ANONYMOUS })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: [] } })

        expect(await screen.findByText('No comments yet.')).toBeInTheDocument()
        expect(count(container)).toBe('0')
        expect(screen.queryByRole('group', { name: 'Sort comments' })).not.toBeInTheDocument()
    })

    it('lets a signed-in user post a comment', async () => {
        stubFetch({ me: ALICE })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        const textarea = await screen.findByLabelText('Add a comment')
        const button = screen.getByRole('button', { name: 'Post comment' })
        expect(button).toBeDisabled()

        await fireEvent.input(textarea, { target: { value: 'Hi' } })
        expect(button).toBeDisabled()
        expect(screen.getByText('3 more characters needed')).toBeInTheDocument()

        await fireEvent.input(textarea, { target: { value: 'Looks good to me' } })
        expect(button).toBeEnabled()

        await fireEvent.submit(container.querySelector('form')!)

        await waitFor(() => {
            expect(commentTexts(container)).toEqual([
                'Looks good to me',
                'Newer comment',
                'Older comment',
            ])
        })
        expect(count(container)).toBe('3')
        expect(textarea).toHaveValue('')

        const [url, options] = calls('POST')[0]
        expect(url).toBe('/pm/api/tasks/7/comments/')
        expect(JSON.parse((options as RequestInit).body as string)).toEqual({
            text: 'Looks good to me',
        })
    })

    it('posts with Ctrl+Enter', async () => {
        stubFetch({ me: ALICE })
        render(TaskComments, { props: { taskId: 7, comments: [] } })

        const textarea = await typeComment('Looks good to me')
        await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

        await waitFor(() => {
            expect(calls('POST')).toHaveLength(1)
        })
    })

    it('shows the API error when posting fails and keeps the draft', async () => {
        stubFetch({
            me: ALICE,
            post: { status: 400, body: { text: ['Comment must be at least 5 characters.'] } },
        })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: [] } })

        const textarea = await typeComment('Looks good to me')
        await fireEvent.submit(container.querySelector('form')!)

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Comment must be at least 5 characters.'
        )
        expect(textarea).toHaveValue('Looks good to me')
        expect(commentTexts(container)).toEqual([])
    })

    it('falls back to the sign-in prompt when the session has ended', async () => {
        stubFetch({ me: ALICE, post: { status: 403, body: { detail: 'Not authenticated.' } } })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: [] } })

        await typeComment('Looks good to me')
        await fireEvent.submit(container.querySelector('form')!)

        expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
        expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument()
    })

    it('marks your own comments and offers delete only on those', async () => {
        stubFetch({ me: ALICE })
        render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        const buttons = await screen.findAllByRole('button', { name: 'Delete comment' })
        expect(buttons).toHaveLength(1)
        expect(buttons[0].closest('.comment')).toHaveTextContent('Alice Smith')
        expect(screen.getByText('You').closest('.comment')).toHaveTextContent('Alice Smith')
    })

    it('lets staff delete any comment', async () => {
        stubFetch({ me: STAFF })
        render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        expect(await screen.findAllByRole('button', { name: 'Delete comment' })).toHaveLength(2)
    })

    it('deletes a comment after confirming', async () => {
        stubFetch({ me: ALICE })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        await fireEvent.click(await screen.findByRole('button', { name: 'Delete comment' }))
        expect(screen.getByText('Delete this comment?')).toBeInTheDocument()

        await fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

        await waitFor(() => {
            expect(commentTexts(container)).toEqual(['Older comment'])
        })
        expect(count(container)).toBe('1')
        expect(calls('DELETE')[0][0]).toBe('/pm/api/comments/2/')
    })

    it('keeps the comment when deletion is cancelled', async () => {
        stubFetch({ me: ALICE })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        await fireEvent.click(await screen.findByRole('button', { name: 'Delete comment' }))
        await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(screen.queryByText('Delete this comment?')).not.toBeInTheDocument()
        expect(commentTexts(container)).toEqual(['Newer comment', 'Older comment'])
        expect(calls('DELETE')).toHaveLength(0)
    })

    it('reports a failed deletion and keeps the comment', async () => {
        stubFetch({ me: ALICE, del: { status: 403, body: { detail: 'Forbidden' } } })
        const { container } = render(TaskComments, { props: { taskId: 7, comments: COMMENTS } })

        await fireEvent.click(await screen.findByRole('button', { name: 'Delete comment' }))
        await fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))

        expect(
            await screen.findByText('You can only delete your own comments.')
        ).toBeInTheDocument()
        expect(commentTexts(container)).toEqual(['Newer comment', 'Older comment'])
    })
})

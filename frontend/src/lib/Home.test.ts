import { render, screen, waitFor, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Home from './Home.svelte'

const TASKS = [
    {
        id: 1,
        title: 'Ship the release',
        status: 'done',
        due_date: '2020-01-01',
        project_name: 'Alpha',
        assignee: 1,
        assignee_email: 'alice@example.com',
        assignee_name: 'Alice Smith',
    },
    {
        id: 2,
        title: 'Fix the login flow',
        status: 'in_progress',
        due_date: '2020-02-01',
        project_name: 'Alpha',
        assignee: 1,
        assignee_email: 'alice@example.com',
        assignee_name: 'Alice Smith',
    },
    {
        id: 3,
        title: 'Plan the roadmap',
        status: 'todo',
        due_date: '2099-01-01',
        project_name: 'Beta',
        assignee: 2,
        assignee_email: 'bob@example.com',
        assignee_name: null,
    },
    {
        id: 4,
        title: 'Tidy the backlog',
        status: 'todo',
        due_date: null,
        project_name: 'Beta',
        assignee: null,
        assignee_email: null,
        assignee_name: null,
    },
]

function statCard(container: HTMLElement, label: string): Element | undefined {
    const cards = Array.from(container.querySelectorAll('.stat'))
    return cards.find((el) => el.querySelector('.label')?.textContent?.trim() === label)
}

function statValue(container: HTMLElement, label: string): string | undefined {
    return statCard(container, label)?.querySelector('.value')?.textContent?.trim()
}

function statHref(container: HTMLElement, label: string): string | null | undefined {
    return statCard(container, label)?.getAttribute('href')
}

describe('Home', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(TASKS) }))
        )
    })

    it('shows the task metrics', async () => {
        const { container } = render(Home)

        await waitFor(() => {
            expect(statValue(container, 'Total tasks')).toBe('4')
        })

        expect(statValue(container, 'To Do')).toBe('2')
        expect(statValue(container, 'In Progress')).toBe('1')
        expect(statValue(container, 'Done')).toBe('1')
        expect(statValue(container, 'Overdue')).toBe('1')
    })

    it('links each metric to the task list filtered to what it counts', () => {
        const { container } = render(Home)

        expect(statHref(container, 'Total tasks')).toBe('/pm/app/tasks/')
        expect(statHref(container, 'To Do')).toBe('/pm/app/tasks/?status=todo')
        expect(statHref(container, 'In Progress')).toBe('/pm/app/tasks/?status=in_progress')
        expect(statHref(container, 'Done')).toBe('/pm/app/tasks/?status=done')
        expect(statHref(container, 'Overdue')).toBe(
            '/pm/app/tasks/?due_date__lt__date=today&status__neq=done'
        )
    })

    it('shows the completion percentage', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByText('25%')).toBeInTheDocument()
        })

        expect(screen.getByRole('link', { name: '1 of 4 tasks done' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?status=done'
        )
    })

    it('lists upcoming tasks but not overdue, done or undated ones', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'Plan the roadmap' })).toBeInTheDocument()
        })

        expect(screen.getByRole('link', { name: 'Plan the roadmap' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/3/'
        )
        expect(screen.queryByRole('link', { name: 'Ship the release' })).toBeNull()
        expect(screen.queryByRole('link', { name: 'Fix the login flow' })).toBeNull()
        expect(screen.queryByRole('link', { name: 'Tidy the backlog' })).toBeNull()
    })

    it('shows how long until each task is due, with the date as a tooltip', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'Plan the roadmap' })).toBeInTheDocument()
        })

        const row = screen.getByRole('link', { name: 'Plan the roadmap' }).closest('li')!
        const due = row.querySelector('.due-date')!
        expect(due.textContent?.trim()).toMatch(/^in \d+ years$/)
        expect(due).toHaveAttribute('title', 'Jan 1, 2099')
    })

    it('links the due soon panel to the open, dated tasks', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'Plan the roadmap' })).toBeInTheDocument()
        })

        const dueSoon = screen.getByRole('link', { name: 'Plan the roadmap' }).closest('section')!
        expect(within(dueSoon).getByRole('link', { name: 'View all' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?status__neq=done&due_date__gte__date=today'
        )
        expect(within(dueSoon).getByRole('link', { name: 'To Do' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?status=todo'
        )
    })

    it('breaks the tasks down per project', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByText('Alpha')).toBeInTheDocument()
        })

        const alpha = screen.getByText('Alpha').closest('li')!
        expect(within(alpha).getByText('1/2 done')).toBeInTheDocument()

        const beta = screen.getByText('Beta').closest('li')!
        expect(within(beta).getByText('0/2 done')).toBeInTheDocument()
    })

    it('links each project to its tasks', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByText('Alpha')).toBeInTheDocument()
        })

        expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?project_name=Alpha'
        )

        const alpha = screen.getByText('Alpha').closest('li')!
        expect(within(alpha).getByRole('link', { name: '1/2 done' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?project_name=Alpha&status=done'
        )

        const projects = alpha.closest('section')!
        expect(within(projects).getByRole('link', { name: 'View all' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/'
        )
    })

    it('ranks the people with assigned tasks by what they have finished', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByText('Alice Smith')).toBeInTheDocument()
        })

        const rows = screen.getByRole('table').querySelectorAll('tbody tr')
        expect(Array.from(rows, (row) => row.querySelector('.person-name')?.textContent)).toEqual([
            'Alice Smith',
            'bob',
        ])

        const alice = screen.getByText('Alice Smith').closest('tr')!
        expect(within(alice).getByRole('link', { name: 'Alice Smith: 0 To Do' })).toHaveClass(
            'score--zero'
        )
        expect(within(alice).getByRole('link', { name: 'Alice Smith: 1 In Progress' })).toBeVisible()
        expect(within(alice).getByRole('link', { name: 'Alice Smith: 1 Done' })).toBeVisible()
        expect(within(alice).getByRole('link', { name: 'Alice Smith: 1 overdue' })).toBeVisible()
        expect(within(alice).getByText('50%')).toBeInTheDocument()

        const bob = screen.getByText('bob').closest('tr')!
        expect(within(bob).getByRole('link', { name: 'bob: 1 To Do' })).toBeVisible()
        expect(within(bob).getByRole('link', { name: 'bob: 0 overdue' })).toHaveClass('score--zero')
        expect(within(bob).getByText('0%')).toBeInTheDocument()
    })

    it('links each score to the task list filtered by person and status', async () => {
        render(Home)

        await waitFor(() => {
            expect(screen.getByText('Alice Smith')).toBeInTheDocument()
        })

        expect(screen.getByRole('link', { name: 'Alice Smith' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?assignee_email=alice%40example.com'
        )
        expect(screen.getByRole('link', { name: 'Alice Smith: 1 Done' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?assignee_email=alice%40example.com&status=done'
        )
        expect(screen.getByRole('link', { name: 'Alice Smith: 1 overdue' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/?assignee_email=alice%40example.com&due_date__lt__date=today&status__neq=done'
        )
    })

    it('counts the unassigned tasks and links to them', async () => {
        render(Home)

        const link = await screen.findByRole('link', { name: '1 unassigned task' })
        expect(link).toHaveAttribute('href', '/pm/app/tasks/?assignee_email__empty=')
    })
})

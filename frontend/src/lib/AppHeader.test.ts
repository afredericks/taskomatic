import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import AppHeader from './AppHeader.svelte'
import { matchRoute } from './routes'

/** Renders the header as it would be on the page at `url`. */
function renderAt(url: string) {
    return render(AppHeader, { props: { route: matchRoute(url) } })
}

function currentLinks(): string[] {
    return screen
        .getAllByRole('link', { current: 'page' })
        .map((link) => link.textContent?.trim() ?? '')
}

describe('AppHeader', () => {
    it('renders the application title linking to the home page', () => {
        render(AppHeader)

        const title = screen.getByRole('link', { name: 'Taskomatic' })
        expect(title).toHaveAttribute('href', '/pm/app/')
    })

    it('shows the logo mark inside the title without changing its name', () => {
        render(AppHeader)

        const title = screen.getByRole('link', { name: 'Taskomatic' })
        const logo = title.querySelector('svg')
        expect(logo).not.toBeNull()
        expect(logo).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders the menu items', () => {
        render(AppHeader)

        const menu = screen.getByRole('navigation', { name: 'Main menu' })
        expect(menu).toBeInTheDocument()

        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/pm/app/')
        expect(screen.getByRole('link', { name: 'Add Task' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/new/'
        )
        expect(screen.getByRole('link', { name: 'Task List' })).toHaveAttribute(
            'href',
            '/pm/app/tasks/'
        )
        expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
            'href',
            '/pm/app/settings/'
        )
    })

    it('marks exactly one menu item as the current page', () => {
        renderAt('/pm/app/tasks/')

        expect(currentLinks()).toEqual(['Task List'])
    })

    it('marks Home only on the home page', () => {
        renderAt('/pm/app/')

        expect(currentLinks()).toEqual(['Home'])
    })

    it('treats a task page as part of the task list', () => {
        renderAt('/pm/app/tasks/12/')

        expect(currentLinks()).toEqual(['Task List'])
    })

    it('prefers the exact section over the one it sits under', () => {
        renderAt('/pm/app/tasks/new/')

        expect(currentLinks()).toEqual(['Add Task'])
    })

    it('marks nothing outside the application pages', () => {
        renderAt('/somewhere/else/')

        expect(screen.queryAllByRole('link', { current: 'page' })).toHaveLength(0)
    })
})

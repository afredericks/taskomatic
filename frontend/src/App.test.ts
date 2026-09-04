import { render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.svelte'

function visit(url: string) {
    window.history.replaceState(null, '', url)
}

describe('App', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
        )
    })

    it('hands the page panel body to the task list grid so only the grid scrolls', async () => {
        visit('/pm/app/tasks/')
        render(App)

        await waitFor(() => {
            expect(screen.getByRole('main')).toHaveClass('fill')
        })
        expect(screen.getByRole('table')).toHaveClass('fill')
    })

    it('lets the page panel scroll on pages without a filling grid', async () => {
        visit('/pm/app/')
        render(App)

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
        })
        expect(screen.getByRole('main')).not.toHaveClass('fill')
    })
})

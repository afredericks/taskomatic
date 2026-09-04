import { render, screen } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it } from 'vitest'

import PagePanel from './PagePanel.svelte'

describe('PagePanel', () => {
    it('renders its children inside a scrollable main region', () => {
        render(PagePanel, {
            props: {
                children: createRawSnippet(() => ({ render: () => '<p>Page body</p>' })),
            },
        })

        const main = screen.getByRole('main')
        expect(main.classList.contains('page-panel')).toBe(true)
        expect(main.textContent).toContain('Page body')
    })

    it('scrolls the page rather than filling it unless a child asks', () => {
        render(PagePanel, {
            props: {
                children: createRawSnippet(() => ({ render: () => '<p>Page body</p>' })),
            },
        })

        expect(screen.getByRole('main')).not.toHaveClass('fill')
    })
})

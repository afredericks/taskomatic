import { fireEvent, render, screen } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

import Capsule from './Capsule.svelte'

const children = createRawSnippet(() => ({ render: () => '<span>Done</span>' }))

describe('Capsule', () => {
    it('renders a plain badge span by default', () => {
        const { container } = render(Capsule, { props: { variant: 'done', children } })

        const capsule = container.querySelector('.badge')!
        expect(capsule.tagName).toBe('SPAN')
        expect(capsule).toHaveClass('badge--done')
        expect(capsule).toHaveTextContent('Done')
    })

    it('renders a button that fires onclick', async () => {
        const onclick = vi.fn()
        render(Capsule, { props: { variant: 'primary', label: 'Open it', onclick, children } })

        const button = screen.getByRole('button', { name: 'Open it' })
        expect(button).toHaveClass('badge', 'badge--primary')

        await fireEvent.click(button)
        expect(onclick).toHaveBeenCalled()
    })

    it('reflects the expanded state on button capsules', () => {
        render(Capsule, { props: { onclick: () => {}, expanded: false, children } })

        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    })

    it('renders a link when given a href', () => {
        render(Capsule, { props: { variant: 'todo', href: '/pm/app/tasks/', children } })

        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/pm/app/tasks/')
        expect(link).toHaveClass('badge', 'badge--todo')
    })

    it('spins and stops taking clicks while loading', () => {
        render(Capsule, { props: { onclick: () => {}, loading: true, children } })

        const button = screen.getByRole('button')
        expect(button).toHaveClass('loading')
        expect(button).toHaveAttribute('aria-busy', 'true')
        expect(button).toBeDisabled()
    })

    it('can hide the status dot and shrink for counts', () => {
        const { container } = render(Capsule, {
            props: { variant: 'primary', dot: false, compact: true, children },
        })

        const capsule = container.querySelector('.badge')!
        expect(capsule).toHaveClass('no-dot', 'compact')
    })
})

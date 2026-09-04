import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'

import Settings from './Settings.svelte'

describe('Settings', () => {
    beforeEach(() => {
        delete document.documentElement.dataset.theme
        delete document.documentElement.dataset.brand
        localStorage.clear()
    })

    it('renders the dark mode switch and the four themes', () => {
        render(Settings)

        expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeInTheDocument()

        const themes = screen.getAllByRole('radio')
        expect(themes.map((radio) => (radio as HTMLInputElement).value)).toEqual([
            'midnight',
            'red-alert',
            'chrome',
            'daybreak',
        ])
    })

    it('toggling the switch forces the mode and persists it', async () => {
        render(Settings)
        const toggle = screen.getByRole('switch', { name: 'Dark mode' })

        await fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-checked', 'true')
        expect(document.documentElement.dataset.theme).toBe('dark')
        expect(JSON.parse(localStorage.getItem('tinypm.appearance')!).mode).toBe('dark')

        await fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-checked', 'false')
        expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('selecting a dark-foundation theme applies it and switches to dark', async () => {
        render(Settings)

        await fireEvent.click(screen.getByRole('radio', { name: /Midnight/ }))

        expect(document.documentElement.dataset.brand).toBe('midnight')
        expect(document.documentElement.dataset.theme).toBe('dark')
        expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute(
            'aria-checked',
            'true'
        )
    })

    it('selecting a light-foundation theme switches to light', async () => {
        render(Settings)

        await fireEvent.click(screen.getByRole('radio', { name: /Daybreak/ }))

        expect(document.documentElement.dataset.brand).toBe('daybreak')
        expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('the mode can be flipped away from the theme foundation', async () => {
        render(Settings)

        await fireEvent.click(screen.getByRole('radio', { name: /Red Alert/ }))
        await fireEvent.click(screen.getByRole('switch', { name: 'Dark mode' }))

        expect(document.documentElement.dataset.brand).toBe('red-alert')
        expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('restores the saved appearance on render', () => {
        localStorage.setItem('tinypm.appearance', JSON.stringify({ mode: 'dark', theme: 'chrome' }))

        render(Settings)

        expect(screen.getByRole('radio', { name: /Chrome/ })).toBeChecked()
        expect(screen.getByRole('switch', { name: 'Dark mode' })).toHaveAttribute(
            'aria-checked',
            'true'
        )
    })

    it('reset returns to the defaults', async () => {
        render(Settings)

        await fireEvent.click(screen.getByRole('radio', { name: /Midnight/ }))
        await fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))

        expect(document.documentElement.dataset.theme).toBeUndefined()
        expect(document.documentElement.dataset.brand).toBeUndefined()
        expect(JSON.parse(localStorage.getItem('tinypm.appearance')!)).toEqual({
            mode: null,
            theme: null,
        })
    })
})

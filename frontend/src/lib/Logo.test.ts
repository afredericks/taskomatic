import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import Logo from './Logo.svelte'

describe('Logo', () => {
    it('renders a decorative svg hidden from assistive technology', () => {
        const { container } = render(Logo)

        const svg = container.querySelector('svg')
        expect(svg).not.toBeNull()
        expect(svg).toHaveAttribute('aria-hidden', 'true')
        expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
    })

    it('draws both eyes and the progress-bar smile', () => {
        const { container } = render(Logo)

        expect(container.querySelectorAll('circle.eye')).toHaveLength(2)
        expect(container.querySelector('path.smile-track')).not.toBeNull()
        expect(container.querySelector('path.smile')).toHaveAttribute('pathLength', '100')
    })

    it('scales to the requested size', () => {
        const { container } = render(Logo, { size: 48 })

        const svg = container.querySelector('svg')
        expect(svg).toHaveAttribute('width', '48')
        expect(svg).toHaveAttribute('height', '48')
    })
})

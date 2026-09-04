import { describe, expect, it } from 'vitest'

import { hueFor, initials } from './avatar'

describe('initials', () => {
    it('takes the first and last word of a name', () => {
        expect(initials('Alice Smith')).toBe('AS')
        expect(initials('Mary Anne van Dyke')).toBe('MD')
    })

    it('takes two letters from a single word or a dotted handle', () => {
        expect(initials('alice')).toBe('AL')
        expect(initials('bob.johnson')).toBe('BJ')
    })

    it('falls back to a question mark for blank input', () => {
        expect(initials('   ')).toBe('?')
    })
})

describe('hueFor', () => {
    it('is stable and stays on the colour wheel', () => {
        const hue = hueFor('alice@example.com')
        expect(hueFor('alice@example.com')).toBe(hue)
        expect(hue).toBeGreaterThanOrEqual(0)
        expect(hue).toBeLessThan(360)
    })

    it('differs between people', () => {
        expect(hueFor('alice@example.com')).not.toBe(hueFor('bob@example.com'))
    })
})

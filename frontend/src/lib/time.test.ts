import { describe, expect, it } from 'vitest'

import { daysUntil, formatDate, formatDateTime, formatDueIn, formatRelativeTime } from './time'

const NOW = new Date('2026-09-03T12:00:00Z')

function ago(seconds: number): string {
    return new Date(NOW.getTime() - seconds * 1000).toISOString()
}

describe('formatRelativeTime', () => {
    it('calls anything under a minute "just now"', () => {
        expect(formatRelativeTime(ago(0), NOW)).toBe('just now')
        expect(formatRelativeTime(ago(59), NOW)).toBe('just now')
    })

    it('counts whole minutes, hours and days', () => {
        expect(formatRelativeTime(ago(60), NOW)).toBe('1 minute ago')
        expect(formatRelativeTime(ago(5 * 60), NOW)).toBe('5 minutes ago')
        expect(formatRelativeTime(ago(3 * 3600 + 1800), NOW)).toBe('3 hours ago')
        expect(formatRelativeTime(ago(24 * 3600), NOW)).toBe('yesterday')
        expect(formatRelativeTime(ago(3 * 86400), NOW)).toBe('3 days ago')
    })

    it('switches to a short date after a week', () => {
        expect(formatRelativeTime('2026-08-20T12:00:00Z', NOW)).toBe('Aug 20')
    })

    it('adds the year once the date is in another year', () => {
        expect(formatRelativeTime('2025-12-24T12:00:00Z', NOW)).toBe('Dec 24, 2025')
    })

    it('returns an empty string for unparsable input', () => {
        expect(formatRelativeTime('not a date', NOW)).toBe('')
    })
})

describe('daysUntil', () => {
    it('counts whole calendar days either side of today', () => {
        expect(daysUntil('2026-09-03', NOW)).toBe(0)
        expect(daysUntil('2026-09-04', NOW)).toBe(1)
        expect(daysUntil('2026-08-31', NOW)).toBe(-3)
        expect(daysUntil('2026-09-04', new Date('2026-09-03T23:59:00Z'))).toBe(1)
    })

    it('returns null when there is no usable date', () => {
        expect(daysUntil(null, NOW)).toBeNull()
        expect(daysUntil('', NOW)).toBeNull()
        expect(daysUntil('not a date', NOW)).toBeNull()
    })
})

describe('formatDueIn', () => {
    it('names today, tomorrow and yesterday', () => {
        expect(formatDueIn('2026-09-03', NOW)).toBe('today')
        expect(formatDueIn('2026-09-04', NOW)).toBe('tomorrow')
        expect(formatDueIn('2026-09-02', NOW)).toBe('yesterday')
    })

    it('counts days within the week', () => {
        expect(formatDueIn('2026-09-06', NOW)).toBe('in 3 days')
        expect(formatDueIn('2026-09-09', NOW)).toBe('in 6 days')
        expect(formatDueIn('2026-08-31', NOW)).toBe('3 days ago')
    })

    it('counts weeks up to a month', () => {
        expect(formatDueIn('2026-09-10', NOW)).toBe('in 1 week')
        expect(formatDueIn('2026-09-24', NOW)).toBe('in 3 weeks')
        expect(formatDueIn('2026-10-02', NOW)).toBe('in 4 weeks')
    })

    it('counts months up to a year', () => {
        expect(formatDueIn('2026-10-03', NOW)).toBe('in 1 month')
        expect(formatDueIn('2027-03-03', NOW)).toBe('in 6 months')
        expect(formatDueIn('2026-08-01', NOW)).toBe('1 month ago')
    })

    it('counts years beyond that', () => {
        expect(formatDueIn('2027-09-03', NOW)).toBe('in 1 year')
        expect(formatDueIn('2099-01-01', NOW)).toBe('in 72 years')
    })

    it('counts calendar days, not elapsed hours', () => {
        const lateTonight = new Date('2026-09-03T23:59:00Z')
        expect(formatDueIn('2026-09-04', lateTonight)).toBe('tomorrow')
        const justAfterMidnight = new Date('2026-09-04T00:01:00Z')
        expect(formatDueIn('2026-09-04', justAfterMidnight)).toBe('today')
    })

    it('returns an empty string for unparsable input', () => {
        expect(formatDueIn('not a date', NOW)).toBe('')
    })
})

describe('formatDate', () => {
    it('spells out a date-only value without shifting the day', () => {
        expect(formatDate('2026-09-05')).toBe('Sep 5, 2026')
        expect(formatDate('2099-01-01')).toBe('Jan 1, 2099')
    })

    it('returns an empty string for unparsable input', () => {
        expect(formatDate('not a date')).toBe('')
    })
})

describe('formatDateTime', () => {
    it('includes the date and the time', () => {
        expect(formatDateTime('2026-09-03T09:30:00Z')).toMatch(/Sep 3, 2026/)
        expect(formatDateTime('2026-09-03T09:30:00Z')).toMatch(/\d{1,2}:\d{2}/)
    })

    it('returns an empty string for unparsable input', () => {
        expect(formatDateTime('not a date')).toBe('')
    })
})
